import { describe, it, expect } from "vitest";
import { resolveSchemaRefs } from "./schema-ref-resolver.js";
import type { FieldSchema } from "./form-input-types.js";

describe("resolveSchemaRefs", () => {
  it("resolves local $defs reference", () => {
    const schema: FieldSchema = {
      $defs: {
        address: {
          type: "object",
          properties: { street: { type: "string" }, city: { type: "string" } },
        },
      },
      properties: {
        home: { $ref: "#/$defs/address" },
      },
    };
    const resolved = resolveSchemaRefs(schema);
    expect(resolved.properties!.home!.type).toBe("object");
    expect(resolved.properties!.home!.properties!.street!.type).toBe("string");
  });

  it("resolves nested references", () => {
    const schema: FieldSchema = {
      $defs: {
        name: { type: "string" },
        person: { type: "object", properties: { name: { $ref: "#/$defs/name" } } },
      },
      properties: {
        owner: { $ref: "#/$defs/person" },
      },
    };
    const resolved = resolveSchemaRefs(schema);
    expect(resolved.properties!.owner!.properties!.name!.type).toBe("string");
  });

  it("handles circular references with terminal empty schema", () => {
    const schema: FieldSchema = {
      $defs: {
        node: {
          type: "object",
          properties: {
            value: { type: "string" },
            child: { $ref: "#/$defs/node" },
          },
        },
      },
      properties: {
        root: { $ref: "#/$defs/node" },
      },
    };
    const resolved = resolveSchemaRefs(schema);
    expect(resolved.properties!.root!.type).toBe("object");
    expect(resolved.properties!.root!.properties!.value!.type).toBe("string");
    expect(resolved.properties!.root!.properties!.child).toEqual({});
  });

  it("passes through unresolvable refs", () => {
    const schema: FieldSchema = {
      properties: {
        thing: { $ref: "#/$defs/nonexistent" },
      },
    };
    const resolved = resolveSchemaRefs(schema);
    expect(resolved.properties!.thing!.$ref).toBe("#/$defs/nonexistent");
  });

  it("handles definitions key (legacy)", () => {
    const schema: FieldSchema = {
      definitions: {
        name: { type: "string" },
      },
      properties: {
        label: { $ref: "#/definitions/name" },
      },
    };
    const resolved = resolveSchemaRefs(schema);
    expect(resolved.properties!.label!.type).toBe("string");
  });

  it("resolves refs inside items", () => {
    const schema: FieldSchema = {
      $defs: { tag: { type: "string", minLength: 1 } },
      properties: {
        tags: { type: "array", items: { $ref: "#/$defs/tag" } },
      },
    };
    const resolved = resolveSchemaRefs(schema);
    expect(resolved.properties!.tags!.items!.type).toBe("string");
    expect(resolved.properties!.tags!.items!.minLength).toBe(1);
  });

  it("resolves refs inside oneOf", () => {
    const schema: FieldSchema = {
      $defs: { emailVariant: { properties: { method: { const: "email" } } } },
      properties: {
        contact: { oneOf: [{ $ref: "#/$defs/emailVariant" }] },
      },
    };
    const resolved = resolveSchemaRefs(schema);
    expect(resolved.properties!.contact!.oneOf![0]!.properties!.method!.const).toBe("email");
  });

  it("returns schema unchanged when no refs present", () => {
    const schema: FieldSchema = {
      properties: { name: { type: "string" } },
    };
    const resolved = resolveSchemaRefs(schema);
    expect(resolved).toEqual(schema);
  });
});
