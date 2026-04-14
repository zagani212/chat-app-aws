import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  BatchGetCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

import { createApiClient, postToConnections } from "/opt/nodejs/PostToConnection.mjs";

import { randomUUID } from "crypto";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  const body = JSON.parse(event.body);

  // 1. Get current user
  const connectedUser = await dynamo.send(
    new GetCommand({
      TableName: "Connection",
      Key: { connectionId: event.requestContext.connectionId }
    })
  );
  const userIds = [connectedUser.Item.userId, ...body.userIds]
  // 2. Get participants
  const { Responses } = await dynamo.send(
    new BatchGetCommand({
      RequestItems: {
        User: {
          Keys: userIds.map((userId) => ({ userId }))
        }
      }
    })
  );

  const participants = Responses.User;

  try {
    const roomId = randomUUID()
    const roomKey = userIds.sort().join("#")
    const room = {
      roomKey,
      roomId,
      name: body.name,
      type: userIds.length > 2 ? 'GROUP' : 'DIRECT',
      participants,
      createdAt: new Date().toISOString(),
    };

    await dynamo.send(
      new PutCommand({
        TableName: "ChatRoom",
        Item: room,
        ConditionExpression: "attribute_not_exists(roomKey)"
      })
    );

    const apiClient = createApiClient(event);

    // 4. Notify ALL users
    await Promise.all(
      participants.map(async (user) => {
        await dynamo.send(
          new PutCommand({
            TableName: "UserRoom",
            Item: {
              userId: user.userId,
              roomKey
            },
          })
        );
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
        await postToConnections(apiClient, Items, {
          type: "ROOM_CREATED",
          room
        });
      })
    );

  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      console.log("Room already exists", err);
    } else {
      throw err;
    }
  }
};