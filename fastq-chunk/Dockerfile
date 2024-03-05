FROM node:16.13.1
MAINTAINER Jacob Asiedu <cmap-soft@broadinstitute.org>

LABEL prism-data-warehouse.prism.org.version="0.0.1"
LABEL prism-data-warehouse.prism.org.vendor="PRISM"

# zip
RUN apt-get update && apt-get install -y zip && \
    rm -rf /var/lib/apt/lists/*

# aws
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip
RUN ./aws/install && aws --version

WORKDIR /usr/src/app
COPY . .

RUN npm install

ENTRYPOINT ["node","launch.js"]



