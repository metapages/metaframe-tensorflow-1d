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
    printf "🏵 Metaframe: Tensorflow 1D conv net:    https://metapages.github.io/metaframe-predictor-conv-1d-net/\n"
    printf "\n"
    just --list

# Install required dependencies
init:
    npm i

build: (browser-assets-build "./docs") server-build npm-build

# build production brower assets
browser-assets-build out-dir="./docs" public-url="./":
    mkdir -p {{out-dir}}
    find {{out-dir}}/ -maxdepth 1 -type f -exec rm "{}" \;
    {{typescriptBrowser}} --noEmit
    ./node_modules/parcel-bundler/bin/cli.js build index.html --out-dir={{out-dir}} --public-url={{public-url}}
    cp package.json {{out-dir}}/


# using justfile dependencies failed, the last command would not run
# publish to npm and github pages.
publish npmversionargs="patch":
    just _ensureGitPorcelain
    just _npm-clean
    just test
    just npm-version {{npmversionargs}}
    just npm-publish
    just githubpages_publish

# https://zellwk.com/blog/publish-to-npm/
npm-publish: npm-build
    #!/usr/bin/env deno run --allow-read={{NPM_PUBLISH_DIR}}/package.json --allow-run --allow-write={{NPM_PUBLISH_DIR}}/.npmrc
    import { npmPublish } from '{{DENO_DEPS}}';
    npmPublish({cwd:'{{NPM_PUBLISH_DIR}}', npmToken:'{{NPM_TOKEN}}'});

# bumps version, commits change, git tags
npm-version npmversionargs="patch":
    #!/usr/bin/env deno run --allow-run
    import { npmVersion } from '{{DENO_DEPS}}';
    await npmVersion({npmVersionArg:'{{npmversionargs}}'});

# build npm package for publishing
npm-build: _npm-clean
    @# mkdir -p {{NPM_PUBLISH_DIR}}
    @# rm -rf {{NPM_PUBLISH_DIR}}/*
    cp package.json {{NPM_PUBLISH_DIR}}/
    {{typescriptNpm}}

_npm-clean:
    mkdir -p {{NPM_PUBLISH_DIR}}
    rm -rf {{NPM_PUBLISH_DIR}}/*

_ensureGitPorcelain:
    #!/usr/bin/env deno run --allow-run
    import { ensureGitNoUncommitted } from '{{DENO_DEPS}}';
    await ensureGitNoUncommitted();

test: npm-build
    cd {{NPM_PUBLISH_DIR}} && npm link
    just test/test
    cd {{NPM_PUBLISH_DIR}} && npm unlink
    rm -rf {{NPM_PUBLISH_DIR}}/*

# update "docs" branch with the (versioned and default) current build
githubpages_publish: _ensureGitPorcelain
    just browser-assets-build ./docs/v`cat package.json | jq -r .version`
    just browser-assets-build
    git add --all docs
    git commit -m "site v`cat package.json | jq -r .version`"
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
