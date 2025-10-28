import { defineStorage } from '@aws-amplify/backend';

/**
 * 顔認証PoCのStorage（S3）定義
 * 
 * セキュリティ方針:
 * - すべての画像は非公開
 * - オーナー（アップロードした本人）のみ読み書き可能
 * - プロフィール写真もLiveness写真も同じアクセス権限
 */
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

