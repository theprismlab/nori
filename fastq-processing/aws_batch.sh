#!/bin/bash
cd /cmap/bin/sushi/scripts/

if [[ ! -z $USE_ECS ]]
then
  ecs="-o ecs"
  echo ECS flag added
fi

if [[ ! -z $DATA_BUCKET ]]
then
  s3fs ${DATA_BUCKET} /data -o use_path_request_style $ecs
  echo s3fs ${DATA_BUCKET} /data -o use_path_request_style $ecs
  ls /data/
  echo Bucket mounted
fi

if [[ ! -z "${AWS_BATCH_JOB_ARRAY_INDEX}" ]]
then
  CHUNK_FILE=$WORK_DIR/"chunk-files"/"fastq-chunk-"${AWS_BATCH_JOB_ARRAY_INDEX}".txt"
  OUT_DIR=$WORK_DIR/raw-count-parts/part-${AWS_BATCH_JOB_ARRAY_INDEX}
  mkdir -p $OUT_DIR
  echo Rscript fastq2readcount.R --out $OUT_DIR --fastq_chunk_file $CHUNK_FILE
  Rscript fastq2readcount.R --out $OUT_DIR --fastq_chunk_file $CHUNK_FILE
else
  Rscript fastq2readcount.R "${@}"
fi

exit_code=$?
#echo "$exit_code"
exit $exit_code
