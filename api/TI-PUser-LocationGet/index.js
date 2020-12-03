
// const {"v4": uuidv4} = require('uuid');

var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB();

let totalToRecover = 0;

exports.handler = function (event, context, callback) {
    let cognitoSub = event.cognitoSub;
    let cognitoUser
    if (!cognitoSub){
        cognitoUser = decodeJWT(event.jwtToken);
        cognitoSub = cognitoUser.sub
    }
    
    const userid = event.pid;
    
    if (userid === cognitoSub){
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
                    dynamo.query({
                            TableName: 'TI-LocationDonations',
                            KeyConditionExpression: 'LocId = :locid and DonationId > :donationId',
                            ExpressionAttributeValues: { ':locid' : { S: userloc.Item.Location.S} ,':donationId' : { S: '0'}}
                        }, function (err, data) {
                            totalToRecover += data.Items.length;
                            handleIdQuery(err, data, callback, [], userloc);
                        });
                    
                } else {
                    console.log(err);
                    callback('inactive')
                }
            })
            } else {
                callback('forbidden');
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

function handleIdQuery(err, data, callback, donations, userloc) {
    if (data.LastEvaluatedKey){
        totalToRecover += 100;
    }
    if (err === null) {
        let request = []
        data.Items.forEach(function (item, index) {
            request.push({
                DonationId:{ S: item.DonationId.S},
                }
            );
            if ( (index+1) % 10 === 0){
                dynamo.batchGetItem({
                    'RequestItems': {
                        'TI-TargetedDonations' :{
                            AttributesToGet : ['DonationId', 'Donation'],
                            Keys: request
                        }
                    }
                }, function (err,result){
                    if (err === null){
                        result.Responses['TI-TargetedDonations'].forEach( (itemR)=>{
                            const donation = JSON.parse(itemR['Donation'].S);
                            donations.push({
                                id: itemR.DonationId.S,
                                status: 'unclaimed',
                                gadget: donation.gadget,
                                loc: donation.loc
                            });
                        })
                        //totalToRecover -= result.Responses['TI-TargetedDonations'].length;
                        totalToRecover -= (10 - result.Responses['TI-TargetedDonations'].length)
                        ready(donations,callback);
                    }else{
                        callback(err);
                    }
                })
                request = [];
            }
        });
        
        if (request.length > 0){
            
             dynamo.batchGetItem({
                    'RequestItems': {
                        'TI-TargetedDonations' :{
                            AttributesToGet : ['DonationId', 'Donation'],
                            Keys: request
                        }
                    }
                }, function (err, result){
                    if (err === null){
                        result.Responses['TI-TargetedDonations'].forEach( (itemR)=>{
                            const donation = JSON.parse(itemR['Donation'].S);
                            donations.push({
                                id: itemR.DonationId.S,
                                status: 'unclaimed',
                                gadget: donation.gadget,
                                loc: donation.loc
                            });
                        })
                            totalToRecover -= ( request.length - result.Responses['TI-TargetedDonations'].length)
                           // callback(null,result)
                        
                        //totalToRecover -= result.Responses['TI-TargetedDonations'].length
                       
                         ready(donations,callback);
                    }else{
                        callback(err);
                    }
            });
        } else {
              if (!data.LastEvaluatedKey){
                            ready(donations,callback);
                 }
        }

        if (data.LastEvaluatedKey) {
             dynamo.getItem({
                            TableName: 'TI-LocationDonations',
                            Key: {
                                LocId: {
                                    S: userloc.Item.Location.S
                                }
                            },
                            ExclusiveStartKey: data.LastEvaluatedKey,
                        }, function (err, data) {
                            totalToRecover -= 100;
                            totalToRecover += data.Items.length;
                            handleIdQuery(err, data, callback, donations, userloc);
                        });
        } else {
            ready(donations,callback);
        }
    } else {
        callback(err);
    }
}

function ready(donations,callback){
    ///console.log(donations, totalToRecover)
    if (donations.length  === totalToRecover){
        callback(null,{donations: donations})
    }
}


