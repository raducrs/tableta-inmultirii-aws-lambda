import json
import urllib.parse
import boto3

print('Loading function')

s3 = boto3.client('s3')

import os


def lambda_handler(event, context):
    

    # Get the object from the event and show its content type
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    try:
        
        print(os.listdir('/opt/python/lib/python3.7/site-packages'))
        
        import cv2
        import numpy as np

        
        # read image from s3
        response = s3.get_object(Bucket=bucket, Key=key)
        print("CONTENT TYPE: " + response['ContentType'])
        body = response['Body'].read()
        
       
        
        # 
        src = cv2.imdecode(np.asarray(bytearray(body)), cv2.IMREAD_GRAYSCALE)
        
        # Resize to TARGET x TARGET in landscape or portrait
        TARGET = 512
        TARGET_PORTRAIT = 350
        
        org_height = src.shape[0]
        org_width = src.shape[1]
        
        scale_percent = 1
        landscape = True
        portrait_style = False
        if (org_height>org_width):
            scale_percent = TARGET_PORTRAIT  / org_height
            landscape = False
            portrait_style = True
        else:
            scale_percent = TARGET / org_width
            resulting_height =  int(src.shape[0] * scale_percent)
            if (resulting_height>TARGET_PORTRAIT):
                scale_percent = TARGET_PORTRAIT  / org_height
                landscape = False
           
        # new size    
        width = int(src.shape[1] * scale_percent)
        height = int(src.shape[0] * scale_percent)
        dsize = (width, height)
          
        src = cv2.resize(src, dsize)
        
    
        # apply guassian blur on src image
        src = cv2.GaussianBlur(src,(3,3),cv2.BORDER_DEFAULT)
        src = cv2.Sobel(src,cv2.CV_8U,1,1,ksize=5)
        
        top_pixel = np.percentile(src,97)
        
        src = cv2.convertScaleAbs(src, alpha=(250/top_pixel), beta=0)
        src = cv2.GaussianBlur(src,(3,3),cv2.BORDER_DEFAULT)
        
        # read background from local layer
        bck = cv2.imread('/opt/python/blackboard/blackboard_wide_2.png', cv2.IMREAD_GRAYSCALE)
        beta = 0.6
        offset_x = 250
        offset_y = 5
        for y in range(src.shape[0]):
            for x in range(src.shape[1]):
                new_pixel = bck[y+offset_y,x+offset_x]+beta*src[y,x];
                new_pixel = 255 if new_pixel > 255 else new_pixel
                bck[y+offset_y,x+offset_x] = np.uint8(new_pixel)
        if not landscape:    
            # clip image
            actual_width = offset_x + src.shape[1] + 5
            actual_width = actual_width if actual_width < 768 else 767
            bck = bck[:,0:actual_width]
        
        # put image back to public s3 bucket
        image_string = cv2.imencode('.jpg', bck)[1].tostring()
        s3.put_object(Bucket='<bucket-name>', Key=key+'.jpg', Body=image_string)
        
        # resize to 1.91 : 1 scale for FB
        alpha = 1.905
        ww = bck.shape[1]
        hh = bck.shape[0]
        
        min_h = -(alpha * hh - ww) / 2 / alpha
        dh = 0
        dw = 0
        if min_h >= 0:
            v_h = - (alpha * hh - ww) * (alpha * hh - ww) / 4 / alpha
            if v_h > 0:
                dh = min_h
                dw = alpha*(dh+hh)-ww
            else:
                dw = 0
                dh = (dw + ww)/alpha - hh
        else:
            #v_h = - (alpha * hh - ww) * (alpha * hh - ww) / 4 / alpha
            #if v_h >= 0:
            #    dh = 0
            #    dw = alpha*(dh+hh)-ww
            #else:
            #    dw = 0
            #    dh = (dw + ww)/alpha - hh
            dh = 0
            dw = alpha*(dh+hh)-ww
        
        dh = int(dh)
        dw = int(dw)
        
        if dh<0 or dw<0:
            print('false compute '+str(dh)+' '+str(dw))
            dh = 0 
            dw = 0
        if dh>300 or dw > 600:
            print('too large values '+str(dh)+' '+str(dw))
            dh = 0
            dw = 0
        
        top, bottom = dh//2, dh-(dh//2)
        left, right = dw//2, dw-(dw//2)
        
        color = [0, 0, 0]
        extended = cv2.copyMakeBorder(bck, top, bottom, left, right, cv2.BORDER_CONSTANT,value=color)
        #extended = cv2.copyMakeBorder(bck, top, bottom, left, right, cv2.BORDER_REFLECT)
        
        # ensure min width for large scale display
        scale_factor = 768/extended.shape[1]
        new_width = int(scale_factor*extended.shape[1])
        new_heigt = int(scale_factor*extended.shape[0])
        if dh==0 and dw==0:
            ...
        else:
            new_width = 768
            new_height = 403
        scaled_just_photo_dsize = (new_width,new_heigt)
        extended = cv2.resize(extended, scaled_just_photo_dsize)
        
        extended_string_photo = cv2.imencode('.jpg', extended)[1].tostring()
        s3.put_object(Bucket='<bucket-name>', Key=key+'-url.jpg', Body=extended_string_photo)
        
        return response['ContentType']
        
        #actual_width = offset_x + src.shape[1] + 5
        #actual_width = actual_width if actual_width < 768 else 767
        #actual_height = offset_y + src.shape[0] + 5
        #actual_height = actual_height if actual_height < 360 else 359
        #just_photo = bck[0:actual_height,offset_x:actual_width]
        
        #scale_factor = 2
        #if portrait_style:
        #    scale_factor = 3
        #scaled_just_photo_dsize = (scale_factor*just_photo.shape[1],scale_factor*just_photo.shape[0])
        
        #scaled_just_photo = cv2.resize(just_photo, scaled_just_photo_dsize)
        #image_string_photo = cv2.imencode('.jpg', scaled_just_photo)[1].tostring()
        
        #s3.put_object(Bucket='<bucket-name>', Key=key+'-url.jpg', Body=image_string_photo)
        #return response['ContentType']
    except Exception as e:
        print(e)
        print('Error getting object {} from bucket {}. Make sure they exist and your bucket is in the same region as this function.'.format(key, bucket))
        raise e
