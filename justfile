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
CLIENT_PUBLISH_DIR := invocation_directory() + "/.tmp/docs-temp"
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

build: browser-assets-build server-build npm-build

# build production brower assets
browser-assets-build:
    rm -rf {{CLIENT_PUBLISH_DIR}}
    mkdir -p {{CLIENT_PUBLISH_DIR}}
    {{typescriptBrowser}} --noEmit
    ./node_modules/parcel-bundler/bin/cli.js build --out-dir {{CLIENT_PUBLISH_DIR}} index.html
    cp package.json {{CLIENT_PUBLISH_DIR}}/

server-build:
    rm -rf server.js*
    ./node_modules/typescript/bin/tsc -p tsconfig-server.json

server-start: clean build
    node server.js

# publish to npm and github pages
publish npmversionargs="patch":
    just npm-publish {{npmversionargs}}
    just githubpages-publish

# using justfile dependencies failed, the last command would not run
# https://zellwk.com/blog/publish-to-npm/
npm-publish npmversionargs="patch":
    just _ensureGitPorcelain
    just _npm-clean
    just test
    just npm-version {{npmversionargs}}
    just npm-publish

npm-publish: npm-build
    #!/usr/bin/env deno run --allow-read={{NPM_PUBLISH_DIR}}/package.json --allow-run --allow-write={{NPM_PUBLISH_DIR}}/.npmrc
    import { npmPublish } from '{{DENO_DEPS}}';
    console.log("NPM_PUBLISH_DIR={{NPM_PUBLISH_DIR}}");
    npmPublish({cwd:'{{NPM_PUBLISH_DIR}}', npmToken:'{{NPM_TOKEN}}'});

# bumps version, commits change, git tags
npm-version npmversionargs="patch":
    #!/usr/bin/env deno run --allow-run
    import { npmVersion } from '{{DENO_DEPS}}';
    await npmVersion({npmVersionArg:'{{npmversionargs}}'});

# build npm package for publishing
npm-build:
    echo " NPM BUILD"
    rm -rf {{NPM_PUBLISH_DIR}}
    mkdir -p {{NPM_PUBLISH_DIR}}
    echo "middle just npm-build"
    # cat package.json | jq .
    cp package.json {{NPM_PUBLISH_DIR}}/
    {{typescriptNpm}}
    echo "end just npm-build"
    cat package.json | jq .

_npm-clean:
    echo " NPM CLEAN"
    rm -rf {{NPM_PUBLISH_DIR}}

_ensureGitPorcelain:
    #!/usr/bin/env deno run --allow-run
    import { ensureGitNoUncommitted } from '{{DENO_DEPS}}';
    await ensureGitNoUncommitted();

test: npm-build
    cd {{NPM_PUBLISH_DIR}} && npm link
    just test/test
    cd {{NPM_PUBLISH_DIR}} && npm unlink
    echo "After just test"
    # cat package.json | jq .
    rm -rf {{NPM_PUBLISH_DIR}}

# update "docs" branch with the (versioned and default) current build
githubpages-publish: _ensureGitPorcelain
    just browser-assets-build
    mkdir -p docs
    rm -rf docs/v`cat package.json | jq -r .version`
    find docs/ -maxdepth 1 -type f -exec rm "{}" \;
    cp -r {{CLIENT_PUBLISH_DIR}} docs/v`cat package.json | jq -r .version`
    cp {{CLIENT_PUBLISH_DIR}}/* docs/
    git add --all docs
    git commit -m 'site v`cat package.json | jq -r .version`'
    git push origin master

# # update branch:glitch to master, triggering a glitch update and rebuild
# publish-glitch: build
#     npm run clean
#     @# delete current glitch branch, no worries, it gets rebuilt every time
#     git branch -D glitch || exit 0
#     git checkout -b glitch
#     git push -u --force origin glitch
#     git checkout master

# watchexec --watch src --exts ts,html -- just browser-assets-build
# watches and builds browser client assets  (alternative to 'just run')
@client-watch:
    {{typescriptBrowser}}
    {{parcel}} watch --out-dir public index.html

# paired with client-watch (alternative to 'just run')
@watch-server:
    watchexec --restart --watch server.ts -- "npm run server-build && HTTPS={{HTTPS}} node server.js"

# starts a dev server [port 1234] (alternative to 'just client-watch' && 'just watch-server')
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
    rm -rf .tmp

# DEV: generate TLS certs for HTTPS over localhost https://blog.filippo.io/mkcert-valid-https-certificates-for-localhost/
_mkcert:
    rm -rf {{certs}}
    mkdir -p {{certs}}
    cd {{certs}}/ && mkcert -cert-file cert.pem -key-file cert-key.pem metaframe-1d-trainer.local localhost
    @echo "Don't forget to add '127.0.0.1 metaframe-1d-trainer.local' to /etc/hosts"

@_require_NPM_TOKEN:
	if [ -z "{{NPM_TOKEN}}" ]; then echo "Missing NPM_TOKEN env var"; exit 1; fi