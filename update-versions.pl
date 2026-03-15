#!/usr/bin/env perl

use v5.42.0;
use utf8;
use version;
use JSON::PP;

# Fetch all releases from the GitHub repository and sort them by version and timestamp
my $releases = decode_json(`gh api --paginate --slurp '/repos/shogo82148/build-redis/releases?per_page=100'`);
$releases = [map { @$_} @$releases];
$releases = [sort {
    my (undef, $ver_a, $timestamp_a) = split /-/, $a->{tag_name};
    my (undef, $ver_b, $timestamp_b) = split /-/, $b->{tag_name};
    version->new($ver_b) cmp version->new($ver_a) or $timestamp_b cmp $timestamp_a;
} @$releases];

my %seen;
my $redis_versions = [];
my $valkey_versions = [];
for my $release (@$releases) {
  # Skip already processed distribution-version combinations
  my ($distribution, $version, undef) = split /-/, $release->{tag_name};
  next if $release->{draft};
  next if $seen{"$distribution-$version"}++;

  # Collect asset information for the release
  my @assets = sort { $a->{name} cmp $b->{name} } @{$release->{assets}};
  my @entries;
  for my $asset (@assets) {
    $asset->{name} =~ /^([a-z]+)-([0-9.]+)-(.*)-(x64|arm64)\.tar\.zstd$/ or next;
    my ($distribution, $version, $os, $arch) = ($1, $2, $3, $4);
    push @entries, {
      distribution => $distribution,
      version      => $version,
      os           => $os,
      arch         => $arch,
      sha256       => $asset->{digest} =~ /sha256:([a-f0-9]{64})/ ? $1 : undef,
      url          => $asset->{browser_download_url},
    };
  }
  if ($distribution eq 'redis') {
    push @$redis_versions, @entries;
  } elsif ($distribution eq 'valkey') {
    push @$valkey_versions, @entries;
  }
}

# Write the collected versions to JSON files
my $json = JSON::PP->new->utf8->indent->indent_length(2)->space_after->canonical;

open my $fh, ">", "src/versions/redis.json" or die $!;
print $fh $json->encode($redis_versions);
close $fh;

open $fh, ">", "src/versions/valkey.json" or die $!;
print $fh $json->encode($valkey_versions);
close $fh;
