import { OverrideBundleDefinition } from "@polkadot/types/types";

const definitions: OverrideBundleDefinition = {
  types: [
    {
      // Before spec 9430, assetId was Option<AssetId>
      minmax: [0, 9429],
      types: {
        NovaAssetId: "Option<AssetId>",
      },
    },
    {
      // From spec 9430 to 1999999, assetId uses Option<MultiLocation>
      minmax: [9430, 1999999],
      types: {
        NovaAssetId: "Option<MultiLocation>",
      },
    },
    {
      // From spec version 2000000, ChargeAssetTxPayment uses MultiLocationV3 for foreign assets
      minmax: [2000000, null],
      types: {
        NovaAssetId: "Option<MultiLocationV3>",
      },
    },
  ],
  signedExtensions: {
    ChargeAssetTxPayment: {
      extrinsic: {
        tip: "Compact<Balance>",
        // eslint-disable-next-line sort-keys
        assetId: "NovaAssetId",
      },
      payload: {},
    },
  },
};

export default {
  typesBundle: { spec: { statemint: definitions } },
  types: {
    // Override for current runtime - needed for block decoding
    NovaAssetId: "Option<MultiLocationV3>",
  },
};
