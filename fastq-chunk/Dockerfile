FROM node:18-bullseye
MAINTAINER John Davis <jdavis@broadinstitute.org>

# Install dependencies first
RUN apt-get update && apt-get install -y \
    zip \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    aws --version

WORKDIR /usr/src/app

# Copy package files first (for better Docker layer caching)
COPY fastq-chunk/package*.json ./

# Install npm dependencies
RUN npm install

# Copy the rest of the application code
COPY fastq-chunk/ ./

ENTRYPOINT ["node","launch.js"]