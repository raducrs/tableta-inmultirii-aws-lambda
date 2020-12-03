
// const {"v4": uuidv4} = require('uuid');

var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB();

exports.handler = function (event, context, callback) {
    let cognitoSub = event.cognitoSub;
    let cognitoEmail = event.cognitoEmail;
    let cognitoUser
    if (!cognitoSub || cognitoEmail){
        cognitoUser = decodeJWT(event.jwtToken);
        cognitoEmail = cognitoUser.email;
        cognitoSub = cognitoUser.sub
    }
    
    const userid = event.uid;
    
    if (userid === cognitoSub){
        dynamo.query({
            TableName: 'TI-TargetedDonations',
            IndexName: 'UserIdProj-index',
            ProjectionExpression: 'DonationId, Donation, #MyStatus',
            ExpressionAttributeNames: {'#MyStatus': 'Status'},
            KeyConditionExpression: 'UserId = :userid',
            ExpressionAttributeValues: {':userid': {S: cognitoEmail }}
        }, function (err, data) {
            handleIdQuery(err, data, callback, [], cognitoEmail);
        });
    } else {
        callback('forbidden')
    }
};

function decodeJWT(jwt){
    if (!jwt) return {};
    const buff = Buffer.from(jwt, 'base64');  
    const text = buff.toString('utf-8');
    const firstObj = text.indexOf('}')+1;
    const wHeader = text.substring(firstObj, text.indexOf('}',firstObj)+1);
    console.log(wHeader);
    return JSON.parse(wHeader)
}

function handleIdQuery(err, data, callback, donations, userid) {
    if (err === null) {
        data.Items.forEach(function (item) {
            console.log(item,item.Donation);
            const donation = JSON.parse(item['Donation'].S);
            donations.push({
                id: item.DonationId.S,
                status: item.Status.S,
                gadget: donation.gadget,
                loc: donation.loc
            }
                );
        });

        if (data.LastEvaluatedKey) {
            dynamo.query({
            TableName: 'TI-TargetedDonations',
            IndexName: 'UserIdProj-index',
            ProjectionExpression: 'DonationId, Donation, #MyStatus',
            ExpressionAttributeNames: {'#MyStatus': 'Status'},
            KeyConditionExpression: 'UserId = :userid',
            ExpressionAttributeValues: {':userid': {S: userid }},
                ExclusiveStartKey: data.LastEvaluatedKey
            }, function (err, data) {
                handleIdQuery(err, data, callback, donations, userid);
            });
        } else {
            callback(null, {donations: donations});
        }
    } else {
        callback(err);
    }
}

