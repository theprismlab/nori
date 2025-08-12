# --- STAGE 1: Builder for s3fs-fuse ---
FROM debian:bookworm-slim as builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential automake pkg-config libcurl4-openssl-dev \
    libxml2-dev libssl-dev libfuse-dev wget \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN wget https://github.com/s3fs-fuse/s3fs-fuse/archive/v1.95.tar.gz && \
    tar -xzvf v1.95.tar.gz && \
    cd s3fs-fuse-1.95 && \
    ./autogen.sh && \
    ./configure --prefix=/usr/local && \
    make && \
    make install


# --- STAGE 2: Final Application Image ---
FROM rocker/r-ver:4.5

LABEL maintainer="John Davis <cmap-soft@broadinstitute.org>"
LABEL clue.sushi.pipeline.clue.io.version="0.0.1"
LABEL clue.sushi.pipeline.clue.io.vendor="PRISM/CMAP"

RUN apt-get update && apt-get install -y --no-install-recommends \
    fuse bzip2 git wget curl parallel libssl-dev libxml2-dev libcairo2-dev \
    libsqlite3-dev libmariadbd-dev libmariadb-dev-compat libpq-dev \
    libssh2-1-dev libhdf5-dev libcurl4-openssl-dev jq \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=builder /usr/local/bin/s3fs /usr/local/bin/s3fs

# --- NEW: Modern Python setup with uv ---
# Install uv
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

# --- START DEBUGGING COMMANDS ---
# 1. Find out which user is running the build
RUN echo "Build is running as user: $(whoami)"

# 2. Find the location of the uv binary
RUN echo "Searching for the 'uv' executable..." && find / -name "uv"
# --- END DEBUGGING COMMANDS ---


# Set the PATH for the final image and for subsequent RUN commands
ENV PATH="/root/.cargo/bin:${PATH}" # We will correct this path later

# Install Python 3.13 and create the venv using the absolute path to uv
RUN /root/.cargo/bin/uv python install 3.13 && \
    /root/.cargo/bin/uv venv /opt/venv --python 3.13

# Copy requirements and install them into the venv
COPY nori-base/requirements.txt .
RUN /opt/venv/bin/uv pip sync requirements.txt
# --- End of uv setup ---

# Install R packages
COPY ./fastq-processing/install_packages.R /src/install_packages.R
RUN Rscript /src/install_packages.R

# Create application directories and copy scripts
RUN mkdir -p /cmap/bin/sushi/ /clue/bin /data
COPY ./scripts /cmap/bin/sushi/scripts
COPY ./fastq-processing/aws_batch.sh /clue/bin/aws_batch
RUN chmod +x /clue/bin/aws_batch && \
    find /cmap/bin/sushi/scripts -type f -exec chmod +x {} +

# Set final PATH to include both the Python venv and the clue binaries
WORKDIR /
ENV PATH="/opt/venv/bin:/clue/bin:${PATH}"
ENTRYPOINT ["aws_batch"]
CMD ["-help"]