// index.mjs
import { PutCommand, DynamoDBDocumentClient, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import { createApiClient, postToConnections } from "/opt/nodejs/PostToConnection.mjs";

import { CognitoJwtVerifier } from "aws-jwt-verify";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamo = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    console.log("1")
    try {
        const token = event.queryStringParameters?.token;
        if (!token) {
            return { statusCode: 401 };
        }
        console.log("2")
        const verifier = CognitoJwtVerifier.create({
            userPoolId: process.env.USER_POOL_ID,
            tokenUse: "access",
            clientId: process.env.CLIENT_ID,
        });

        const payload = await verifier.verify(token);
        console.log("3")
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
        console.log("4")
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
        console.log("5")
        const apiClient = createApiClient(event);
        
        await Promise.all(
            result.Items.map(async (conn) => {
                if (conn.connectionId === event.requestContext.connectionId) return;
                console.log("Send notification to users == ", conn.connectionId)
                try {
                    await postToConnections(apiClient, [conn], {
                        type: "USER_ONLINE",
                        data: { userId: payload.sub }
                    });
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