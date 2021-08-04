# FROM denoland/deno:alpine
FROM denoland/deno:1.12.2
# this special glibc alpine version is needed for deno to run
# FROM frolvlad/alpine-glibc:alpine-3.12_glibc-2.32 as browser


# Runs as root, get security updates
RUN apt-get update && apt-get -y upgrade

RUN apt-get update && apt-get install -y \
  bash \
  curl \
  jq \
  git \
  software-properties-common \
  && rm -rf /var/lib/apt/lists/*

RUN curl -sL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install nodejs

# RUN apk --no-cache --update add \
#     bash \
#     curl \
#     git \
#     npm \
#     openssh

# justfile for running commands, you will mostly interact with just https://github.com/casey/just
RUN VERSION=0.9.1 ; \
    SHA256SUM=054d2e02804b635da051d33cb120d76963fc1dc027b21a2f618bf579632b9c94 ; \
    curl -L -O https://github.com/casey/just/releases/download/v$VERSION/just-v$VERSION-x86_64-unknown-linux-musl.tar.gz && \
    (echo "$SHA256SUM  just-v$VERSION-x86_64-unknown-linux-musl.tar.gz" | sha256sum  -c -) && \
    mkdir -p /tmp/just && mv just-v$VERSION-x86_64-unknown-linux-musl.tar.gz /tmp/just && cd /tmp/just && \
    tar -xzf just-v$VERSION-x86_64-unknown-linux-musl.tar.gz && \
    mkdir -p /usr/local/bin && mv /tmp/just/just /usr/local/bin/ && rm -rf /tmp/just
# just tweak: unify the just binary location on host and container platforms because otherwise the shebang doesn't work properly due to no string token parsing (it gets one giant string)
ENV PATH $PATH:/usr/local/bin
# alias "j" to just, it's just right there index finger
RUN echo '#!/bin/bash\njust "$@"' > /usr/bin/j && \
    chmod +x /usr/bin/j

# watchexec for live reloading in development https://github.com/watchexec/watchexec
RUN VERSION=1.14.1 ; \
    SHA256SUM=34126cfe93c9c723fbba413ca68b3fd6189bd16bfda48ebaa9cab56e5529d825 ; \
    curl -L -O https://github.com/watchexec/watchexec/releases/download/$VERSION/watchexec-$VERSION-i686-unknown-linux-musl.tar.xz && \
    (echo "$SHA256SUM  watchexec-${VERSION}-i686-unknown-linux-musl.tar.xz" | sha256sum -c) && \
    tar xvf watchexec-$VERSION-i686-unknown-linux-musl.tar.xz watchexec-$VERSION-i686-unknown-linux-musl/watchexec -C /usr/bin/ --strip-components=1 && \
    rm -rf watchexec-*

# WORKDIR /workspace
# ADD package.json ./
# ADD package-lock.json ./
# RUN npm i

# ADD test/package.json ./test/
# ADD test/package-lock.json ./test/
# RUN cd test && npm i
