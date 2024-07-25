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

if [[ ! -z $BC_LENGTHS ]]
then
  bc_lengths_arg="-l $BC_LENGTHS"
  echo Barcode lengths flag added
fi

if [[ ! -z "${AWS_BATCH_JOB_ARRAY_INDEX}" ]]
then
  batch_index=${AWS_BATCH_JOB_ARRAY_INDEX}
else
  batch_index=0
fi

CHUNK_FILE=$WORK_DIR/"chunk-files"/"fastq-chunk-"${batch_index}".txt"
OUT_DIR=$WORK_DIR/raw-count-parts/part-${batch_index}
mkdir -p $OUT_DIR
echo Rscript fastq2readcount.R --out $OUT_DIR --fastq_chunk_file $CHUNK_FILE $bc_lengths_arg
Rscript fastq2readcount.R --out $OUT_DIR --fastq_chunk_file $CHUNK_FILE $bc_lengths_arg

exit_code=$?
#echo "$exit_code"
exit $exit_code
