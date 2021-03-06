#!/usr/bin/env bash

export ROOT_DOMAIN=open-cc.org

. deploy-terraform.sh "${@:1}" \
  -e SIP_TERMINATION_URI \
  -e SIP_TERMINATION_USER \
  -e SIP_TERMINATION_SECRET \
  -e SIP_TERMINATION_PHONE_NUMBER \
  -e SIP_EXTENSION_SECRET \
  -e TWILIO_ACCOUNT_SID \
  -e TWILIO_AUTH_TOKEN \
  -e ASTERISK_API_USER \
  -e ASTERISK_API_SECRET \
  -e LETSENCRYPT_ACCOUNT_ID \
  -e LETSENCRYPT_PRIVATE_KEY \
  -e LETSENCRYPT_REGR