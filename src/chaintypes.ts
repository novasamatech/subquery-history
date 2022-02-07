import definitions, { RpcFunctionDefinition } from "@interlay/interbtc-types";
import { OverrideBundleType } from "@polkadot/types/types";

const types = {
  types: [
    {
      minmax: [0, undefined],
      types: definitions.types[0].types,
    },
  ],
  rpc: definitions.rpc,
  instances: definitions.instances,
};

const typesBundle: OverrideBundleType = {
  spec: {
    "kintsugi-parachain": types,
  },
};

export default {
  types: {
    H160: "[u8; 20]",
    H256: "[u8; 32]",
    AccountIndex: "u32",
    AccountId: "u64",
    GenericMultiAddress: {
      _enum: {
        Id: "AccountId",
        Index: "Compact<AccountIndex>",
        Raw: "Bytes",
        Address32: "H256",
        Address20: "H160",
      },
    },
    MultiAddress: "GenericMultiAddress",
    LookupSource: "Address",
    Index: "u32",
    ...definitions.types[0].types,
  },
  typesBundle,
};
