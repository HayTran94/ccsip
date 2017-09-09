#!/usr/bin/env bash

apt-get install ipcalc

LOCAL_IP=$(ifconfig docker0 | grep 'inet addr' | cut -d: -f2 | awk '{print $1}')
LOCAL_MASK=$(ifconfig docker0 | grep 'inet addr' | cut -d: -f4 | awk '{print $1}')
export LOCAL_NET=$(ipcalc ${LOCAL_IP}/${LOCAL_MASK} | grep Network | awk '{print $2}')
export EXTERNAL_ADDR=${DP_IP_ADDR}

sed -i 's|SIP_TERMINATION_URI|'"$SIP_TERMINATION_URI"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf
sed -i 's|SIP_TERMINATION_USER|'"$SIP_TERMINATION_USER"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf
sed -i 's|SIP_TERMINATION_SECRET|'"$SIP_TERMINATION_SECRET"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf
sed -i 's|SIP_EXTENSION_SECRET|'"$SIP_EXTENSION_SECRET"'|g' /${DP_NAME}/asterisk/etc/asterisk/sip.conf

docker-compose -f /${DP_NAME}/docker-compose.yml up
