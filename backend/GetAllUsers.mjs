import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
    ApiGatewayManagementApiClient,
    PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";

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

        const apiClient = new ApiGatewayManagementApiClient({
            endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
        });

        await apiClient.send(
            new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: Buffer.from(JSON.stringify(users))
            })
        );

        return { statusCode: 200 };

    } catch (error) {
        console.error("Error:", error);
        return { statusCode: 500 };
    }
};