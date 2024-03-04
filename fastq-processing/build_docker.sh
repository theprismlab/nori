#!/usr/bin/env bash

cd ../

docker build -t prismcmap/fastq-processing:testing --rm=true -f fastq-processing/Dockerfile .
