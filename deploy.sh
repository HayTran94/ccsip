#!/usr/bin/env bash

if [ ! -f .work/dropler/deploy.sh ]; then
  mkdir -p tmp
  git clone https://github.com/github1/dropler.git .work/dropler
fi

export ROOT_DOMAIN=open-cc.org

. .work/dropler/deploy.sh "${@:1}" \
  -e SIP_TERMINATION_URI \
  -e SIP_TERMINATION_USER \
  -e SIP_TERMINATION_SECRET \
  -e SIP_TERMINATION_PHONE_NUMBER \
  -e SIP_EXTENSION_SECRET \
  -e TWILIO_ACCOUNT_SID \
  -e TWILIO_AUTH_TOKEN