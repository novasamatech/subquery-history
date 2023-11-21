import { OverrideBundleDefinition } from "@polkadot/types/types";

const definitions: OverrideBundleDefinition = {
  types: [
    {
      minmax: [0, 10004],
      types: {
        NovaAssetId: "Option<AssetId>",
      },
    },
    {
      minmax: [10005, null],
      types: {
        NovaAssetId: "Option<MultiLocation>",
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

export default { typesBundle: { spec: { statemine: definitions } } };
