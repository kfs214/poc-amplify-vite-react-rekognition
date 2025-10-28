import { RekognitionClient, CompareFacesCommand } from '@aws-sdk/client-rekognition';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import type { APIGatewayProxyHandler } from 'aws-lambda';

const rekognitionClient = new RekognitionClient({});
const s3Client = new S3Client({});

// CORS設定: 複数オリジン対応
const getAllowedOrigin = (requestOrigin?: string): string => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }
  
  return allowedOrigins[0];
};

// S3から画像をバイト配列として取得
const getImageFromS3 = async (key: string): Promise<Uint8Array> => {
  const command = new GetObjectCommand({
    Bucket: process.env.STORAGE_BUCKET_NAME,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error(`Image not found: ${key}`);
  }

  // ストリームをバイト配列に変換
  const bytes = await response.Body.transformToByteArray();
  return bytes;
};

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Compare Faces request:', event);

  const origin = event.headers.origin || event.headers.Origin;
  const allowedOrigin = getAllowedOrigin(origin);

  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  try {
    // リクエストボディの解析
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Request body is required',
        }),
      };
    }

    const { profileImageKey, livenessImageKey } = JSON.parse(event.body);

    if (!profileImageKey || !livenessImageKey) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'profileImageKey and livenessImageKey are required',
        }),
      };
    }

    console.log('Comparing images:', { profileImageKey, livenessImageKey });

    // S3から両方の画像を取得
    const [sourceImage, targetImage] = await Promise.all([
      getImageFromS3(profileImageKey),
      getImageFromS3(livenessImageKey),
    ]);

    // Rekognition CompareFaces APIを呼び出し
    const command = new CompareFacesCommand({
      SourceImage: {
        Bytes: sourceImage,
      },
      TargetImage: {
        Bytes: targetImage,
      },
      SimilarityThreshold: 0, // すべての結果を取得（閾値判定はフロントエンドで実施）
    });

    const response = await rekognitionClient.send(command);

    console.log('CompareFaces response:', response);

    // 最も類似度の高い顔を取得
    const faceMatches = response.FaceMatches || [];
    const bestMatch = faceMatches.length > 0 ? faceMatches[0] : null;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        similarity: bestMatch?.Similarity || 0,
        faceMatches: faceMatches.length,
        sourceImageHasFace: (response.SourceImageFace?.Confidence || 0) > 0,
        targetImageHasFaces: (response.UnmatchedFaces?.length || 0) + faceMatches.length,
      }),
    };
  } catch (error) {
    console.error('Error comparing faces:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Failed to compare faces',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

