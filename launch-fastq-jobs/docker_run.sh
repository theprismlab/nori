#!/usr/bin/env bash
docker run --rm \
--name launchFastQProc \
-v ~/work/1_Projects/fastq_processing/:/prism/data/  \
-v ~/.aws/:/root/.aws/ \
-e S3_BUCKET=data-share.theprismlab.org \
-e WORK_DIR=/prism/data/out/ \
-e WALKUP_PATH=genomics-platform/WALKUP-16118 \
-e CHUNK_SIZE=30 \
-it prismcmap/fastq-processing:latest

