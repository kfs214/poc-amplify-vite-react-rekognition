# ADR-007: Lambda関数にS3書き込み権限は不要

## ステータス
✅ 承認済み

## コンテキスト

Liveness Session作成用のLambda関数（`create-liveness-session`）は、Rekognitionの`CreateFaceLivenessSession` APIを呼び出し、その際にS3バケット情報（`OutputConfig`）を指定する。

初期実装では、「Lambda関数がS3に書き込む」と誤解し、Lambda関数のIAMロールに`s3:PutObject`権限を付与していた。

## アーキテクチャ

実際のデータフロー：

```
フロントエンド
  ↓ POST /liveness/create-session
Lambda関数 (create-liveness-session)
  ↓ CreateFaceLivenessSession(S3Bucket指定)
Rekognitionサービス
  ↓ セッションIDを返す
  ↓
ユーザーが顔認証実行
  ↓
Rekognitionサービスが直接S3に書き込む ← ここ！
  ↓
S3バケット (livenessImages/)
  - ReferenceImage
  - AuditImages (設定されている場合)
```

**重要**: Lambda関数はS3に書き込まない。Rekognitionサービスが直接書き込む。

## 検討した選択肢

### 選択肢1: Lambda関数にS3書き込み権限を付与（誤り）❌
```typescript
const s3WritePolicy = new PolicyStatement({
  actions: ['s3:PutObject', 's3:PutObjectAcl'],
  resources: [`${backend.storage.resources.bucket.bucketArn}/livenessImages/*`],
});
backend.createLivenessSession.resources.lambda.addToRolePolicy(s3WritePolicy);
```
- **デメリット**: 
  - 不要な権限を付与（最小権限の原則に違反）
  - アーキテクチャの誤解を招く
  - Lambda関数は実際にS3に書き込まない

### 選択肢2: Lambda関数にS3書き込み権限を付与しない ✅
- **メリット**: 
  - 最小権限の原則に従う
  - 実際のデータフローに一致
  - セキュリティリスク低減

## 決定

**選択肢2を採用**: Lambda関数にS3書き込み権限を付与**しない**

Lambda関数に必要な権限：
- ✅ `rekognition:CreateFaceLivenessSession` - Rekognition API呼び出し
- ❌ `s3:PutObject` - **不要**（RekognitionがS3に直接書き込む）

## 根拠

1. **アーキテクチャの正確性**: Lambda関数はS3に書き込まない
2. **最小権限の原則**: 不要な権限は付与しない
3. **セキュリティ**: 権限の過剰付与はセキュリティリスクを増大させる
4. **AWSのベストプラクティス**: サービス間の直接通信を活用

## 影響

- ✅ Lambda関数のIAMロールがシンプルになる
- ✅ セキュリティが向上
- ✅ 最小権限の原則に従う
- ⏸️ Rekognitionサービスの権限は別途確認が必要（ADR-008参照）

## 関連

- ADR-008: S3バケットポリシー（Rekognitionサービス用）は動作確認後に判断
- マイルストーン5.5: Liveness Session API

