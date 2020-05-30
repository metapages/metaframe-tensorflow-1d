# This is half done. It's all client side for now, but there's a server 
# serving everything also. Want to api/websocket that punk but not now

parcel             := "./node_modules/parcel-bundler/bin/cli.js"
typescriptCheck    := "./node_modules/typescript/bin/tsc --build tsconfig-browser.json"
certs              := ".certs"
HTTPS              := env_var_or_default("HTTPS", "true")
NPM_TOKEN          := env_var_or_default("NPM_TOKEN", "")
DENO_DEPS          := invocation_directory() + "/deps.ts"
CLIENT_PUBLISH_DIR := invocation_directory() + "/docs"

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

build: build-client

# build production brower assets
build-client:
    rm -rf {{CLIENT_PUBLISH_DIR}}/*
    {{typescriptCheck}}
    ./node_modules/parcel-bundler/bin/cli.js build --out-dir {{CLIENT_PUBLISH_DIR}} index.html
    cp -r src/* {{CLIENT_PUBLISH_DIR}}/
    cp package.json {{CLIENT_PUBLISH_DIR}}/

build-server:
    rm -rf server.js*
    ./node_modules/typescript/bin/tsc -p tsconfig-server.json

start-server: clean build
    node server.js

# deno  deno.ts
# @echo "PUBLISHING npm version `cat package.json | jq -r '.version'`"
# echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> {{CLIENT_PUBLISH_DIR}}/.npmrc
# cd {{CLIENT_PUBLISH_DIR}}; npm publish .
# bump npm version ; commit and git tag ; npmversionargs #https://docs.npmjs.com/cli/version
publish +npmversionargs="": 
    #!/usr/bin/env deno run --allow-read=package.json --allow-run --allow-write={{invocation_directory()}}/{{CLIENT_PUBLISH_DIR}}/.npmrc
    import { npmPublish, npmVersion } from '{{DENO_DEPS}}';
    await npmVersion({npmVersionArg:'{{npmversionargs}}'});
    //npmPublish({artifactDirectory:'{{CLIENT_PUBLISH_DIR}}', npmToken:'{{NPM_TOKEN}}'});
    

# https://zellwk.com/blog/publish-to-npm/
publish-npm: _require_NPM_TOKEN build-client
	@echo "PUBLISHING npm version `cat package.json | jq -r '.version'`"
	echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" >> {{CLIENT_PUBLISH_DIR}}/.npmrc
	cd {{CLIENT_PUBLISH_DIR}}; npm publish .

# update branch:glitch to master, triggering a glitch update and rebuild
publish-glitch: build
    npm run clean
    @# delete current glitch branch, no worries, it gets rebuilt every time
    git branch -D glitch || exit 0
    git checkout -b glitch
    git push -u --force origin glitch
    git checkout master

# watchexec --watch src --exts ts,html -- just build-client
# watches and builds browser client assets  (alternative to 'just run')
@watch-client:
    {{typescriptCheck}}
    {{parcel}} watch --out-dir public index.html

# paired with watch-client (alternative to 'just run')
@watch-server:
    watchexec --restart --watch server.ts -- "npm run build-server && HTTPS={{HTTPS}} node server.js"

# starts a dev server [port 1234] (alternative to 'just watch-client' && 'just watch-server')
run: cert-check
    {{typescriptCheck}}
    {{parcel}} --cert {{certs}}/cert.pem \
               --key {{certs}}/cert-key.pem \
               --port 3000 \
               --host metaframe-1d-trainer.local \
               --hmr-hostname metaframe-1d-trainer.local \
               --hmr-port 3001 \
               index.html

run2: cert-check
    {{typescriptCheck}}
    {{parcel}} --port 3000 \
               --host metaframe-1d-trainer.local \
               --hmr-hostname metaframe-1d-trainer.local \
               --hmr-port 3001 \
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

@_require_NPM_TOKEN:
	if [ -z "{{NPM_TOKEN}}" ]; then echo "Missing NPM_TOKEN env var"; exit 1; fi