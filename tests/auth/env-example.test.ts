import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("env_example_lists_keys_only", () => {
  it("declares BETTER_AUTH_SECRET, BETTER_AUTH_URL, and DATABASE_URL with empty values", () => {
    const envExamplePath = resolve(process.cwd(), ".env.example");
    const contents = readFileSync(envExamplePath, "utf8");
    const lines = contents.split(/\r?\n/);

    const keysRequired = [
      "BETTER_AUTH_SECRET",
      "BETTER_AUTH_URL",
      "DATABASE_URL",
    ] as const;

    for (const key of keysRequired) {
      const matching = lines.find(
        (line) =>
          line.startsWith(`${key}=`) && !line.trimStart().startsWith("#"),
      );
      expect(matching, `${key} must appear in .env.example`).toBeDefined();
      // Anything to the right of `=` must be empty (or whitespace) so we
      // never check secrets into source control.
      const value = matching!.slice(`${key}=`.length).trim();
      expect(value, `${key} must have an empty value`).toBe("");
    }
  });
});
