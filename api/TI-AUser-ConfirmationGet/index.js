var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB();
const lambda = new AWS.Lambda({region: 'eu-central-1'});

exports.handler = function (event, context, callback) {
    const donationId = event.donationId;
    const activationCode = event.activationCode;
    
      dynamo.getItem({
            TableName: 'TI-TargetedDonations',
            AttributesToGet: ['Status', 'ActivationCode', 'broadcast', 'LocId'],
            Key : {
                'DonationId' : {
                    S: donationId
                    }
            }
        }, function (err, data) {
            if(err){
                callback('forbidden 1');
            } else {
                if (data.Item && data.Item.ActivationCode.S === activationCode && data.Item.Status.S === 'unconfirmed'){
                      const isBroadcast = data.Item.broadcast && data.Item.broadcast.BOOL;
                      dynamo.updateItem({
                                    TableName: 'TI-TargetedDonations',
                                    Key: {
                                        'DonationId' : {
                                            S: donationId
                                        }
                                    },
                                    UpdateExpression: 'set #S = :newStatus',
                                    ExpressionAttributeValues: { 
                                        ':newStatus' : { S: isBroadcast ? 'unclaimed' : 'open' }
                                    },
                                     ExpressionAttributeNames: {
                                        "#S": "Status"
                                    }
                                    }, (err,data) => {
                                        if (err){
                                            callback('forbidden 3')
                                        } else {
                                            if (isBroadcast){
                                                 lambda.invokeAsync({
                                                        FunctionName: 'TI-LocationPopulate',
                                                        // InvocationType: 'Event',
                                                        InvokeArgs: JSON.stringify({ locId: data.Item.LocId.S, donationId: donationId })
                                                    }, function(err,data){
                                                        if (err){
                                                            callback("forbidden 4");
                                                        } else {
                                                            callback(null, {op: 'success 2'})
                                                        }
                                                    });
                                            } else {
                                                callback(null, {op: 'success 1'})
                                            }
                                        }
                                       
                                    });
                     
                            
                    
                } else {
                    callback('forbidden 2')
                }
            }
        })
        
};
