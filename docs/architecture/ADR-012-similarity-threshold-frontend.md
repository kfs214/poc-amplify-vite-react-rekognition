# ADR-012: 類似度閾値判定はフロントエンドで実施

## ステータス
✅ 承認済み

## コンテキスト

Rekognition `CompareFaces` APIは、`SimilarityThreshold`パラメータを指定することで、指定した閾値以上の類似度を持つ顔のみを返すことができる。

顔照合の成功/失敗を判定する閾値（例: 80%）をどこで設定するか検討する必要がある。

## 検討した選択肢

### 選択肢1: Lambda関数で閾値判定（バックエンド）
```typescript
const command = new CompareFacesCommand({
  SourceImage: { Bytes: sourceImage },
  TargetImage: { Bytes: targetImage },
  SimilarityThreshold: 80,  // 80%以上のみ返す
});
```

- **メリット**: 
  - ビジネスロジックがバックエンドに集約
  - フロントエンドはシンプル
- **デメリット**: 
  - 閾値を変更するたびにLambda関数のデプロイが必要
  - PoCで閾値を試行錯誤する際の柔軟性が低い
  - デバッグ時に実際の類似度スコアが分からない

### 選択肢2: フロントエンドで閾値判定 ✅
```typescript
// Lambda関数
const command = new CompareFacesCommand({
  SourceImage: { Bytes: sourceImage },
  TargetImage: { Bytes: targetImage },
  SimilarityThreshold: 0,  // すべての結果を取得
});

// フロントエンド（ResultScreen.tsx）
const SIMILARITY_THRESHOLD = 80;  // 定数で管理
const isSuccess = similarity >= SIMILARITY_THRESHOLD;
```

- **メリット**: 
  - 閾値の試行錯誤が容易（コード変更＋リロードのみ）
  - デプロイ不要で閾値変更可能
  - 実際の類似度スコアを常に確認できる（デバッグ/デモ用）
  - PoCの目的（UI/UX体験）に適している
- **デメリット**: 
  - ビジネスロジックがフロントエンドに存在
  - 本番環境では閾値をバックエンドで管理すべき

## 決定

**選択肢2を採用**: フロントエンドで閾値判定

### 実装

#### Lambda関数（compare-faces/handler.ts）
```typescript
const command = new CompareFacesCommand({
  SourceImage: { Bytes: sourceImage },
  TargetImage: { Bytes: targetImage },
  SimilarityThreshold: 0,  // すべての結果を返す
});

// レスポンス
return {
  statusCode: 200,
  body: JSON.stringify({
    similarity: bestMatch?.Similarity || 0,  // 生の類似度スコア
    faceMatches: faceMatches.length,
    // ... その他の情報
  }),
};
```

#### フロントエンド（ResultScreen.tsx）
```typescript
const SIMILARITY_THRESHOLD = 80;  // ハードコード定数（ADR-005参照）

const response = await post({ apiName: 'CompareApi', path: '/compare', ... });
const { similarity } = response.body;

if (similarity >= SIMILARITY_THRESHOLD) {
  // 照合成功
} else {
  // 照合失敗
}
```

## 根拠

1. **PoCの目的**: UI/UX体験であり、閾値の試行錯誤が想定される
2. **開発速度**: 閾値変更時にデプロイ不要（フロントエンドのみ変更）
3. **デバッグ性**: 実際の類似度スコアを常に確認できる
4. **柔軟性**: デザイナーやビジネスサイドが閾値を変えて体験できる
5. **データの透明性**: APIは生のスコアを返し、判定はクライアント側で実施

## トレードオフ

### PoCでの判断
- ✅ 閾値の試行錯誤が容易
- ✅ デモ時に類似度スコアを見せられる
- ✅ デプロイ頻度を減らせる

### 本番環境への移行時
本番環境では、以下の理由でバックエンド判定に変更すべき：
- ビジネスロジックの集約
- セキュリティ（クライアントで閾値を変更されるリスク）
- 監査証跡（判定結果をログに記録）

**移行手順**:
1. Lambda関数で`SimilarityThreshold`を環境変数から取得
2. フロントエンドは`isSuccess: boolean`のみ受け取る
3. 閾値変更時は環境変数を更新（デプロイ不要）

## 影響

- ✅ PoCでの開発速度向上
- ✅ デモでの柔軟性向上
- ✅ デバッグ性向上
- ⚠️ 本番環境への移行時に修正が必要

## 関連

- ADR-005: ハードコード類似度閾値（定数管理）
- ADR-003: 同期的な顔照合（PoCの設計思想）
- マイルストーン6: バックエンド - 顔照合API
- マイルストーン9: 画面C - 結果表示（閾値判定実装）

