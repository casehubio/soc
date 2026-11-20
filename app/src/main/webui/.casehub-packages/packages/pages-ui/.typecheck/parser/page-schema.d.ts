import { z } from "zod";
/**
 * Minimal Zod schema for the root YAML dashboard structure.
 *
 * Validates basic shape only — the heavy lifting (desugaring, nav resolution,
 * property substitution) is done by parsePage and its sub-modules.
 */
export declare const yamlRootPageSchema: z.ZodObject<{
    pages: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    layoutTemplates: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    datasets: z.ZodOptional<z.ZodArray<z.ZodUnknown>>;
    global: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    properties: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    navTree: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
//# sourceMappingURL=page-schema.d.ts.map