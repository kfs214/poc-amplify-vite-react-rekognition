# 顔認証PoC マスタープラン

## 設計思想（Why）

- **3画面構成**: 実行コンテキストの違い（アプリ画面/アプリ内ブラウザ/結果画面）をモックヘッダーで視覚的に表現
- **モックヘッダー**: デザイナーに「今どのコンテキストか」を明示（開発コストをかけずにUXのリアリティを向上）
- **自撮り機能**: プロフィール写真も「顔」で撮影可能（`capture="user"`）にすることで体験のリアリティを向上
- **同期的な顔照合**: 非同期が理想だが、PoCでは同期呼び出し（`API.post`）でシンプルに実装
- **DynamoDB保存**: 更新フローを実現するため、Liveness写真キーを永続化
- **並行処理によるUX最適化**: S3アップロードとDB確認を並行実行し、体感ローディング時間を50%短縮
- **最小権限の原則**: 認証済みユーザーのみがLivenessやS3にアクセス可能

## マイルストーン 1: クリーンアップと3画面の骨格作成

### タスク1.1: Todo関連のクリーンアップ

- `src/App.tsx` から Todo関連のロジック・UI・import（Schema, generateClient, useState, useEffect, todo関連の関数・state）をすべて削除
- `<Authenticator>` コンポーネントと `signOut` ボタンは残す
- シンプルな「Hello, Amplify PoC」のようなプレースホルダーUIに置き換え

### タスク1.2: ルーティングの導入

- `react-router-dom` をインストール（`npm install react-router-dom`）
- `src/main.tsx` を編集し、`<Authenticator>` の内部に `<BrowserRouter>` を配置
- `src/App.tsx` を編集し、`<Routes>` と `<Route>` を設定（後述の3画面用）

### タスク1.3: 3画面コンポーネントの作成

新規ディレクトリ `src/screens/` を作成し、以下の3つのコンポーネントを作成：

**UploadScreen.tsx** (パス: `/`)

```tsx
<div>
  <h1>【アプリ画面 (モック)】</h1>
  <p>プロフィール写真アップロード画面（プレースホルダー）</p>
</div>
```

**LivenessScreen.tsx** (パス: `/liveness`)

```tsx
<div>
  <h1>【アプリ内ブラウザ (モック)】</h1>
  <p>Livenessチェック画面（プレースホルダー）</p>
</div>
```

**ResultScreen.tsx** (パス: `/result`)

```tsx
<div>
  <h1>【アプリ画面 (モック)】</h1>
  <p>顔照合結果画面（プレースホルダー）</p>
</div>
```

ルーティング設定を `src/App.tsx` に追加し、3画面が表示されることを確認。

---

## マイルストーン 2: 画面間データ連携（Context API）

### タスク2.1: PoCContextの作成

`src/contexts/PoCContext.tsx` を新規作成：

- `profileImageKey: string | null`（プロフィール写真のS3キー）
- `livenessImageKey: string | null`（Liveness写真のS3キー）
- `setProfileImageKey`, `setLivenessImageKey` の各setter
- Context ProviderとカスタムHook（`usePoCContext`）を提供

### タスク2.2: Contextの適用

`src/App.tsx` を編集し、`<Routes>` 全体を `<PoCContextProvider>` で囲む。

---

## マイルストーン 3: バックエンド - Data（DynamoDB）の追加

### タスク3.1: Dataモデルの定義

`amplify/data/resource.ts` を編集：

- 既存の `Todo` モデルを削除
- `UserLivenessInfo` モデルを新規定義：
  - `userId: string` (required) - ログインユーザーのID
  - `profileImageKey: string` - プロフィール写真のS3キー
  - `livenessImageKey: string` - Liveness写真のS3キー
- 認可ルールを **owner-based** に変更（`allow.owner()`）
- 認証モードを **Cognito User Pools** に変更（`userPool()`）

`amplify/backend.ts` で `data` リソースがインポート済みであることを確認。

---

## マイルストーン 4: バックエンド - Storage（S3）の設定

### タスク4.1: Storageリソースの追加

`amplify/storage/resource.ts` を新規作成：

- `defineStorage` を使用してS3バケットを定義
- アクセスパターンを設定（すべて非公開、オーナーのみアクセス可能）：
  - `profileImages/` プレフィックス: 認証ユーザー（オーナー）のみ読み書き可
  - `livenessImages/` プレフィックス: 認証ユーザー（オーナー）のみ読み書き可

### タスク4.2: backendへの追加

`amplify/backend.ts` を編集し、`storage` リソースをインポートして `defineBackend` に追加。

---

## マイルストーン 5: バックエンド - Liveness IAMポリシー設定

> **参考**: [公式ドキュメント Step 1](https://ui.docs.amplify.aws/react/connected-components/liveness)（補足事項も参照）

### 実装方針

`amplify/backend.ts`にIAMポリシーを追加：

- Rekognition `StartFaceLivenessSession` アクションへのアクセスを許可
- **プロジェクト固有の判断**:
  - ✅ 認証済みユーザーのみアクセス許可（最小権限の原則）
  - ❌ ゲストユーザーへのアクセスは不許可

詳細な実装手順は公式ドキュメント Step 1を参照。

---

## マイルストーン 5.5: バックエンド - Liveness Session API

> **参考**: [Amazon Rekognition Face Liveness developer guide](https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness.html)（Amplify UI Liveness公式ドキュメントのPrerequisites 2、補足事項も参照）

### 実装方針

Liveness Session（セッションID生成・結果取得）用のバックエンドAPIを作成：

- **Session作成API**: フロントエンドから呼び出し、Rekognition `CreateFaceLivenessSession` を実行してセッションIDを返す
- **Session結果取得API**: セッションID受け取り、Rekognition `GetFaceLivenessSessionResults` で結果を返す

**プロジェクト固有の判断**:
- 認証済みユーザーのみアクセス可能
- Amplify Function（Lambda）とAPI Gatewayを使用

詳細な実装手順は [Amazon Rekognition Face Liveness developer guide](https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness.html) を参照。

---

## マイルストーン 6: バックエンド - 顔照合API（Lambda + Rekognition）

### タスク6.1: Functionの作成

`amplify/functions/compare-faces/` ディレクトリを新規作成：

- `resource.ts`: Lambda関数定義（`defineFunction`）
- `handler.ts`: Lambda関数の実装
  - リクエストボディから `profileImageKey` と `livenessImageKey` を取得
  - S3から2つの画像を取得
  - Amazon Rekognition `compareFaces` APIを呼び出し
  - 類似度スコアをレスポンスとして返す

### タスク6.2: IAMポリシーの設定

`resource.ts` で、Lambda関数に以下の権限を付与：

- S3バケットからの読み取り権限（`GetObject`）
- Rekognition `CompareFaces` APIの実行権限

### タスク6.3: APIの定義

`amplify/api/resource.ts` を新規作成：

- `defineApi` を使用してREST APIを定義
- `/compare` エンドポイント（POST）を定義し、`compare-faces` Functionにルーティング
- 認証を必須に設定（Cognito User Pools）

### タスク6.4: backendへの追加

`amplify/backend.ts` を編集し、`api` リソースをインポートして `defineBackend` に追加。

---

## マイルストーン 7: 画面A（プロフィール写真アップロード）の実装

### タスク7.1: UIの作成

`src/screens/UploadScreen.tsx` を編集：

- `<input type="file" accept="image/*" capture="user" />` を配置（インカメラでの自撮り対応）
- ファイル選択時のプレビュー表示
- 「アップロード」ボタン（ローディング中は `@aws-amplify/ui-react` の `Loader` コンポーネントまたはCSSスピナーを表示）
- `signOut` ボタンの配置

### タスク7.2: アップロード・DB確認の並行処理実装（UX最適化）

**並行処理でローディング時間を短縮**:

- `Promise.all` を使用して以下を並行実行：
  1. `uploadData` API（Amplify Storage v6）でS3にアップロード
  2. Amplify Data（`client.models.UserLivenessInfo.get`）で既存レコードをDB確認
- 両方完了後、S3キーを `PoCContext` の `profileImageKey` に保存

**実装例**:
```typescript
const [uploadResult, dbResult] = await Promise.all([
  uploadData({ 
    path: `profileImages/${userId}/${Date.now()}.jpg`, 
    data: file 
  }),
  client.models.UserLivenessInfo.get({ id: userId })
]);
```

### タスク7.3: 分岐ロジックの実装

並行処理の結果を使って分岐：

- DB結果（`dbResult`）を確認
  - レコードが存在せず、または `livenessImageKey` が空 → **新規登録フロー**: `/liveness` に遷移
  - レコードが存在し、`livenessImageKey` が有る → **更新フロー**: `/result` に遷移
- `useNavigate` で画面遷移を実装

**UX改善効果**: DB確認（100-300ms）がアップロード中に完了するため、体感的なローディング時間が約50%短縮されます。

---

## マイルストーン 8: 画面B（Livenessチェック）の実装

> **参考**: [公式ドキュメント Step 2 & 4](https://ui.docs.amplify.aws/react/connected-components/liveness#step-2-install-dependencies)（補足事項も参照）

### タスク8.1: 依存関係のインストール

- `@aws-amplify/ui-react-liveness` をインストール（公式ドキュメント Step 2参照）

### タスク8.2: FaceLivenessDetectorの組み込み

`src/screens/LivenessScreen.tsx` を編集：

- `@aws-amplify/ui-react-liveness` から `FaceLivenessDetector` をインポート
- Livenessセッション作成APIを呼び出し、セッションIDを取得
- `FaceLivenessDetector` コンポーネントを配置

詳細な実装手順は公式ドキュメント Step 4を参照。

**注**: Liveness中はカメラストリーミングUIなので、ローディング表示は不要です。

### タスク8.3: 結果ハンドリングの実装

- Livenessチェック成功時、返ってきたS3キー（Liveness写真）を `PoCContext` の `livenessImageKey` に保存
- `/result` に自動遷移（`useNavigate`）

### タスク8.4: エラーハンドリング

- Livenessチェック失敗時のエラー表示
- リトライボタンの配置

---

## マイルストーン 9: 画面C（顔照合と結果表示）の実装

### タスク9.1: データ取得ロジック

`src/screens/ResultScreen.tsx` を編集：

- `PoCContext` から `profileImageKey` を取得（必須）
- `livenessImageKey` を取得：
  - Context内に有れば使用（新規登録フロー）
  - 無ければ Amplify Data（`client.models.UserLivenessInfo.get`）からDBより取得（更新フロー）

### タスク9.2: 顔照合APIの呼び出し

- `post` API（Amplify v6の`post`関数）を使用して `/compare` エンドポイントを呼び出し
- リクエストボディ: `{ profileImageKey, livenessImageKey }`
- **ローディング表示**: `Loader` コンポーネントまたはCSSスピナーで「顔照合中...」を表示

### タスク9.3: 結果表示の実装

- APIから返ってきた類似度スコア（`similarity`）を表示
- 類似度の閾値は定数でハードコーディング（例: `const SIMILARITY_THRESHOLD = 80;`）
- 成功/失敗の視覚的フィードバック（例: スコア80%以上で「✓ 照合成功」）
- 「ホームに戻る」ボタン（`/` に遷移）
- **デザイナー向け注記**: 画面上部に以下を表示
  ```
  ℹ️ PoC用の同期実装です。本番環境では非同期処理となり、
  ユーザーは待たずに離脱可能です。
  ```

### タスク9.4: データの永続化

照合に成功したら（スコアが閾値以上）：

- Amplify Data（`client.models.UserLivenessInfo.create` または `update`）を使用
- `userId`（ログインユーザーID）, `profileImageKey`, `livenessImageKey` を保存
- 次回の更新フローで再利用可能にする

---

## 補足事項

### 公式ドキュメント

本PoCの実装にあたり、以下の公式ドキュメントを参照してください：

- **[Amplify UI Face Liveness](https://ui.docs.amplify.aws/react/connected-components/liveness)**: Livenessの全体実装ガイド
  - Prerequisites 2: Liveness Session API作成 → マイルストーン5.5（[Amazon Rekognition developer guide](https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness.html)参照）
  - Step 1: IAMポリシー設定 → マイルストーン5
  - Step 2: 依存関係インストール → マイルストーン8
  - Step 3: Initialize Amplify → ✅ 既に完了（`src/main.tsx`）
  - Step 4: フロントエンド実装 → マイルストーン8

### フロントエンドの依存関係

以下のnpmパッケージをインストール：

- `react-router-dom` (ルーティング)
- `@aws-amplify/ui-react-liveness` (Livenessコンポーネント)

### バックエンドの依存関係

- **Liveness IAMポリシー**: 追加パッケージ不要（既存の `aws-cdk-lib` を使用）
- **Liveness Session Lambda**: `@aws-sdk/client-rekognition` (CreateFaceLivenessSession, GetFaceLivenessSessionResults)
- **顔照合Lambda**: `@aws-sdk/client-rekognition`, `@aws-sdk/client-s3`

### ローディング表示が必要な箇所

| 画面 | タイミング | 実装方法 |
|------|-----------|----------|
| 画面A | S3アップロード＋DB確認（並行処理） | `Loader` または CSSスピナー |
| 画面B | Liveness実行中 | 不要（カメラストリーミングUI） |
| 画面C | 顔照合API呼び出し | `Loader` + 「顔照合中...」メッセージ |

### デプロイとテスト

- 各マイルストーン完了後、`npx ampx sandbox` でローカルテスト
- 最終的に `npx ampx pipeline-deploy` でデプロイ

### セキュリティ考慮事項

- すべてのデータアクセスはowner-based認可
- S3の画像は認証ユーザー（オーナー）のみアクセス可能
- API呼び出しはCognito User Pools認証必須

