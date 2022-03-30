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
    AccountId32: "[u8; 32]",
    Address: "AccountId32",
  },
  typesBundle,
};