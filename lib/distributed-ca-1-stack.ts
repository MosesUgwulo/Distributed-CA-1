import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apig from 'aws-cdk-lib/aws-apigateway';
import { review } from '../seed/reviews';
import { generateBatch } from '../shared/util';
import * as custom from "aws-cdk-lib/custom-resources"
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as node from "aws-cdk-lib/aws-lambda-nodejs";
import { UserPool } from 'aws-cdk-lib/aws-cognito';



export class DistributedCa1Stack extends cdk.Stack {
  private auth: apig.IResource;
  private userPoolId: string;
  private userPoolClientId: string;


  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table ===================================================================================
    const reviewsTable = new dynamodb.Table(this, 'ReviewsTable', {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'movieId', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'reviewDate', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: 'ReviewsTable',
    });

    reviewsTable.addLocalSecondaryIndex({
      indexName: "reviewerName",
      sortKey: { name: "reviewerName", type: dynamodb.AttributeType.STRING },
    })
    // ==================================================================================================

    // User pool =========================================================================================

    const userPool = new UserPool(this, "UserPool", {
      signInAliases: { username: true, email: true },
      selfSignUpEnabled: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolId = userPool.userPoolId;

    const appClient = userPool.addClient("AppClient", {
      authFlows: { userPassword: true },
    });

    const userPoolClientId = appClient.userPoolClientId;
    // =================================================================================================

    // LAMBDAS ===============================================================================================

    // Get all reviews lambda
    const getAllReviewsFn = new lambdanode.NodejsFunction(this, "GetAllReviewsFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getAllReviews.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
          TABLE_NAME: reviewsTable.tableName,
          REGION: 'eu-west-1'
      }
    });

    // Add Reviews lambda
    const addReviewFn = new lambdanode.NodejsFunction(this, "AddReviewFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/addReview.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
          TABLE_NAME: reviewsTable.tableName,
          REGION: 'eu-west-1'
      }
    });

    // Get reviews by ID lambda
    const getReviewByIDFn = new lambdanode.NodejsFunction(this, "GetReviewByIDFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getReviewByID.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
          TABLE_NAME: reviewsTable.tableName,
          REGION: 'eu-west-1'
      }
    });

    // Get Reviews by reviewer name lambda
    const getReviewByReviewerNameFn = new lambdanode.NodejsFunction(this, "GetReviewByReviewerNameFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getReviewByReviewerName.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
          TABLE_NAME: reviewsTable.tableName,
          REGION: 'eu-west-1'
      }
    });

    // Get all reviews by reviewer name lambda
    const getAllReviewsByReviewerNameFn = new lambdanode.NodejsFunction(this, "GetAllReviewsByReviewerNameFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_16_X,
      entry: `${__dirname}/../lambdas/getAllReviewsByReviewerName.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
          TABLE_NAME: reviewsTable.tableName,
          REGION: 'eu-west-1'
      }
    });

    // =========================================================================================================


    // API LAMBDAS =============================================================================================
    const commonFnProps = {
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler",
      environment: {
        USER_POOL_ID: userPoolId,
        CLIENT_ID: userPoolClientId,
        REGION: cdk.Aws.REGION,
      },
    }

    const signUpFn = new lambdanode.NodejsFunction(this, "SignUpFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/signup.ts`,
    })

    const confirmSignUpFn = new lambdanode.NodejsFunction(this, "ConfirmSignUpFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/confirm-signup.ts`,
    })

    const signInFn = new lambdanode.NodejsFunction(this, "SignInFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/signin.ts`,
    })

    const signOutFn = new lambdanode.NodejsFunction(this, "SignOutFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/signout.ts`,
    })

    const authorizerFn = new lambdanode.NodejsFunction(this, "AuthorizerFn", {
      ...commonFnProps,
      entry: `${__dirname}/../lambdas/auth/authorizer.ts`,
    })

    const requestAuthorizerFn = new apig.RequestAuthorizer(
      this,
      "RequestAuthorizerFn", {
        identitySources: [apig.IdentitySource.header("cookie")],
        handler: authorizerFn,
        resultsCacheTtl: cdk.Duration.minutes(0),
      }
    );

    // =========================================================================================================

    // API GATEWAY =============================================================================================

    const authAPI = new apig.RestApi(this, "AuthAPI", {
      description: "Auth API",
      endpointTypes: [apig.EndpointType.REGIONAL],
      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
      }
    });

    this.auth = authAPI.root.addResource("auth");

    const signUpEndpoint = this.auth.addResource("signup");
    const confirmSignUpEndpoint = this.auth.addResource("confirm-signup");
    const signInEndpoint = this.auth.addResource("signin");
    const signOutEndpoint = this.auth.addResource("signout");

    // POST /auth/signup
    signUpEndpoint.addMethod("POST", new apig.LambdaIntegration(signUpFn));
    // POST /auth/confirm-signup
    confirmSignUpEndpoint.addMethod("POST", new apig.LambdaIntegration(confirmSignUpFn));
    // POST /auth/signin
    signInEndpoint.addMethod("POST", new apig.LambdaIntegration(signInFn));
    // GET /auth/signout
    signOutEndpoint.addMethod("GET", new apig.LambdaIntegration(signOutFn));

    // =========================================================================================================

    
    new custom.AwsCustomResource(this, "initReviewsDDBData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [reviewsTable.tableName]: generateBatch(review),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("initReviewsDDBData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [reviewsTable.tableArn],
    }),
  });

  // Permissions
  reviewsTable.grantReadData(getAllReviewsFn);
  reviewsTable.grantReadData(getReviewByIDFn);
  reviewsTable.grantReadData(getReviewByReviewerNameFn);
  reviewsTable.grantReadData(getAllReviewsByReviewerNameFn);

  reviewsTable.grantWriteData(addReviewFn);


  const api = new apig.RestApi(this, 'ReviewsApi', {
    description: "Reviews API",
    deployOptions: {
      stageName: "dev",
    },

    defaultCorsPreflightOptions: {
      allowHeaders: ["Content-Type", "X-Amz-Date"],
      allowMethods: ["OPTIONS", "GET", "POST", "PUT", "DELETE"],
      allowCredentials: true,
      allowOrigins: ["*"],
    }
  });


  const moviesEndpoint = api.root.addResource('movies');
  const reviewsEndpoint = moviesEndpoint.addResource('reviews');
  const reviewsByReveiwerNameEndpoint = reviewsEndpoint.addResource('{reviewerName}');
  const movieIdEndpoint = moviesEndpoint.addResource('{movieId}');
  const movieIdReviewsEndpoint = movieIdEndpoint.addResource('reviews');
  const reviewerNameEndpoint = movieIdReviewsEndpoint.addResource('{reviewerName}');

  // GET /movies/reviews
  reviewsEndpoint.addMethod('GET', new apig.LambdaIntegration(getAllReviewsFn, { proxy: true }));
  // POST /movies/reviews
  reviewsEndpoint.addMethod('POST', new apig.LambdaIntegration(addReviewFn, { proxy: true }), {
    authorizer: requestAuthorizerFn,
    authorizationType: apig.AuthorizationType.CUSTOM,
  });
  // GET /movies/reviews/{reviewerName}
  reviewsByReveiwerNameEndpoint.addMethod('GET', new apig.LambdaIntegration(getAllReviewsByReviewerNameFn, { proxy: true }));
  // GET /movies/{movieId}/reviews
  movieIdReviewsEndpoint.addMethod('GET', new apig.LambdaIntegration(getReviewByIDFn, { proxy: true }));
  // GET /movies/{movieId}/reviews/{reviewerName}
  reviewerNameEndpoint.addMethod('GET', new apig.LambdaIntegration(getReviewByReviewerNameFn, { proxy: true }));


}


}
