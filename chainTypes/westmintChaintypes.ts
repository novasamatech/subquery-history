import { OverrideBundleDefinition } from "@polkadot/types/types";

const definitions: OverrideBundleDefinition = {
  types: [
    {
      minmax: [0, 9434],
      types: {
        NovaAssetId: "Option<AssetId>"
      },
    },
    {
      minmax: [9435, null],
      types: {
        NovaAssetId: "Option<MultiLocation>"
      },
    },
  ],
  signedExtensions: {
    ChargeAssetTxPayment: {
      extrinsic: {
        tip: 'Compact<Balance>',
        // eslint-disable-next-line sort-keys
        assetId: 'NovaAssetId'
      },
      payload: {}
    }
  }
};

export default { typesBundle: { spec: { "westmint": definitions } } };