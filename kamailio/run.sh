#!/bin/bash

consul-template -consul-addr consul:8500 -template '/tmp/dispatcher.list.tpl:/etc/kamailio/dispatcher.list' &

/run.sh