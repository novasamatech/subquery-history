import definitions, { RpcFunctionDefinition } from "@interlay/interbtc-types";
import { OverrideBundleType } from '@polkadot/types/types';

const types = {
  types: [
    {
      minmax: [0, undefined],
      types: definitions.types[0].types
    }
  ],
  rpc: definitions.rpc,
  instances: definitions.instances,
}

const typesBundle: OverrideBundleType = {
  spec: {
    interlay: types,
    interbtc: types,
    kintsugi: types
  },
}

export default {
  types: {
    GenericMultiAddress: {
      _enum: {
        Id: 'AccountId',
        Index: 'Compact<AccountIndex>',
        Raw: 'Bytes',
        Address32: 'H256',
        Address20: 'H160'  
      }
    },
    MultiAddress: "GenericMultiAddress",
    Address: "MultiAddress",
    LookupSource: "Address"
  },
  typesBundle
};
