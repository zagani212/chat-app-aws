import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  try {
    const connectionId = event.requestContext.connectionId
    const connectedUser = await dynamo.send(
      new GetCommand({
        TableName: "Connection",
        Key: { connectionId }
      })
    );
    const {Items: roomKeys} = await dynamo.send(
      new QueryCommand({
        TableName: "UserRoom",
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: {
          ":u": connectedUser.Item.userId
        }
      })
    );
    const messages = []
    await Promise.all(
      roomKeys.map(async (room) => {
        console.log(room)
        const {Items: msg} = await dynamo.send(
          new QueryCommand({
            TableName: "Message",
            KeyConditionExpression: "roomKey = :r",
            ExpressionAttributeValues: {
              ":r": room.roomKey
            }
          })
        );
        console.log(msg)
        messages.push(...msg)
      })
    )

    const apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    });

    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({
          type: "MESSAGES_FETCHED",
          messages
        }))
      })
    );

    return { statusCode: 200 };

  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500 };
  }
};