#!/bin/bash

refreshDispatcher() {
  until pids=$(pidof kamailio)
  do
    sleep 1
  done
  sleep 5
  touch /etc/kamailio/dispatcher.list
}

mkdir -p /tmp/opensipsdb

read -r -d "" DB_TEXT_VERSION <<EOF
table_name(str) table_version(int)
subscriber:6
location:6
aliases:6
EOF

read -r -d "" DB_TEXT_SUBSCRIBER <<EOF
username(str) password(str) ha1(str) domain(str) ha1b(str) rpid(str)
EOF

read -r -d "" DB_TEXT_LOCATION <<EOF
username(str) contact(str) expires(int) q(double) callid(str) cseq(int)
EOF

echo "${DB_TEXT_VERSION}" > /tmp/opensipsdb/version
echo "${DB_TEXT_SUBSCRIBER}" > /tmp/opensipsdb/subscriber
echo "${DB_TEXT_LOCATION}" > /tmp/opensipsdb/location

chmod -R 777 /tmp/opensipsdb/

consul-template -consul-addr "consul:8500" -template '/tmp/dispatcher.list.tpl:/etc/kamailio/dispatcher.list' &

refreshDispatcher &

/run.sh