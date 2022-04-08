import type { OverrideBundleType } from "@polkadot/types/types";

const types = [
  {
    // on all versions
    minmax: [0, undefined],
    types: {
      Address: "MultiAddress",
      Enclave: {
        mrenclave: "Hash",
        pubkey: "AccountId",
        timestamp: "u64",
        url: "Text",
      },
      LookupSource: "MultiAddress",
      Request: {
        cyphertext: "Vec<u8>",
        shard: "ShardIdentifier",
      },
      ShardIdentifier: "Hash",
    },
  },
];

const typesBundle: OverrideBundleType = {
  spec: {
    "integritee-parachain": {
      types,
    },
  },
};

export default {
  typesBundle,
};