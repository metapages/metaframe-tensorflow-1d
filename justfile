###############################################################
# Minimal commands to develop, build, test, and deploy
###############################################################
# just docs: https://github.com/casey/just
set shell                          := ["bash", "-c"]
set dotenv-load                    := true
# E.g. 'my.app.com'. Some services e.g. auth need know the external endpoint for example OAuth
# The root domain for this app, serving index.html
export APP_FQDN                    := env_var_or_default("APP_FQDN", "metaframe1.dev")
export APP_PORT                    := env_var_or_default("APP_PORT", "443")
ROOT                               := env_var_or_default("GITHUB_WORKSPACE", `git rev-parse --show-toplevel`)
export CI                          := env_var_or_default("CI", "")
PACKAGE_NAME_SHORT                 := file_name(`cat package.json | jq -r '.name' | sd '.*/' ''`)
# Store the CI/dev docker image in github
export DOCKER_IMAGE_PREFIX         := "ghcr.io/metapages/" + PACKAGE_NAME_SHORT
# Always assume our current cloud ops image is versioned to the exact same app images we deploy
export DOCKER_TAG                  := `if [ "${GITHUB_ACTIONS}" = "true" ]; then echo "${GITHUB_SHA}"; else echo "$(git rev-parse --short=8 HEAD)"; fi`
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

# If not in docker, get inside
_help:
    #!/usr/bin/env bash
    # exit when any command fails
    set -euo pipefail
    if [ -f /.dockerenv ]; then
        echo ""
        just --list --unsorted --list-heading $'🏵  Commands: Metaframe Tensorflow 1D conv net 🔗 {{green}}https://metapages.github.io/{{PACKAGE_NAME_SHORT}}/{{normal}}\n';
        echo ""
    else
        just _docker;
    fi

# Run the dev server. Opens the web app in browser.
@dev:
    if [ -f /.dockerenv ]; then \
        just _dev; \
    else \
        just _mkcert; \
        open https://${APP_FQDN}:${APP_PORT}; \
        just _docker just _dev; \
    fi

_dev: _ensure_npm_modules (_tsc "--build")
    #!/usr/bin/env bash
    APP_ORIGIN=https://${APP_FQDN}:${APP_PORT}
    echo "Browser development pointing to: ${APP_ORIGIN}"
    VITE_APP_ORIGIN=${APP_ORIGIN} {{vite}} --clearScreen false

# Build the browser client static assets and npm module
build: (_tsc "--build") _browser_assets_build npm_build

@test: npm_build
    just test/test

# publish to npm and github pages.
publish npmversionargs="patch": _ensureGitPorcelain test (npm_version npmversionargs) npm_publish githubpages_publish
    @# Push the tags up
    git push origin v$(cat package.json | jq -r '.version')

# rebuild the client on changes, but do not serve
watch BUILD_SUB_DIR="./":
    watchexec -w src -w tsconfig.json -w package.json -w vite.config.ts -- just npm_build

# watch and serve browser client. Can't use vite to serve: https://github.com/vitejs/vite/issues/2754
serve BUILD_SUB_DIR="": (_browser_assets_build BUILD_SUB_DIR)
    cd docs && ../node_modules/http-server/bin/http-server --cors '*' -o {{BUILD_SUB_DIR}} -a {{APP_FQDN}} -p {{APP_PORT}} --ssl --cert ../.certs/{{APP_FQDN}}.pem --key ../.certs/{{APP_FQDN}}-key.pem

# build npm package for publishing
npm_build: _ensure_npm_modules
    mkdir -p dist
    rm -rf dist/*
    {{tsc}} --noEmit false
    @echo "  ✅ npm_build"

# bumps version, commits change, git tags
npm_version npmversionargs="patch":
    npm version {{npmversionargs}}

# If the npm version does not exist, publish the module
npm_publish: _require_NPM_TOKEN npm_build
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
    if [ ! -f .npmrc ]; then
        echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc
    fi
    npm publish --access public .

# deletesL .certs dist
clean:
    rm -rf .certs dist

# build production brower assets
_browser_assets_build BUILD_SUB_DIR="": _ensure_npm_modules
    mkdir -p docs/{{BUILD_SUB_DIR}}
    find docs/{{BUILD_SUB_DIR}} -maxdepth 1 -type f -exec rm "{}" \;
    rm -rf docs/{{BUILD_SUB_DIR}}/assets
    BUILD_SUB_DIR={{BUILD_SUB_DIR}} {{vite}} build --mode=production

# compile typescript src, may or may not emit artifacts
_tsc +args="": _ensure_npm_modules
    {{tsc}} {{args}}

# DEV: generate TLS certs for HTTPS over localhost https://blog.filippo.io/mkcert-valid-https-certificates-for-localhost/
_mkcert:
    #!/usr/bin/env bash
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
        echo -e "💥 Add below to /etc/hosts with this command: {{bold}}sudo vi /etc/hosts{{normal}} 💥";
        echo -e "";
        echo -e "{{bold}}127.0.0.1       {{APP_FQDN}}{{normal}}";
        echo -e "";
        exit 1;
    fi
    echo -e "✅ Local mkcert certificates and /etc/hosts contains: 127.0.0.1       {{APP_FQDN}}"

@_ensure_npm_modules:
    if [ ! -f "{{tsc}}" ]; then npm i && cd test && npm i; fi

# vite builder commands
@_vite +args="":
    {{vite}} {{args}}

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
    npm i
    just _browser_assets_build v$(cat package.json | jq -r .version)
    just _browser_assets_build
    # Now commit and push
    git add --all --force docs
    git commit -m "site v$(cat package.json | jq -r .version)"
    git push -uf origin gh-pages
    git checkout ${CURRENT_BRANCH}
    echo -e "👉 Github configuration (once): 🔗 https://github.com/$(git remote get-url origin | sd 'git@github.com:' '' | sd '.git' '')/settings/pages"
    echo -e "  - {{green}}Source{{normal}}"
    echo -e "    - {{green}}Branch{{normal}}: gh-pages 📁 /docs"

####################################################################################
# Ensure docker image for local and CI operations
# Hoist into a docker container with all require CLI tools installed
####################################################################################
# Hoist into a docker container with all require CLI tools installed
@_docker +args="bash": _build_docker
    echo -e "🌱 Entering docker context: {{bold}}{{DOCKER_IMAGE_PREFIX}}:{{DOCKER_TAG}} from <cloud/>Dockerfile 🚪🚪{{normal}}"
    mkdir -p {{ROOT}}/.tmp
    touch {{ROOT}}/.tmp/.bash_history
    touch {{ROOT}}/.tmp/.aliases
    if [ -f ~/.aliases ]; then cp ~/.aliases {{ROOT}}/.tmp/.aliases; fi
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
            -v {{PACKAGE_NAME_SHORT}}_node_modules:$WORKSPACE/node_modules \
            $(if [ -d $HOME/.gitconfig ]; then echo "-v $HOME/.gitconfig:/root/.gitconfig"; else echo ""; fi) \
            $(if [ -d $HOME/.ssh ]; then echo "-v $HOME/.ssh:/root/.ssh"; else echo ""; fi) \
            -p {{APP_PORT}}:{{APP_PORT}} \
            --add-host {{APP_FQDN}}:127.0.0.1 \
            -w $WORKSPACE \
            {{DOCKER_IMAGE_PREFIX}}:{{DOCKER_TAG}} {{args}} || true

# @_docker +args="bash": _build_docker
#     echo -e "🌱 Entering docker context: {{bold}}{{DOCKER_IMAGE_PREFIX}}:{{DOCKER_TAG}} from <cloud/>Dockerfile 🚪🚪{{normal}}"
#     mkdir -p {{ROOT}}/.tmp
#     touch {{ROOT}}/.tmp/.bash_history
#     export WORKSPACE=/repo && \
#         docker run \
#             --rm \
#             -ti \
#             -e DOCKER_IMAGE_PREFIX=${DOCKER_IMAGE_PREFIX} \
#             -e PS1="< \w/> " \
#             -e PROMPT="<%/% > " \
#             -e DOCKER_IMAGE_PREFIX={{DOCKER_IMAGE_PREFIX}} \
#             -e HISTFILE=$WORKSPACE/.tmp/.bash_history \
#             -e WORKSPACE=$WORKSPACE \
#             $(if [ -f .env ]; then echo "-v {{ROOT}}/.env:$WORKSPACE/.env"; else echo ""; fi) \
#             -v {{ROOT}}/.certs:$WORKSPACE/.certs \
#             -v {{ROOT}}/.dockerignore:$WORKSPACE/.dockerignore \
#             -v {{ROOT}}/.git:$WORKSPACE/.git \
#             -v {{ROOT}}/.github:$WORKSPACE/.github \
#             -v {{ROOT}}/.gitignore:$WORKSPACE/.gitignore \
#             $(if [ -f .npmrc ]; then echo "-v {{ROOT}}/.npmrc:$WORKSPACE/.npmrc"; else echo ""; fi) \
#             -v {{ROOT}}/dist:$WORKSPACE/dist \
#             -v {{ROOT}}/Dockerfile:$WORKSPACE/Dockerfile \
#             -v {{ROOT}}/docs:$WORKSPACE/docs \
#             -v {{ROOT}}/index.html:$WORKSPACE/index.html \
#             -v {{ROOT}}/justfile:$WORKSPACE/justfile \
#             -v {{ROOT}}/package-lock.json:$WORKSPACE/package-lock.json \
#             -v {{ROOT}}/package.json:$WORKSPACE/package.json \
#             -v {{ROOT}}/public:$WORKSPACE/public \
#             -v {{ROOT}}/README.md:$WORKSPACE/README.md \
#             -v {{ROOT}}/src:$WORKSPACE/src \
#             -v {{ROOT}}/test:$WORKSPACE/test \
#             -v {{ROOT}}/tsconfig.json:$WORKSPACE/tsconfig.json \
#             -v {{ROOT}}/vite.config.ts:$WORKSPACE/vite.config.ts \
#             -v $HOME/.gitconfig:/root/.gitconfig \
#             -v $HOME/.ssh:/root/.ssh \
#             -p {{APP_PORT}}:{{APP_PORT}} \
#             --add-host {{APP_FQDN}}:127.0.0.1 \
#             -w $WORKSPACE \
#             {{DOCKER_IMAGE_PREFIX}}:{{DOCKER_TAG}} {{args}} || true

# If the ./app docker image in not build, then build it
_build_docker:
    #!/usr/bin/env bash
    set -euo pipefail

    if [[ "$(docker images -q {{DOCKER_IMAGE_PREFIX}}:{{DOCKER_TAG}} 2> /dev/null)" == "" ]]; then
        echo -e "🌱🌱  ➡ {{bold}}Building docker image ...{{normal}} 🚪🚪 ";
        echo -e "🌱 </> {{bold}}docker build -t {{DOCKER_IMAGE_PREFIX}}:{{DOCKER_TAG}} . {{normal}}🚪 ";
        docker build -t {{DOCKER_IMAGE_PREFIX}}:{{DOCKER_TAG}} . ;
    fi

_ensure_inside_docker:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ ! -f /.dockerenv ]; then
        echo -e "🌵🔥🌵🔥🌵🔥🌵 Not inside a docker container. First run the command: 'just' 🌵🔥🌵🔥🌵🔥🌵"
        exit 1
    fi

@_ensureGitPorcelain:
    if [ ! -z "$(git status --untracked-files=no --porcelain)" ]; then \
        echo -e " ❗ Uncommitted files:"; \
        git status --untracked-files=no --porcelain; \
        exit 1; \
    fi

@_require_NPM_TOKEN:
	if [ -z "{{NPM_TOKEN}}" ]; then echo "Missing NPM_TOKEN env var"; exit 1; fi
