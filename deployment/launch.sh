#!/bin/bash

error() {
  echo ">>>>>> error running docker container <<<<<<<<<"
  echo ""

  exit 1
}

trap error ERR

export PRODUCT=$(jq -r .product metadata.json)
export SERVICE_NAME=$(jq -r .service metadata.json)
export VERSION=$(jq -r .version metadata.json)
export CLOUDKAT_VERSION=$(jq -r .cloudkat_version metadata.json)

aws s3 cp s3://ctm-software-cache/cloudkat/cloudkat-linux-${CLOUDKAT_VERSION}.zip .
unzip -o cloudkat-linux-${CLOUDKAT_VERSION}.zip
chmod u+x cloudkat

./cloudkat docker login

aws s3 cp s3://ctm-app-config/${PRODUCT}/${SERVICE_NAME}/${ENVIRONMENT}/config .

CONFIG=$(aws --region eu-west-1 kms decrypt --ciphertext-blob fileb://./config --output text --query Plaintext | base64 --decode)

export ENVIRONMENT=$(echo "$CONFIG" | jq -r .ENVIRONMENT)
export NGINX_VERSION=$(echo "$CONFIG" | jq -r .NGINX_VERSION)
export JIRA_USER=$(echo "${CONFIG}" | jq -r .JIRA_USER)
export EXCHANGE_USER=$(echo "${CONFIG}" | jq -r .EXCHANGE_USER)

aws s3 --region eu-west-1 cp s3://ctm-software-cache/cloudkat/cloudkat-linux-${CLOUDKAT_VERSION}.zip .
unzip cloudkat-linux-${CLOUDKAT_VERSION}.zip
rm cloudkat-linux-${CLOUDKAT_VERSION}.zip
chmod u+x cloudkat
export JIRA_PASSWORD=$(./cloudkat secret load -e ${ENVIRONMENT} -m metadata.json -n jira_password| tr -d " ")
export EXCHANGE_PASSWORD=$(./cloudkat secret load -e ${ENVIRONMENT} -m metadata.json -n exchange_password| tr -d " ")

docker-compose up -d