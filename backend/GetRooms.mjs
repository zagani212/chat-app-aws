import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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

    console.log(connectedUser)

    const roomKeys = await dynamo.send(
      new QueryCommand({
        TableName: "UserRoom",
        KeyConditionExpression: "userId = :u",
        ExpressionAttributeValues: {
          ":u": connectedUser.Item.userId
        }
      })
    );

    console.log(roomKeys)

    const rooms = []

    await Promise.all(
      roomKeys.items.map(async (room) => {
        const {Item} = await dynamo.send(
          new GetCommand({
            TableName: "ChatRoom",
            Key: { roomKey: room.roomKey }
          })
        );
        rooms.push(Item)
      })
    )

    console.log(rooms)

    const apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    });

    await apiClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({
          type: "ROOMS_FETCHED",
          rooms
        }))
      })
    );

    return { statusCode: 200 };

  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500 };
  }
};