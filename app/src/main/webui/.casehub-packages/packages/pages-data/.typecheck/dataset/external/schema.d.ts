import { z } from "zod";
import { ColumnType } from "../types.js";
import { HttpMethod } from "./types.js";
export declare const externalDataSetDefSchema: z.ZodObject<{
    uuid: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    url: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    join: z.ZodOptional<z.ZodArray<z.ZodString>>;
    serverQuery: z.ZodOptional<z.ZodBoolean>;
    serverPagination: z.ZodOptional<z.ZodObject<{
        offsetParam: z.ZodString;
        limitParam: z.ZodString;
        sortParam: z.ZodOptional<z.ZodString>;
        orderParam: z.ZodOptional<z.ZodString>;
        filterParam: z.ZodOptional<z.ZodString>;
        defaultPageSize: z.ZodNumber;
        maxCachedPages: z.ZodOptional<z.ZodNumber>;
        totalPath: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    method: z.ZodOptional<z.ZodEnum<typeof HttpMethod>>;
    headers: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    query: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    form: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodString>>;
    body: z.ZodOptional<z.ZodString>;
    dataPath: z.ZodOptional<z.ZodString>;
    expression: z.ZodOptional<z.ZodString>;
    type: z.ZodOptional<z.ZodString>;
    columns: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        type: z.ZodEnum<typeof ColumnType>;
    }, z.core.$strip>>>;
    cacheEnabled: z.ZodOptional<z.ZodBoolean>;
    cacheMaxRows: z.ZodOptional<z.ZodNumber>;
    refreshTime: z.ZodOptional<z.ZodString>;
    accumulate: z.ZodOptional<z.ZodBoolean>;
    keyColumn: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type ParsedExternalDataSetDef = z.output<typeof externalDataSetDefSchema>;
export declare function parseExternalDataSetDef(input: unknown): ParsedExternalDataSetDef;
//# sourceMappingURL=schema.d.ts.map