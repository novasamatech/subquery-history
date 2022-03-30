import { typeBundleForPolkadot } from "@kiltprotocol/type-definitions";

export default {
  types: {
    Keys: "AccountId",
  },
  typesBundle: {
    spec: {
      "mashnet-node": typeBundleForPolkadot,
      "kilt-spiritnet": typeBundleForPolkadot,
    },
  },
};