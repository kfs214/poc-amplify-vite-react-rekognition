# ADR-010: S3バケット名の自動参照

## ステータス
✅ 承認済み

## コンテキスト

Lambda関数（`create-liveness-session`）は、Rekognitionの`CreateFaceLivenessSession` APIを呼び出す際に、S3バケット名を`OutputConfig.S3Bucket`に指定する必要がある。

Amplify Gen 2では、`defineStorage`でS3バケットが自動生成されるが、バケット名は動的に決定される（例: `amplify-poc-storage-abc123-main`）。

## 検討した選択肢

### 選択肢1: マネコンからバケット名をコピーして環境変数に設定
```bash
# 1. デプロイ後、AWS Consoleでバケット名を確認
# 例: amplify-poc-storage-abc123-main

# 2. Amplify Consoleで環境変数を設定
STORAGE_BUCKET_NAME=amplify-poc-storage-abc123-main

# 3. Lambda関数で使用
const bucketName = process.env.STORAGE_BUCKET_NAME;
```
- **メリット**: シンプルで分かりやすい
- **デメリット**: 
  - マニュアル操作が必要（設定ミスのリスク）
  - バケット名が変わるたびに更新が必要
  - ブランチごとに異なるバケット名を管理する必要がある
  - DRY原則に違反（バケット情報が2箇所に存在）

### 選択肢2: CDKでバケット名を自動参照 ✅
```typescript
// backend.ts
backend.createLivenessSession.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName  // 自動参照！
);
```
- **メリット**: 
  - マニュアル操作不要
  - 設定ミスが発生しない
  - ブランチごとに自動で適切なバケット名が設定される
  - DRY原則に従う（真実の情報源は1つ）
  - Amplify Gen 2の設計思想に一致
- **デメリット**: なし

## 決定

**選択肢2を採用**: `backend.storage.resources.bucket.bucketName`で自動参照

### 実装

```typescript
// amplify/backend.ts
import { storage } from './storage/resource';

const backend = defineBackend({
  auth,
  data,
  storage,  // Storage定義をインポート
  createLivenessSession,
  getLivenessSessionResults,
});

// Lambda関数にS3バケット名を自動設定
backend.createLivenessSession.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName  // 自動参照
);
```

### Lambda関数での使用

```typescript
// amplify/functions/create-liveness-session/handler.ts
const command = new CreateFaceLivenessSessionCommand({
  Settings: {
    OutputConfig: {
      S3Bucket: process.env.STORAGE_BUCKET_NAME,  // 自動設定された値を使用
      S3KeyPrefix: 'livenessImages/',
    },
  },
});
```

## 根拠

1. **DRY原則**: S3バケット定義は`amplify/storage/resource.ts`のみ
2. **自動化**: デプロイ時に自動で適切なバケット名が設定される
3. **設定ミス防止**: マニュアル操作を排除
4. **ブランチ対応**: ブランチごとに自動で適切なバケット名が使われる
5. **Amplify Gen 2の設計思想**: リソース間の参照をサポート
6. **CDKのベストプラクティス**: リソースの参照は自動で行う

## Amplify Gen 2のリソース参照パターン

| リソース | 参照方法 |
|---------|---------|
| S3バケット名 | `backend.storage.resources.bucket.bucketName` |
| S3バケットARN | `backend.storage.resources.bucket.bucketArn` |
| Cognito User Pool | `backend.auth.resources.userPool` |
| DynamoDB テーブル名 | `backend.data.resources.tables['ModelName'].tableName` |

## 影響

- ✅ マニュアル操作不要
- ✅ 設定ミスが発生しない
- ✅ ブランチごとのデプロイで自動対応
- ✅ コードの保守性向上

## 関連

- ADR-009: CORS設定は環境変数で管理（手動設定が必要なケース）
- マイルストーン4: Storage（S3）の設定
- マイルストーン5.5: Liveness Session API
- [Amplify Gen 2 - Extend with CDK](https://docs.amplify.aws/react/build-a-backend/add-aws-services/cdk/)

