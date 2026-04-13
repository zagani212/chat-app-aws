// index.mjs
import { PutCommand, DynamoDBDocumentClient, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try {
        const token = event.queryStringParameters?.token;
        if (!token) {
            return { statusCode: 401 };
        }

        const verifier = CognitoJwtVerifier.create({
            userPoolId: process.env.USER_POOL_ID,
            tokenUse: "access",
            clientId: process.env.CLIENT_ID,
        });

        const payload = await verifier.verify(token);

        await dynamo.send(
            new PutCommand({
                TableName: "Connection",
                Item: {
                    connectionId: event.requestContext.connectionId,
                    connectedAt: new Date().toISOString(),
                    userId: payload.sub
                }
            })
        );
        await dynamo.send(
            new UpdateCommand({
                TableName: "User",
                Key: { userId: payload.sub },
                UpdateExpression: "SET #s = :s",
                ExpressionAttributeNames: {
                    "#s": "status"
                },
                ExpressionAttributeValues: {
                    ":s": "ONLINE",
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
                if (conn.connectionId === event.requestContext.connectionId) return;
                console.log("Send notification to users == ", conn.connectionId)
                try {
                    await apiClient.send(
                        new PostToConnectionCommand({
                            ConnectionId: conn.connectionId,
                            Data: Buffer.from(JSON.stringify({
                                type: "USER_ONLINE",
                                data: { userId: payload.sub }
                            }))
                        })
                    );
                } catch (e) {
                    console.log("The connection is terminated")
                }
            })
        )
        return {
            statusCode: 200,
            body: "Connected"
        };

    } catch (e) {
        console.log(e)
        return {
            statusCode: 500,
            body: "Not Connected"
        };
    }


};