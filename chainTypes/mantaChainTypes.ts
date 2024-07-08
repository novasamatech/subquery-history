import type { OverrideBundleDefinition } from "@polkadot/types/types";

const definitions: OverrideBundleDefinition = {
  types: [
    {
      minmax: [0, undefined],
      types: {
        CurrencyId: {
          _enum: ["MA"],
        },
        CurrencyIdOf: "CurrencyId",
        Amount: "i128",
        AmountOf: "Amount",
        AccountInfo: "AccountInfoWithDualRefCount",
      },
    },
  ],
};

export default { typesBundle: { spec: { manta: definitions } } };
