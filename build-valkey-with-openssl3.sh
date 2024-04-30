#!/usr/bin/env bash

set -uex

ROOT=$(cd "$(dirname "$0")" && pwd)
export VALKEY_VERSION=$1
: "${RUNNER_TEMP:=$ROOT/.work}"
: "${RUNNER_TOOL_CACHE:=$RUNNER_TEMP/dist}"
case "$(uname -m)" in
    "x86_64")
        VALKEY_ARCH="x64"
        ;;
    "arm64")
        VALKEY_ARCH="arm64"
        ;;
    *)
        echo "unsupported architecture: $(uname -m)"
        exit 1
        ;;
esac

PREFIX=$RUNNER_TOOL_CACHE/valkey/$VALKEY_VERSION/$VALKEY_ARCH

# configure rpath, and detect the number of CPU Core
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
case "$OS" in
    darwin)
        LDFLAGS=-Wl,-rpath,'@executable_path/../lib'
        JOBS=$(sysctl -n hw.logicalcpu_max 2>/dev/null)
    ;;
    linux)
        # shellcheck disable=SC2016
        LDFLAGS=-Wl,-rpath,'\$$ORIGIN/../lib'
        JOBS=$(nproc 2>/dev/null)
    ;;
esac
export LDFLAGS

# bundle OpenSSL for better reproducibility.
OPENSSL_VERSION=3.2.1
mkdir -p "$RUNNER_TEMP"
cd "$RUNNER_TEMP"

echo "::group::download OpenSSL source"
(
    set -eux
    cd "$RUNNER_TEMP"
    curl --retry 3 -sSL "https://github.com/openssl/openssl/archive/refs/tags/openssl-$OPENSSL_VERSION.tar.gz" -o openssl.tar.gz
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
    cd "$RUNNER_TEMP/openssl-openssl-$OPENSSL_VERSION"
    ./Configure --prefix="$PREFIX" --openssldir="$PREFIX" --libdir=lib
    make "-j$JOBS"
    make install_sw install_ssldirs

    if [[ $OS = darwin ]]; then
        install_name_tool -id "@rpath/libcrypto.3.dylib" "$PREFIX/lib/libcrypto.3.dylib"
        install_name_tool -id "@rpath/libssl.3.dylib" "$PREFIX/lib/libssl.3.dylib"
        install_name_tool -change "$PREFIX/lib/libcrypto.3.dylib" "@rpath/libcrypto.3.dylib" "$PREFIX/lib/libssl.3.dylib"
        install_name_tool -change "$PREFIX/lib/libcrypto.3.dylib" "@rpath/libcrypto.3.dylib" "$PREFIX/bin/openssl"
        install_name_tool -change "$PREFIX/lib/libssl.3.dylib" "@rpath/libssl.3.dylib" "$PREFIX/bin/openssl"
    fi
)
echo "::endgroup::"

# download
echo "::group::download Valkey source"
(
    mkdir -p "$RUNNER_TEMP"
    curl -sSL "https://github.com/valkey-io/valkey/archive/$VALKEY_VERSION.tar.gz" -o "$RUNNER_TEMP/valkey.tar.gz"
)
echo "::endgroup::"

# build
echo "::group::build valkey"
(
    cd "$RUNNER_TEMP"
    tar xzf valkey.tar.gz
    cd "valkey-unstable"

    # apply patches
    if [[ -d "$ROOT/patches/valkey/$VALKEY_VERSION" ]]
    then
        cat "$ROOT/patches/valkey/$VALKEY_VERSION"/*.patch | patch -s -f -p1
    fi

    make "-j$JOBS" PREFIX="$PREFIX" BUILD_TLS=yes OPENSSL_PREFIX="$PREFIX" V=1
)
echo "::endgroup::"

echo "::group::archive valkey binary"
(
    cd "$RUNNER_TEMP/valkey-unstable"
    mkdir -p "$PREFIX"
    make install "-j$JOBS" PREFIX="$PREFIX" BUILD_TLS=yes OPENSSL_PREFIX="$PREFIX" V=1

    # remove dev packages
    rm -rf "$PREFIX/include"
    rm -rf "$PREFIX/lib/pkgconfig"

    cd "$PREFIX"
    tar --use-compress-program 'zstd -T0 --long=30 --ultra -22' -cf "$RUNNER_TEMP/valkey-bin.tar.zstd" .
)
echo "::endgroup::"
