import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";

export const createApiClient = (event) => {
  return new ApiGatewayManagementApiClient({
    endpoint: `https://${event.requestContext.domainName}/${event.requestContext.stage}`
  });
};

export const postToConnections = async (apiClient, connections, payload) => {
  await Promise.all(
    connections.map(conn =>
      apiClient.send(
        new PostToConnectionCommand({
          ConnectionId: conn.connectionId,
          Data: Buffer.from(JSON.stringify(payload))
        })
      )
    )
  );
};