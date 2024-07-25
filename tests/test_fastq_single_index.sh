#### TEST SUITE ####
#
#  Use build_docker.sh to build the docker image.
#  Make sure to change the docker tag to "develop"
#  Please minimize assets before adding to repo, and delete output after testing
#
#####
DOCKER_TAG="testing"
#rm -r ./assets/out/

##### fastq2readcounts ###
docker run -it --privileged \
    -v ~/.aws:/root/.aws:ro --cap-add SYS_ADMIN --device /dev/fuse \
    -v $PWD/assets/:/data_out -e DATA_BUCKET=data-share.theprismlab.org prismcmap/fastq-processing:$DOCKER_TAG \
    --fastq_chunk_file /data_out/chunks.txt \
    --out /data_out/out \
    -b _R1_

##Known value inside output file, aka ground truth
#FOUND_LINE=$(cat ./assets/out/raw_counts.csv | grep -c "ACAGGATG,AAGTAGAG,ACATTACTTCCATATACAACTAAT,49")
#
#if [ "$FOUND_LINE" -eq "1" ]; then
#    echo "fastq2readcounts test passed"
#else
#    echo "fastq2readcounts test failed"
#    exit 1
#fi

##### seq_to_mts ###
#aws s3 sync s3://macchiato.clue.io/builds/EPS001_reprocessed2/build/ $PWD/assets/build/
#fastq-processing run -it -v $PWD/assets/:/data prismcmap/sushi:$DOCKER_TAG seq_to_mts \
#    --build_path /data/build/ \
#    --out /data/build/s3/ \
#    --build_name EPS001
