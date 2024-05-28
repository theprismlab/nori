#!/usr/bin/env bash
DOCKER_TAG="testing"


#change the version number for each new build
docker build --platform linux/amd64 -t prismcmap/fastq-chunk:${DOCKER_TAG} --rm=true .

docker push prismcmap/fastq-chunk:${DOCKER_TAG}