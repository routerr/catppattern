#!/usr/bin/env bash
# Generate multiple random Catppuccin patterns.
# Usage: ./generate.sh [amount] [-s] [-xs] [-xxs] [-xxxs] [-h|--horizontal] [-gif]
#   amount  number of patterns to generate (default: 1)
#   -s      small      — 50% area
#   -xs     extra-small — 25% area
#   -xxs    micro      — 10% area
#   -xxxs   nano       —  5% area
#   -h      horizontal 2532x1170 iPhone wallpaper canvas
#   -gif    render animated GIFs (catpattern_<seed>[_<size>].gif) instead
#           of static PNGs. Combines with any size/layout flag above.
#
# Flags may be given in any order relative to the amount.
# Each invocation picks a fresh random positive integer seed and runs
# catpattern.py with it. Outputs land in catpattern.py's results/ dir.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Parse args: separate the amount from -flags ──────────────────────────────
AMOUNT=""
SIZE_FLAG=""
GIF_FLAG=""
HORIZONTAL_FLAG=""

for arg in "$@"; do
  case "$arg" in
    -s|--small)        SIZE_FLAG="$arg" ;;
    -xs|--extra-small) SIZE_FLAG="$arg" ;;
    -xxs|--micro)      SIZE_FLAG="$arg" ;;
    -xxxs|--nano)      SIZE_FLAG="$arg" ;;
    -h|--horizontal)   HORIZONTAL_FLAG="$arg" ;;
    -gif|--gif)        GIF_FLAG="-gif" ;;
    *)
      if [[ -z "$AMOUNT" ]]; then
        AMOUNT="$arg"
      else
        echo "Error: unexpected argument '$arg'" >&2
        exit 1
      fi
      ;;
  esac
done

AMOUNT="${AMOUNT:-1}"
if ! [[ "$AMOUNT" =~ ^[0-9]+$ ]] || [[ "$AMOUNT" -lt 1 ]]; then
  echo "Error: amount must be a positive integer (got: '$AMOUNT')" >&2
  exit 1
fi

# ── Resolve a Python interpreter that actually has the required deps ─────────
PYTHON=""
for candidate in python python3 py; do
  if command -v "$candidate" >/dev/null 2>&1; then
    if "$candidate" -c "import numpy, matplotlib, PIL" >/dev/null 2>&1; then
      PYTHON="$(command -v "$candidate")"
      break
    fi
  fi
done
if [[ -z "$PYTHON" ]]; then
  echo "Error: no python interpreter with numpy+matplotlib+Pillow found on PATH" >&2
  exit 1
fi

# ── Generate ─────────────────────────────────────────────────────────────────
for ((i = 1; i <= AMOUNT; i++)); do
  # Random positive integer seed in 1 .. 2^31-1
  SEED="$(awk 'BEGIN{srand(); print int(rand() * 2147483647) + 1}')"
  echo "[$i/$AMOUNT] seed=$SEED ${SIZE_FLAG:-(normal)}${HORIZONTAL_FLAG:+ horizontal}${GIF_FLAG:+ gif}"
  "$PYTHON" "$SCRIPT_DIR/catpattern.py" "$SEED" $SIZE_FLAG $HORIZONTAL_FLAG $GIF_FLAG
done
