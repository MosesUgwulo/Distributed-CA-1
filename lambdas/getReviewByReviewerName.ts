import { ScanCommand, ScanCommandInput, QueryCommandInput, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { createDDbDocClient } from "../shared/util";

const ddbClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
    const parameters = event?.pathParameters;
    const reviewerName = parameters?.reviewerName;  
    const movieID = parameters?.movieId ? parseInt(parameters.movieId) : undefined;
    const regex = new RegExp("20[0-9][0-9]")
    

    if(!reviewerName) {
        return {
            statusCode: 404,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Missing reviewer name" })
        }
    }

    if(!movieID) {
        return {
            statusCode: 404,
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({ message: "Missing movie ID" })
        }
    }

    let commandInput: QueryCommandInput = {
        TableName: process.env.TABLE_NAME,
    };

    if(regex.test(reviewerName)) {
        commandInput = {
            ...commandInput,
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: "movieId = :m AND begins_with(reviewDate, :y)",
            ExpressionAttributeValues: {
                ":m": movieID,
                ":y": reviewerName,
            }
        }
    } else {
        commandInput = {
            TableName: process.env.TABLE_NAME,
            KeyConditionExpression: "movieId = :m",
            FilterExpression: "reviewerName = :r",
            ExpressionAttributeValues: {
                ":m": movieID,
                ":r": reviewerName,
            },
        }
    }

    const commandOutput = await ddbClient.send(new QueryCommand(commandInput));

    return {
        statusCode: 200,
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ data: commandOutput.Items })
    }
}