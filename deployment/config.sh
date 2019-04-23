#!/usr/bin/env bash
error() {
  echo ">>>>>> Failed to configure <<<<<<<<<"
  echo ""
  exit 1
}
trap error ERR

PRODUCT=$(jq -r .product metadata.json)
SERVICE_NAME=$(jq -r .service metadata.json)

rm -Rf ./config-file

read -d ';' CONFIG_SETTINGS << EOL
{
  "ENVIRONMENT": "${ENVIRONMENT}",
  "NGINX_VERSION": "${NGINX_VERSION}",
  "JIRA_USER": "${JIRA_USER}",
  "EXCHANGE_USER": "${EXCHANGE_USER}",
  "JIRA_HOST": "${JIRA_HOST}",
  "EMAIL_GROUP": "${EMAIL_GROUP}",
  "JIRA_PASSWORD": "${JIRA_PASSWORD}",
  "EXCHANGE_PASSWORD": "${EXCHANGE_PASSWORD}"
};
EOL

aws --region eu-west-1 kms encrypt --key-id arn:aws:kms:eu-west-1:482506117024:alias/quoting --plaintext "${CONFIG_SETTINGS}" --query CiphertextBlob --output text | base64 --decode > config-file

aws s3 cp config-file s3://ctm-app-config/${PRODUCT}/${SERVICE_NAME}/${ENVIRONMENT}/config-settings --sse