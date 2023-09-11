#!/bin/bash

set -eu

cd "$(dirname "$0")"
cd ..

OPENSSL_VERSION1_1_1=$(gh api --jq '[.[] | select(.ref != "refs/tags/OpenSSL_1_1_1")] | last.ref | sub("refs/tags/OpenSSL_"; "")' /repos/openssl/openssl/git/matching-refs/tags/OpenSSL_1_1_1)
export OPENSSL_VERSION1_1_1

perl -i -pe 's/^OPENSSL_VERSION=.*$/OPENSSL_VERSION=$ENV{OPENSSL_VERSION1_1_1}/' build-redis-with-openssl1.1.sh

OPENSSL_VERSION3=$(gh api --jq 'map(select(.ref | test("/openssl-[0-9]+[.][0-9]+[.][0-9]+$"))) | last.ref | sub("refs/tags/openssl-"; "")' /repos/openssl/openssl/git/matching-refs/tags/openssl-3.)
export OPENSSL_VERSION3

perl -i -pe 's/^OPENSSL_VERSION=.*$/OPENSSL_VERSION=$ENV{OPENSSL_VERSION3}/' build-redis-with-openssl3.sh
