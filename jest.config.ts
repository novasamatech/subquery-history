export default {
  preset: "ts-jest",
  testMatch: ["**/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: "tsconfig.jest.json", diagnostics: false },
    ],
  },
};
