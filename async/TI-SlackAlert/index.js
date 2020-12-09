
const https = require('https');


exports.handler = (event, context, callback) => {
  
  try {
      console.log(event);
      let message = 'Error';
      if (event.Records){
        const elem = event.Records[0];
        if (elem.eventName === 'INSERT'){
          const donation = elem.dynamodb.NewImage;
          const dId = donation.DonationId.S;
          const dU = donation.User.S;
          const dD = donation.Donation.S;
          message = `Donatie noua (${dId})\n\tUtilizator: ${dU} \n\tDetalii: ${dD}\n`
        } else  if (elem.eventName === 'MODIFY'){
          const donation = elem.dynamodb.NewImage;
          const prev = elem.dynamodb.OldImage;
          const dId = donation.DonationId.S;
          const dNew = donation.Status.S;
          const dLoc = donation.LocId.S ? donation.LocId.S : '';
          const dOld = prev.Status.S;
          const dBroadcast = donation.broadcast && donation.broadcast.BOOL ? 'locatie' : 'tintita';
          const dPrevLoc = donation.broadcast && donation.broadcast.BOOL ? (prev.LocId.S ? prev.LocId.S : '') : ' ';
          message = `Donatie ${dBroadcast} ${dLoc}(${dPrevLoc}) (${dId}) modificata din: ${dOld} in ${dNew} \n`
        } else  if (elem.eventName === 'ObjectCreated:Put'){
          
          const picKey = JSON.stringify(event['Records'][0]['s3']['object']['key']).replace('"','');
          message = `Poza https://<bucket>.s3.eu-central-1.amazonaws.com/${picKey}`;
          
        } else {
          message = JSON.stringify(event)
        }
      } else if (event.triggerSource === "PostAuthentication_Authentication") {
        const userEmail = event.request.userAttributes.email;
        message = `Utilizator logat: ${userEmail}`;
      } else if (event.triggerSource === "PreSignUp_SignUp") {
        const userEmail = event.request.userAttributes.email;
        let role = ''
        if (event.request.userAttributes["custom:usergroup"] === "partener"){
          role = '(PARTENER) ';
        }
        message = `${role}Cerere utilizator nou: ${userEmail}`;
      } else if (event.triggerSource === "PostConfirmation_ConfirmSignUp") {
        const userEmail = event.request.userAttributes.email;
        const userSub = event.request.userAttributes.sub;
        let role = ''
        if (event.request.userAttributes["custom:usergroup"] === "partener"){
          role = '(PARTENER) ';
        }
        message = `${role}Utilizator nou: ${userEmail} (${userSub})`;
      } else if (event.feedback){
        const typeFeedback = event.feedback.eventType;
        const contentFeedback = event.feedback.content;
        message = `${typeFeedback}: ${contentFeedback}`;
      } else {
        message = JSON.stringify(event)
      }
      const payload = JSON.stringify({
        text: `${message}`,
      });
      
      const options = {
        hostname: "hooks.slack.com",
        method: "POST",
        path: "/services/<channel-id>",
        timeout: 3000
      };
      
      const req = https.request(options,
          (res) => res.on("data", () => {console.log('success'); context.succeed(event)}))
      req.on("error", (error) => {console.error(error); context.succeed(event)});
      req.on("timeout", (error) => {console.error(error); context.succeed(event)})
      req.write(payload);
      req.end();
  } catch (err){
    console.error(err);
    context.succeed(event)
  }
  
}
