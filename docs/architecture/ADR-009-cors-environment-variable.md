# ADR-009: CORS設定は環境変数で管理

## ステータス
✅ 承認済み

## コンテキスト

Liveness Session API（Lambda関数とAPI Gateway）は、フロントエンドからのCORS（Cross-Origin Resource Sharing）リクエストに対応する必要がある。

開発環境とデプロイ環境でオリジンURLが異なる：
- ローカル開発: `http://localhost:5173`
- デプロイ環境: `https://main.d1234abcd5678.amplifyapp.com` (実際のURL)

## 検討した選択肢

### 選択肢1: ワイルドカード（`*`）を許可
```typescript
headers: {
  'Access-Control-Allow-Origin': '*',
}
```
- **メリット**: どの環境でも動作
- **デメリット**: 
  - セキュリティリスク（CSRF攻撃のリスク）
  - Cognitoとの認証情報（credentials）を使用できない
  - ベストプラクティスに違反

### 選択肢2: オリジンをハードコード
```typescript
const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://main.xxx.amplifyapp.com'];
```
- **メリット**: 
  - セキュリティが高い
  - 設定漏れがない
- **デメリット**: 
  - 新しい環境（dev/prod）を追加するたびにコード修正が必要
  - GitOpsの柔軟性が低い
  - ブランチごとのデプロイURL対応が困難

### 選択肢3: 環境変数で管理 ✅
```typescript
// Lambda関数
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

// API Gateway (backend.ts実行時)
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
```
- **メリット**: 
  - 標準的なインフラ設定方法（12 Factor Appの原則）
  - 複数環境（ローカル/dev/staging/prod）に対応
  - デフォルト値でローカル開発は動作
  - GitOpsで管理（環境変数はAmplify Consoleで設定）
  - ブランチごとのデプロイURLに柔軟に対応
- **デメリット**: 
  - デプロイ後に環境変数設定が必要（1回だけ）

## 決定

**選択肢3を採用**: 環境変数で管理、デフォルト値はlocalhost

### 実装

#### backend.ts
```typescript
// Lambda関数の環境変数
backend.createLivenessSession.addEnvironment(
  'ALLOWED_ORIGINS',
  'http://localhost:5173'  // デフォルト値
);

backend.getLivenessSessionResults.addEnvironment(
  'ALLOWED_ORIGINS',
  'http://localhost:5173'
);
```

#### liveness-api/resource.ts
```typescript
// API Gateway CORS設定（backend.ts実行時に環境変数を読む）
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

const api = new apigateway.RestApi(livenessApiStack, 'LivenessApi', {
  defaultCorsPreflightOptions: {
    allowOrigins: allowedOrigins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowCredentials: true,
  },
});
```

#### Lambda handler
```typescript
const getAllowedOrigin = (requestOrigin?: string): string => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  return allowedOrigins[0];
};
```

### デプロイ後の設定

**Amplify Console** → **Environment variables**:
- Key: `ALLOWED_ORIGINS`
- Value: `http://localhost:5173,https://main.d1234abcd5678.amplifyapp.com`

複数オリジンはカンマ区切りで指定。

## 根拠

1. **標準的な方法**: 環境変数はインフラ設定の業界標準（12 Factor App）
2. **複数環境対応**: ローカル/dev/staging/prodで異なるオリジンに対応
3. **セキュリティ**: ワイルドカードを避け、明示的なオリジンのみ許可
4. **デフォルト値**: 設定漏れでもローカル開発は動作
5. **GitOps**: コードではなく環境変数で管理（変更時にpush不要）
6. **柔軟性**: 新しいブランチデプロイ時に環境変数追加のみで対応

## セキュリティ

| 設定 | 値 |
|------|-----|
| `Access-Control-Allow-Origin` | 環境変数で明示的に指定されたオリジンのみ |
| `Access-Control-Allow-Headers` | `Content-Type,Authorization` のみ |
| `Access-Control-Allow-Credentials` | `true` (Cognito認証必須) |
| `Access-Control-Allow-Methods` | `GET, POST, OPTIONS` のみ |

## 影響

- ✅ ローカル開発: デフォルト値で動作
- ✅ デプロイ環境: 環境変数設定後に動作
- ⚠️ デプロイ後に1回だけ環境変数設定が必要

## 運用手順

### ローカル開発
```bash
# 環境変数不要（デフォルト値で動作）
npx ampx sandbox
```

### デプロイ
```bash
# 1. デプロイ
npx ampx pipeline-deploy --branch main

# 2. Amplify Consoleで環境変数を設定（初回のみ）
# ALLOWED_ORIGINS=http://localhost:5173,https://main.xxx.amplifyapp.com

# 3. 再デプロイ（環境変数反映）
git push origin main
```

## 関連

- [12 Factor App - Config](https://12factor.net/config)
- マイルストーン5.5: Liveness Session API
- セキュリティ考慮事項（MASTER_PLAN.md）

