# ADR-008: S3バケットポリシー（Rekognitionサービス用）は動作確認後に判断

## ステータス
⏸️ 保留（動作確認待ち）

## コンテキスト

Rekognitionサービスが`CreateFaceLivenessSession`で指定されたS3バケットに画像を保存する際、適切な権限が必要になる可能性がある。

公式ドキュメントでは、Rekognitionサービスへのバケットポリシー設定について明確な記載が見つからなかった。

## アーキテクチャ

```
Rekognitionサービス
  ↓ 画像を保存
S3バケット (livenessImages/)
  ↓ 権限チェック
  ？ バケットポリシーで許可が必要？
```

## 検討した選択肢

### 選択肢1: 事前にバケットポリシーを追加
```typescript
backend.storage.resources.bucket.addToResourcePolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    principals: [new ServicePrincipal('rekognition.amazonaws.com')],
    actions: ['s3:PutObject', 's3:PutObjectAcl'],
    resources: [`${backend.storage.resources.bucket.bucketArn}/livenessImages/*`],
    conditions: {
      StringEquals: {
        'aws:SourceAccount': Stack.of(backend.storage.resources.bucket).account,
      },
    },
  })
);
```
- **メリット**: 事前にエラーを防げる
- **デメリット**: 
  - 不要な権限を付与する可能性（最小権限の原則に違反）
  - Amplify Gen 2が自動設定している可能性を無視

### 選択肢2: 動作確認後に判断（保留）✅
- **メリット**: 
  - 最小権限の原則に従う
  - 不要な権限追加を避ける
  - Amplifyの自動設定を確認できる
  - エラーメッセージから必要な権限が明確になる
- **デメリット**: 
  - 初回実行時にエラーが出る可能性

## 決定

**選択肢2を採用**: まず動作確認し、エラーが出たら追加

### 検証フロー

```
1. 現状のままデプロイ
   ↓
2. フロントエンドからLiveness実行
   ↓
3. エラーが出るか確認
   ↓ （エラーなし）
✅ バケットポリシー不要（Amplifyが自動設定済み）
   ↓ （エラーあり: Access Denied等）
❌ バケットポリシー追加が必要
```

## 根拠

1. **最小権限の原則**: 不要な権限は付与しない
2. **Amplify Gen 2の信頼**: 多くの権限を自動設定している
3. **公式ドキュメント**: 明確な記載がない（=自動設定の可能性）
4. **リスク評価**: 
   - エラーが出ても修正は容易（バケットポリシー追加のみ）
   - 不要な権限を付与するリスクの方が高い

## 次のアクション

**マイルストーン8（Liveness実装）完了後**:
1. 実際にLivenessを実行
2. S3に画像が保存されるか確認
3. エラーが出た場合:
   - エラーメッセージを記録
   - 必要な権限を特定
   - バケットポリシーを追加
   - このADRを更新

## 影響

- ✅ 最小権限の原則に従う
- ✅ 不要な権限追加を避ける
- ⏸️ 実装完了後に動作確認が必要

## 関連

- ADR-007: Lambda関数にS3書き込み権限は不要
- マイルストーン5.5: Liveness Session API
- マイルストーン8: Livenessチェック実装（動作確認タイミング）

