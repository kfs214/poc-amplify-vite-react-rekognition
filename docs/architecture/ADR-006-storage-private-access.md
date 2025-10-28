# ADR-006: Storage（S3）の非公開設定

## ステータス
採用 (2025-10-28)

## コンテキスト
プロフィール写真とLiveness写真をS3に保存する際、アクセス権限を決定する必要がある。

本来の用途では、プロフィール写真は他のユーザーにも表示するため公開読み取りが考えられるが、PoCでのアクセスパターンを決定する。

## 検討した選択肢

### 選択肢1: プロフィール写真は公開、Liveness写真は非公開
```typescript
defineStorage({
  name: 'pocStorage',
  access: (allow) => ({
    'profileImages/*': [
      allow.authenticated.to(['read', 'write']), // 認証ユーザーは書き込み可
      allow.guest.to(['read'])                    // 公開読み取り可
    ],
    'livenessImages/*': [
      allow.entity('identity').to(['read', 'write']) // オーナーのみ
    ]
  })
})
```

**メリット**: 
- 本番環境の想定に近い（プロフィール写真は他ユーザーも閲覧）
- ソーシャル機能を考慮

**デメリット**: 
- PoCでは公開機能が不要
- プライバシーリスクが不明確
- 公開範囲の設計が複雑化

### 選択肢2: すべて非公開、オーナーのみアクセス可能（採用）
```typescript
defineStorage({
  name: 'pocStorage',
  access: (allow) => ({
    'profileImages/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write'])
    ],
    'livenessImages/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write'])
    ]
  })
})
```

**メリット**:
- セキュリティが最も高い
- PoCとして適切（外部公開なし）
- 実装がシンプル（すべて同じパターン）
- プライバシー保護が明確

**デメリット**: 
- 本番環境でプロフィール写真を公開する場合、設定変更が必要

### 選択肢3: すべて公開
```typescript
'profileImages/*': [allow.guest.to(['read'])]
```

**メリット**: アクセスがシンプル
**デメリット**: 
- 顔画像が公開されるのはセキュリティリスク
- PoCでも不適切

## 決定
**選択肢2: すべて非公開、オーナーのみアクセス可能** を採用

## 理由
- PoCの目的は「Look & Feel」の体験であり、公開機能は不要
- 顔画像は機密性が高く、限定的なアクセス権限が適切
- セキュリティベストプラクティスに従う
- 実装がシンプル（プロフィール写真もLiveness写真も同じパターン）
- ユーザーからの明示的な要求: "外部公開なし、限定的な読み取り権限"

## 実装
```typescript
// amplify/storage/resource.ts
import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'pocStorage',
  access: (allow) => ({
    'profileImages/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write'])
    ],
    'livenessImages/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write'])
    ]
  })
});
```

## 影響
- すべての画像はオーナー（アップロードした本人）のみアクセス可能
- 他のユーザーは画像を閲覧できない
- Lambda関数がRekognitionで画像を比較する際は、S3の直接アクセス（IAMロール）を使用
- 画像のパスには`{entity_id}`（Cognito Identity ID）が含まれる

## セキュリティ考慮事項
| リソース | アクセス権限 |
|---------|-------------|
| profileImages/ | オーナーのみ読み書き可 |
| livenessImages/ | オーナーのみ読み書き可 |
| Lambda（Rekognition用） | S3 GetObject権限（IAM） |

## 将来的な拡張
本番環境でプロフィール写真を他ユーザーに公開する場合：
1. `profileImages/`のみ公開読み取りに変更
2. または、CloudFront + Signed URLsで制御された公開
3. 画像のリサイズ・最適化（Lambda@Edge等）

ただし、PoCではこれらは不要。

## 参考
- MASTER_PLAN.md マイルストーン4
- スレッドでの議論: "外部公開なし、限定的な読み取り権限で実装したい"
- Amplify Storage公式ドキュメント: https://docs.amplify.aws/gen2/build-a-backend/storage/

