#!/bin/bash

refreshDispatcher() {
  until pids=$(pidof kamailio)
  do
    sleep 1
  done
  while true; do
    touch /etc/kamailio/dispatcher.list
    sleep 30
  done
}

mkdir -p /tmp/opensipsdb

# db_text table definitions based on https://github.com/kamailio/kamailio/misc/scripts/dbtext/ser_db

cat << EOF > /tmp/opensipsdb/version
table_name(str) table_version(int)
subscriber:6
location:6
aliases:6
EOF

cat << EOF > /tmp/opensipsdb/subscriber
username(str) password(str) ha1(str) domain(str) ha1b(str) rpid(str)
1001:${SIP_EXTENSION_SECRET}:xxx:ccsip-kamailio-0.open-cc.org:xxx:1001
EOF

cat << EOF > /tmp/opensipsdb/location
username(str) domain(str,null) contact(str,null) received(str) expires(int,null) q(double,null) callid(str,null) cseq(int,null) last_modified(str) flags(int) user_agent(str) socket(str)
EOF

chmod -R 777 /tmp/opensipsdb/

consul-template -consul-addr "consul:8500" -template '/tmp/dispatcher.list.tpl:/etc/kamailio/dispatcher.list' &

refreshDispatcher &

/run.sh