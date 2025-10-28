import { defineBackend } from '@aws-amplify/backend';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';
import { createLivenessSession } from './functions/create-liveness-session/resource';
import { getLivenessSessionResults } from './functions/get-liveness-session-results/resource';
import { compareFaces } from './functions/compare-faces/resource';
import { configureLivenessApi } from './liveness-api/resource';
import { configureCompareApi } from './compare-api/resource';

const backend = defineBackend({
  auth,
  data,
  storage,
  createLivenessSession,
  getLivenessSessionResults,
  compareFaces,
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

// 顔照合Lambda関数の権限設定
// Rekognition CompareFaces権限
const compareFacesRekognitionPolicy = new PolicyStatement({
  actions: ['rekognition:CompareFaces'],
  resources: ['*'],
});

backend.compareFaces.resources.lambda.addToRolePolicy(compareFacesRekognitionPolicy);

// S3読み取り権限（プロフィール画像とLiveness画像の取得）
const s3ReadPolicy = new PolicyStatement({
  actions: ['s3:GetObject'],
  resources: [
    `${backend.storage.resources.bucket.bucketArn}/profileImages/*`,
    `${backend.storage.resources.bucket.bucketArn}/livenessImages/*`,
  ],
});

backend.compareFaces.resources.lambda.addToRolePolicy(s3ReadPolicy);

// 顔照合Lambda関数に環境変数を設定
backend.compareFaces.addEnvironment(
  'STORAGE_BUCKET_NAME',
  backend.storage.resources.bucket.bucketName
);

backend.compareFaces.addEnvironment(
  'ALLOWED_ORIGINS',
  'http://localhost:5173'
);

// Compare API設定
configureCompareApi(
  backend as any,
  backend.compareFaces.resources.lambda
);
