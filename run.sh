#!/usr/bin/env bash

if ! ipcalc --version 2>&1 > /dev/null; then
  apt-get install ipcalc
fi
if ! jq --version 2>&1 > /dev/null; then
  apt-get install jq
fi

LOCAL_IP=$(ifconfig docker0 | grep 'inet addr' | cut -d: -f2 | awk '{print $1}')
LOCAL_MASK=$(ifconfig docker0 | grep 'inet addr' | cut -d: -f4 | awk '{print $1}')
LOCAL_NET=$(ipcalc ${LOCAL_IP}/${LOCAL_MASK} | grep Network | awk '{print $2}')
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

  curl -X PUT \
     -d '{"Datacenter": "dc1", "Node": "'"${INSTANCE_NAME}"'", "Address": "'"${PRIVATE_ADDR}"'", "Service": {"Service": "'"${INSTANCE_TYPE}"'", "Port": 5060, "Tags": [ "udp" ]}}' \
     http://ccsip-kamailio-0.open-cc.org:8500/v1/catalog/register

fi

export PRIVATE_ADDR
export EXTERNAL_ADDR
export SIP_TERMINATION_PHONE_NUMBER="${TWILIO_SIP_TRUNK_PN}"

REPLACE_VARS="'"$(declare -px | awk '{print $3}' | awk -F'=' '{print "${"$1"}"}' | tr '\n' ' ' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"'"

find /${DP_NAME}/ \
  \( -name '*.cfg' -o -name '*.conf' \) \
  -exec sh -c 'envsubst '"$REPLACE_VARS"' < {} > {}.tmp; mv {}.tmp {}' \;

if [ "$TWILIO_SIP_TRUNK_ORIG_URL_ADDR" = "sip:$EXTERNAL_ADDR" ]; then
  echo "updated twilio sip trunk origination url"
else
  echo "failed to update twilio sip trunk origination url"
  exit 1
fi

docker-compose -f /${DP_NAME}/docker-compose-kamailio.yml rm -f
docker-compose -f /${DP_NAME}/docker-compose-kamailio.yml build
docker-compose -f /${DP_NAME}/docker-compose-kamailio.yml up
