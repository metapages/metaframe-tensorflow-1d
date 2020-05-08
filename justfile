parcel := "./node_modules/parcel-bundler/bin/cli.js"
tsc    := "./node_modules/typescript/bin/tsc"
certs  := ".certs"

@_help:
    printf "🏵 Metaframe: Tensorflow 1D conv net\n"
    printf "\n"
    just --list

# Install required dependencies
init:
    npm i

# Idempotent. 
@cert-check:
    if [ ! -f {{certs}}/cert-key.pem ]; then \
        just _mkcert; \
    fi

# build production asset
build:
    {{tsc}} --noEmit
    {{parcel}} build index.html

# watches and builds assets
@watch:
    watchexec --watch src --exts ts,html -- just build

# starts a dev server [port 1234]
run: cert-check
    {{tsc}} --noEmit
    {{parcel}} --cert {{certs}}/cert.pem \
               --key {{certs}}/cert-key.pem \
               --port 1234 \
               --host metaframe-1d-trainer.local \
               --hmr-hostname metaframe-1d-trainer.local \
               --hmr-port 1235 \
               index.html

# Removes generated files
clean:
    rm -rf {{certs}}
    rm -rf node_modules

# DEV: generate TLS certs for HTTPS over localhost https://blog.filippo.io/mkcert-valid-https-certificates-for-localhost/
_mkcert:
    rm -rf {{certs}}
    mkdir -p {{certs}}
    cd {{certs}}/ && mkcert -cert-file cert.pem -key-file cert-key.pem metaframe-1d-trainer.local localhost
    @echo "Don't forget to add '127.0.0.1 metaframe-1d-trainer.local' to /etc/hosts"
