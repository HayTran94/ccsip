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

# db_text table definitions based on https://github.com/kamailio/kamailio/misc/scripts/dbtext/ser_db

cat << EOF > /tmp/opensipsdb/version
table_name(str) table_version(int)
subscriber:6
location:6
aliases:6
EOF

cat << EOF > /tmp/opensipsdb/subscriber
username(str) password(str) ha1(str) domain(str) ha1b(str) rpid(str)
jan:pass1:xxx:jan.sk:xxx:ZZZZ
palo:pass2:xxx:palo.sk:xxx:ZZZZ
EOF

cat << EOF > /tmp/opensipsdb/location
uid(str) aor(str) contact(str) server_id(int) received(str,null) expires(int) q(double) callid(str,null) cseq(int,null) flags(int) user_agent(str,null) instance(str,null)
EOF

chmod -R 777 /tmp/opensipsdb/

consul-template -consul-addr "consul:8500" -template '/tmp/dispatcher.list.tpl:/etc/kamailio/dispatcher.list' &

refreshDispatcher &

/run.sh