// index.mjs
import { DeleteCommand, DynamoDBDocumentClient, QueryCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    const connectionId = event.requestContext?.connectionId;

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
        const apiClient = new ApiGatewayManagementApiClient({
            endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
        });
        await Promise.all(
            result.Items.map(async (conn) => {
                console.log("Send notification to users")
                await apiClient.send(
                    new PostToConnectionCommand({
                        ConnectionId: conn.connectionId,
                        Data: Buffer.from(JSON.stringify({
                            type: "USER_OFFLINE",
                            data: { userId: connection.userId }
                        }))
                    })
                );
            })
        )


    }
};