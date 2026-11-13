#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec cargo run --release --manifest-path "$ROOT/engine/Cargo.toml"
