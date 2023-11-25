import { QueryCommandInput, QueryCommand, ScanCommandInput, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createDDbDocClient } from "../shared/util";

const ddbClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    const parameters = event.pathParameters;
    const reviewerName = parameters?.reviewerName;

    try {
        if(!reviewerName) {
            return {
                statusCode: 404,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: "Missing reviewer name" })
            }
        }

        const commandInput: ScanCommandInput = {
            TableName: process.env.TABLE_NAME,
            FilterExpression: "reviewerName = :r",
            ExpressionAttributeValues: {
                ":r": reviewerName
            }
        }

        const commandOutput = await ddbClient.send(new ScanCommand(commandInput));

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ parameters: reviewerName, data: commandOutput.Items })
        }
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: error.message })
        }
    }
}