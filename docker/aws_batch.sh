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

# read in flagged arguments
case "$1" in
  fastq2readcount)
    shift
    Rscript fastq2readcount.R "${@}"
    ;;
  --help|-h)
    printf "Available commands:"
    echo *.R | sed 's/.R /\n/g'
    ;;
  *)
    printf "Unknown parameter: %s \n" "$1"
    printf "Available commands:\n\t"
    echo *.R | sed -r 's/.R\s?/\n\t/g'
    exit -1
    shift
    ;;
esac

exit_code=$?
#echo "$exit_code"
exit $exit_code
