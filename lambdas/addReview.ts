import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createDDbDocClient } from "../shared/util";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    const body = event.body ? JSON.parse(event.body) : undefined;

    if (!body) {
        return {
            statusCode: 500,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Missing request body" })
        }
    }

    const commandOutput = await ddbDocClient.send(new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: body
    }));

    return {
        statusCode: 201,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({message: "Review Added"})
    }
}