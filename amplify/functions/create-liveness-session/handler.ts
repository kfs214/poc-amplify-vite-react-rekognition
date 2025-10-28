import { RekognitionClient, CreateFaceLivenessSessionCommand } from '@aws-sdk/client-rekognition';
import type { APIGatewayProxyHandler } from 'aws-lambda';

const rekognitionClient = new RekognitionClient({});

// CORS設定: 複数オリジン対応
const getAllowedOrigin = (requestOrigin?: string): string => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  return allowedOrigins[0];
};

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Create Liveness Session request:', event);

  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigin = getAllowedOrigin(origin);

  try {
    // S3バケット設定（ReferenceImage保存用、AuditImagesはデフォルト0）
    const command = new CreateFaceLivenessSessionCommand({
      Settings: {
        OutputConfig: {
          S3Bucket: process.env.STORAGE_BUCKET_NAME,
          S3KeyPrefix: 'livenessImages/',
        },
      },
    });
    
    const response = await rekognitionClient.send(command);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        sessionId: response.SessionId,
      }),
    };
  } catch (error) {
    console.error('Error creating liveness session:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        error: 'Failed to create liveness session',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

