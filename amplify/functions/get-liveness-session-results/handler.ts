import { RekognitionClient, GetFaceLivenessSessionResultsCommand } from '@aws-sdk/client-rekognition';
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
  console.log('Get Liveness Session Results request:', event);

  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigin = getAllowedOrigin(origin);

  try {
    const sessionId = event.queryStringParameters?.sessionId;

    if (!sessionId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          error: 'sessionId is required',
        }),
      };
    }

    const command = new GetFaceLivenessSessionResultsCommand({
      SessionId: sessionId,
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
        status: response.Status,
        confidence: response.Confidence,
        referenceImage: response.ReferenceImage,
        auditImages: response.AuditImages,
      }),
    };
  } catch (error) {
    console.error('Error getting liveness session results:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        error: 'Failed to get liveness session results',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

