# ADR-011: Lambda関数の環境変数は使用するもののみ設定

## ステータス
✅ 承認済み

## コンテキスト

Liveness Session APIには2つのLambda関数がある：
1. `create-liveness-session`: セッション作成
2. `get-liveness-session-results`: セッション結果取得

初期実装では、両方の関数に`STORAGE_BUCKET_NAME`環境変数を設定していたが、実際には`get-liveness-session-results`では使用していない。

## 検討した選択肢

### 選択肢1: 両方の関数に同じ環境変数を設定
```typescript
// backend.ts
backend.createLivenessSession.addEnvironment('STORAGE_BUCKET_NAME', bucketName);
backend.getLivenessSessionResults.addEnvironment('STORAGE_BUCKET_NAME', bucketName);  // 不要
```
- **メリット**: 統一感がある
- **デメリット**: 
  - 不要な環境変数を設定（無駄なリソース）
  - コードの意図が不明瞭
  - 将来的な混乱を招く（「なぜ設定されているのに使っていない？」）

### 選択肢2: 使用する関数にのみ設定 ✅
```typescript
// backend.ts
backend.createLivenessSession.addEnvironment('STORAGE_BUCKET_NAME', bucketName);
// getLivenessSessionResults には設定しない
```
- **メリット**: 
  - コードの意図が明確
  - 最小設定の原則に従う
  - 保守性向上（環境変数とコードの対応が明確）
- **デメリット**: なし

## 決定

**選択肢2を採用**: 使用する関数にのみ環境変数を設定

### 各Lambda関数の環境変数

| Lambda関数 | 環境変数 | 使用箇所 | 理由 |
|-----------|---------|---------|------|
| `create-liveness-session` | `STORAGE_BUCKET_NAME` | ✅ handler.ts:28 | `CreateFaceLivenessSessionCommand`の`OutputConfig.S3Bucket`に指定 |
| `create-liveness-session` | `ALLOWED_ORIGINS` | ✅ handler.ts:8 | CORS対策 |
| `get-liveness-session-results` | ~~`STORAGE_BUCKET_NAME`~~ | ❌ 使用していない | `GetFaceLivenessSessionResultsCommand`はセッションIDのみ必要 |
| `get-liveness-session-results` | `ALLOWED_ORIGINS` | ✅ handler.ts:8 | CORS対策 |

### 実装

```typescript
// amplify/backend.ts

// S3バケット名（CreateLivenessSessionのみ必要）
backend.createLivenessSession.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName
);

// CORS設定（両方必要）
backend.createLivenessSession.addEnvironment(
  'ALLOWED_ORIGINS',
  'http://localhost:5173'
);

backend.getLivenessSessionResults.addEnvironment(
  'ALLOWED_ORIGINS',
  'http://localhost:5173'
);
```

## 技術的根拠

### create-liveness-session
```typescript
// S3バケット名を使用
const command = new CreateFaceLivenessSessionCommand({
  Settings: {
    OutputConfig: {
      S3Bucket: process.env.STORAGE_BUCKET_NAME,  // ✅ 使用
      S3KeyPrefix: 'livenessImages/',
    },
  },
});
```

### get-liveness-session-results
```typescript
// セッションIDのみ使用（S3バケット名不要）
const command = new GetFaceLivenessSessionResultsCommand({
  SessionId: sessionId,  // セッション作成時の設定を使用
});

const response = await rekognitionClient.send(command);
// response.ReferenceImage はRekognitionが返す（S3バケット情報含む）
```

**理由**: `GetFaceLivenessSessionResults`は、セッション作成時に指定されたS3設定を内部で使用するため、Lambda関数側でバケット名を知る必要がない。

## 根拠

1. **最小設定の原則**: 必要最小限の環境変数のみ設定
2. **コードの明確性**: 環境変数とコードの対応が明確
3. **保守性**: 将来の開発者が混乱しない
4. **パフォーマンス**: 不要な環境変数の読み込みを避ける
5. **デバッグ**: 環境変数のトラブルシューティングが容易

## 影響

- ✅ コードの意図が明確になる
- ✅ 保守性が向上
- ✅ 最小設定の原則に従う
- ✅ 環境変数の管理が容易になる

## ベストプラクティス

Lambda関数の環境変数設定時のチェックリスト：

1. ✅ 実際にコード内で使用されているか？
2. ✅ デフォルト値があるか？
3. ✅ 環境変数名は明確か？
4. ✅ セキュリティ上の懸念はないか？

## 関連

- ADR-007: Lambda関数にS3書き込み権限は不要
- ADR-010: S3バケット名の自動参照
- マイルストーン5.5: Liveness Session API

