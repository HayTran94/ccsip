#!/usr/bin/env bash

registerConsulService() {
  while true; do
    if nc -w 2 -v ${CONSUL_HOST} 8500 </dev/null; then
      curl -s -X PUT \
         -d '{"Datacenter": "dc1", "Node": "'"${INSTANCE_NAME}"'", "Address": "'"${PRIVATE_ADDR}"'", "Service": {"Service": "'"${INSTANCE_TYPE}"'", "Port": 5060, "Tags": [ "udp" ]}}' \
         "http://${CONSUL_HOST}:8500/v1/catalog/register"
      echo "updated consul registration"
    else
      echo "unable to reach consul at ${CONSUL_HOST}:8500"
    fi
    sleep 5
  done
}

registerConsulService &

asterisk -f