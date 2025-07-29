#!/usr/bin/env python3
from __future__ import annotations
"""
subquery-history/scripts/scan_chain/find_first_with_metadata.py
---------------------------------------------------------------

Utility to discover the earliest block height for which historic
metadata (`state_getMetadata`) is still available on a given Substrate
RPC node.  If your indexer crashes on the first block with
`findMetaCall`, run this script and use the reported height as the new
`startBlock`.

Example
~~~~~~~
    python scripts/scan_chain/find_first_with_metadata.py \
        --ws wss://moonriver.unitedbloc.com \
        --preset moonriver \
        --start 300000

Dependencies
~~~~~~~~~~~~
    pip install substrate-interface requests
"""

import argparse
import sys
import time
from typing import Optional

import requests
from substrateinterface import SubstrateInterface


# --------------------------------------------------------------------------- #
# JSON-RPC helpers                                                            #
# --------------------------------------------------------------------------- #
def rpc(endpoint: str, method: str, params: list | None = None):
    """Perform a synchronous HTTP JSON-RPC call and return `result`."""
    payload = {
        "jsonrpc": "2.0",
        "method": method,
        "params": params or [],
        "id": 1,
    }
    r = requests.post(endpoint, json=payload, timeout=30)
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(data["error"])
    return data["result"]


def ws_to_http(url: str) -> str:
    """Convert ws(s):// URL to http(s):// for plain POST requests."""
    if url.startswith("wss://"):
        return "https://" + url[len("wss://") :]
    if url.startswith("ws://"):
        return "http://" + url[len("ws://") :]
    return url


# --------------------------------------------------------------------------- #
# Core checks                                                                 #
# --------------------------------------------------------------------------- #
def metadata_ok(http_ep: str, block_hash: str) -> bool:
    """Return True if `state_getMetadata` succeeds for given block."""
    try:
        rpc(http_ep, "state_getMetadata", [block_hash])
        return True
    except Exception:
        return False


def first_block_with_meta(
    http_ep: str,
    substrate: SubstrateInterface,
    low: int,
    high: int,
) -> Optional[int]:
    """
    Binary-search [low, high] for first block that still has metadata.
    """
    probes = 0
    ans = None
    while low <= high:
        mid = (low + high) // 2
        probes += 1
        h = substrate.get_block_hash(mid)
        ok = h is not None and metadata_ok(http_ep, h)
        sys.stdout.write(
            f"\rprobes:{probes:4d}  testing #{mid:,} ... {'OK' if ok else 'FAIL'}"
        )
        sys.stdout.flush()
        if ok:
            ans = mid
            high = mid - 1
        else:
            low = mid + 1
    print()
    return ans


# --------------------------------------------------------------------------- #
# CLI                                                                         #
# --------------------------------------------------------------------------- #
def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Find earliest block with historic metadata available."
    )
    p.add_argument("--ws", required=True, help="WebSocket RPC endpoint")
    p.add_argument("--preset", default="substrate", help="Type-registry preset")
    p.add_argument(
        "--start", type=int, default=0, help="Lower bound for search (default 0)"
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()
    http_ep = ws_to_http(args.ws)

    print(f"Connecting to {args.ws} …")
    api = SubstrateInterface(url=args.ws, type_registry_preset=args.preset)
    head = api.get_block_number(api.get_chain_head())
    print(f"Head: {head:,}")

    low = max(0, args.start)
    high = head
    print(f"Searching range [{low:,}, {high:,}]")

    t0 = time.time()
    first_ok = first_block_with_meta(http_ep, api, low, high)
    duration = time.time() - t0

    if first_ok is None:
        print("❌  No block with metadata found in range.")
        sys.exit(1)

    print(
        f"\n✅  Earliest block with metadata: {first_ok:,}\n"
        f"   (Safe startBlock ≥ this height)\n"
        f"⏱  Scan finished in {duration:.1f}s"
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
