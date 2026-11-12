import { mockAddress, mockNumber, mockOption } from "./utils/mockFunctions";
import { spawnSync } from "child_process";
import { tmpdir } from "os";
import { resolve } from "path";

jest.mock("@polkadot/api", () => ({}));
const { fetchEraRows } = require("../scripts/backfill_era_validator_infos");

it("loads the standalone backfill CLI outside the repository", () => {
  // Use a real child process so Jest's TypeScript loader cannot mask ts-node errors.
  // Missing arguments must reach the CLI's usage check, without connecting to RPC.
  const result = spawnSync(
    process.execPath,
    [resolve(__dirname, "../scripts/backfill_era_validator_infos.js")],
    { cwd: tmpdir(), encoding: "utf8", timeout: 15000 },
  );
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Usage: backfill_era_validator_infos.js");
  expect(result.stderr).not.toContain("TSError");
});

it("excludes invalid addresses from backfill SQL rows and retains valid validators", async () => {
  const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
  const valid = "0x" + "ab".repeat(32);
  const invalid = "0x" + "cd".repeat(5367);
  const overview = [invalid, valid].map((address) => [
    { args: [mockNumber(123), mockAddress(address)] },
    mockOption({
      pageCount: mockNumber(0),
      total: mockNumber(10),
      own: mockNumber(10),
    }),
  ]);
  const api = {
    query: {
      staking: {
        erasStakersOverview: { entries: async () => overview },
        erasStakersPaged: { entries: async () => [] },
      },
    },
  };

  try {
    const rows = await fetchEraRows(api, 123, "9484708");
    expect(rows).toHaveLength(1);
    expect(rows[0].address).toBe(valid);
    expect(rows[0].id).toBe(`123-backfill-${valid}`);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("block=9484708 extrinsicIdx=none"),
    );
    expect(warn.mock.calls[0][0].length).toBeLessThan(200);
  } finally {
    warn.mockRestore();
  }
});
