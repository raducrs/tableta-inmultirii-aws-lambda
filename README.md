# Tableta Inmultirii AWS Lambda
Lambda AWS code and configuration for Tableta Inmultirii

The code for AWS Lambda and role definition were extracted using utilities in [raducrs/aws-lambda-save-configuration](https://github.com/raducrs/aws-lambda-save-configuration)

This AWS lambda function were published also to serve as examples in creating a serveless architecture in AWS

# Features by technology

## DynamoDB 

### getItem 
- [api\TI-AUser-ConfirmationGet](api/TI-AUser-ConfirmationGet)

### updateItem
- [api\TI-AUser-ConfirmationGet](api/TI-AUser-ConfirmationGet) - by key
- [api\TI-AUser-DonationPost](api/TI-AUser-DonationPost) - with optimistic atomic increment (val = val + 1)
- [api\TI-DUser-PostDonations](api/TI-DUser-PostDonations) - with optimistic atomic increment (val = val + 1)
- [api\TI-PUser-StatusPut](api/TI-PUser-StatusPut) - chained from query result

### putItem
- [api\TI-AUser-DonationPost](api/TI-AUser-DonationPost)
- [api\TI-DUser-PostDonations](api/TI-DUser-PostDonations)

### query
- [api\TI-DUser-GetDonations](api/TI-DUser-GetDonations) - secondary index with equality
- [api\TI-PUser-AcceptedGet](api/TI-PUser-AcceptedGet) - between attribute for sort key and equality for key secondary index
- [api\TI-PUser-AcceptedPost](api/TI-PUser-AcceptedPost) - sort key and equality for key 
- [api\TI-PUser-TargetedGet](api/TI-PUser-TargetedGet) - composed key and read in batch

### batchWriteItem
- [api\TI-PUser-AcceptedPost](api/TI-PUser-AcceptedPost) - batch DeleteRequest delete by key and sort key
- [async\TI-LocationPopulate](async/TI-LocationPopulate) - write batched data

### deleteItem
- [api\TI-PUser-DonationDelete](api/TI-PUser-DonationDelete) - by key and sort key

### batchGetItem
- [api\TI-PUser-LocationGet](api/TI-PUser-LocationGet) - from async processing of query (partial) results in batch (simulates a join)
- [api\TI-Stats-GadgetsGet](api/TI-Stats-GadgetsGet) 

### stream event
-[async\TI-SlackAlert](async/TI-SlackAlert) - INSERT
-[async\TI-SlackAlert](async/TI-SlackAlert) - MODIFY

## Lambda

### InvokeAsync
- [api\TI-AUser-ConfirmationGet](api/TI-AUser-ConfirmationGet)
- [api\TI-DUser-PostDonations](api/TI-DUser-PostDonations)

### OpenCV
- [imageprocessing\TI-ImageChalk](imageprocessing/TI-ImageChalk)

## AWS SES 

### Create Template
- [api\TI-AUser-DonationPost](api/TI-AUser-DonationPost)

### Send Email Template
- [api\TI-AUser-DonationPost](api/TI-AUser-DonationPost)


## S3

### getSignedUrlPromise
- [api\TI-UploadGetSignedUrl](api/TI-UploadGetSignedUrl)

### put_object
- [imageprocessing\TI-ImageChalk](imageprocessing/TI-ImageChalk)

### notification of upload to bucket
- [async\TI-SlackAlert](async/TI-SlackAlert)  

## Cognito

### Notification
- [async\TI-SlackAlert](async/TI-SlackAlert) - `PostAuthentication_Authentication`
- [async\TI-SlackAlert](async/TI-SlackAlert) - `PreSignUp_SignUp`
- [async\TI-SlackAlert](async/TI-SlackAlert) - `PostConfirmation_ConfirmSignUp`

## Various

### Image Processing
- [imageprocessing\TI-ImageChalk](imageprocessing/TI-ImageChalk) - resize
- [imageprocessing\TI-ImageChalk](imageprocessing/TI-ImageChalk) - apply filters
- [imageprocessing\TI-ImageChalk](imageprocessing/TI-ImageChalk) - pad to fit a given image ratio - userful for Facebook preview which requires 1:1.91 ratio

### UUID generator
- [api\TI-AUser-DonationPost](api/TI-AUser-DonationPost)

### Decode JWT
- [api\TI-DUser-GetDonations](api/TI-DUser-GetDonations)

# Roles

For the description of the policies you need to check the [Cloud Formation Repo](https://github.com/raducrs/tableta-inmultirii-aws-cloudformation) and the created resources. The `S3` and `DynamoDB` policies are created and attached via templates.

## TI-APIGatewayS3

Allows API Gateway to read S3 content

### Attached policies: 

```
AmazonAPIGatewayPushToCloudWatchLogs
TI-S3PublicAddJSON-Policy
``` 


### Assume role: 

```
apigateway.amazonaws.com
``` 


## TI-LambdaGetUploadURL

Retrieves an upload url into the bucket

### Attached policies 

```
AWSOpsWorksCloudWatchLogs
TI-UploadToPrivateFolder-Policy
``` 


### Assume role: 

```
lambda.amazonaws.com
``` 


## TI-LambdaImageChalk

Allows Lambda functions to call AWS services on your behalf.

### Attached policies: 

```
AWSOpsWorksCloudWatchLogs
TI-WriteToPublicS3
TI-GetLayerChalkBoard-Policy
TI-ReadUploadImages-Policy
``` 


### Assume role: 

```
lambda.amazonaws.com
``` 


## TI-LambdaReadDB

Allows Lambda functions to read DynamoDB tables

### Attached policies: 

```
AWSOpsWorksCloudWatchLogs
TI-DynamoDBRead-Policy
TI-InvokeLambda-Policy
``` 


### Assume role: 

```
lambda.amazonaws.com
``` 


## TI-LambdaReadWriteDB

Allows Lambda functions to write and read to/from DynamoDB

### Attached policies: 

```
AWSOpsWorksCloudWatchLogs
TI-SESCreateUpdateSend
TI-DynamoDBRead-Policy
TI-DynamoDBWrite-Policy
``` 


### Assume role: 

```
lambda.amazonaws.com
``` 


## TI-LambdaWriteDB

Allows Lambda functions to write to DynamoDB

### Attached policies: 

```
AWSOpsWorksCloudWatchLogs
TI-DynamoDBWrite-Policy
TI-InvokeLambda-Policy
``` 


### Assume role: 

```
lambda.amazonaws.com
``` 


## TI-SlackPostRole

Allow post to slack

### Attached policies 

```
TI-DynamoDB-TargetedDonationsStream-Policy
``` 


### Assume role: 

```
lambda.amazonaws.com
``` 



