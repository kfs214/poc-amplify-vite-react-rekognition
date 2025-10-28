import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';

/**
 * 顔照合API
 * 
 * エンドポイント:
 * - POST /compare: プロフィール写真とLiveness写真を照合
 * 
 * セキュリティ:
 * - Cognito User Pools認証必須
 */
export function configureCompareApi(
  backend: any,
  compareFacesFunction: lambda.IFunction
) {
  const compareApiStack = backend.createStack('compare-api-stack');

  // CORS設定: 環境変数から取得（デフォルト: localhost）
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

  // REST API作成
  const api = new apigateway.RestApi(compareApiStack, 'CompareApi', {
    restApiName: 'Face Compare Service',
    description: 'API for face comparison using Rekognition',
    defaultCorsPreflightOptions: {
      allowOrigins: allowedOrigins,
      allowMethods: ['POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      allowCredentials: true,
    },
  });

  // Cognito Authorizer設定
  const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
    compareApiStack,
    'CompareApiAuthorizer',
    {
      cognitoUserPools: [backend.auth.resources.userPool],
    }
  );

  // POST /compare
  const compareResource = api.root.addResource('compare');
  compareResource.addMethod(
    'POST',
    new apigateway.LambdaIntegration(compareFacesFunction),
    {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    }
  );

  // API URLを出力
  backend.addOutput({
    custom: {
      CompareApiUrl: api.url,
      CompareApiId: api.restApiId,
    },
  });
}

