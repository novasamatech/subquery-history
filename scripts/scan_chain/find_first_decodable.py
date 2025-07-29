#!/usr/bin/env python3
"""
find_first_decodable.py
-----------------------

Binary-search helper for discovering the earliest Substrate block that
*successfully* decodes with **@polkadot/api** (the same stack SubQuery uses).

Instead of Python’s `substrate-interface`, we spawn a tiny Node script
(`check_block.js`) that does the real test:

    node check_block.js <endpoint> <blockNumber> [preset]

The Node tool prints either  `OK`  or  `FAIL`, allowing us to decide which
half-range to probe next.  This guarantees the result is compatible with any
producer based on `@polkadot/api` (SubQuery, Subsquid, etc.).

Installation
~~~~~~~~~~~~
1. A working `node` binary (≥16).
2. NPM packages:

   ```bash
   npm install @polkadot/api
   pip install -r requirements.txt
   ```

Exampl
~~~~~~~
```bash
python scripts/scan_chain/find_first_decodable.py \
  --ws wss://moonriver.unitedbloc.com \
  --start 390000 \
  --preset moonriver
```
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from typing import Optional

# Optional import just to fetch latest block height quickly.
try:
    from substrateinterface import SubstrateInterface
except ImportError:
    SubstrateInterface = None  # type: ignore


HERE = os.path.abspath(os.path.dirname(__file__))
NODE_CHECKER = os.path.join(HERE, "check_block.js")


# --------------------------------------------------------------------------- #
# Helpers                                                                     #
# --------------------------------------------------------------------------- #
def is_decodable(endpoint: str, preset: str, height: int) -> bool:
    """
    Return True when `@polkadot/api` can fetch & decode given `height`.
    """
    proc = subprocess.run(
        ["node", NODE_CHECKER, endpoint, str(height), preset],
        capture_output=True,
        text=True,
    )
    return proc.stdout.strip() == "OK"


def binary_search_first_ok(
    endpoint: str,
    preset: str,
    low: int,
    high: int,
) -> Optional[int]:
    """
    Classic binary search on monotone predicate `is_decodable`.
    It assumes range looks like F…FT…T (F=fail, T=ok) and returns first T.
    """
    attempt = 0
    ans: Optional[int] = None
    while low <= high:
        mid = (low + high) // 2
        attempt += 1
        ok = is_decodable(endpoint, preset, mid)

        # Live one-line progress
        sys.stdout.write(
            f"\r▶️  probes: {attempt:5d} | testing block {mid:,} ... "
            f"{'OK ' if ok else 'FAIL'}"
        )
        sys.stdout.flush()

        if ok:
            ans = mid
            high = mid - 1
        else:
            low = mid + 1
    print()  # newline after progress
    return ans


def latest_block(endpoint: str, preset: str) -> int:
    """
    Obtain latest block height using `substrate-interface` if available,
    otherwise fallback to JSON-RPC.
    """
    if SubstrateInterface is not None:
        sub = SubstrateInterface(url=endpoint, type_registry_preset=preset)
        header = sub.get_block_header()
        if isinstance(header, dict):
            return int(
                header.get("number")
                or header.get("header", {}).get("number", 0)
            )
        return int(header.number)  # ScaleType Header
    # Minimal JSON-RPC (HTTP POST) fallback
    import json
    import urllib.request

    payload = json.dumps(
        {"jsonrpc": "2.0", "method": "chain_getHeader", "params": [], "id": 1}
    ).encode()
    with urllib.request.urlopen(endpoint.replace("ws://", "http://").replace("wss://", "https://"), data=payload) as resp:
        data = json.load(resp)
    number_hex = data["result"]["number"]
    return int(number_hex, 16)


# --------------------------------------------------------------------------- #
# CLI                                                                         #
# --------------------------------------------------------------------------- #
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Find earliest block decodable with @polkadot/api."
    )
    p.add_argument("--ws", required=True, help="WebSocket RPC endpoint")
    p.add_argument("--start", type=int, default=0, help="Lower bound (inclusive)")
    p.add_argument(
        "--end",
        type=int,
        default=None,
        help="Upper bound (default: latest at node)",
    )
    p.add_argument(
        "--preset",
        default="substrate",
        help="Type-registry preset (moonriver, moonbeam, etc.)",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()

    print(f"Using node checker: {NODE_CHECKER}")
    print(f"Connecting to {args.ws} ...")
    head = args.end if args.end is not None else latest_block(args.ws, args.preset)

    lo, hi = args.start, head
    if lo < 0 or hi < lo:
        sys.exit("Invalid search interval")

    print(f"Latest block at node: {head}")
    print(f"Searching first decodable block in [{lo}, {hi}] ...")

    t0 = time.time()
    first_ok = binary_search_first_ok(args.ws, args.preset, lo, hi)
    elapsed = time.time() - t0

    if first_ok is None:
        print("\n❌  No decodable block found in the specified interval.")
        sys.exit(1)

    print(
        f"\n✅  Earliest decodable block: {first_ok}\n"
        f"   (safe startBlock for SubQuery)\n"
        f"⏱  Search duration: {elapsed:.1f}s"
    )


if __name__ == "__main__":
    main()
