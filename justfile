# just docs: https://github.com/casey/just

set shell                          := ["bash", "-c"]
ROOT                               := env_var_or_default("GITHUB_WORKSPACE", `git rev-parse --show-toplevel`)
export DOCKER_IMAGE_PREFIX         := "ghcr.io/metapages/metaframe-predictor-conv-1d-net"
# Always assume our current cloud ops image is versioned to the exact same app images we deploy
export DOCKER_TAG                  := `if [ "${GITHUB_ACTIONS}" = "true" ]; then echo "${GITHUB_SHA}"; else echo "$(git rev-parse --short=8 HEAD)"; fi`
# E.g. 'my.app.com'. Some services e.g. auth need know the external endpoint for example OAuth
# The root domain for this app, serving index.html
export APP_FQDN                    := env_var_or_default("APP_FQDN", "metaframe1.dev")
export APP_PORT                    := env_var_or_default("APP_PORT", "443")
CLOUDSEED_DENO                     := "https://deno.land/x/cloudseed@v0.0.18"
NPM_PUBLISH_DIR                    := "./dist"
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
    just --list --unsorted --list-heading $'🏵  Commands: Metaframe Tensorflow 1D conv net 🔗 {{green}}https://metapages.github.io/metaframe-predictor-conv-1d-net/{{normal}}\n';

_help2:
    #!/usr/bin/env bash
    # exit when any command fails
    set -euo pipefail
    if [ -f /.dockerenv ]; then
        just --list --unsorted --list-heading $'🏵  Commands: Metaframe Tensorflow 1D conv net https://metapages.github.io/metaframe-predictor-conv-1d-net/\n';
    else
        just _docker;
    fi

#
# Build the browser client static assets
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

# can't use vite to serve: https://github.com/vitejs/vite/issues/2754
serve DOCS_SUB_DIR="": (browser-assets-build DOCS_SUB_DIR)
    cd docs && ../node_modules/http-server/bin/http-server --cors '*' -o {{DOCS_SUB_DIR}} -a {{APP_FQDN}} -p {{APP_PORT}} --ssl --cert ../.certs/{{APP_FQDN}}.pem --key ../.certs/{{APP_FQDN}}-key.pem

# deletes .certs dist
clean:
    rm -rf .certs dist

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

@_ensure_npm_modules:
    if [ ! -f "{{tsc}}" ]; then npm i; fi

@_require_NPM_TOKEN:
	if [ -z "{{NPM_TOKEN}}" ]; then echo "Missing NPM_TOKEN env var"; exit 1; fi

# vite builder commands
@_vite +args="":
    {{vite}} {{args}}

# The new stuff



# build production brower assets
browser-assets-build DOCS_SUB_DIR="":
    mkdir -p docs/{{DOCS_SUB_DIR}}
    find docs/{{DOCS_SUB_DIR}} -maxdepth 1 -type f -exec rm "{}" \;
    rm -rf docs/{{DOCS_SUB_DIR}}/assets
    DOCS_SUB_DIR={{DOCS_SUB_DIR}} {{vite}} build

# cp package.json {{out-dir}}/
# _build +args="--mode=production":
# {{vite}} build {{args}}


# using justfile dependencies failed, the last command would not run
# publish to npm and github pages.
publish npmversionargs="patch": _ensure_inside_docker _ensureGitPorcelain _npm_clean test (npm_version "{{npmversionargs}}") npm_publish githubpages_publish

# https://zellwk.com/blog/publish-to-npm/
npm_publish: npm_build
    #!/usr/bin/env -S deno run --unstable --allow-read={{NPM_PUBLISH_DIR}}/package.json --allow-run --allow-write={{NPM_PUBLISH_DIR}}/.npmrc
    import { npmPublish } from '{{CLOUDSEED_DENO}}/npm/mod.ts';
    npmPublish({cwd:'{{NPM_PUBLISH_DIR}}', npmToken:'{{NPM_TOKEN}}'});

# bumps version, commits change, git tags
npm_version npmversionargs="patch":
    #!/usr/bin/env -S deno run --unstable --allow-run
    import { npmVersion } from '{{CLOUDSEED_DENO}}/npm/mod.ts';
    await npmVersion({npmVersionArg:'{{npmversionargs}}'});

# build npm package for publishing
npm_build: _npm_clean
    @#cp package.json {{NPM_PUBLISH_DIR}}/
    {{tsc}} --noEmit false

_npm_clean:
    mkdir -p {{NPM_PUBLISH_DIR}}
    rm -rf {{NPM_PUBLISH_DIR}}/*

test: npm_build
    cd {{NPM_PUBLISH_DIR}} && npm link
    just test/test
    cd {{NPM_PUBLISH_DIR}} && npm unlink

# update "docs" branch with the (versioned and default) current build
githubpages_publish: _ensure_inside_docker _ensureGitPorcelain
    just browser-assets-build ./docs/v$(cat package.json | jq -r .version)
    just browser-assets-build
    git add --all docs
    git commit -m "site v$(cat package.json | jq -r .version)"
    git push origin master

_ensureGitPorcelain: _ensure_inside_docker
    #!/usr/bin/env -S deno run --unstable --allow-run --allow-read
    import { ensureGitNoUncommitted } from '{{CLOUDSEED_DENO}}/git/mod.ts';
    await ensureGitNoUncommitted();

####################################################################################
# Ensure docker image for local and CI operations
# Hoist into a docker container with all require CLI tools installed
####################################################################################
# Hoist into a docker container with all require CLI tools installed
@docker: _build_docker
    echo -e "🚪🚪 Entering docker context: {{bold}}{{DOCKER_IMAGE_PREFIX}}cloud:{{DOCKER_TAG}} from <cloud/>Dockerfile 🚪🚪{{normal}}"
    mkdir -p {{ROOT}}/.tmp
    touch {{ROOT}}/.tmp/.bash_history
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
