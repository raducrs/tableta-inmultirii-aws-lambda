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
            AttributesToGet: ['Status','broadcast', 'LocId'],
            Key : {
                'DonationId' : {
                    S: donationId
                    }
            }
        }, function (err, data) {
            if (err===null){
                const donation = data.Item;
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
                 if (err === null){
                     if (donation.broadcast && donation.broadcast.BOOL){
                        
                        // location donation
                        
                            dynamo.deleteItem({
                                TableName: 'TI-LocationDonations',
                                Key: {
                                    DonationId: {
                                        S: donationId
                                    },
                                    LocId: {
                                        S: userloc.Item.Location.S
                                    }
                                }
                            }, (err,res)=> {
                                if(err){
                                    callback('ops 2')
                                } else {
                                    dynamo.putItem({
                                        TableName: 'TI-LocationDonationsRejected',
                                        Item: {
                                            LocId: {
                                                S: userloc.Item.Location.S
                                            },
                                            DonationId: {
                                                S: donationId
                                            }
                                        }
                                    }, (err,resWrite)=> {
                                        if (err){
                                            callback('ops 3')
                                        } else {
                                            callback(null,{op: 'success 2'}) 
                                        }
                                    })
                                    
                                }
                            })
                     } else {
                         if (userloc.Item.Location.S === donation.LocId.S){
                             dynamo.updateItem({
                                TableName: 'TI-TargetedDonations',
                                Key: {
                                    'DonationId' : {
                                        S: donationId
                                    }
                                },
                            UpdateExpression: 'set #S = :rejected',
                            ExpressionAttributeValues: { 
                            ':rejected' : { S: 'rejected'}
                                },
                            ExpressionAttributeNames: {
                                    "#S": "Status"
                                }
                        }, (err,res)=>{
                            if (err){
                                callback('ops')
                            } else {
                                callback(null, {op: 'success'})
                            }
                        })
                    } else {
                        callback('forbidden ')
                    }
                     }
                } else {
                    callback('forbidden 3');
                }
             })
            } else {
        callback('forbidden 2')
    }})
    } else {
        callback('forbidden 1')
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
