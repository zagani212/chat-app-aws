import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { createApiClient, postToConnections } from "/opt/nodejs/PostToConnection.mjs";

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

    const rooms = []

    console.log(roomKeys)

    await Promise.all(
      roomKeys.Items.map(async (room) => {
        const { Item } = await dynamo.send(
          new GetCommand({
            TableName: "ChatRoom",
            Key: { roomKey: room.roomKey }
          })
        );
        rooms.push(Item)
      })
    )

    console.log(rooms)

    const apiClient = createApiClient(event);
    await postToConnections(apiClient, [{ connectionId }], {
      type: "ROOMS_FETCHED",
      rooms
    });
    return { statusCode: 200 };

  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500 };
  }
};