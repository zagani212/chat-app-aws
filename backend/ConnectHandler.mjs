// index.mjs
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const db = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    const connectionId = event.requestContext?.connectionId;

    const command = new PutCommand({
        TableName: "Connection",
        Item: {
            connectionId: connectionId,
            connectedAt: new Date().toISOString(),
            userId: "user123"
        }
    });

    await db.send(command);

    return {
        statusCode: 200,
        body: "Connected"
    };
};