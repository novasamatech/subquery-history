import { OverrideBundleType } from '@polkadot/types/types';
import { typesBundle } from '@darwinia/types/mix';



export default {
  types: {
    ExposureT:{
      ownRingBalance: "Compact<Balance>",
      ownKtonBalance: "Compact<Balance>",
      ownPower: "Power",
      totalPower: "Power",
      others: "Vec<IndividualExposure>"
    },
    Power: "u32"
  },
  typesBundle: typesBundle.spec
}