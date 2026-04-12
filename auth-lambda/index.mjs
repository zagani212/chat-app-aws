// index.mjs
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { CognitoJwtVerifier } from "aws-jwt-verify";

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const db = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try{
        const token = event.queryStringParameters?.token;
        if (!token) {
            return { statusCode: 401 };
        }

        const verifier = CognitoJwtVerifier.create({
            userPoolId: "eu-west-3_6bjayLJGh",
            tokenUse: "access",
            clientId: "580nkbgtp5llse8ce9g33b94l2",
        });

        const payload = await verifier.verify(token);

        const command = new PutCommand({
            TableName: "Connection",
            Item: {
                connectionId: event.requestContext.connectionId,
                connectedAt: new Date().toISOString(),
                userId: payload.sub
            }
        });

        await db.send(command);
        return {
            statusCode: 200,
            body: "Connected"
        };
    }catch(e){
        console.log(e)
        return {
            statusCode: 500,
            body: "Not Connected"
        };
    }

    
};