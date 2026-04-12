import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  GetCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  const { roomId } = JSON.parse(event.body);

  const connectionId = event.requestContext.connectionId
  const connectedUser = await dynamo.send(
    new GetCommand({
      TableName: "Connection",
      Key: { connectionId }
    })
  );

  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: "ChatRoom",
      IndexName: "GSI1",
      KeyConditionExpression: "roomId = :r",
      ExpressionAttributeValues: {
        ":r": roomId
      }
    })
  );
  console.log(Items)
  const room = Items[0]
  console.log(room)
  room.participants.filter((p) => p !== connectedUser.userid)
  if (room.participants.length <= 1) {
    await dynamo.send(
      new DeleteCommand({
        TableName: "ChatRoom",
        Key: { roomKey: room.roomKey },
      })
    )
  } else {
    await dynamo.send(
      new PutCommand({
        TableName: "ChatRoom",
        Item: room
      })
    )
  }

  const apiClient = new ApiGatewayManagementApiClient({
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  });

  await Promise.all(
    room.participants.map(async (user) => {
      const { Items } = await dynamo.send(
        new QueryCommand({
          TableName: "Connection",
          IndexName: "GSI1",
          KeyConditionExpression: "userId = :u",
          ExpressionAttributeValues: {
            ":u": user.userId
          }
        })
      );

      if (!Items) return;

      // 5. Send to ALL connections of user
      await Promise.all(
        Items.map(async (conn) => {
          await apiClient.send(
            new PostToConnectionCommand({
              ConnectionId: conn.connectionId,
              Data: Buffer.from(JSON.stringify({
                type: "ROOM_DELETED",
                room
              }))
            })
          );
        })
      );

    })
  );
}