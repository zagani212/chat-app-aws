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
  console.log(roomId)
  const connectionId = event.requestContext.connectionId
  const { Item: connectedUser } = await dynamo.send(
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
  console.log(connectedUser.userId)
  const participants = room.participants.filter((p) => p.userId !== connectedUser.userId)
  console.log(participants)
  if (participants.length <= 1) {
    console.log("Let s delete the chat room")
    await dynamo.send(
      new DeleteCommand({
        TableName: "ChatRoom",
        Key: { roomKey: room.roomKey },
      })
    )
    await dynamo.send(
      new DeleteCommand({
        TableName: "UserRoom",
        Key: {
          userId: participants[0].userId,
          roomKey: room.roomKey
        }
      })
    )
  } else {
    console.log("Let s edit the chat room")
    await dynamo.send(
      new PutCommand({
        TableName: "ChatRoom",
        Item: room
      })
    )
  }

  console.log('Here')
  console.log(connectedUser)
  console.log({
    PK: { S: connectedUser.userId },
    SK: { S: room.roomKey }
  })
  await dynamo.send(
    new DeleteCommand({
      TableName: "UserRoom",
      Key: {
        userId: connectedUser.userId,
        roomKey: room.roomKey
      }
    })
  )

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
                type: "ROOM_LEFT",
                room
              }))
            })
          );
        })
      );

    })
  );
}