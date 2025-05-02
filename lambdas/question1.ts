import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const client = createDDbDocClient();
const TABLE_NAME = process.env.TABLE_NAME!;
const REGION = process.env.REGION!;

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event));

    const movieIdStr = event?.pathParameters?.movieId;
    const movieId = movieIdStr ? parseInt(movieIdStr) : undefined;
    const role = event.queryStringParameters?.role;

    if (!movieId || isNaN(movieId)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing or invalid movieId" }),
      };
    }

    // Case 1: Get specific role for the movie
    if (role) {
      const getOutput = await client.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            movieId,
            role,
          },
        })
      );

      if (!getOutput.Item) {
        return {
          statusCode: 404,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ message: `Role '${role}' not found for movieId ${movieId}` }),
        };
      }

      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ data: getOutput.Item }),
      };
    }

    // Case 2: Get all roles for the movie
    const queryOutput = await client.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "movieId = :m",
        ExpressionAttributeValues: {
          ":m": movieId,
        },
      })
    );

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: queryOutput.Items }),
    };
  } catch (error: any) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message || error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: {
      wrapNumbers: false,
    },
  });
}
