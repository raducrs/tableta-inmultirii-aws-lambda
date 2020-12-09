# TI-ImageChalk

An Amazon S3 trigger that processes the  uploaded image and uploads the result back to S3

**Need to add a valid bucket name in `<bucket-name>`**

Runtime: `python3.7` 

Timeout(s): 45  

Memory(Mb): 192 

Handler: `lambda_function.lambda_handler` 

Role: `​TI-LambdaImageChalk`

Additional policies: 

```
{
  "service": "s3.amazonaws.com",
  "action": "lambda:InvokeFunction"
}
{
  "service": "s3.amazonaws.com",
  "action": "lambda:InvokeFunction"
}
``` 


## Layers 

### Opencv

To create the opencv layer follow the instruction [here](https://github.com/iandow/opencv_aws_lambda)

Upload the `zip` archive to an `S3` bucket. 

The `zip` archives need to have the following structure `cv2-python38.zip\python\lib\python3.8\site-packages` or `cv2-python37.zip\python\lib\python3.7\site-packages` to work as AWS layers.

**The opencv release contains the zip binaries**

### Background image

Create a `zip` archive with the following structure `baseimage.zip\baseimage\python\blackboard_wide_2.png` and upload it to an `S3` bucket.




