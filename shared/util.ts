import { marshall } from "@aws-sdk/util-dynamodb";
import { Review } from "./types";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import {
    APIGatewayRequestAuthorizerEvent,
    APIGatewayAuthorizerEvent,
    PolicyDocument,
    APIGatewayProxyEvent,
  } from "aws-lambda";
  
  import axios from "axios"
  import jwt, { JwtPayload } from 'jsonwebtoken'
  import jwkToPem, { JWK } from "jwk-to-pem";
  
  export type CookieMap = { [key: string]: string } | undefined;
  export type JwtToken = { sub: string; email: string } | null;
  export type Jwk = {
    keys: {
      alg: string;
      e: string;
      kid: string;
      kty: string;
      n: string;
      use: string;
    }[];
  };
  
  export const parseCookies = (
    event: APIGatewayRequestAuthorizerEvent | APIGatewayProxyEvent
  ) => {
    if (!event.headers || !event.headers.Cookie) {
      return undefined;
    }
  
    const cookiesStr = event.headers.Cookie;
    const cookiesArr = cookiesStr.split(";");
  
    const cookieMap: CookieMap = {};
  
    for (let cookie of cookiesArr) {
      const cookieSplit = cookie.trim().split("=");
      cookieMap[cookieSplit[0]] = cookieSplit[1];
    }
  
    return cookieMap;
  };
  
  export const verifyToken = async (
    token: string,
    userPoolId: string | undefined,
    region: string
  ): Promise<JwtToken | string | JwtPayload> => {
    try {
      const url = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
      const { data }: { data: Jwk } = await axios.get(url);
      const pem = jwkToPem(data.keys[0] as JWK);
  
      return jwt.verify(token, pem, { algorithms: ["RS256"] });
    } catch (err) {
      console.log(err);
      return null;
    }
  };
  
  export const createPolicy = (
    event: APIGatewayAuthorizerEvent,
    effect: string
  ): PolicyDocument => {
    return {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: effect,
          Action: "execute-api:Invoke",
          Resource: [event.methodArn],
        },
      ],
    };
  };

type Entity = Review;
export const generateReviewItem = (entity: Entity) => {
    return {
        PutRequest: {
            Item: marshall(entity),
        },
    };
};

export const generateBatch = (data: Entity[]) => {
    return data.map((e) => {
        return generateReviewItem(e);
    });
};

export function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION });
    const marshallOptions = {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    };
    const unmarshallOptions = {
      wrapNumbers: false,
    };
    const translateConfig = { marshallOptions, unmarshallOptions };
    return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}