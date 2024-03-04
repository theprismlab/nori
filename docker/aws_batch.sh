#!/bin/bash
cd /cmap/bin/sushi/scripts/

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
