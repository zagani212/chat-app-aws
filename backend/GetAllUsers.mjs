import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

import { createApiClient, postToConnections } from "/opt/nodejs/PostToConnection.mjs";

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION });

export const handler = async (event) => {
    try {
        const result = await dynamo.send(
            new ScanCommand({
                TableName: "User"
            })
        );

        const users = result.Items || [];

        const connectionId = event.requestContext.connectionId;

        const apiClient = createApiClient(event);

        await postToConnections(apiClient, [{connectionId}],users);

        return { statusCode: 200 };

    } catch (error) {
        console.error("Error:", error);
        return { statusCode: 500 };
    }
};