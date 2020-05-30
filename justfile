# This is half done. It's all client side for now, but there's a server 
# serving everything also. Want to api/websocket that punk but not now

parcel             := "./node_modules/parcel-bundler/bin/cli.js"
typescriptBrowser  := "./node_modules/typescript/bin/tsc --project tsconfig-browser.json"
typescriptNpm      := "./node_modules/typescript/bin/tsc --project tsconfig-npm.json"
certs              := ".certs"
HTTPS              := env_var_or_default("HTTPS", "true")
NPM_TOKEN          := env_var_or_default("NPM_TOKEN", "")
DENO_DEPS          := invocation_directory() + "/deps.ts"
# github only publishes from the "docs" directory
CLIENT_PUBLISH_DIR := invocation_directory() + "/docs"
NPM_PUBLISH_DIR    := invocation_directory() + "/dist"

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
    mkdir -p {{CLIENT_PUBLISH_DIR}}
    @# Do not delete the sub folders with prior published versions
    find {{CLIENT_PUBLISH_DIR}}/ -maxdepth 1 -type f -exec rm "{}" \;
    {{typescriptBrowser}} --noEmit
    ./node_modules/parcel-bundler/bin/cli.js build --out-dir {{CLIENT_PUBLISH_DIR}} index.html
    @#cp -r src/* {{CLIENT_PUBLISH_DIR}}/
    cp package.json {{CLIENT_PUBLISH_DIR}}/


build-server:
    rm -rf server.js*
    ./node_modules/typescript/bin/tsc -p tsconfig-server.json

start-server: clean build
    node server.js

# bump npm version ; commit and git tag ; npmversionargs #https://docs.npmjs.com/cli/version
# publish +npmversionargs="patch": (publishNpm npmversionargs) publishGithubPages

# test
publishNpm +npmversionargs="patch": _ensureGitPorcelain test (_npmVersion npmversionargs) npmBuild
    #!/usr/bin/env deno run --allow-read=dist/package.json --allow-run --allow-write={{NPM_PUBLISH_DIR}}/.npmrc
    import { npmPublish } from '{{DENO_DEPS}}';
    npmPublish({cwd:'{{NPM_PUBLISH_DIR}}', npmToken:'{{NPM_TOKEN}}'});

# build npm package for publishing
npmBuild:
    rm -rf {{NPM_PUBLISH_DIR}}
    mkdir -p {{NPM_PUBLISH_DIR}}
    {{typescriptNpm}}
    cp package.json {{NPM_PUBLISH_DIR}}/

_ensureGitPorcelain:
    #!/usr/bin/env deno run --allow-run
    import { ensureGitNoUncommitted } from '{{DENO_DEPS}}';
    await ensureGitNoUncommitted();

test: npmBuild
    cd dist && npm link
    just test/test
    cd dist && npm unlink

# ./node_modules/parcel-bundler/bin/cli.js build --out-dir {{CLIENT_PUBLISH_DIR}} index.html
# @#cp -r src/* {{CLIENT_PUBLISH_DIR}}/
# cp package.json {{CLIENT_PUBLISH_DIR}}/

# bumps version, commits change, git tags
_npmVersion +npmversionargs="patch":
    #!/usr/bin/env deno run --allow-run
    import { npmVersion } from '{{DENO_DEPS}}';
    await npmVersion({npmVersionArg:'{{npmversionargs}}'});

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
    {{typescriptBrowser}}
    {{parcel}} watch --out-dir public index.html

# paired with watch-client (alternative to 'just run')
@watch-server:
    watchexec --restart --watch server.ts -- "npm run build-server && HTTPS={{HTTPS}} node server.js"

# starts a dev server [port 1234] (alternative to 'just watch-client' && 'just watch-server')
run: cert-check
    {{typescriptBrowser}}
    {{parcel}} --cert {{certs}}/cert.pem \
               --key {{certs}}/cert-key.pem \
               --port 3000 \
               --host metaframe-1d-trainer.local \
               --hmr-hostname metaframe-1d-trainer.local \
               --hmr-port 3001 \
               index.html

run2: cert-check
    {{typescriptBrowser}}
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