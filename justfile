# just docs: https://github.com/casey/just

set shell                          := ["bash", "-c"]
ROOT                               := env_var_or_default("GITHUB_WORKSPACE", `git rev-parse --show-toplevel`)
export CI                          := env_var_or_default("CI", "")
PACKAGE_NAME_SHORT                 := file_name(`cat package.json | jq -r '.name'`)
# Store the CI/dev docker image in github
export DOCKER_IMAGE_PREFIX         := "ghcr.io/metapages/" + PACKAGE_NAME_SHORT
# Always assume our current cloud ops image is versioned to the exact same app images we deploy
export DOCKER_TAG                  := `if [ "${GITHUB_ACTIONS}" = "true" ]; then echo "${GITHUB_SHA}"; else echo "$(git rev-parse --short=8 HEAD)"; fi`
# E.g. 'my.app.com'. Some services e.g. auth need know the external endpoint for example OAuth
# The root domain for this app, serving index.html
export APP_FQDN                    := env_var_or_default("APP_FQDN", "metaframe1.dev")
export APP_PORT                    := env_var_or_default("APP_PORT", "443")
# Some commands use deno because it's great at this stuff
CLOUDSEED_DENO                     := "https://deno.land/x/cloudseed@v0.0.18"
# cache deno modules on the host so they can be transferred to the docker container
export DENO_DIR                    := ROOT + "/.tmp/deno"
# The NPM_TOKEN is required for publishing to https://www.npmjs.com
NPM_TOKEN                          := env_var_or_default("NPM_TOKEN", "")
vite                               := "VITE_APP_FQDN=" + APP_FQDN + " VITE_APP_PORT=" + APP_PORT + " NODE_OPTIONS='--max_old_space_size=16384' ./node_modules/vite/bin/vite.js"
tsc                                := "./node_modules/typescript/bin/tsc"
# minimal formatting, bold is very useful
bold                               := '\033[1m'
normal                             := '\033[0m'
green                              := "\\e[32m"
yellow                             := "\\e[33m"
blue                               := "\\e[34m"
magenta                            := "\\e[35m"
grey                               := "\\e[90m"

@_help:
    just --list --unsorted --list-heading $'🏵  Commands: Metaframe Tensorflow 1D conv net 🔗 {{green}}https://metapages.github.io/{{PACKAGE_NAME_SHORT}}/{{normal}}\n';

# Build the browser client static assets and npm module
build: _ensure_npm_modules (_tsc "--build") browser-assets-build npm_build

# Run the browser dev server (optionally pointing to any remote app)
dev: _ensure_npm_modules _mkcert (_tsc "--build")
    #!/usr/bin/env bash
    APP_ORIGIN=https://${APP_FQDN}:${APP_PORT}
    echo "Browser development pointing to: ${APP_ORIGIN}"
    VITE_APP_ORIGIN=${APP_ORIGIN} {{vite}}

# rebuild the client on changes, but do not serve
watch DOCS_SUB_DIR="./":
    watchexec -w src -w tsconfig.json -w package.json -w vite.config.ts -- just serve {{DOCS_SUB_DIR}}

# watch and serve browser client. Can't use vite to serve: https://github.com/vitejs/vite/issues/2754
serve DOCS_SUB_DIR="": (browser-assets-build DOCS_SUB_DIR)
    cd docs && ../node_modules/http-server/bin/http-server --cors '*' -o {{DOCS_SUB_DIR}} -a {{APP_FQDN}} -p {{APP_PORT}} --ssl --cert ../.certs/{{APP_FQDN}}.pem --key ../.certs/{{APP_FQDN}}-key.pem

# build production brower assets
@browser-assets-build DOCS_SUB_DIR="": _npm_install
    mkdir -p docs/{{DOCS_SUB_DIR}}
    find docs/{{DOCS_SUB_DIR}} -maxdepth 1 -type f -exec rm "{}" \;
    rm -rf docs/{{DOCS_SUB_DIR}}/assets
    @DOCS_SUB_DIR={{DOCS_SUB_DIR}} {{vite}} build

# publish to npm and github pages.
publish npmversionargs="patch":  _ensure_inside_docker _ensureGitPorcelain _npm_clean test (npm_version npmversionargs) npm_publish githubpages_publish

# https://zellwk.com/blog/publish-to-npm/
npm_publish_old: npm_build
    #!/usr/bin/env -S deno run --unstable --allow-read=package.json --allow-run --allow-write=.npmrc
    import { npmPublish } from '{{CLOUDSEED_DENO}}/npm/mod.ts';
    npmPublish({cwd:'.', npmToken:'{{NPM_TOKEN}}'});

# If the version does not exist, publish the packages (metaframe+metapage)
npm_publish: _require_NPM_TOKEN
    #!/usr/bin/env bash
    set -euo pipefail
    if [ "$CI" != "true" ]; then
        # This check is here to prevent publishing if there are uncommitted changes, but this check does not work in CI environments
        # because it starts as a clean checkout and git is not installed and it is not a full checkout, just the tip
        if [[ $(git status --short) != '' ]]; then
            git status
            echo -e '💥 Cannot publish with uncommitted changes'
            exit 2
        fi
    fi
    VERSION=$(cat package.json | jq -r '.version')
    INDEX=$(npm view $(cat package.json | jq -r .name) versions --json | jq "index( \"$VERSION\" )")
    if [ "$INDEX" != "null" ]; then
        echo -e '🌳 Version exists, not publishing'
        exit 0
    fi
    echo "PUBLISHING npm version $VERSION"
    echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
    npm publish --access public .

# bumps version, commits change, git tags
npm_version npmversionargs="patch":
    #!/usr/bin/env -S deno run --unstable --allow-run
    import { npmVersion } from '{{CLOUDSEED_DENO}}/npm/mod.ts';
    await npmVersion({npmVersionArg:'{{npmversionargs}}'});

# build npm package for publishing
npm_build: _npm_clean _npm_install
    {{tsc}} --noEmit false

# deletes .certs dist
clean:
    rm -rf .certs dist

@_npm_install:
    if [ ! -d "node_modules" ]; then \
        npm i --silent && cd test && npm i --silent ; \
    fi

@_npm_clean:
    mkdir -p dist
    rm -rf dist/*

@test: npm_build
    just test/test

# update "gh-pages" branch with the (versioned and default) current build (and keeping all previous versions)
githubpages_publish: _ensureGitPorcelain
    #!/usr/bin/env bash
    set -euo pipefail
    # Mostly CURRENT_BRANCH should be main, but maybe you are testing on a different branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ -z "$(git branch --list gh-pages)" ]; then
        git checkout -b gh-pages;
    fi
    git checkout gh-pages
    # Prefer changes in CURRENT_BRANCH, not our incoming gh-pages rebase
    git rebase -Xours ${CURRENT_BRANCH}
    just browser-assets-build ./v$(cat package.json | jq -r .version)
    just browser-assets-build
    git add --all docs
    git commit -m "site v$(cat package.json | jq -r .version)"
    git push -uf origin gh-pages
    git checkout ${CURRENT_BRANCH}

####################################################################################
# Ensure docker image for local and CI operations
# Hoist into a docker container with all require CLI tools installed
####################################################################################
# Hoist into a docker container with all require CLI tools installed
@docker: _build_docker
    echo -e "🚪🚪 Entering docker context: {{bold}}{{DOCKER_IMAGE_PREFIX}}cloud:{{DOCKER_TAG}} from <cloud/>Dockerfile 🚪🚪{{normal}}"
    mkdir -p {{ROOT}}/.tmp
    touch {{ROOT}}/.tmp/.bash_history

    # Hack for dealing with macos+docker+volume woes
    mkdir -p {{ROOT}}/node_modules
    chmod 777 {{ROOT}}/node_modules
    mkdir -p  {{ROOT}}/test/node_modules
    chmod 777 {{ROOT}}/test/node_modules

    export WORKSPACE=/repo && \
        docker run \
            --rm \
            -ti \
            -e DOCKER_IMAGE_PREFIX=${DOCKER_IMAGE_PREFIX} \
            -e PS1="< \w/> " \
            -e PROMPT="<%/% > " \
            -e DOCKER_IMAGE_PREFIX={{DOCKER_IMAGE_PREFIX}} \
            -e HISTFILE=$WORKSPACE/.tmp/.bash_history \
            -e WORKSPACE=$WORKSPACE \
            -v {{ROOT}}:$WORKSPACE \
            -v $HOME/.gitconfig:/root/.gitconfig \
            -v $HOME/.ssh:/root/.ssh \
            -v /var/run/docker.sock:/var/run/docker.sock \
            -w $WORKSPACE \
            {{DOCKER_IMAGE_PREFIX}}cloud:{{DOCKER_TAG}} bash || true

# If the ./app docker image in not build, then build it
@_build_docker:
    if [[ "$(docker images -q {{DOCKER_IMAGE_PREFIX}}cloud:{{DOCKER_TAG}} 2> /dev/null)" == "" ]]; then \
        echo -e "🚪🚪  ➡ {{bold}}Building docker image ...{{normal}} 🚪🚪 "; \
        echo -e "🚪 </> {{bold}}docker build -t {{DOCKER_IMAGE_PREFIX}}cloud:{{DOCKER_TAG}} . {{normal}}🚪 "; \
        docker build -t {{DOCKER_IMAGE_PREFIX}}cloud:{{DOCKER_TAG}} . ; \
    fi

_ensureGitPorcelain: _ensure_inside_docker
    #!/usr/bin/env -S deno run --unstable --allow-run --allow-read
    import { ensureGitNoUncommitted } from '{{CLOUDSEED_DENO}}/git/mod.ts';
    await ensureGitNoUncommitted();

# compile typescript src, may or may not emit artifacts
_tsc +args="":
    {{tsc}} {{args}}

# DEV: generate TLS certs for HTTPS over localhost https://blog.filippo.io/mkcert-valid-https-certificates-for-localhost/
_mkcert:
    #!/usr/bin/env bash
    echo -e "🚪 Check local mkcert certificates and /etc/hosts with APP_FQDN=${APP_FQDN}"
    if [ -n "$CI" ]; then
        echo "CI=$CI ∴ skipping mkcert"
        exit 0
    fi
    if [ -f /.dockerenv ]; then \
        echo "Inside docker context, assuming mkcert has been run on the host"
        exit 0;
    fi
    if ! command -v mkcert &> /dev/null; then echo "💥 {{bold}}mkcert{{normal}}💥 is not installed (manual.md#host-requirements): https://github.com/FiloSottile/mkcert"; exit 1; fi
    if [ ! -f .certs/{{APP_FQDN}}-key.pem ]; then
        mkdir -p .certs/ ;
        cd .certs/ && mkcert -cert-file {{APP_FQDN}}.pem -key-file {{APP_FQDN}}-key.pem {{APP_FQDN}} localhost ;
    fi
    if ! cat /etc/hosts | grep "{{APP_FQDN}}" &> /dev/null; then
        echo -e "";
        echo -e "💥 Add the line below to /etc/hosts: (with this command: sudo vi /etc/hosts )💥";
        echo -e "";
        echo -e "{{bold}}127.0.0.1       {{APP_FQDN}}{{normal}}";
        echo -e "";
        exit 1;
    fi

_ensure_inside_docker:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f /.dockerenv ]; then
        echo -e "🌵🔥🌵🔥🌵🔥🌵 Not inside a docker container. First run the command: 'just docker' 🌵🔥🌵🔥🌵🔥🌵"
        exit 1
    fi

_enter_docker:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f /.dockerenv ]; then
        just _docker || true
    fi

# vite builder commands
@_vite +args="":
    {{vite}} {{args}}

@_ensure_npm_modules:
    if [ ! -f "{{tsc}}" ]; then npm i; fi

@_require_NPM_TOKEN:
	if [ -z "{{NPM_TOKEN}}" ]; then echo "Missing NPM_TOKEN env var"; exit 1; fi
