# Cursor AIのためのAmplify Gen 2 開発憲法

## 💡 プロジェクトの文脈と最優先事項

* **ターゲット:** 本プロジェクトは **Amplify Gen 2** を使用しています。
* **Gen 2 公式ドキュメント:** https://docs.amplify.aws/gen2/
* **SDKバージョン:** **Amplify v6** (aws-amplify@6.x.x)
* **スキーマ定義:** `amplify/data/resource.ts`
* **認証設定:** `amplify/auth/resource.ts`
* **クライアント設定:** `src/main.tsx` (または `index.js`) で `Amplify.configure()` を実行している。

## 🛑 絶対禁止事項 (オラオラ実装の防止)

1.  **車輪の再開発の禁止:**
    * Amplifyが提供する機能を、`fetch()` APIや`axios`、自作のstate管理（useState/useEffectでのデータ取得）などで**絶対に再実装しないこと**。
2.  **認証機能の自作禁止:**
    * サインイン、サインアップ、サインアウト等の認証ロジックを**絶対にスクラッチで実装しないこと**。
3.  **旧バージョン(v5以前)の構文使用禁止:**
    * `Auth.signIn` や `DataStore.save` などの古い構文（v5）は**絶対に使用しないこと**。

## ✅ 絶対遵守事項 (Amplify SDK v6 の強制)

1.  **データアクセス（CRUD）:**
    * すべてのデータ操作は、**必ず `aws-amplify/data` (v6) SDK を使用**すること。
    * コードを生成する前に、**必ず `amplify/data/resource.ts` ファイルを参照**し、定義されているスキーマと型定義を100%尊重すること。
2.  **認証:**
    * すべての認証操作は、**必ず `aws-amplify/auth` (v6) SDK を使用**すること。（例: `signIn`, `signOut`, `getCurrentUser`）
3.  **UIコンポーネント:**
    * 認証画面が必要な場合は、**必ず `@aws-amplify/ui-react` の `Authenticator` コンポーネントを使用**すること。
    * フォームやUI部品が必要な場合も、**可能な限り `@aws-amplify/ui-react` のプリミティブ（`TextField`, `Button` 等）を優先**すること。
4.  **設定ファイル:**
    * Amplifyの設定は、クライアントサイドで `Amplify.configure()` を呼び出すことで行われる。**`amplifyconfiguration.json`** の内容を尊重すること。
