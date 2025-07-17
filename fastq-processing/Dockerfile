FROM python:3.9-slim
MAINTAINER Anup Jonchhe <cmap-soft@broadinstitute.org>
LABEL clue.sushi.pipeline.clue.io.version="0.0.1"
LABEL clue.sushi.pipeline.clue.io.vendor="PRISM/CMAP"

RUN apt-get -y update && \
    apt-get install -y --fix-missing curl bzip2 git wget build-essential automake libcurl4-openssl-dev libxml2-dev pkg-config libssl-dev libfuse-dev parallel

RUN mkdir -p /cmap/bin && \
mkdir -p /cmap/bin/sushi/

RUN wget https://github.com/s3fs-fuse/s3fs-fuse/archive/v1.86.tar.gz && \
    tar -xzvf v1.86.tar.gz && \
    cd s3fs-fuse-1.86 && \
    ./autogen.sh && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    rm -rf s3fs-fuse-1.86 v1.86.tar.gz

RUN mkdir /data

# Install Python dependencies
COPY ./fastq-processing/requirements.txt /src/requirements.txt
RUN pip install --no-cache-dir -r /src/requirements.txt

COPY ./scripts /cmap/bin/sushi/scripts
COPY ./fastq-processing/aws_batch.sh /clue/bin/aws_batch

WORKDIR /
ENV PATH /clue/bin:$PATH
RUN ["chmod","-R", "+x", "/cmap/bin"]
RUN ["chmod", "+x", "/cmap/bin/sushi/scripts/fastq2readcount.py"]
ENTRYPOINT ["aws_batch"]

CMD ["-help"]
