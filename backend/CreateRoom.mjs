import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  BatchGetCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";

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

  // 2. Get participants
  const { Responses } = await dynamo.send(
    new BatchGetCommand({
      RequestItems: {
        User: {
          Keys: [
            { userId: connectedUser.Item.userId },
            { userId: body.targetUserId }
          ]
        }
      }
    })
  );

  const participants = Responses.User;

  try {
    const roomId = randomUUID()
    const roomKey = [connectedUser.Item.userId, body.targetUserId].sort().join("#")
    const room = {
      roomKey,
      roomId,
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

    const apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    });

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
        await Promise.all(
          Items.map(async (conn) => {
            try {
              await apiClient.send(
                new PostToConnectionCommand({
                  ConnectionId: conn.connectionId,
                  Data: Buffer.from(JSON.stringify({
                    type: "ROOM_CREATED",
                    room
                  }))
                })
              );
            } catch (err) {
              // handle stale connections
              if (err.statusCode === 410) {
                console.log("Stale connection:", conn.connectionId);
              } else {
                throw err;
              }
            }
          })
        );
      })
    );

  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      console.log("Room already exists");
    } else {
      throw err;
    }
  }
};