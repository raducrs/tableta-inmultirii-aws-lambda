var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB();

exports.handler = function (event, context, callback) {

    let cognitoSub = event.cognitoSub;
    let cognitoUser
    if (!cognitoSub){
        cognitoUser = decodeJWT(event.jwtToken);
        cognitoSub = cognitoUser.sub
    }
    
    const donationId = event.donationId;
    
    const userid = event.pid;
    
    if (userid === cognitoSub){
        dynamo.getItem({
            TableName: 'TI-TargetedDonations',
            AttributesToGet: ['Status'],
            Key : {
                'DonationId' : {
                    S: donationId
                    }
            }
        }, function (err, data) {
            if (err===null){
                const donation = data.Item;
                if ( donation.Status.S === 'unclaimed'){
                     dynamo.getItem({
                        TableName: 'TI-PUser-Loc',
                        Key: {
                            PUser: {
                                S: userid
                            },
                        LocId: {
                            S: 'self'
                            }
                        }
             }, function (err,userloc) {
                if (err===null){
                    dynamo.updateItem({
                        TableName: 'TI-TargetedDonations',
                        Key: {
                             'DonationId' : {
                                S: donationId
                            }
                        },
                        UpdateExpression: 'set #S = :accepted, LocId = :locId, broadcast = :broadcast',
                        ExpressionAttributeValues: { 
                            ':accepted' : { S: 'accepted'},
                            ':locId': { S: userloc.Item.Location.S },
                            ':broadcast': { BOOL: true}
                        },
                         ExpressionAttributeNames: {
                            "#S": "Status"
                        }
                    }, (err,res)=>{
                        if (err) {
                            callback('already accepted 3'); 
                        } else {
                            dynamo.query({
                                    TableName: 'TI-LocationDonations',
                                    KeyConditionExpression: 'DonationId = :donationId and LocId > :locid',
                                    ExpressionAttributeValues: { ':donationId' : { S: donationId} ,':locid' : { S: '0'}}
                                }, function (err, others) {
                                    if(err === null){
                                        const keys = others.Items.map( item=> ({ 
                                            "DeleteRequest": { 
                                                "Key": { 
                                                    DonationId: {
                                                        S: item.DonationId.S
                                                    },
                                                    LocId:{
                                                        S: item.LocId.S
                                                    }
                                                }
                                            }
                                        }));
                                        
                                        dynamo.batchWriteItem({
                                            RequestItems: {
                                                'TI-LocationDonations' : keys
                                            }
                                        }, (err,delRes)=> {
                                            if(err){
                                                callback(err);
                                            }
                                        })
                                    } else {
                                        callback(err);
                                    }
                                    
                                });
                        }
                    })
                } else {
                    callback(err);
                }
            })
                } else if ( donation.Status.S === 'open'){
                    dynamo.updateItem({
                        TableName: 'TI-TargetedDonations',
                        Key: {
                             'DonationId' : {
                                S: donationId
                            }
                        },
                        UpdateExpression: 'set #S = :accepted',
                        ExpressionAttributeValues: { ':accepted' : { S: 'accepted'}},
                        ExpressionAttributeNames: {
                            "#S": "Status"
                        }
                    }, (err,res)=>{
                        if (err) {
                            callback('already accepted 2');
                        }
                    })
                } else {
                    callback('already accepted');
                }
                
            }else {
                callback(err)
            }
        });
    } else {
        callback('forbidden')
    }
};

function decodeJWT(jwt){
    if (!jwt) return {};
    const buff = Buffer.from(jwt, 'base64');  
    const text = buff.toString('utf-8');
    let firstObj = text.indexOf('}')+1; // address : { formated:
    let second = text.indexOf('}',firstObj)+1;
    second = text.indexOf('}',second)+1;
    const wHeader = text.substring(firstObj, second);
    console.log(wHeader);
    return JSON.parse(wHeader)
}
