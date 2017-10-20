#!/usr/bin/env bash

registerConsulService() {
  while true; do
    if nc -zvw 1 ${CONSUL_HOST} 8510 > /dev/null 2>&1; then
      curl -s -X PUT \
         -d '{"Datacenter": "dc1", "Node": "'"${INSTANCE_NAME}"'", "Address": "'"${PRIVATE_ADDR}"'", "Service": {"Service": "'"${INSTANCE_TYPE}"'", "Port": 5060, "Tags": [ "udp" ]}}' \
         "http://${CONSUL_HOST}:8500/v1/catalog/register" > /dev/null
      echo "[status] updated consul registration"
    else
      echo "[status] unable to reach consul at ${CONSUL_HOST}:8500"
    fi
    sleep 5
  done
}

registerConsulService &

node index.js