#!/usr/bin/env bash
docker run --rm \
--name launchFastQProc \
-v /foo/data/:/prism/data/  \
-v /bar/:/root/.credentials/ \
-e AWS_SHARED_CREDENTIALS_FILE=/root/.credentials/aws.credentials \
-e bucketName=data-share.theprismlab.org \
-e datasetId=prism  \
-e tableId=auditTrail \
-e csvFile=/prism/data/foo/test.csv \
-it prismcmap/portaluploads

