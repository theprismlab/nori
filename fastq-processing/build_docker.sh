#!/usr/bin/env bash
DOCKER_TAG="testing"

cd ../

docker build -t prismcmap/fastq-processing:${DOCKER_TAG} --rm=true -f fastq-processing/Dockerfile .

docker push prismcmap/fastq-processing:${DOCKER_TAG}
