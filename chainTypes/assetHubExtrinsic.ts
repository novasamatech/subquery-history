import type { Enum, Struct } from "@polkadot/types-codec";
import type { GenericExtrinsic } from "@polkadot/types/extrinsic/Extrinsic";
import type { CodecClass, Registry } from "@polkadot/types/types";

// Canonical copy: novasamatech/subquery-accounts, chainTypes/assetHubExtrinsic.ts.
// Related upstream work: https://github.com/polkadot-js/api/pull/6253.
// Keep both copies in sync; see AGENTS.md for the removal criteria.

const EXTRINSIC_VERSION_V5 = 5;
const GENERAL_EXTRINSIC_PREAMBLE = 0x40 | EXTRINSIC_VERSION_V5;
const MIN_GENERAL_PAYLOAD_BYTES = 2; // Preamble + extension version; metadata validates the rest.

/**
 * Overrides GeneralExtrinsic to decode the metadata-selected v5 pipeline.
 * Returns registry-created codecs because numeric decoders outside SubQuery's
 * chain types VM cannot consume the VM's Uint8Arrays.
 * Remove with AssetHubExtrinsic once the stock codec satisfies the incident
 * fixture's field, signed-origin, byte/hash and legacy compatibility assertions.
 */
export const AssetHubGeneralExtrinsic = class {
  constructor(registry: Registry, value: Uint8Array | string) {
    const encoded = registry.createType("Raw", value).toU8a();
    const length = registry.createType("Compact<u32>", encoded);
    const offset = length.encodedLength;
    const end = offset + length.toNumber();
    if (
      end > encoded.length ||
      encoded[offset] !== GENERAL_EXTRINSIC_PREAMBLE ||
      length.toNumber() < MIN_GENERAL_PAYLOAD_BYTES
    ) {
      throw new Error("Invalid Asset Hub general extrinsic envelope");
    }

    const data = encoded.subarray(offset + 1, end);
    const metadata = registry.metadata.extrinsic;
    const pipeline = [...metadata.transactionExtensionsByVersion].find(
      ([version]) => version.eq(data[0]),
    );
    if (!pipeline) {
      throw new Error(
        `Unknown Asset Hub transaction extension version: ${data[0]}`,
      );
    }

    // polkadot-js 16.5.x uses the v4 extensions for all versions. v16 metadata
    // supplies both the exact order and the SCALE types for each v5 pipeline.
    const fields: Record<string, string> = {
      transactionExtensionVersion: "u8",
    };
    for (const index of pipeline[1]) {
      const extension = metadata.transactionExtensions[index.toNumber()];
      if (!extension)
        throw new Error(`Missing Asset Hub transaction extension: ${index}`);
      fields[extension.identifier.toString()] = registry.createLookupType(
        extension.type,
      );
    }
    fields["method"] = "Call";
    const decoded = registry.createTypeUnsafe<Struct>(JSON.stringify(fields), [
      data,
    ]);
    if (decoded.encodedLength !== data.length) {
      throw new Error(
        "Asset Hub general extrinsic length does not match its metadata",
      );
    }

    Object.defineProperties(decoded, {
      // GenericExtrinsic reads the preamble from the inner version on creation.
      version: { value: GENERAL_EXTRINSIC_PREAMBLE },
      signature: { value: { isSigned: false } },
      method: { get: () => decoded.get("method") },
      era: { get: () => decoded.get("CheckMortality") },
      nonce: { get: () => decoded.get("CheckNonce") },
      tip: {
        get: () => decoded.getT<Struct>("ChargeAssetTxPayment").get("tip"),
      },
      assetId: {
        get: () => decoded.getT<Struct>("ChargeAssetTxPayment").get("assetId"),
      },
      mode: {
        get: () =>
          registry.createType(
            "u8",
            decoded.getT<Struct>("CheckMetadataHash").getT<Enum>("mode").index,
          ),
      },
      // The metadata hash is implicit signing data, absent from the extrinsic.
      metadataHash: { get: () => registry.createType("Option<Hash>") },
    });
    return decoded;
  }
} as unknown as CodecClass;

/**
 * Overrides Extrinsic to expose v5 signatures and signed origins to the indexer.
 * Remove with AssetHubGeneralExtrinsic when a published runtime's stock codec
 * preserves these fields and passes the byte/hash and legacy assertions in
 * tests/assetHubExtrinsic.test.ts.
 */
export const AssetHubExtrinsic = class {
  constructor(registry: Registry, value?: unknown, options?: unknown) {
    const Extrinsic =
      registry.createClassUnsafe<GenericExtrinsic>("GenericExtrinsic");
    const extrinsic = new Extrinsic(registry, value, options);
    if (!extrinsic.isGeneral()) return extrinsic;

    const extensions = extrinsic.unwrap() as unknown as Struct;
    const verification = extensions.get("VerifyMultiSignature") as
      | Enum
      | undefined;
    const authorization =
      verification?.type === "Signed"
        ? (verification.value as Struct)
        : undefined;
    const signature = authorization?.get("signature") as Enum | undefined;
    Object.defineProperties(extrinsic, {
      type: { value: EXTRINSIC_VERSION_V5 },
      // A v5 signature lives in VerifyMultiSignature, not the v4 signed bit.
      version: { value: GENERAL_EXTRINSIC_PREAMBLE },
      isSigned: { value: !!authorization },
      signer: {
        get: () =>
          registry.createType(
            "Address",
            authorization?.get("account")?.toHex(),
          ),
      },
      signature: {
        get: () =>
          (signature ?? registry.createType("ExtrinsicSignature")).value,
      },
    });
    return extrinsic;
  }
} as unknown as CodecClass;
