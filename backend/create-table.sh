#!/bin/bash

# Wait for DynamoDB Local to be ready
echo "Waiting for DynamoDB Local to be ready..."
sleep 5

# Get table name from environment variable or use default
TABLE_NAME=${DYNAMODB_TABLE_NAME:-DailyLogEvents}

# Create the table
echo "Creating ${TABLE_NAME} table..."
aws dynamodb create-table \
    --table-name ${TABLE_NAME} \
    --attribute-definitions AttributeName=id,AttributeType=S \
    --key-schema AttributeName=id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
    --endpoint-url ${DYNAMODB_ENDPOINT:-http://localhost:8000} || echo "Table already exists."
