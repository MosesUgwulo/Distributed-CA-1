# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## ServerlessREST Assignment - Distributed Systems.

__Name:__ Moses Ugwulo

This repository contains the implementation of a serverless REST API for the AWS platform. A CDK stack creates the infrastructure. The domain context of the API is movie reviews.

### API endpoints.

+ __GET /movies/reviews__ - add a movie review.
+ __POST /movies/reviews__ - add a movie review.
+ __GET /movies/reviews/{reviewerName}__ - Get all the reviews written by a specific reviewer.
+ __GET /movies/{movieId}/reviews__ - Get all the reviews for a movie with the specified id.
+ __GET /movies/{movieId}/reviews?minRating=n__ - Get all the reviews for the movie with the specified ID with a rating greater than the minRating.
+ __GET /movies/{movieId}/reviews/{reviewerName}__ - Get the review for the movie with the specified movie ID and written by the named reviewer.
+ __GET /movies/{movieId}/reviews/{year}__ - Get the review(s) for the movie with the specified movie ID and were written in a specified year.

### Auth API endpoints

+ __POST /auth/signup__ - Sign up a new user.
+ __POST /auth/confirm-signup__ - Confirm a new user.
+ __POST /auth/signin__ - Sign in a user.
+ __GET /auth/signout__ - Sign out a user.

### API Gateways

#### Reviews API Gateway
![Reviews API Gateway](https://i.imgur.com/ZEyr1ng.png)

#### Auth API Gateway
![Auth API Gateway](https://i.imgur.com/jS9H851.png)

#### User pool
![User pool](https://i.imgur.com/r1OmHRp.png)

#### DynamoDB Reviews Table
![DynamoDB Reviews Table](https://i.imgur.com/zh3q7FS.png)

### Link to demo
[Link to demo](https://youtu.be/7dJUqJ0p4NI)