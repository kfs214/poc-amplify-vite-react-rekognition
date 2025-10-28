# Cursor AIのためのコミットメッセージ憲法

## ✅ 絶対遵守事項 (Conventional Commits 規約)

コミットメッセージを生成する際は、**必ず**以下の Conventional Commits フォーマットに従うこと。

    <type>(<scope>): <subject>
    <BLANK LINE>
    <body>
    <BLANK LINE>
    <footer>

---

### 1. `<type>`（必須）

必ず以下のいずれかの `type` から選択すること。

* **feat:** （機能）新機能の追加
* **fix:** （修正）バグ修正
* **docs:** （文書）ドキュメントのみの変更
* **style:** （スタイル）コードの動作に影響しない変更（フォーマット、セミコロンなど）
* **refactor:** （リファクタ）バグ修正でも機能追加でもないコードの変更（リファクタリング）
* **perf:** （パフォーマンス）パフォーマンスを向上させるコード変更
* **test:** （テスト）不足しているテストの追加や既存テストの修正
* **chore:** （雑務）ビルドプロセスや補助ツール、ライブラリの変更（`package.json`の更新など）
* **ci:** （CI）CI設定ファイルやスクリプトの変更
* **revert:** （取り消し）以前のコミットを取り消す場合

### 2. `<scope>`（任意）

変更範囲を示すスコープを記述する。（例: `auth`, `api`, `ui`, `deps`）

### 3. `<subject>`（必須）

* 50文字以内
* 現在形で記述し、文頭は大文字にしない
* 文末にピリオドを付けない

### 4. `<body>`（任意）

* 変更の動機（なぜ）と、以前の動作との対比（何を）を記述する。
* 1行あたり72文字で改行する。

### 5. `<footer>`（任意）

* `BREAKING CHANGE:`（破壊的変更）を記述する。
* `Refs #123` のように、関連するIssue番号を記述する。

---

## 📝 良いコミットメッセージの例

    feat(auth): add sign-in with email and password
    
    Implements the sign-in logic using aws-amplify/auth SDK.
    Handles loading states and error messages based on the API response.
    
    Refs #42

    fix(api): correct the data type for todo priority
    
    The priority field in the schema was defined as String but
    the front-end was passing a Number, causing a validation error.
    
    BREAKING CHANGE: The `priority` field in the Todo model is now String.

    chore(deps): update aws-amplify libraries to v6.1.0

    docs(readme): add setup instructions for amplify gen2
