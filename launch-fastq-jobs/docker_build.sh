#!/usr/bin/env bash

#change the version number for each new build
docker build --platform linux/amd64 -t prismcmap/launchfastqproc:latest --rm=true .

