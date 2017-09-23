#!/bin/bash

refreshDispatcher() {
  until pids=$(pidof kamailio)
  do
    sleep 1
  done
  sleep 5
  touch /etc/kamailio/dispatcher.list
}

consul-template -consul-addr consul:8500 -template '/tmp/dispatcher.list.tpl:/etc/kamailio/dispatcher.list' &

refreshDispatcher &

/run.sh