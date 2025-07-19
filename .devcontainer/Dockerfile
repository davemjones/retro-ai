FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bullseye

# Install additional OS packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends postgresql-client

# Install global node packages
RUN su node -c "npm install -g npm@latest prisma"

# Set the working directory
WORKDIR /workspace

# Switch to node user
USER node