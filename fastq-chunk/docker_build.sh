#!/usr/bin/env bash

#change the version number for each new build
docker build --platform linux/amd64 -t prismcmap/fastq-chunk:testing --rm=true .

docker push prismcmap/fastq-chunk:testing