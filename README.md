# actions-setup-redis

<p align="left">
  <a href="https://github.com/shogo82148/actions-setup-redis"><img alt="GitHub Actions status" src="https://github.com/shogo82148/actions-setup-redis/workflows/Test/badge.svg"></a>
</p>

This action sets by [redis](https://redis.io/) database for use in actions by:

- optionally downloading and caching a version of redis
- start redis-server

## Motivation

- GitHub Actions supports Docker services, and there is the official [redis image](https://hub.docker.com/_/redis). but it works on only Linux.
- Some test utils for redis (such as [Test::RedisServer](https://metacpan.org/pod/Test::RedisServer)) requires redis-server installed on the local host.

## Usage

See [action.yml](action.yml)

Basic:
```yaml
steps:
- uses: actions/checkout@v3
- uses: shogo82148/actions-setup-redis@v1
  with:
    redis-version: '6.x'
- run: redis-cli ping
```

Matrix Testing:
```yaml
jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os:
        - 'ubuntu-latest'
        - 'macOS-latest'
        # - 'windows-latest' # windows is currently not supported.
        redis:
        - '6.2'
        - '6.0'
        - '5.0'
        - '4.0'
    name: Redis ${{ matrix.redis }} on ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v3
      - name: Setup redis
        uses: shogo82148/actions-setup-redis@v1
        with:
          redis-version: ${{ matrix.redis }}
          auto-start: "false"

      - name: tests with Test::RedisServer
        run: |
          cpanm Test::RedisServer
          prove -lv t
```

## Configuration

### redis-version

The version of Redis.
The `redis-version` input supports the following syntax:

- `latest`: the latest version of stable Redis
- `6`, `5`, `4`: major versions
- `6.2`, `6.0`: minor versions
- `6.2.0`, `6.2.1`: patch versions

The default value is `latest`.
The actions supports only stable versions.

### redis-port

The port number that `redis-server` listens.
The default value is `6379`.

### redis-tls-port

The port number that `redis-server` listens TLS connections.
The default value is `0` and TLS is disabled.

### auto-start

If the `auto-start` is `true`, the action starts `redis-server` as a daemon.
If it is `false`, the action just install Redis commands, doesn't start `redis-server`.
It is a boolean value, valid values are `true` or `false`.
The default value is `true`.

### redis-conf

Extra configurations for `redis.conf`.
See [Redis configuration](https://redis.io/topics/config).

## Outputs

### redis-port

The port number that `redis-server` listens.

```yaml
jobs:
  build:
    runs-on: 'ubuntu-latest'
    steps:
      - uses: actions/checkout@v3
      - id: setup
        uses: shogo82148/actions-setup-redis@v1

      # connect to the redis-server via TCP
      - run: |
          redis-cli -h 127.0.0.1 -p ${{ steps.setup.outputs.redis-port }} ping
```

### redis-unix-socket

The unix domain socket path that `redis-server` listens.

```yaml
jobs:
  build:
    runs-on: 'ubuntu-latest'
    steps:
      - uses: actions/checkout@v3
      - id: setup
        uses: shogo82148/actions-setup-redis@v1

      # connect to the redis-server via unix domain socket
      - run: |
          redis-cli -s ${{ steps.setup.outputs.redis-unix-socket }} ping
```

### redis-tls-port

The port number that `redis-server` listens TLS connections.

### redis-tls-port

The directory path for TLS sample certificates/keys.

```yaml
jobs:
  build:
    runs-on: 'ubuntu-latest'
    steps:
      - uses: actions/checkout@v3
      - id: setup
        uses: shogo82148/actions-setup-redis@v1
        with:
          # TLS Support starts from v6.0.
          redis-version: "6.0"

          # TLS is disabled by default. You need extra configurations.
          redis-port: "0"
          redis-tls-port: "6379"

      # connect to the redis-server via TLS
      - run: |
          redis-cli -h 127.0.0.1 -p "${{ steps.setup.outputs.redis-tls-port }}" \
            --tls \
            --cert "${{ steps.setup.outputs.redis-tls-dir }}/redis.crt" \
            --key "${{ steps.setup.outputs.redis-tls-dir }}/redis.key" \
            --cacert "${{ steps.setup.outputs.redis-tls-dir }}/ca.crt" \
            ping
```

See [TLS Support](https://redis.io/topics/encryption) for more details.

# License

The scripts and documentation in this project are released under the [MIT License](LICENSE)
