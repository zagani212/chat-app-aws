import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
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
  try {

    const { roomId, content } = JSON.parse(event.body);
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
      senderId: connectedUser.userId,
      roomKey: roomInfo.roomKey,
      messageId: randomUUID(),
      content,
      timestamp: new Date().toISOString()
    }
    await dynamo.send(
      new PutCommand({
        TableName: "Message",
        Item: message
      })
    );

    
    const participants = roomInfo.participants;
    const apiClient = new ApiGatewayManagementApiClient({
      endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    });
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
        await Promise.all(
          Items.map(async (conn) => {
            console.log("let's send back the message to the users")
            console.log(conn.connectionId)
            await apiClient.send(
              new PostToConnectionCommand({
                ConnectionId: conn.connectionId,
                Data: Buffer.from(JSON.stringify({
                  type: "NEW_MESSAGE",
                  message
                }))
              })
            );
          })
        )

      })
    )

  } catch (err) {
    console.log(err)
  }
};