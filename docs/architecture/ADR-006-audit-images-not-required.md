# ADR-006: 監査画像（AuditImages）は不要

## ステータス
✅ 承認済み

## コンテキスト

Amazon Rekognition Face Livenessでは、以下の2種類の画像を取得できる：

1. **ReferenceImage**: 顔照合に使用する1枚の画像
2. **AuditImages**: 監査・検証・記録用の画像（0-4枚）

PoCの目的は、デザイナーとビジネスサイドに顔認証のUI/UXを体験してもらうことであり、後続のマイルストーンで`CompareFaces` APIを使った顔照合を実装する。

## 検討した選択肢

### 選択肢1: AuditImagesLimit = 4（最大枚数取得）
- **メリット**: 
  - 複数枚から最良の画像を選択できる
  - Liveness検証の証跡が残る
  - 不正検知の記録として使える
- **デメリット**: 
  - ストレージコスト増加
  - プライバシーへの配慮が必要
  - PoCでは使用しない

### 選択肢2: AuditImagesLimit = 0（取得しない）✅
- **メリット**: 
  - ReferenceImageのみで顔照合可能
  - ストレージコスト削減
  - プライバシー保護
  - PoCに必要十分
- **デメリット**: 
  - 監査証跡が残らない（本番環境では必要な場合あり）

## 決定

**選択肢2を採用**: `AuditImagesLimit` を設定しない（デフォルト0）

```typescript
const command = new CreateFaceLivenessSessionCommand({
  Settings: {
    OutputConfig: {
      S3Bucket: process.env.STORAGE_BUCKET_NAME,
      S3KeyPrefix: 'livenessImages/',
    },
    // AuditImagesLimit: 設定しない（デフォルト0）
  },
});
```

## 根拠

1. **顔照合の要件**: `CompareFaces` APIはReferenceImageのみで動作する
2. **PoCの目的**: UI/UX体験であり、監査機能は不要
3. **ストレージコスト**: 不要なデータを保存しない（最小権限・最小リソースの原則）
4. **プライバシー**: ユーザーの顔画像を必要最小限のみ保存
5. **公式ドキュメント**: AuditImagesはオプションであり、顔照合には不要と明記

## 影響

- ✅ ReferenceImageのみ取得（顔照合に使用）
- ✅ ストレージ使用量削減
- ✅ プライバシー保護強化
- ⚠️ 本番環境では監査要件に応じて再検討が必要

## 関連

- [Amazon Rekognition Face Liveness API Reference](https://docs.aws.amazon.com/rekognition/latest/APIReference/API_GetFaceLivenessSessionResults.html)
- マイルストーン5.5: Liveness Session API
- マイルストーン6: 顔照合API（CompareFaces）

