# ADR-013: API Gatewayディレクトリの命名規則統一

## ステータス
✅ 承認済み

## コンテキスト

このプロジェクトでは、複数のAPI Gateway定義が存在する：
1. Liveness Session API（セッション作成・結果取得）
2. Compare API（顔照合）

Amplify Gen 2では、API GatewayをCDKで直接定義するため、専用のディレクトリを作成して管理する必要がある。

初期実装時、以下のように命名していた：
- `liveness-api/` - Liveness Session API用
- `api/` - Compare API用（**一貫性がない**）

## 問題点

### 1. 命名の一貫性欠如
| ディレクトリ | 目的 | 問題 |
|------------|------|------|
| `liveness-api/` | Liveness Session API | ✅ 目的が明確 |
| `api/` | Compare API | ❌ 汎用的すぎて目的不明 |

### 2. スケーラビリティの問題
将来的に新しいAPIが追加される場合：
- `liveness-api/` - OK（目的が明確）
- `api/` - 何のAPI？（既存か新規か不明）
- `xxx-api/` - OK（目的が明確）

`api/`という名前は、「デフォルトのAPI」という印象を与え、後続の開発者を混乱させる。

### 3. 保守性の低下
コードレビュー時や将来のメンテナンス時に：
- 「`api/`って何のAPI？」
- 「`liveness-api/`との関係は？」
- 「なぜ命名規則が違う？」

という疑問が生じる。

## 検討した選択肢

### 選択肢1: `api/`のまま維持
- **メリット**: 変更不要
- **デメリット**: 
  - 一貫性がない
  - 目的が不明確
  - 将来の拡張性が低い

### 選択肢2: `compare-api/`にリネーム ✅
- **メリット**: 
  - 命名の一貫性
  - 目的が明確
  - 将来の拡張性が高い
  - 保守性向上
- **デメリット**: 
  - リネーム作業が必要（ただし1分で完了）

## 決定

**選択肢2を採用**: `api/` → `compare-api/` にリネーム

### 命名規則

```
amplify/
├── functions/              ← Lambda関数（実体）
│   ├── create-liveness-session/
│   ├── get-liveness-session-results/
│   └── compare-faces/
├── liveness-api/           ← API Gateway定義（Liveness用）
└── compare-api/            ← API Gateway定義（Compare用）
```

**パターン**: `{purpose}-api/`

### リネーム対象

| Before | After | 理由 |
|--------|-------|------|
| `api/resource.ts` | `compare-api/resource.ts` | 目的を明確化 |
| `import { configureCompareApi } from './api/resource'` | `import { configureCompareApi } from './compare-api/resource'` | インポートパスを更新 |

## 根拠

### 1. 命名の一貫性
すべてのAPI Gateway定義が同じパターンに従う：
- `liveness-api/` - Liveness Session API
- `compare-api/` - Compare API
- `xxx-api/` - 将来追加されるAPI

### 2. 自己説明的なコード
ディレクトリ名を見ただけで、何のAPIか分かる：
```bash
$ ls amplify/
auth/  data/  storage/  functions/  liveness-api/  compare-api/
# ↑ 一目で「LivenessとCompareの2つのAPIがある」と分かる
```

### 3. スケーラビリティ
新しいAPI追加時に迷わない：
```bash
# 新しいAPI追加時
amplify/payment-api/  # 決済API
amplify/notification-api/  # 通知API
```

### 4. チーム開発での明確性
複数人で開発する際、ディレクトリ名から即座に目的が分かる。

## 影響

### ポジティブ
- ✅ コードの可読性向上
- ✅ 保守性向上
- ✅ 将来の拡張性向上
- ✅ チーム開発での明確性向上

### ネガティブ
- なし（リネーム作業は1分で完了）

## 実装の詳細

### 変更ファイル

1. **ディレクトリリネーム**:
   ```bash
   mv amplify/api amplify/compare-api
   ```

2. **backend.tsのインポート修正**:
   ```typescript
   // Before
   import { configureCompareApi } from './api/resource';
   
   // After
   import { configureCompareApi } from './compare-api/resource';
   ```

3. **その他の影響**:
   - なし（ディレクトリはビルド時のみ参照、デプロイ後のリソース名には影響なし）

## ベストプラクティス

### API Gatewayディレクトリ命名規則

| 原則 | 例 |
|------|-----|
| **目的を含める** | `liveness-api/`, `compare-api/`, `payment-api/` |
| **`-api`サフィックス** | APIであることを明示 |
| **小文字＋ハイフン** | `kebab-case`（TypeScriptファイル名と統一） |
| **簡潔で分かりやすく** | `user-management-api/`ではなく`user-api/` |

### Amplify Gen 2のディレクトリ構造パターン

```
amplify/
├── auth/                    ← Amplifyヘルパー（defineAuth）
├── data/                    ← Amplifyヘルパー（defineData）
├── storage/                 ← Amplifyヘルパー（defineStorage）
├── functions/               ← Amplifyヘルパー（defineFunction）
│   └── {function-name}/     ← Lambda関数ごと
├── {purpose}-api/           ← CDK直接（API Gateway）← 今回の規則
│   └── resource.ts
└── backend.ts
```

## 関連

- [Amplify Gen 2 - Add a REST API](https://docs.amplify.aws/react/build-a-backend/add-aws-services/rest-api/)
- マイルストーン5.5: Liveness Session API（`liveness-api/`）
- マイルストーン6: 顔照合API（`compare-api/`）

