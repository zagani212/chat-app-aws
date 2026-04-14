import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

import { createApiClient, postToConnections } from "/opt/nodejs/PostToConnection.mjs";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  const body = JSON.parse(event.body);

  // 1. Get current user
  const { Item: connectedUser } = await dynamo.send(
    new GetCommand({
      TableName: "Connection",
      Key: { connectionId: event.requestContext.connectionId }
    })
  );

  // 2. Get Room Particiapnt
  const { Items } = await dynamo.send(
    new QueryCommand({
      TableName: "ChatRoom",
      IndexName: "GSI1",
      KeyConditionExpression: "roomId = :u",
      ExpressionAttributeValues: {
        ":u": body.roomId
      }
    })
  );
  const room = Items[0]

  const apiClient = createApiClient(event);

  await Promise.all(
    await room.participants.map(async (p) => {
      console.log(p, connectedUser)
      if (p.userId == connectedUser.userId) return
      const { Items } = await dynamo.send(
        new QueryCommand({
          TableName: "Connection",
          IndexName: "GSI1",
          KeyConditionExpression: "userId = :u",
          ExpressionAttributeValues: {
            ":u": p.userId
          }
        })
      );
      if (!Items) return;

      await postToConnections(apiClient, Items, {
        type: "USER_IS_TYPING",
        isTyping: body.isTyping
      });
    })
  )
};