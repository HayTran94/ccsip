#!/usr/bin/env bash

apt-get install ipcalc
apt-get install jq

LOCAL_IP=$(ifconfig docker0 | grep 'inet addr' | cut -d: -f2 | awk '{print $1}')
LOCAL_MASK=$(ifconfig docker0 | grep 'inet addr' | cut -d: -f4 | awk '{print $1}')
export LOCAL_NET=$(ipcalc ${LOCAL_IP}/${LOCAL_MASK} | grep Network | awk '{print $2}')
export EXTERNAL_ADDR=${DP_IP_ADDR}

sed -i 's|LOCAL_NET|'"$LOCAL_NET"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf
sed -i 's|EXTERNAL_ADDR|'"$EXTERNAL_ADDR"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf
sed -i 's|SIP_TERMINATION_URI|'"$SIP_TERMINATION_URI"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf
sed -i 's|SIP_TERMINATION_USER|'"$SIP_TERMINATION_USER"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf
sed -i 's|SIP_TERMINATION_SECRET|'"$SIP_TERMINATION_SECRET"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf
sed -i 's|SIP_EXTENSION_SECRET|'"$SIP_EXTENSION_SECRET"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf

TWILIO_SIP_TRUNKS=$(curl -s https://trunking.twilio.com/v1/Trunks -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}")
TWILIO_SIP_TRUNK_SID=$(echo ${TWILIO_SIP_TRUNKS} | jq .trunks[0].sid -r)
TWILIO_SIP_TRUNK_ORIG_URLS_LINK=$(echo ${TWILIO_SIP_TRUNKS} | jq .trunks[0].links.origination_urls -r)
TWILIO_SIP_TRUNK_ORIG_URL_URL=$(curl -s ${TWILIO_SIP_TRUNK_ORIG_URLS_LINK} -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" | jq .origination_urls[0].url -r)
TWILIO_SIP_TRUNK_ORIG_URL_ADDR=$(curl -sX POST ${TWILIO_SIP_TRUNK_ORIG_URL_URL} -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" -d "SipUrl=sip:${EXTERNAL_ADDR}" | jq .sip_url -r)

if [ "$TWILIO_SIP_TRUNK_ORIG_URL_ADDR" = "sip:$EXTERNAL_ADDR" ]; then
  echo "updated twilio sip trunk origination url"
else
  echo "failed to update twilio sip trunk origination url"
  exit 1
fi

docker-compose -f /${DP_NAME}/docker-compose.yml up
