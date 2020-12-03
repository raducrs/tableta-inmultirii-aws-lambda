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
    const newStatus = event.newStatus;
    if (!(newStatus === 'contact-shown' || newStatus === 'contacted' || newStatus === 'given')){
        callback('forbidden 1');
    }
    const userid = event.pid;
    
    if (userid === cognitoSub){
        dynamo.getItem({
            TableName: 'TI-TargetedDonations',
            AttributesToGet: ['Status', 'User', 'LocId'],
            Key : {
                'DonationId' : {
                    S: donationId
                    }
            }
        }, function (err, data) {
            if (err===null){
               if (data.Item.Status.S === 'accepted' || data.Item.Status.S === 'contact-shown' || data.Item.Status.S === 'contacted' || data.Item.Status.S === 'given'){
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
                            // TODO add lastContacted , accepted, given
                            if (userloc.Item.Location.S === data.Item.LocId.S){
                                dynamo.updateItem({
                                    TableName: 'TI-TargetedDonations',
                                    Key: {
                                        'DonationId' : {
                                            S: donationId
                                        }
                                    },
                                    UpdateExpression: 'set #S = :newStatus',
                                    ExpressionAttributeValues: { 
                                        ':newStatus' : { S: newStatus}
                                    },
                                     ExpressionAttributeNames: {
                                        "#S": "Status"
                                    }
                                    }, (err,res)=>{
                                        if (err) {
                                            callback(err); 
                                        } else {
                                            callback(null,{ status: newStatus})
                                        }
                                        })
                                
                                
                            } else {
                                callback('forbidden 5')
                            }
                        } else {
                            callback('forbidden 4');
                        }
                    })
               } else {
                   callback('forbidden 2');
               }
             } else{
                 callback('can not get');
             }
        })
    } else{
          callback('forbidden 3')
    }
}

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