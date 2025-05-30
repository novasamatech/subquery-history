import { typesBundleForPolkadot } from "@bifrost-finance/type-definitions";
import type { OverrideBundleDefinition } from "@polkadot/types/types";

export default {
  typesBundle: {
    spec: {
      bifrost: typesBundleForPolkadot.spec.bifrost as OverrideBundleDefinition,
    },
  },
};
