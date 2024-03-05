#!/usr/bin/env bash

docker run \
-v /Users/jasiedu/.ssh/prism-google/:/root/.aws/ \
-it --entrypoint /bin/bash prismcmap/portaluploads:latest
