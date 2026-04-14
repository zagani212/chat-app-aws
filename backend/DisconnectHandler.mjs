// index.mjs
import { DeleteCommand, DynamoDBDocumentClient, QueryCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { createApiClient, postToConnections } from "/opt/nodejs/PostToConnection.mjs";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    const connectionId = event.requestContext?.connectionId;
    console.log("let's delete the connection id == ", connectionId)
    const { Attributes: connection } = await dynamo.send(
        new DeleteCommand({
            TableName: "Connection",
            Key: { connectionId },
            ReturnValues: "ALL_OLD"
        })
    );

    console.log(connection)

    const { Items } = await dynamo.send(
        new QueryCommand({
            TableName: "Connection",
            IndexName: "GSI1",
            KeyConditionExpression: "userId = :u",
            ExpressionAttributeValues: {
                ":u": connection.userId
            }
        })
    );

    console.log(Items)

    if (Items.length == 0) {
        await dynamo.send(
            new UpdateCommand({
                TableName: "User",
                Key: { userId: connection.userId },
                UpdateExpression: "SET #s = :s, lastSeen = :l",
                ExpressionAttributeNames: {
                    "#s": "status"
                },
                ExpressionAttributeValues: {
                    ":s": "OFFLINE",
                    ":l": new Date().toISOString()
                },
            })
        );

        const result = await dynamo.send(
            new ScanCommand({
                TableName: "Connection"
            })
        );

        console.log("all connections are : ")
        console.log(result.Items)

        const apiClient = createApiClient(event);

        await postToConnections(apiClient, Items, {
            type: "USER_OFFLINE",
            data: { userId: connection.userId }
        });

    }
};