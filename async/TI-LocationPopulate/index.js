var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB();

exports.handler = (event, context, callback) => {
    const locId = event.locId;
    const donationId = event.donationId;
    
    dynamo.query({
        TableName: 'TI-PUser-Loc',
        IndexName: 'LocId-index',
        ProjectionExpression: '#L',
        ExpressionAttributeNames: {'#L': 'Location'},
        KeyConditionExpression: 'LocId = :locid',
        ExpressionAttributeValues: {
            ':locid': {S: locId }
        }
    }, function (err, data) {
        handleIdQuery(err, data, callback, [], locId, donationId);
    });
    
};

function handleIdQuery(err, data, callback, locations, locId, donationId){
    if (err === null) {
        data.Items.forEach(function (item) {
            locations.push(  {
            PutRequest: {
                Item: {
                    LocId: {
                        S: item.Location.S
                    },
                    DonationId: {
                        S: donationId
                    }
                }
            }
        });
        });

        if (data.LastEvaluatedKey) {
             dynamo.query({
                TableName: 'TI-PUser-Loc',
                IndexName: 'LocId-index',
                ProjectionExpression: '#L',
                ExpressionAttributeNames: {'#L': 'Location'},
                KeyConditionExpression: 'LocId = :locid',
                ExpressionAttributeValues: {
                    ':locid': {S: locId }
                }
            }, function (err, data) {
                handleIdQuery(err, data,callback, locations, locId, donationId);
            });
        } else {
            writeToTable(locations, callback);
        }
    } else {
        callback(err);
        console.error(err);
    }
}

function writeToTable(locations, callback){
  dynamo.batchWriteItem({
        RequestItems: {
            'TI-LocationDonations': locations
        }
    }, function (err, data) {
        if(err === null) {
            console.log('all written')
            callback(null,locations);
        } else {
            callback(err);
            console.log(err);
        }
    });
}