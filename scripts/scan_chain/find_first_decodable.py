#!/usr/bin/env python3
"""
find_first_decodable.py

Small helper that connects to any Substrate-based RPC and
discovers the earliest block whose extrinsics can be decoded with the
available historical metadata.  Useful when an archive node has pruned older
`:code` entries and you need a safe `startBlock` for SubQuery.

Requires:
    pip install -r requirements.txt

Example usage
-------------
# Search from 390 000 up to chain head using a public archive RPC
python scripts/find_first_decodable.py \
    --ws wss://moonriver.unitedbloc.com \
    --start 390000
"""

from __future__ import annotations

import argparse
import sys
import time
from typing import Optional

from substrateinterface import SubstrateInterface
from substrateinterface.exceptions import (
    SubstrateRequestException,
    StorageFunctionNotFound,
    BlockNotFound,
)
from scalecodec.base import ScaleBytes, ScaleDecoder  # noqa: F401  (import side-effects)



def is_decodable(substrate: SubstrateInterface, number: int) -> bool:
    """
    Return True if block `number` can be fetched & fully decoded.

    Any exception raised by `substrate-interface` (metadata mismatch,
    SCALE-codec failure, missing block, etc.) is treated as *not decodable*.
    """
    try:
        block_hash = substrate.get_block_hash(number)
        if block_hash is None:
            return False

        # This both fetches and decodes header + extrinsics via historic metadata.
        substrate.get_block(block_hash=block_hash)
        return True

    except (SubstrateRequestException, StorageFunctionNotFound, BlockNotFound, Exception):
        # Logging can be uncommented for debugging:
        # print(f"Block {number} decodability check failed: {exc}")
        return False


def binary_search_first_ok(
    substrate: SubstrateInterface, low: int, high: int
) -> Optional[int]:
    """
    Given range [low, high] where some *prefix* may fail to decode and the rest decode OK,
    return minimal block number that decodes, or None if none do.
    """
    result: Optional[int] = None
    attempt = 0
    while low <= high:
        mid = (low + high) // 2
        attempt += 1
        ok = is_decodable(substrate, mid)
        # Live progress line: rewritten on every probe
        sys.stdout.write(f"\r▶️  probes: {attempt:4d} | testing block {mid:,} ... {'OK' if ok else 'FAIL'}")
        sys.stdout.flush()
        if ok:
            result = mid
            high = mid - 1  # search earlier half
        else:
            low = mid + 1   # search later half
    # move cursor to a new line after finishing progress updates
    print()
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="find_first_decodable.py",
        description="Locate earliest Moonriver block that decodes with given RPC node",
    )
    parser.add_argument(
        "--ws",
        required=True,
        help="WebSocket endpoint of (archive) Moonriver node, e.g. wss://moonriver.public.blastapi.io:443",
    )
    parser.add_argument(
        "--start",
        type=int,
        default=0,
        help="Lower bound for search (default: 0)",
    )
    parser.add_argument(
        "--end",
        type=int,
        default=None,
        help="Upper bound (default: latest at node head)",
    )
    parser.add_argument(
        "--preset",
        default="moonriver",
        help="Type-registry preset to use (default: moonriver)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print(f"Connecting to {args.ws} ...")
    substrate = SubstrateInterface(url=args.ws, type_registry_preset=args.preset)

    # Obtain latest block number robustly across substrate-interface versions
    try:
        # Newer API: directly ask for block number at chain head
        head_number = substrate.get_block_number(substrate.get_chain_head())
    except Exception:
        # Older API fallback: extract from header dict or object
        latest_header = substrate.get_block_header()
        if isinstance(latest_header, dict):
            head_number = int(
                latest_header.get("number")
                or latest_header.get("header", {}).get("number", 0)
            )
        else:
            # ScaleType Header instance
            head_number = int(latest_header.number)  # type: ignore[attr-defined]
    high = args.end if args.end is not None else head_number
    low = args.start
    if low < 0 or high < low:
        sys.exit("Invalid --start/--end range supplied")

    print(f"Latest block at RPC: {head_number}")
    print(f"Searching earliest decodable block in [{low}, {high}] ...")

    t0 = time.time()
    first_ok = binary_search_first_ok(substrate, low, high)
    duration = time.time() - t0

    if first_ok is None:
        print("❌  No decodable block found in specified range.")
        sys.exit(1)

    print(
        f"\n✅  Earliest decodable block: {first_ok}\n"
        f"   (You can safely use this as startBlock in SubQuery)\n"
        f"⏱  Search time: {duration:.1f} s"
    )


if __name__ == "__main__":
    main()
