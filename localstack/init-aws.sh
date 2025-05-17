#!/bin/bash
set -e

ENDPOINT_URL="http://localhost:4566"
BUCKET_NAME="my-daily-log-files"

echo "Waiting for LocalStack to be ready..."
sleep 25  # Increased sleep time to ensure LocalStack is fully initialized

# Create directory for LocalStack files
mkdir -p /tmp/localstack_tmp
mkdir -p /tmp/localstack_data

echo "Checking S3 service health..."
aws --endpoint-url=$ENDPOINT_URL s3 ls || {
  echo "S3 service is not ready yet. Waiting additional time..."
  sleep 10
  # Try again
  aws --endpoint-url=$ENDPOINT_URL s3 ls || echo "Warning: S3 service may not be ready"
}

echo "Creating S3 bucket..."
# Check if bucket exists first
if ! aws --endpoint-url=$ENDPOINT_URL s3 ls s3://$BUCKET_NAME 2>/dev/null; then
    echo "Bucket does not exist. Creating it now..."
    aws --endpoint-url=$ENDPOINT_URL s3 mb s3://$BUCKET_NAME || {
      echo "Error creating bucket. Will try again..."
      sleep 5
      aws --endpoint-url=$ENDPOINT_URL s3 mb s3://$BUCKET_NAME
    }
    echo "Bucket created successfully"
else
    echo "Bucket already exists"
fi

echo "Setting bucket ACL to public-read..."
aws --endpoint-url=$ENDPOINT_URL s3api put-bucket-acl --bucket $BUCKET_NAME --acl public-read

# Verify bucket creation
echo "Verifying bucket creation..."
if aws --endpoint-url=$ENDPOINT_URL s3 ls s3://$BUCKET_NAME 2>/dev/null; then
    echo "Bucket verified successfully!"
else
    echo "ERROR: Bucket verification failed!"
    # Try to create it one more time
    aws --endpoint-url=$ENDPOINT_URL s3 mb s3://$BUCKET_NAME || echo "Failed to create bucket again"
fi

echo "S3 bucket setup complete!"
