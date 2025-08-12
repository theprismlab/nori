# Start from a modern, slim Node.js Long-Term Support (LTS) image
FROM node:22-bookworm-slim

# Use LABEL instead of the deprecated MAINTAINER
LABEL maintainer="Jacob Asiedu <cmap-soft@broadinstitute.org>"
LABEL prism-data-warehouse.prism.org.version="0.0.1"
LABEL prism-data-warehouse.prism.org.vendor="PRISM"

# Install dependencies, including ca-certificates, and clean up in a single layer
RUN apt-get update && apt-get install -y --no-install-recommends unzip curl ca-certificates && \
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip ./aws && \
    apt-get purge -y --auto-remove unzip curl && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory for the application
WORKDIR /usr/src/app

# Copy only the necessary files for installing dependencies first
COPY fastq-chunk/package.json fastq-chunk/package-lock.json* ./

# Install npm dependencies
RUN npm ci --only=production

# Copy the rest of the application source code
COPY fastq-chunk/ ./

# Set the default command to run the application
ENTRYPOINT ["node", "launch.js"]