import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

import { createApiClient, postToConnections } from "/opt/nodejs/PostToConnection.mjs";

import { randomUUID } from "crypto";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
  try {

    const { roomId, content } = JSON.parse(event.body);
    const connectionId = event.requestContext.connectionId
    const { Item } = await dynamo.send(
      new GetCommand({
        TableName: "Connection",
        Key: { connectionId }
      })
    );
    const { Item: connectedUser } = await dynamo.send(
      new GetCommand({
        TableName: "User",
        Key: { userId: Item.userId }
      })
    );
    console.log(connectedUser)
    const { Items } = await dynamo.send(
      new QueryCommand({
        TableName: "ChatRoom",
        IndexName: "GSI1",
        KeyConditionExpression: "roomId = :u",
        ExpressionAttributeValues: {
          ":u": roomId
        }
      })
    );
    const roomInfo = Items[0]
    console.log(roomInfo)

    const message = {
      roomId,
      sender: connectedUser,
      roomKey: roomInfo.roomKey,
      messageId: randomUUID(),
      content,
      timestamp: new Date().toISOString()
    }
    console.log(message)
    await dynamo.send(
      new PutCommand({
        TableName: "Message",
        Item: message
      })
    );


    const participants = roomInfo.participants;
    const apiClient = createApiClient(event);
    await Promise.all(
      participants.map(async (p) => {
        console.log("participant: ", p)
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
        console.log(Items)
        await postToConnections(apiClient, Items, {
          type: "NEW_MESSAGE",
          message
        });

      })
    )

  } catch (err) {
    console.log(err)
  }
};