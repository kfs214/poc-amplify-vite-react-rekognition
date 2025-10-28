import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * 顔認証PoCのデータスキーマ定義
 * 
 * UserLivenessInfo: ユーザーごとのプロフィール画像とLiveness画像のS3キーを管理
 * - owner-based認可: ログインユーザーのみが自分のデータにアクセス可能
 */
const schema = a.schema({
  UserLivenessInfo: a
    .model({
      userId: a.string().required(),
      profileImageKey: a.string(),
      livenessImageKey: a.string(),
    })
    .authorization((allow) => [allow.owner()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
