var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB();


exports.handler = function (event, context, callback) {
    
     const request = [];
     request.push({
                Statistic:{ S: 'laptopNumbers'},
                }
            );
     request.push({
                Statistic:{ S: 'tabletNumbers'},
                }
            );
     request.push({
                Statistic:{ S: 'phoneNumbers'},
                }
            );
            
    const response = {
        l: 0,
        t: 0,
        p: 0
    }
    dynamo.batchGetItem({
                    'RequestItems': {
                        'TI-Stats' :{
                            AttributesToGet : ['Statistic', 'Count'],
                            Keys: request
                        }
                    }
                }, function (err,result){
                    if (err === null){
                        result.Responses['TI-Stats'].forEach( (itemR)=>{
                            response[itemR['Statistic'].S.substring(0,1)] = itemR['Count'].N
                        })
                        callback(null,response)
                    }else{
                        callback(null,result);
                    }
                })
};
