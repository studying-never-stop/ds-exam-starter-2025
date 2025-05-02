import { APIGatewayProxyHandlerV2 } from "aws-lambda";

import { DynamoDBClient, QueryCommand, QueryCommandInput, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, DeleteCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["MovieCast"] || {});

const client = createDDbDocClient();
const TABLE_NAME = process.env.TABLE_NAME!;


export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("Event: ", JSON.stringify(event));

    const pathParameters = event?.pathParameters;
    //路径参数
    const movieId = pathParameters?.movieId ? parseInt(pathParameters.movieId) : undefined;

    // 获取查询参数 role
    const role = event.queryStringParameters?.role;
  

    if (!movieId) {
      return {
        statusCode: 404,
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ Message: "Missing movie Id or role" }),
      };
    }

    if(!role){
      let commandInput: QueryCommandInput = {
        TableName: process.env.TABLE_NAME,
      };
      commandInput = {
        ...commandInput,
        KeyConditionExpression: "movieId = :m",
        ExpressionAttributeValues: {
          ":m": movieId,
          },
        }
        const commandOutput = await client.send(
          new QueryCommand(commandInput)
          );
      const body: any = { data: commandOutput.Items };

    
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({role}),
    };
    } else {
      const commandOutput = await client.send(
        new GetCommand({
          TableName: process.env.TABLE_NAME,
          Key: { 
            movieId,
            role
          },
        })
      );
      console.log("GetCommand response: ", commandOutput);
      if (!commandOutput.Item) {
        return {
          statusCode: 404,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ Message: "Invalid movie Id" }),
        };
      }
      const body: any = { data: commandOutput.Item };

    
    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({role}),
    };
    }

    
    
    // const body: any = { data: commandOutput.Item };

    
    // return {
    //   statusCode: 200,
    //   headers: {
    //     "content-type": "application/json",
    //   },
    //   body: JSON.stringify({body}),
    // };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ error }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
