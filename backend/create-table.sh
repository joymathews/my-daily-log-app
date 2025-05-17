#!/bin/bash

# Wait for DynamoDB Local to be ready
echo "Waiting for DynamoDB Local to be ready..."
sleep 5

# Create the DailyLogEvents table
echo "Creating DailyLogEvents table..."
aws dynamodb create-table \
    --table-name DailyLogEvents \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url ${DYNAMODB_ENDPOINT:-http://localhost:8000} || echo "Table already exists."
