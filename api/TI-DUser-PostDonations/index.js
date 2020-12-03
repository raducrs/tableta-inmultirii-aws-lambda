
// const {"v4": uuidv4} = require('uuid');

var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB();
const lambda = new AWS.Lambda({region: 'eu-central-1'});

exports.handler = function (event, context, callback) {
    // TODO implement
    const userid = event.uid;
    
    let cognitoSub = event.cognitoSub;
    let cognitoEmail = event.cognitoEmail;
    let cognitoUser
    if (!cognitoSub || cognitoEmail){
        cognitoUser = decodeJWT(event.jwtToken);
        cognitoEmail = cognitoUser.email;
        cognitoSub = cognitoUser.sub
    }
    if (userid === cognitoSub){

        const newUUID = context.awsRequestId;
        
        let donation = event.donation;
        let user = {...donation.user};
        donation.user = null;
    
       dynamo.putItem({
            TableName: 'TI-TargetedDonations',
            Item: {
                DonationId: {S: newUUID},
                UserId: { S: cognitoEmail },
                LocId: { S: event.donation.loc.locationId },
                Status: { S: event.donation.loc.category ? 'open' : 'unclaimed' },
                Timestamp: { N: "" + new Date().getTime() },
                Donation: { S: JSON.stringify(donation)},
                User: { S: JSON.stringify(user) }
            }
        }, function(err, data) {
            if(err !== null) {
                console.error(err);
                callback(err);
            } else {
                // callback(null, { loc:event.donation.loc.category, isTrue:(event.donation.loc.category != 1)});
                if (event.donation.loc.category != 1){
                    lambda.invokeAsync({
                        FunctionName: 'TI-LocationPopulate',
                        // InvocationType: 'Event',
                        InvokeArgs: JSON.stringify({ locId: event.donation.loc.locationId, donationId: newUUID })
                    }, function(err,data){
                        if (err){
                            callback("invalid");
                        }
                    });
                }
                let statKey;
                if (donation.gadget.gadgetType === 'laptop'){
                    statKey = 'laptopNumbers'
                }
                if (donation.gadget.gadgetType === 'tablet'){
                    statKey = 'tabletNumbers'
                }
                if (donation.gadget.gadgetType === 'phone'){
                    statKey = 'phoneNumbers'
                }
                dynamo.updateItem({
                    TableName: 'TI-Stats',
                    Key: {
                        Statistic: {
                            S: statKey
                            }
                        },
                    UpdateExpression: "set #C = #C + :val",
                    ExpressionAttributeNames: { 
                        "#C" : "Count" 
                    },
                    ExpressionAttributeValues:{
                        ":val": {
                            N: "1" 
                        }
                    }
                }, (err,data)=> {
                    if (err){
                        callback('oops')
                    }else {
                        callback(null,{op:'s'})
                    }
                })
            }
        });
    } else {
        callback("forbidden");
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


