import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

describe("registry completeness", () => {
  it("every blocks-* custom element has a registry entry", () => {
    const generatedPath = resolve(__dirname, "component-schemas.generated.ts");
    const generated = readFileSync(generatedPath, "utf-8");

    const registeredNames = new Set<string>();
    const mapRegex = /\["([^"]+)",\s+\w+PropsSchema\]/g;
    let match;
    while ((match = mapRegex.exec(generated)) !== null) {
      registeredNames.add(match[1]);
    }

    const registryPath = resolve(__dirname, "registry.ts");
    const registry = readFileSync(registryPath, "utf-8");
    const registryKeys = new Set<string>();
    const keyRegex = /'([^']+)':\s+\w+Props;/g;
    while ((match = keyRegex.exec(registry)) !== null) {
      registryKeys.add(match[1]);
    }

    expect(registeredNames.size).toBeGreaterThan(0);
    expect(registeredNames.size).toBe(registryKeys.size);

    for (const key of registryKeys) {
      expect(registeredNames.has(key)).toBe(true);
    }
  });

  it("schema map has correct count", () => {
    const generatedPath = resolve(__dirname, "component-schemas.generated.ts");
    const generated = readFileSync(generatedPath, "utf-8");

    const schemaExports = generated.match(/export const \w+PropsSchema/g) || [];
    const mapEntries = generated.match(/\["\w[^"]*",\s+\w+PropsSchema\]/g) || [];

    expect(schemaExports.length).toBe(mapEntries.length);
    expect(schemaExports.length).toBeGreaterThanOrEqual(50);
  });
});
