#!/bin/bash

refreshConf() {
  while true; do
    touch /etc/haproxy/haproxy.cfg
    sleep 30
  done
}

startSimpleHTTPServer() {
  cd /www
  python -m SimpleHTTPServer 80
}

stopSimpleHTTPServer() {
  kill -9 $(ps aux | grep SimpleHTTPServer | grep -v grep | awk '{print $2}')
}

setupLetsEncryptAccount() {
  mkdir -p "/etc/letsencrypt/accounts/acme-v01.api.letsencrypt.org/directory/${LETSENCRYPT_ACCOUNT_ID}"
  apis=( "acme-v01.api.letsencrypt.org" )
  for API in "${apis[@]}"; do
    echo "${LETSENCRYPT_PRIVATE_KEY}" > "/etc/letsencrypt/accounts/${API}/directory/${LETSENCRYPT_ACCOUNT_ID}/private_key.json"
    echo "${LETSENCRYPT_REGR}" > "/etc/letsencrypt/accounts/${API}/directory/${LETSENCRYPT_ACCOUNT_ID}/regr.json"
    echo '{"creation_host": "3c2f34f61354", "creation_dt": "2017-10-27T00:06:44Z"}' > "/etc/letsencrypt/accounts/${API}/directory/${LETSENCRYPT_ACCOUNT_ID}/meta.json"
  done
}

requestLetsEncryptCert() {
  if [ -n "${LIVE_CERTS}" ]; then
    #certbot certonly --webroot -w /www -d "ccsip-${INSTANCE_NAME}.open-cc.org"
    echo "requesting live certs"
  else
    echo "requesting staging certs"
    certbot certonly --webroot -w /www -d "ccsip-${INSTANCE_NAME}.open-cc.org" --staging --register-unsafely-without-email --agree-tos
  fi
}

if [ -n "${HAPROXY_CFG}" ]; then
  if [[ "${HAPROXY_CFG}" == *.tpl ]]; then
      consul-template -consul-addr "consul:8500" -template "${HAPROXY_CFG}:/etc/haproxy/haproxy.cfg" &
  else
      cp "${HAPROXY_CFG}" /etc/haproxy/haproxy.cfg
  fi
fi

refreshConf &

startSimpleHTTPServer &

setupLetsEncryptAccount

requestLetsEncryptCert

stopSimpleHTTPServer

cat /etc/letsencrypt/live/ccsip-${INSTANCE_NAME}.open-cc.org/cert.pem \
    /etc/letsencrypt/live/ccsip-${INSTANCE_NAME}.open-cc.org/chain.pem \
    /etc/letsencrypt/live/ccsip-${INSTANCE_NAME}.open-cc.org/privkey.pem \
  > /etc/letsencrypt/live/ccsip-${INSTANCE_NAME}.open-cc.org/bundle.pem

sh bootstrap.sh