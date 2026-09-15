import { Metadata, TypeRegistry } from "@polkadot/types";
import type { Enum, Struct } from "@polkadot/types-codec";
import chainTypes from "../chainTypes/statemintChaintypes";
import fixture from "./fixtures/polkadot-ah-general-extrinsic.json";

const SIGNER =
  "0x4c2545283514c51c1b5aeac53e68694cbd5913c14044657db192a3e014d8df66";
const SIGNATURE =
  "0xe89a5ce385d8186d9649b75f8007ac4be2a27e01cd3451be557d00e653ccab55b6053c58faedd4e04b4fb85d59cba2139ad5426875785fdeb592349bd053aa83";

function createRegistry(override: boolean) {
  const { Extrinsic, GeneralExtrinsic, ...legacyTypes } = chainTypes.types;
  const types = override ? chainTypes.types : legacyTypes;
  const registry = new TypeRegistry();
  registry.setKnownTypes({ ...chainTypes, types });
  registry.register(types);
  registry.setMetadata(
    new Metadata(registry, fixture.metadata),
    undefined,
    chainTypes.typesBundle.spec.statemint.signedExtensions,
    true,
  );
  return registry;
}

describe("Asset Hub v5 extrinsic decoding", () => {
  it("reproduces the stock Mortal era error on block 20494727", () => {
    const registry = createRegistry(false);
    expect(() => registry.createType("Extrinsic", fixture.extrinsic)).toThrow(
      "Invalid data passed to Mortal era",
    );
  });

  it("preserves the incident's origin, call, fees, bytes and hash", () => {
    const registry = createRegistry(true);
    const extrinsic = registry.createType("Extrinsic", fixture.extrinsic);

    expect(extrinsic.isGeneral()).toBe(true);
    expect(extrinsic.isSigned).toBe(true);
    expect(extrinsic.type).toBe(5);
    expect(extrinsic.version).toBe(0x45);
    expect(extrinsic.signer.toString()).toBe(
      registry.createType("AccountId", SIGNER).toString(),
    );
    expect(extrinsic.signature.toHex()).toBe(SIGNATURE);
    expect(extrinsic.method.section).toBe("utility");
    expect(extrinsic.method.method).toBe("forceBatch");
    expect(extrinsic.nonce.toNumber()).toBe(334);
    expect(extrinsic.era.asMortalEra.period.toNumber()).toBe(128);
    expect(extrinsic.era.asMortalEra.phase.toNumber()).toBe(116);
    expect(extrinsic.tip.toNumber()).toBe(0);
    expect(extrinsic.assetId.isNone).toBe(true);
    expect(extrinsic.toHex()).toBe(fixture.extrinsic);
    expect(extrinsic.toU8a()).toEqual(
      Uint8Array.from(Buffer.from(fixture.extrinsic.slice(2), "hex")),
    );
    expect(extrinsic.hash.toHex()).toBe(fixture.extrinsicHash);
  });

  it("retains stock signed-v4 and bare-v5 behavior", () => {
    const registry = createRegistry(true);
    const stock = createRegistry(false);
    const original = registry.createType("Extrinsic", fixture.extrinsic);
    const verification = (original.unwrap() as unknown as Struct).getT<Enum>(
      "VerifyMultiSignature",
    ).value as Struct;
    const legacy = stock.createType(
      "Extrinsic",
      { method: original.method },
      { version: 4 },
    );
    legacy.addSignature(SIGNER, verification.get("signature").toHex(), {
      era: original.era,
      nonce: 334,
      tip: 0,
      assetId: null,
      mode: 0,
    });
    const decoded = registry.createType("Extrinsic", legacy.toHex());
    expect(decoded.isGeneral()).toBe(false);
    expect(decoded.isSigned).toBe(true);
    expect(decoded.signer.toString()).toBe(legacy.signer.toString());
    expect(decoded.signature.toHex()).toBe(legacy.signature.toHex());
    expect(decoded.toHex()).toBe(legacy.toHex());
    expect(decoded.hash.toHex()).toBe(legacy.hash.toHex());

    const body = Buffer.concat([Buffer.from([5]), original.method.toU8a()]);
    const bytes = Buffer.concat([
      registry.createType("Compact<u32>", body.length).toU8a(),
      body,
    ]);
    const bare = registry.createType("Extrinsic", bytes);
    const stockBare = stock.createType("Extrinsic", bytes);
    expect(bare.isGeneral()).toBe(false);
    expect(bare.isSigned).toBe(false);
    expect(bare.toHex()).toBe(stockBare.toHex());
    expect(bare.hash.toHex()).toBe(stockBare.hash.toHex());
  });
});
