#!/usr/bin/env bash

set -uex

ROOT=$(cd "$(dirname "$0")" && pwd)
export REDIS_VERSION=$1
: "${RUNNER_TEMP:=$ROOT/.work}"
: "${RUNNER_TOOL_CACHE:=$RUNNER_TEMP/dist}"
PREFIX=$RUNNER_TOOL_CACHE/redis/$REDIS_VERSION/x64

# detect the number of CPU Core
JOBS=$(nproc 2>/dev/null || sysctl -n hw.logicalcpu_max 2>/dev/null)

# bundle OpenSSL for better reproducibility.
OPENSSL_VERSION=1_1_1m
mkdir -p "$RUNNER_TEMP"
cd "$RUNNER_TEMP"

echo "::group::download OpenSSL source"
(
    set -eux
    cd "$RUNNER_TEMP"
    curl --retry 3 -sSL "https://github.com/openssl/openssl/archive/OpenSSL_$OPENSSL_VERSION.tar.gz" -o openssl.tar.gz
)
echo "::endgroup::"

echo "::group::extract OpenSSL source"
(
    set -eux
    cd "$RUNNER_TEMP"
    tar zxvf openssl.tar.gz
)
echo "::endgroup::"

echo "::group::build OpenSSL"
(
    set -eux
    TARGET=""
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    case "$OS" in
        darwin) TARGET="darwin64-x86_64-cc" ;;
        linux) TARGET="linux-x86_64" ;;
    esac
    cd "$RUNNER_TEMP/openssl-OpenSSL_$OPENSSL_VERSION"
    ./Configure --prefix="$PREFIX" "$TARGET"
    make "-j$JOBS"
    make install_sw install_ssldirs
)
echo "::endgroup::"

# download
echo "::group::download redis source"
(
    mkdir -p "$RUNNER_TEMP"
    curl -sSL "https://github.com/antirez/redis/archive/$REDIS_VERSION.tar.gz" -o "$RUNNER_TEMP/redis.tar.gz"
)
echo "::endgroup::"

# build
echo "::group::build redis"
(
    cd "$RUNNER_TEMP"
    tar xzf redis.tar.gz
    cd "redis-$REDIS_VERSION"

    # apply patches
    if [[ -d "$ROOT/patches/$REDIS_VERSION" ]]
    then
        cat "$ROOT/patches/$REDIS_VERSION"/*.patch | patch -s -f -p1
    fi

    make "-j$JOBS" PREFIX="$PREFIX" BUILD_TLS=yes OPENSSL_PREFIX="$PREFIX" V=1
)
echo "::endgroup::"

echo "::group::archive redis binary"
(
    cd "$RUNNER_TEMP/redis-$REDIS_VERSION"
    mkdir -p "$PREFIX"
    make install "-j$JOBS" PREFIX="$PREFIX" BUILD_TLS=yes OPENSSL_PREFIX="$PREFIX" V=1

    # remove dev packages
    rm -rf "$PREFIX/include"
    rm -rf "$PREFIX/lib/pkgconfig"

    cd "$PREFIX"
    tar --use-compress-program 'zstd -T0 --long=30 --ultra -22' -cf "$RUNNER_TEMP/redis-bin.tar.zstd" .
)
echo "::endgroup::"
