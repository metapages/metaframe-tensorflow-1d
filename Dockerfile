
FROM node:12.10.0-alpine

RUN apk update && apk --no-cache add \
    bash \
    curl

# justfile https://github.com/casey/just
RUN VERSION=0.5.1 ; \
    SHA256SUM=13e3411f137bf7b94bc6844820f11725f98621cfea3244bd33943cfa1b4c81fc ; \
    curl -L -O https://github.com/casey/just/releases/download/v$VERSION/just-v$VERSION-x86_64-unknown-linux-musl.tar.gz && \
    (echo "$SHA256SUM  just-v$VERSION-x86_64-unknown-linux-musl.tar.gz" | sha256sum  -c -) && \
    mkdir -p /tmp/just && mv just-v$VERSION-x86_64-unknown-linux-musl.tar.gz /tmp/just && cd /tmp/just && \
    tar -xzf just-v$VERSION-x86_64-unknown-linux-musl.tar.gz && \
    mkdir -p /usr/local/bin && mv /tmp/just/just /usr/local/bin/ && rm -rf /tmp/just
# just tweak: unify the just binary location on host and container platforms because otherwise the shebang doesn't work properly due to no string token parsing (it gets one giant string)
ENV PATH $PATH:/usr/local/bin

# watchexec for live reloading in development https://github.com/watchexec/watchexec
RUN VERSION=1.12.0 ; \
    SHA256SUM=1c952ee81d3a790128f536044588a5604d614c6c160a96b0139ddabaef58f32e ; \
    curl -L -O https://github.com/watchexec/watchexec/releases/download/$VERSION/watchexec-$VERSION-i686-unknown-linux-musl.tar.xz && \
    (echo "$SHA256SUM  watchexec-${VERSION}-i686-unknown-linux-musl.tar.xz" | sha256sum -c) && \
    tar xvf watchexec-$VERSION-i686-unknown-linux-musl.tar.xz watchexec-$VERSION-i686-unknown-linux-musl/watchexec -C /usr/bin/ --strip-components=1 && \
    rm -rf watchexec-*

RUN npm install -g npm@6.12.0 typescript@3.6.3

ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV
RUN echo "NODE_ENV=$NODE_ENV"

WORKDIR /workspace/metaframes/tensorflow-convnet-1d
COPY package.json ./
COPY package-lock.json ./
RUN npm i

COPY tsconfig.json ./
COPY src ./src
COPY index.html ./
COPY justfile ./
RUN just build

ENV PORT 1234

HEALTHCHECK --interval=4s --timeout=2s --retries=20 --start-period=2s CMD curl --fail http://localhost:1234 || exit 1
