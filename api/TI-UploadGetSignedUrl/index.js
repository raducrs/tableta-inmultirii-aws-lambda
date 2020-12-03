const AWS = require('aws-sdk')
const s3 = new AWS.S3()

// Change this value to adjust the signed URL's expiration
const URL_EXPIRATION_SECONDS = 300

exports.handler = (event, context, callback) => {
  getUploadURL(event,context,callback)
}

const getUploadURL = function(event,context,callback) {
  const newUUID = context ? context.awsRequestId : parseInt(Math.random()*100000)
  const Key = `${newUUID}`

  // Get signed URL from S3
  const s3Params = {
    Bucket: '<bucket-name>',
    Key,
    Expires: URL_EXPIRATION_SECONDS,
    ContentType: 'image/*',

    // This ACL makes the uploaded object publicly readable. You must also uncomment
    // the extra permission for the Lambda function in the SAM template.

    // ACL: 'public-read'
  }

  console.log('Params: ', s3Params)
  s3.getSignedUrlPromise('putObject', s3Params, function(err, url){
      if(err){
          callback(err)
      } else {
      callback(null,{
            uploadURL: url,
            Key
          });
      }
  })

  
}