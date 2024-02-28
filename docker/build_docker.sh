#!/usr/bin/env bash

cd ../

docker build -t prismcmap/sushi:testing --rm=true -f docker/Dockerfile .
