
// const {"v4": uuidv4} = require('uuid');

var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB();

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
                            TableName: 'TI-TargetedDonations',
                            IndexName: 'LocIdProj-index',
                            ProjectionExpression: 'DonationId, Donation, #S ',
                            ExpressionAttributeNames: {'#S': 'Status'},
                            KeyConditionExpression: 'LocId = :locid and #S between :statusaccepted and :statusreceived',
                            ExpressionAttributeValues: {
                                ':locid': {S: userloc.Item.Location .S }, 
                                ':statusaccepted' : { S: 'accepted'}, 
                                ':statusreceived' : { S: 'given'}
                            }
                        }, function (err, data) {
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
                            IndexName: 'LocIdProj-index',
                            ProjectionExpression:  'DonationId, Donation, #S ',
                            ExpressionAttributeNames: {'#S': 'Status'},
                            KeyConditionExpression: 'LocId = :locid and #S between :statusaccepted and :statusreceived',
                            ExpressionAttributeValues: {
                                ':locid': {S: userloc.Item.Location .S }, 
                                ':statusaccepted' : { S: 'accepted'}, 
                                ':statusreceived' : { S: 'given'}
                            }
                        }, function (err, data) {
                            handleIdQuery(err, data, callback, donations, userloc);
                        });
        } else {
            callback(null, {donations: donations});
        }
    } else {
        callback(err);
    }
}


