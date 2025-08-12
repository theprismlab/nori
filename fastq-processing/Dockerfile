# Start from the nori-base image we built in the previous stage.
# Using a build argument for the tag ensures you use the version just built.
ARG IMAGE_TAG=latest
FROM prismcmap/nori-base:${IMAGE_TAG}

# Add labels specific to this image
LABEL maintainer="Anup Jonchhe <cmap-soft@broadinstitute.org>"
LABEL clue.sushi.pipeline.clue.io.version="0.0.1"
LABEL clue.sushi.pipeline.clue.io.vendor="PRISM/CMAP"

# --- Application-Specific Setup ---

# Copy and install the R packages required ONLY for this pipeline.
# The path is correct relative to the project root build context.
COPY ./fastq-processing/install_packages.R /src/install_packages.R
RUN Rscript /src/install_packages.R

# The ENTRYPOINT and CMD are inherited from nori-base, but you can
# override them here if this image needs to run a different default command.
# Since nori-base also uses aws_batch, this is technically optional but good for clarity.
ENTRYPOINT ["aws_batch"]
CMD ["-help"]