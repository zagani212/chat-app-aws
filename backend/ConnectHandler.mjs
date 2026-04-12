// index.mjs
import { PutCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const JWTclient = jwksClient({
    jwksUri: "https://cognito-idp.eu-west-3.amazonaws.com/eu-west-3_6bjayLJGh/.well-known/jwks.json"
});

function getKey(header, callback) {
    JWTclient.getSigningKey(header.kid, (err, key) => {
        callback(null, key.getPublicKey());
    });
}

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const db = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try{
        const token = event.queryStringParameters?.token;

        if (!token) {
            return { statusCode: 401 };
        }
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, getKey, {
                issuer: "https://cognito-idp.eu-west-3.amazonaws.com/eu-west-3_6bjayLJGh"
            }, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });
        const userId = decoded.sub;
        const connectionId = event.requestContext.connectionId;

        console.log("User connected:", userId);
        console.log("ConnectionId:", connectionId);

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
    }catch(e){
        console.log(e)
        return {
            statusCode: 500,
            body: "Not Connected"
        };
    }

    
};