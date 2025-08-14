import { typesBundleForPolkadot } from "@acala-network/type-definitions";
import type { OverrideBundleDefinition } from "@polkadot/types/types";

export default {
  typesBundle: {
    spec: {
      karura: typesBundleForPolkadot.spec.karura as OverrideBundleDefinition,
    },
  },
};
