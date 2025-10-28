import { defineBackend } from '@aws-amplify/backend';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { createLivenessSession } from './functions/create-liveness-session/resource';
import { getLivenessSessionResults } from './functions/get-liveness-session-results/resource';
import { configureLivenessApi } from './liveness-api/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  createLivenessSession,
  getLivenessSessionResults,
});

// Liveness用のIAMポリシー設定（最小権限の原則）
const livenessStack = backend.createStack("liveness-stack");

const livenessPolicy = new Policy(livenessStack, "LivenessPolicy", {
  statements: [
    new PolicyStatement({
      actions: ["rekognition:StartFaceLivenessSession"],
      resources: ["*"],
    }),
  ],
});

// 認証済みユーザーのみにLivenessアクセスを許可
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(livenessPolicy);

// Lambda関数にRekognition権限を付与
const rekognitionPolicy = new PolicyStatement({
  actions: [
    'rekognition:CreateFaceLivenessSession',
    'rekognition:GetFaceLivenessSessionResults',
  ],
  resources: ['*'],
});

backend.createLivenessSession.resources.lambda.addToRolePolicy(rekognitionPolicy);
backend.getLivenessSessionResults.resources.lambda.addToRolePolicy(rekognitionPolicy);

// Lambda関数に環境変数を設定
// S3バケット名（自動参照） - CreateLivenessSessionのみ必要
backend.createLivenessSession.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName
);

// CORS設定（デフォルト: localhost、デプロイ後に環境変数で追加）
backend.createLivenessSession.addEnvironment(
  'ALLOWED_ORIGINS',
  'http://localhost:5173'
);

backend.getLivenessSessionResults.addEnvironment(
  'ALLOWED_ORIGINS',
  'http://localhost:5173'
);

// Liveness API設定（速度優先でany型キャスト）
configureLivenessApi(
  backend as any,
  backend.createLivenessSession.resources.lambda,
  backend.getLivenessSessionResults.resources.lambda
);
