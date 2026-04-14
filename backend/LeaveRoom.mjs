import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  PutCommand,
  GetCommand,
  BatchWriteCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

import { createApiClient, postToConnections } from "/opt/nodejs/PostToConnection.mjs";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

const deleteRommMessages = async (roomKey) => {
  const result = await dynamo.send(
    new QueryCommand({
      TableName: "Message",
      KeyConditionExpression: "roomKey = :rk",
      ExpressionAttributeValues: {
        ":rk": roomKey
      }
    })
  );
  if (!result.Items || !result.Items.length) return;
  const deleteRequests = result.Items.map(item => ({
    DeleteRequest: {
      Key: {
        roomKey: item.roomKey,
        messageId: item.messageId
      }
    }
  }));
  await dynamo.send(
    new BatchWriteCommand({
      RequestItems: {
        Message: deleteRequests
      }
    })
  );
}

const deleteRoom = async (roomKey, userId) => {
  await dynamo.send(
    new DeleteCommand({
      TableName: "ChatRoom",
      Key: { roomKey },
    })
  )
  await dynamo.send(
    new DeleteCommand({
      TableName: "UserRoom",
      Key: {
        userId,
        roomKey
      }
    })
  )
}

export const handler = async (event) => {
  const { roomId } = JSON.parse(event.body);
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
  const room = Items[0]
  let ROOM_IS_DELETED = false
  const participants = room.participants.filter((p) => p.userId !== connectedUser.userId)
  if (participants.length <= 1) {
    await deleteRoom(room.roomKey, participants[0].userId)
    await deleteRommMessages(room.roomKey)
    ROOM_IS_DELETED = true
  } else {
    await dynamo.send(
      new PutCommand({
        TableName: "ChatRoom",
        Item: room
      })
    )
  }

  await dynamo.send(
    new DeleteCommand({
      TableName: "UserRoom",
      Key: {
        userId: connectedUser.userId,
        roomKey: room.roomKey
      }
    })
  )

  const apiClient = createApiClient(event);


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

      await postToConnections(apiClient, Items, {
        type: ROOM_IS_DELETED ? "ROOM_DELETED" : "ROOM_LEFT",
        room
      });
    })
  );
}