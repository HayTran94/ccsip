#!/bin/bash

refreshConf() {
  while true; do
    touch /etc/haproxy/haproxy.cfg
    sleep 30
  done
}

consul-template -consul-addr "consul:8500" -template '/tmp/haproxy.cfg.tpl:/etc/haproxy/haproxy.cfg' &

refreshConf &

sh bootstrap.sh