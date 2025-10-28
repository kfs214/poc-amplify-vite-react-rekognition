# ADR-004: Owner-based認可モデル

## ステータス
採用 (2025-10-28)

## コンテキスト
既存のTodoアプリはAPI Key認証（`allow.publicApiKey()`）を使用していたが、顔認証PoCでは各ユーザーの顔画像データを保護する必要がある。

認証（Authentication）は既にCognito User Poolsで実装済みだが、認可（Authorization）モデルを決定する必要がある。

## 検討した選択肢

### 選択肢1: API Key認証（現状維持）
```typescript
UserLivenessInfo: a
  .model({ ... })
  .authorization((allow) => [allow.publicApiKey()])
```

**メリット**: 
- 既存の設定をそのまま使用
- 実装変更が不要

**デメリット**: 
- API Keyさえあれば誰でもアクセス可能
- ユーザーAがユーザーBの顔画像データを見られる
- プライバシー・セキュリティリスクが高い

### 選択肢2: Owner-based認可（採用）
```typescript
UserLivenessInfo: a
  .model({
    userId: a.string().required(),
    profileImageKey: a.string(),
    livenessImageKey: a.string(),
  })
  .authorization((allow) => [allow.owner()])
```

**メリット**:
- ログインユーザーのみが自分のデータにアクセス可能
- Cognitoのユーザー認証と統合
- プライバシー保護が適切
- Amplify Gen 2の標準的なパターン

**デメリット**: 
- 認証モードをCognito User Poolsに変更する必要がある
- 既存のTodoモデルも変更が必要

### 選択肢3: グループベース認可
```typescript
.authorization((allow) => [
  allow.group("Admins"),
  allow.owner()
])
```

**メリット**: 管理者アクセスも可能
**デメリット**: 
- PoCでは管理者機能が不要
- 実装が複雑化
- 過剰設計

## 決定
**選択肢2: Owner-based認可** を採用

## 理由
- 顔画像データは機密性が高く、本人のみがアクセスすべき
- Cognitoユーザー認証は既に実装済み
- Amplify Gen 2の推奨パターン
- PoCでも適切なセキュリティ実装を示すべき
- 実装コストが低い（スキーマ定義を変更するだけ）

## 実装
```typescript
// amplify/data/resource.ts
const schema = a.schema({
  UserLivenessInfo: a
    .model({
      userId: a.string().required(),
      profileImageKey: a.string(),
      livenessImageKey: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool", // API Key → Cognito変更
  },
});
```

## 影響
- 既存のTodoモデルも削除（owner-basedに統一）
- Data APIの呼び出しは自動的にログインユーザーでフィルタリングされる
- Storage（S3）も同様にowner-basedで設定
- REST APIもCognito User Pools認証を必須に設定

## セキュリティ考慮事項
| データ | アクセス権限 |
|--------|-------------|
| UserLivenessInfo（DynamoDB） | オーナーのみ読み書き可 |
| profileImages/（S3） | オーナーのみ読み書き可 |
| livenessImages/（S3） | オーナーのみ読み書き可 |
| /compare API | Cognito認証必須 |

## 参考
- MASTER_PLAN.md マイルストーン3
- スレッドでの議論: "各ユーザーの顔画像キーは本人だけがアクセスすべき"
- Amplify Gen 2ドキュメント: https://docs.amplify.aws/gen2/build-a-backend/data/customize-authz/

