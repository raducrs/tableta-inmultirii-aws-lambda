 var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB();
const ses = new AWS.SES()



exports.handler = function (event, context, callback) {
    
        //createSESTemplate()
 
        const newUUID = context.awsRequestId;
        
        let donation = event.donation;
        let user = {...donation.user};
        donation.user = null;
        
        const activationCode = makeCode(20);
        
        const params =getEmailTemplate(donation,user,newUUID, activationCode);
        
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
                    console.log(err);
                })
        
        ses.sendTemplatedEmail(params).promise().then(
             function(data) {
                    if ( event.donation.loc.category){
                      dynamo.putItem({
                            TableName: 'TI-TargetedDonations',
                            Item: {
                                DonationId: {S: newUUID},
                                UserId: { S: user.email },
                                LocId: { S: event.donation.loc.locationId },
                                Status: { S: 'unconfirmed' },
                                Timestamp: { N: "" + new Date().getTime() },
                                Donation: { S: JSON.stringify(donation)},
                                User: { S: JSON.stringify(user) },
                                ActivationCode: { S: activationCode }
                            }
                        }, function(err, data) {
                            if(err !== null) {
                                callback('oops1');
                            } else {
                                callback(null,{op: 'success'});
                            }
                        })
                  } else {
                        dynamo.putItem({
                            TableName: 'TI-TargetedDonations',
                            Item: {
                                DonationId: {S: newUUID},
                                UserId: { S: user.email },
                                LocId: { S: event.donation.loc.locationId },
                                Status: { S: 'unconfirmed' },
                                Timestamp: { N: "" + new Date().getTime() },
                                Donation: { S: JSON.stringify(donation)},
                                User: { S: JSON.stringify(user) },
                                ActivationCode: { S: activationCode },
                                broadcast: { BOOL: true}
                            }
                        }, function(err, data) {
                            if(err !== null) {
                                callback('oops2');
                            } else {
                                callback(null,{op: 'success 2'});
                            }
                        })
                  }
            }).catch(
                function(err) {
                console.error(err, err.stack);
                callback(' oops email error')
              }
            )
    
 
       
       
}

function getEmailTemplate(donation,user,donationId, activationCode){
    const link = `https://tableta-inmultirii.ro/confirmation/${donationId}/c/${activationCode}`;
    const location = `${donation.loc.name}, ${donation.loc.address}`;
    switch (donation.gadget.gadgetType) {
        case 'laptop':
            return getEmailParams(donation.gadget.laptop.make, donation.gadget.laptop.year, 'un laptop', location, link, user )
         case 'tablet':
            return getEmailParams(donation.gadget.tablet.make, donation.gadget.tablet.year, 'o tableta', location, link, user )
        case 'phone':
            return getEmailParams(donation.gadget.phone.make, donation.gadget.phone.year, 'un telefon', location, link, user )
    }
}

function getEmailParams(make, year, gadgetType, location, link, user){
    return {
  Destination: { /* required */
    ToAddresses: [
      user.email
    ]
  },
  Source: 'confirmare-donatie@tableta-inmultirii.ro', 
  Template: 'ConfirmationEmail', /* required */
  TemplateData: `{ \"make\":\"${make}\" , \"year\":\"${year}\",  \"gadgetType\":\"${gadgetType}\", \"location\":\"${location}\", \"link\":\"${link}\"}`,
  ReplyToAddresses: [
    'no-reply@tableta-inmultirii.ro'
  ],
};

}

function makeCode(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
        
        
function createSESTemplate(event, context, callback) {
    
    const params = {
          "Template": {
            "TemplateName": "ConfirmationEmail",
            "SubjectPart": "Confirmati donatia {{make}} {{year}}?",
            "HtmlPart": "<h1>Buna ziua,</h1><p>Ai ales sa donezi {{gadgetType}} {{make}} {{year}} catre {{location}}. Inainte de a trimite catre parteneri avem nevoie de confirmarea ta.</p><p> Pentru a confirma acceseaza linkul urmator <a href=\"{{link}}\">{{link}}/</a></p><p>Va multumim,</p><p>Echipa Tableta Inmultirii</p>",
            "TextPart": "Buna ziua,\r\nAi ales sa donezi {{gadgetType}} {{make}} {{year}} catre {{location}}. Inainte de a trimite catre parteneri avem nevoie de confirmarea ta.\r\n Pentru a confirma acceseaza {{link}} tableta-inmultirii.ro \r\nVa multumim,\r\nEchipa Tableta Inmultirii"
          }
}
    // Create the promise and SES service object
    var templatePromise = ses.updateTemplate(params).promise();

    // Handle promise's fulfilled/rejected states
    templatePromise.then(
      function(data) {
        console.log(data);
      }).catch(
        function(err) {
        console.error(err, err.stack);
        callback(err);
      });
}