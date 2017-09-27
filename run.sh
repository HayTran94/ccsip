#!/usr/bin/env bash

if [ -z "$1" ]; then
  echo "missing instance type"
  exit 1
fi

INSTANCE_NAME=$1
INSTANCE_TYPE=$(echo "${1}" | awk -F'-' '{print $1}')

if ! jq --version 2>&1 > /dev/null; then
  apt-get install jq
fi

PRIVATE_ADDR=$(ip addr show eth1 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1)
EXTERNAL_ADDR=${DP_IP_ADDR}

if [ "${INSTANCE_TYPE}" = "kamailio" ]; then

  TWILIO_CREDS="${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}"
  TWILIO_SIP_TRUNKS=$(curl -s https://trunking.twilio.com/v1/Trunks -u "${TWILIO_CREDS}")
  TWILIO_SIP_TRUNK=$(echo ${TWILIO_SIP_TRUNKS} | jq ".trunks[] | select(.domain_name==\"${SIP_TERMINATION_URI}\")")
  TWILIO_SIP_TRUNK_SID=$(echo ${TWILIO_SIP_TRUNK} | jq .sid -r)
  TWILIO_SIP_TRUNK_PN_URLS_LINK=$(echo ${TWILIO_SIP_TRUNK} | jq .links.phone_numbers -r)
  TWILIO_SIP_TRUNK_PN=$(curl -s ${TWILIO_SIP_TRUNK_PN_URLS_LINK} -u "${TWILIO_CREDS}" | jq .phone_numbers[0].phone_number -r)
  TWILIO_SIP_TRUNK_ORIG_URLS_LINK=$(echo ${TWILIO_SIP_TRUNK} | jq .links.origination_urls -r)
  TWILIO_SIP_TRUNK_ORIG_URL_URL=$(curl -s ${TWILIO_SIP_TRUNK_ORIG_URLS_LINK} -u "${TWILIO_CREDS}" | jq .origination_urls[0].url -r)
  TWILIO_SIP_TRUNK_ORIG_URL_ADDR=$(curl -sX POST ${TWILIO_SIP_TRUNK_ORIG_URL_URL} -u "${TWILIO_CREDS}" -d "SipUrl=sip:${EXTERNAL_ADDR}" | jq .sip_url -r)

  if [ "$TWILIO_SIP_TRUNK_ORIG_URL_ADDR" = "sip:$EXTERNAL_ADDR" ]; then
    echo "updated twilio sip trunk origination url"
  else
    echo "failed to update twilio sip trunk origination url"
    exit 1
  fi

else

  export SIGNALING_PROXY_HOST=$(echo $DP_TAG_MEMBERS | grep "kamailio" | awk '{print $2}')
  # todo - use private ip for redis and consul
  export REDIS_HOST=${SIGNALING_PROXY_HOST}
  export CONSUL_HOST=${SIGNALING_PROXY_HOST}

fi

export INSTANCE_NAME
export INSTANCE_TYPE
export PRIVATE_ADDR
export EXTERNAL_ADDR
export SIP_TERMINATION_PHONE_NUMBER="${TWILIO_SIP_TRUNK_PN}"

REPLACE_VARS="'"$(declare -px | awk '{print $3}' | awk -F'=' '{print "${"$1"}"}' | tr '\n' ' ' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"'"

find /${DP_NAME}/ \
  \( -name '*.cfg' -o -name '*.conf' -o -name '*.yml' \) \
  -exec sh -c 'envsubst '"$REPLACE_VARS"' < {} > {}.tmp; mv {}.tmp {}' \;

docker-compose -f /${DP_NAME}/docker-compose-${INSTANCE_TYPE}.yml rm -f
docker-compose -f /${DP_NAME}/docker-compose-${INSTANCE_TYPE}.yml build
docker-compose -f /${DP_NAME}/docker-compose-${INSTANCE_TYPE}.yml up -d
