import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

/**
 * Liveness用のREST APIを定義
 * 
 * エンドポイント:
 * - POST /liveness/create-session: Livenessセッション作成
 * - GET /liveness/session-results: Livenessセッション結果取得
 * 
 * セキュリティ:
 * - Cognito User Pools認証必須
 */
export function configureLivenessApi(
  backend: any,
  createSessionFunction: lambda.IFunction,
  getResultsFunction: lambda.IFunction
) {
  const livenessApiStack = backend.createStack('liveness-api-stack');

  // CORS設定: 環境変数から取得（デフォルト: localhost）
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

  // REST API作成
  const api = new apigateway.RestApi(livenessApiStack, 'LivenessApi', {
    restApiName: 'Liveness Service',
    description: 'API for Face Liveness session management',
    defaultCorsPreflightOptions: {
      allowOrigins: allowedOrigins,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      allowCredentials: true,
    },
  });

  // Cognito Authorizer設定
  const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
    livenessApiStack,
    'LivenessApiAuthorizer',
    {
      cognitoUserPools: [backend.auth.resources.userPool],
    }
  );

  // /liveness リソース
  const livenessResource = api.root.addResource('liveness');

  // POST /liveness/create-session
  const createSessionResource = livenessResource.addResource('create-session');
  createSessionResource.addMethod(
    'POST',
    new apigateway.LambdaIntegration(createSessionFunction),
    {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    }
  );

  // GET /liveness/session-results
  const sessionResultsResource = livenessResource.addResource('session-results');
  sessionResultsResource.addMethod(
    'GET',
    new apigateway.LambdaIntegration(getResultsFunction),
    {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    }
  );

  // API URLを出力
  backend.addOutput({
    custom: {
      LivenessApiUrl: api.url,
      LivenessApiId: api.restApiId,
    },
  });
}

