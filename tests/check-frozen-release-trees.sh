#!/usr/bin/env bash
set -euo pipefail

check_git_object() {
  local path="$1"
  local expected="$2"
  local actual
  actual="$(git rev-parse "HEAD:${path}")"
  test "$actual" = "$expected" || {
    printf 'FROZEN_OBJECT_MISMATCH %s\n' "$path" >&2
    exit 1
  }
}

check_sha256() {
  local path="$1"
  local expected="$2"
  local actual
  actual="$(sha256sum "$path" | cut -d' ' -f1)"
  test "$actual" = "$expected" || {
    printf 'FROZEN_SHA256_MISMATCH %s\n' "$path" >&2
    exit 1
  }
}

check_git_object newsv1 2d6247c067aa5fad49995dcb9029d6cdb9898994
check_git_object newsv7 5a59a926d0688d05c08c5ecc008c174133728007
check_git_object 202608251701-pipelinenews 84b748df685b9306ce232e415531ee4eca05b4d6
check_git_object 202608251750-pipelinenews 8a86c549b14a104b247aaadfc522644155b22ddb
check_git_object releases/202608251701-pipelinenews.json 0823bf04096d74d4627b9d1e8d6f1d513f1c6eb4
check_git_object releases/202608251750-pipelinenews.json 5d9d31c801b1a9de328a5fe975daac4c8e2a67c2

check_sha256 newsv7/dist/major_project_news_v9_5_1.json cea104c3e9cfc07971680afdf5f64073e1d4825b63bfaf4e969266df8386ebbd
check_sha256 newsv7/data/newsv7/cumulative_intelligence.json 65767316a618b6ed8048e34b805168ea431f27ea666d89b02971586bfef9f05b

printf 'FROZEN RELEASE OBJECTS: PASS\n'
