# SubQuery Nova - AI Agent Instructions

This file provides context for AI coding assistants (GitHub Copilot, Claude, Cursor, etc.) working on this SubQuery indexer project.

## Project Overview

This is a SubQuery indexer project for Nova Wallet that indexes historical data from multiple Substrate-based chains. The project supports 50+ networks including Polkadot, Kusama, their parachains, and Asset Hubs.

## Key Technical Context

### Chain Types Configuration

Chain types are defined in `chainTypes/*.ts` files and exported via `package.json`. They configure:

- Custom type definitions for specific runtime versions
- Signed extension overrides (especially `ChargeAssetTxPayment`)

**When modifying chain types:**

1. Use `minmax: [startSpec, endSpec]` to define spec version ranges
2. The `signedExtensions` in `typesBundle` affects transaction encoding
3. Top-level `types` export is needed for block decoding in `@polkadot/api`

### Common Issues

**"findMetaCall: Unable to find Call with index [X, Y]" error:**
This usually means `ChargeAssetTxPayment.assetId` type is misconfigured. The decoder interprets asset location data as pallet call indices. Check:

1. Correct spec version ranges in chain types
2. Correct `MultiLocation` version (`MultiLocationV3` for newer runtimes)

---

## Asset Hub Spec Version History

This section documents runtime spec version history for Asset Hub chains. This data is critical for configuring correct type overrides in `chainTypes/` files.

**Why this matters:**

- SubQuery uses `@polkadot/api` which requires correct type definitions for each runtime version
- Incorrect spec version ranges cause block decoding failures
- Asset Hubs have different version progressions (Westend is testnet, versions differ from mainnet)

### Westend Asset Hub (westmint)

| Spec Version | First Block (approx) |
| ------------ | -------------------- |
| 1            | ~134545              |
| 2            | ~1                   |
| 3            | ~538177              |
| 4            | ~807265              |
| 504          | ~941809              |
| 600          | ~1076353             |
| 700          | ~1614529             |
| 800          | ~1883617             |
| 900          | ~2018161             |
| 9230         | ~2421793             |
| 9270         | ~2825425             |
| 9290         | ~3094513             |
| 9320         | ~3363601             |
| 9360         | ~3632689             |
| 9370         | ~3901777             |
| 9380         | ~4036321             |
| 9381         | ~4170865             |
| 9400         | ~4305409             |
| 9425         | ~4574497             |
| 9435         | ~4843585             |
| 1003000      | ~5785393             |
| 1004000      | ~5919937             |
| 1005000      | ~6054481             |
| 1006000      | ~6189025             |
| 1007000      | ~6458113             |
| 1008000      | ~6592657             |
| 1009000      | ~6861745             |
| 1010000      | ~7130833             |
| 1011000      | ~7399921             |
| 1011001      | ~7803553             |
| 1013000      | ~7938097             |
| 1014000      | ~8072641             |
| 1015000      | ~8476273             |
| 1016000      | ~9014449             |
| 1017001      | ~9956257             |
| 1018000      | ~11167153            |
| 1020000      | ~12781681            |
| 1021000      | ~13319857            |
| 1021002      | ~13454401            |

**Note:** Westend skipped versions 9430-9434, jumping directly from 9425 to 9435.

### Kusama Asset Hub (statemine)

| Spec Version | First Block (approx) |
| ------------ | -------------------- |
| 1            | ~257987              |
| 2            | ~1                   |
| 3            | ~773959              |
| 5            | ~1031945             |
| 601          | ~1289931             |
| 700          | ~1805903             |
| 900          | ~2063889             |
| 9230         | ~2579861             |
| 9270         | ~2837847             |
| 9271         | ~3095833             |
| 9290         | ~3353819             |
| 9330         | ~3611805             |
| 9360         | ~3869791             |
| 9370         | ~4127777             |
| 9382         | ~4385763             |
| 9420         | ~4643749             |
| 9430         | ~4901735             |
| 1000000      | ~5933679             |
| 1001002      | ~6449651             |
| 1002000      | ~6965623             |
| 1003000      | ~7739581             |
| 1004002      | ~9029511             |
| 1005001      | ~9545483             |
| 1006000      | ~10061455            |
| 1007001      | ~10835413            |
| 1009002      | ~11351385            |
| 2000002      | ~11609371            |
| 2000003      | ~12125343            |
| 2000004      | ~12383329            |

**Note:** Kusama jumped from 9430 directly to 1000000, skipping versions 9431-999999.

### Polkadot Asset Hub (statemint)

| Spec Version | First Block (approx) |
| ------------ | -------------------- |
| 2            | ~1                   |
| 601          | ~460359              |
| 700          | ~920717              |
| 800          | ~1150896             |
| 900          | ~1381075             |
| 9230         | ~1841433             |
| 9270         | ~2301791             |
| 9290         | ~2531970             |
| 9320         | ~2762149             |
| 9330         | ~2992328             |
| 9360         | ~3222507             |
| 9370         | ~3452686             |
| 9420         | ~4143223             |
| 9430         | ~4373402             |
| 1000000      | ~5294118             |
| 1001002      | ~5754476             |
| 1002000      | ~6214834             |
| 1003003      | ~7365729             |
| 1004000      | ~8516624             |
| 1005001      | ~8976982             |
| 1006000      | ~9667519             |
| 1007001      | ~9897698             |
| 2000002      | ~10358056            |
| 2000003      | ~10818414            |
| 2000005      | ~11508951            |

**Note:** Polkadot jumped from 9430 directly to 1000000, skipping versions 9431-999999.

---

## ChargeAssetTxPayment Type Migrations

The `ChargeAssetTxPayment` signed extension allows paying transaction fees with non-native assets. The `assetId` field type changed across runtime versions.

### Current Configuration

| Chain        | AssetId Type              | Spec Version Range | Config File              |
| ------------ | ------------------------- | ------------------ | ------------------------ |
| **Westend**  | `Option<AssetId>`         | 0 - 9434           | `westmintChaintypes.ts`  |
| **Westend**  | `Option<MultiLocation>`   | 9435 - 1020999     | `westmintChaintypes.ts`  |
| **Westend**  | `Option<MultiLocationV3>` | 1021000+           | `westmintChaintypes.ts`  |
| **Kusama**   | `Option<AssetId>`         | 0 - 9429           | `statemineChaintypes.ts` |
| **Kusama**   | `Option<MultiLocation>`   | 9430 - 1999999     | `statemineChaintypes.ts` |
| **Kusama**   | `Option<MultiLocationV3>` | 2000000+           | `statemineChaintypes.ts` |
| **Polkadot** | `Option<AssetId>`         | 0 - 9429           | `statemintChaintypes.ts` |
| **Polkadot** | `Option<MultiLocation>`   | 9430 - 1999999     | `statemintChaintypes.ts` |
| **Polkadot** | `Option<MultiLocationV3>` | 2000000+           | `statemintChaintypes.ts` |

### Key Migration Points

1. **Migration to MultiLocation** (for paying fees with non-native assets):

   - Westend: spec **9435** (~block 4843585)
   - Kusama: spec **9430** (~block 4901735)
   - Polkadot: spec **9430** (~block 4373402)

2. **Migration to MultiLocationV3** (for foreign assets / Snowbridge support):
   - Westend: spec **1021000** (~block 13319857)
   - Kusama: spec **2000002** (~block 11609371)
   - Polkadot: spec **2000002** (~block 10358056)

### Why MultiLocationV3?

Starting from spec 1021000 (Westend) / 2000000 (Kusama/Polkadot), transactions can use **foreign assets** (e.g., Ethereum assets via Snowbridge) to pay fees. These assets are identified using `MultiLocationV3` which includes `GlobalConsensus` junction type for cross-chain asset references.

Example: Ethereum Sepolia asset location:

```
MultiLocationV3 {
  parents: 2,
  interior: X2(
    GlobalConsensus(Ethereum { chain_id: 11155111 }),
    AccountKey20 { ... }
  )
}
```

Without correct type configuration, `@polkadot/api` misinterprets the location data as pallet call indices, causing decode errors like:

```
findMetaCall: Unable to find Call with index [218, 168]
```

---

## Useful Commands

```bash
# Build the project
yarn build

# Check current spec version on a chain
# Use node REPL with @polkadot/api

# Validate project configuration
yarn validate
```

## RPC Endpoints

Preferred endpoints (Dwellir, fast and reliable):

- Westend Asset Hub: `wss://asset-hub-westend-rpc.n.dwellir.com`
- Kusama Asset Hub: `wss://asset-hub-kusama-rpc.n.dwellir.com`
- Polkadot Asset Hub: `wss://asset-hub-polkadot-rpc.n.dwellir.com`

---

_Data collected: 2026-01-30 via RPC queries_
_Data collection method: Sampled blocks at intervals of latestHeight/50, queried state.getRuntimeVersion for each_
