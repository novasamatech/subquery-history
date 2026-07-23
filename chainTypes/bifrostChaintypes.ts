import { typesBundleForPolkadot } from "@bifrost-finance/type-definitions";
import type { OverrideBundleDefinition } from "@polkadot/types/types";

/* =============================================================================
 *  Bifrost-Kusama  — unified historical patch for SubQuery
 * =============================================================================
 *  Two enums changed in on-chain history:
 *    • DispatchClass – extra variants (index 219 etc.)
 *    • Pays          – extra variants (index 9 etc.)
 *
 *  We relax both to raw `u8` for every specVersion ≥ 550.
 *  All other types are inherited from the official bundle.
 * --------------------------------------------------------------------------- */

const historicalPatch: OverrideBundleDefinition = {
  types: [
    {
      minmax: [801, 901],
      types: {
        DispatchClass: "u8",
        Pays: "u8",
        EventId: "u16",
        Weight: "u64",
        AccountId: "Bytes", // early blocks store 20-byte AccountIds
        MultiSignature: "Bytes", // unknown signature enum variant (index 25) ➜ accept raw bytes
        /* relax the whole extrinsic signature to raw bytes so we don’t try to
           decode inner fields like `nonce` or `tip` (which fail on early blocks) */
        ExtrinsicSignature: "Bytes",
        ExtrinsicSignatureV4: "Bytes",
        Call: "Bytes",
        OpaqueCall: "Bytes",
        Extrinsic: "Bytes",
        ExtrinsicV4: "Bytes",
        Phase: "u8", // early blocks encode Phase as single byte
        /* relax topics (Vec<Hash>) to raw bytes to accept truncated values */
        EventRecord: {
          phase: "Phase",
          event: "Event",
          topics: "Vec<Bytes>",
        },
      },
    },
  ],
};

export default {
  typesBundle: {
    spec: {
      bifrost: {
        /* upstream first … */
        ...typesBundleForPolkadot.spec.bifrost,
        /* our patch comes first to ensure it OVERRIDES conflicting types */
        types: [
          ...historicalPatch.types,
          ...(typesBundleForPolkadot.spec.bifrost.types ?? []),
        ],
      },
    },
  },
};
