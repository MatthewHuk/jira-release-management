#!/bin/sh

error() {
  echo ">>>>>> Failed to publish <<<<<<<<<"
  echo ""
  exit 1
}
trap error ERR

PRODUCT="quoting"
SERVICE_NAME="jira-release-management"
VERSION=`cat ./VERSION`
CLOUDKAT_VERSION="${CLOUDKAT_VERSION}"
INSTANCE_TYPE="m5.large"
OWNER="matthew.huk@bglgroup.co.uk"

if [ -z "${GO_PIPELINE_COUNTER}" ]; then
    export GO_PIPELINE_COUNTER=0
fi

if [ -z "${GO_STAGE_COUNTER}" ]; then
    export GO_STAGE_COUNTER=0
fi

echo -n 'writing service version ...'

BUILD_VERSION="${VERSION}.${GO_PIPELINE_COUNTER}.${GO_STAGE_COUNTER}"
echo $BUILD_VERSION > deployment/service_version.txt

echo 'done'

echo -n 'setting execute permissions on launch.sh script ...'

chmod +x deployment/launch.sh

echo 'done'

echo 'pulling and inflating cloudcat zip ...'

go-app-manager cloudkat/cloudkat-linux-${CLOUDKAT_VERSION}.zip .

echo 'login to docker ...'

./cloudkat docker login

echo -n "Writing metadata.json files and publishing....."

GOSERVER_CIDR=52.16.177.118/32

rm -Rf ./deployment/metadata.json
cat  > ./deployment/metadata.json << EOL
{
  "product": "${PRODUCT}",
  "service": "${SERVICE_NAME}",
  "service_alias": "releasinator",
  "cloudkat_version": "${CLOUDKAT_VERSION}",
  "version": "${BUILD_VERSION}",
  "os": "linux",
  "role": "api",
  "owner": "${OWNER}",
  "health_check_endpoint": "liveness",
  "health_check_type": {
    "test": "ELB"
  },
  "health_check_grace_period": {
    "test": "900"
  },
  "instance_type": {
    "linux": "${INSTANCE_TYPE}"
  },
  "min_size": {
		"load": "1",
		"shadow": "1",
		"prod": "1"
  },
  "max_size": {
		"load": "1",
		"shadow": "1",
		"prod": "1"
  },
  "desired_capacity": {
		"load": "1",
		"shadow": "1",
		"prod": "1"
  },
  "min_elb_capacity": {
		"load": "1",
		"shadow": "1",
		"prod": "1"
  },
  "associate_public_ip_address": "true",
  "internal": "true",
  "access_list": {
    "load": "${GOSERVER_CIDR},10.100.142.0/23,52.209.124.149/32,10.100.62.0/3",
    "shadow": "10.100.146.0/23",
    "prod": "10.100.144.0/23,195.171.22.4/32,195.171.22.68/32"
  },
  "wait_for_capacity_timeout": "10"
}

EOL

./cloudkat docker build -m deployment/metadata.json .
./cloudkat docker push -m deployment/metadata.json
./cloudkat publish -p deployment

echo "packaging and publishing complete"
