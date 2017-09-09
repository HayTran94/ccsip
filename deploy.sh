#!/usr/bin/env bash

if [ ! -f .work/dropler/deploy.sh ]; then
  mkdir -p tmp
  git clone https://github.com/github1/dropler.git .work/dropler
fi

. .work/dropler/deploy.sh "${@:1}"