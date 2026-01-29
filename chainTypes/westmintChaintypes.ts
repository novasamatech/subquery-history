import { OverrideBundleDefinition } from "@polkadot/types/types";

const definitions: OverrideBundleDefinition = {
  types: [
    {
      // Before spec 9435, assetId was Option<AssetId>
      // Note: Westend skipped versions 9430-9434
      minmax: [0, 9434],
      types: {
        NovaAssetId: "Option<AssetId>",
      },
    },
    {
      // From spec 9435 to 1020999, assetId uses Option<MultiLocation>
      minmax: [9435, 1020999],
      types: {
        NovaAssetId: "Option<MultiLocation>",
      },
    },
    {
      // From spec version 1021000, ChargeAssetTxPayment uses MultiLocationV3 for foreign assets
      minmax: [1021000, null],
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
  typesBundle: { spec: { westmint: definitions } },
  types: {
    // Override for current runtime - needed for block decoding
    NovaAssetId: "Option<MultiLocationV3>",
  },
};
