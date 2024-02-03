#!/usr/bin/env bash

set -uex

# download
ROOT=$(cd "$(dirname "$0")" && pwd)
REDIS_VERSION=$1
: "${RUNNER_TEMP:=$ROOT/.work}"

mkdir -p "$RUNNER_TEMP"
curl -sSL "https://github.com/redis/redis/archive/$REDIS_VERSION.tar.gz" -o "$RUNNER_TEMP/redis.tar.gz"

# unarchive source code
cd "$RUNNER_TEMP"
tar xzf redis.tar.gz
cd "redis-$REDIS_VERSION"

# apply patches
if [[ -d "$ROOT/patches/$REDIS_VERSION" ]]
then
    cat "$ROOT/patches/$REDIS_VERSION"/*.patch | patch -s -f -p1
fi

# build
make

mkdir -p "$RUNNER_TEMP/dist"
make install PREFIX="$RUNNER_TEMP/dist"

cd "$RUNNER_TEMP/dist"
tar --use-compress-program 'zstd -T0 --long=30 --ultra -22' -cf "../redis-bin.tar.zstd" .
