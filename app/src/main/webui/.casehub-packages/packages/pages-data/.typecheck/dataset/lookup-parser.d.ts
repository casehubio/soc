import { z } from "zod";
import type { DataSetLookup } from "./lookup.js";
declare const filterLeafSchema: z.ZodObject<{
    column: z.ZodString;
    function: z.ZodEnum<{
        IS_NULL: "IS_NULL";
        NOT_NULL: "NOT_NULL";
        EQUALS_TO: "EQUALS_TO";
        NOT_EQUALS_TO: "NOT_EQUALS_TO";
        LIKE_TO: "LIKE_TO";
        GREATER_THAN: "GREATER_THAN";
        GREATER_OR_EQUALS_TO: "GREATER_OR_EQUALS_TO";
        LOWER_THAN: "LOWER_THAN";
        LOWER_OR_EQUALS_TO: "LOWER_OR_EQUALS_TO";
        BETWEEN: "BETWEEN";
        TIME_FRAME: "TIME_FRAME";
        IN: "IN";
        NOT_IN: "NOT_IN";
    }>;
    args: z.ZodDefault<z.ZodArray<z.ZodUnion<readonly [z.ZodString, z.ZodNumber]>>>;
}, z.core.$strip>;
type FilterNodeInput = z.output<typeof filterLeafSchema> | {
    and: FilterNodeInput[];
} | {
    or: FilterNodeInput[];
} | {
    not: FilterNodeInput;
};
export declare const lookupSchema: z.ZodPipe<z.ZodObject<{
    uuid: z.ZodOptional<z.ZodString>;
    dataSetUuid: z.ZodOptional<z.ZodString>;
    filter: z.ZodOptional<z.ZodArray<z.ZodType<FilterNodeInput, unknown, z.core.$ZodTypeInternals<FilterNodeInput, unknown>>>>;
    group: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodObject<{
        columnGroup: z.ZodOptional<z.ZodPipe<z.ZodObject<{
            source: z.ZodString;
            id: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodString>;
            groupStrategy: z.ZodOptional<z.ZodString>;
            unit: z.ZodOptional<z.ZodEnum<{
                SECOND: "SECOND";
                MINUTE: "MINUTE";
                HOUR: "HOUR";
                DAY_OF_WEEK: "DAY_OF_WEEK";
                MONTH: "MONTH";
                QUARTER: "QUARTER";
            }>>;
            preferredUnit: z.ZodOptional<z.ZodEnum<{
                MILLISECOND: "MILLISECOND";
                HUNDRETH: "HUNDRETH";
                TENTH: "TENTH";
                SECOND: "SECOND";
                MINUTE: "MINUTE";
                HOUR: "HOUR";
                DAY: "DAY";
                DAY_OF_WEEK: "DAY_OF_WEEK";
                WEEK: "WEEK";
                MONTH: "MONTH";
                QUARTER: "QUARTER";
                YEAR: "YEAR";
                DECADE: "DECADE";
                CENTURY: "CENTURY";
                MILLENIUM: "MILLENIUM";
            }>>;
            maxIntervals: z.ZodDefault<z.ZodNumber>;
            emptyIntervals: z.ZodDefault<z.ZodBoolean>;
            ascendingOrder: z.ZodDefault<z.ZodBoolean>;
            firstMonthOfYear: z.ZodOptional<z.ZodEnum<{
                JANUARY: "JANUARY";
                FEBRUARY: "FEBRUARY";
                MARCH: "MARCH";
                APRIL: "APRIL";
                MAY: "MAY";
                JUNE: "JUNE";
                JULY: "JULY";
                AUGUST: "AUGUST";
                SEPTEMBER: "SEPTEMBER";
                OCTOBER: "OCTOBER";
                NOVEMBER: "NOVEMBER";
                DECEMBER: "DECEMBER";
            }>>;
            firstDayOfWeek: z.ZodOptional<z.ZodEnum<{
                MONDAY: "MONDAY";
                TUESDAY: "TUESDAY";
                WEDNESDAY: "WEDNESDAY";
                THURSDAY: "THURSDAY";
                FRIDAY: "FRIDAY";
                SATURDAY: "SATURDAY";
                SUNDAY: "SUNDAY";
            }>>;
        }, z.core.$strip>, z.ZodTransform<{
            strategy: string;
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        }, {
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            strategy?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        }>>>;
        columns: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodObject<{
            source: z.ZodString;
            id: z.ZodOptional<z.ZodString>;
            column: z.ZodOptional<z.ZodString>;
            function: z.ZodOptional<z.ZodString>;
            separator: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodTransform<{
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }, {
            source: string;
            id?: string | undefined;
            column?: string | undefined;
            function?: string | undefined;
            separator?: string | undefined;
        }>>>>;
        functions: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodObject<{
            source: z.ZodString;
            id: z.ZodOptional<z.ZodString>;
            column: z.ZodOptional<z.ZodString>;
            function: z.ZodOptional<z.ZodString>;
            separator: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodTransform<{
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }, {
            source: string;
            id?: string | undefined;
            column?: string | undefined;
            function?: string | undefined;
            separator?: string | undefined;
        }>>>>;
        selectedIntervals: z.ZodOptional<z.ZodArray<z.ZodString>>;
        join: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodTransform<{
        columns: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[];
        columnGroup?: {
            strategy: string;
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        } | undefined;
        functions?: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[] | undefined;
        selectedIntervals?: string[] | undefined;
        join?: boolean | undefined;
    }, {
        columnGroup?: {
            strategy: string;
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        } | undefined;
        columns?: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[] | undefined;
        functions?: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[] | undefined;
        selectedIntervals?: string[] | undefined;
        join?: boolean | undefined;
    }>>>>;
    groupOps: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodObject<{
        columnGroup: z.ZodOptional<z.ZodPipe<z.ZodObject<{
            source: z.ZodString;
            id: z.ZodOptional<z.ZodString>;
            strategy: z.ZodOptional<z.ZodString>;
            groupStrategy: z.ZodOptional<z.ZodString>;
            unit: z.ZodOptional<z.ZodEnum<{
                SECOND: "SECOND";
                MINUTE: "MINUTE";
                HOUR: "HOUR";
                DAY_OF_WEEK: "DAY_OF_WEEK";
                MONTH: "MONTH";
                QUARTER: "QUARTER";
            }>>;
            preferredUnit: z.ZodOptional<z.ZodEnum<{
                MILLISECOND: "MILLISECOND";
                HUNDRETH: "HUNDRETH";
                TENTH: "TENTH";
                SECOND: "SECOND";
                MINUTE: "MINUTE";
                HOUR: "HOUR";
                DAY: "DAY";
                DAY_OF_WEEK: "DAY_OF_WEEK";
                WEEK: "WEEK";
                MONTH: "MONTH";
                QUARTER: "QUARTER";
                YEAR: "YEAR";
                DECADE: "DECADE";
                CENTURY: "CENTURY";
                MILLENIUM: "MILLENIUM";
            }>>;
            maxIntervals: z.ZodDefault<z.ZodNumber>;
            emptyIntervals: z.ZodDefault<z.ZodBoolean>;
            ascendingOrder: z.ZodDefault<z.ZodBoolean>;
            firstMonthOfYear: z.ZodOptional<z.ZodEnum<{
                JANUARY: "JANUARY";
                FEBRUARY: "FEBRUARY";
                MARCH: "MARCH";
                APRIL: "APRIL";
                MAY: "MAY";
                JUNE: "JUNE";
                JULY: "JULY";
                AUGUST: "AUGUST";
                SEPTEMBER: "SEPTEMBER";
                OCTOBER: "OCTOBER";
                NOVEMBER: "NOVEMBER";
                DECEMBER: "DECEMBER";
            }>>;
            firstDayOfWeek: z.ZodOptional<z.ZodEnum<{
                MONDAY: "MONDAY";
                TUESDAY: "TUESDAY";
                WEDNESDAY: "WEDNESDAY";
                THURSDAY: "THURSDAY";
                FRIDAY: "FRIDAY";
                SATURDAY: "SATURDAY";
                SUNDAY: "SUNDAY";
            }>>;
        }, z.core.$strip>, z.ZodTransform<{
            strategy: string;
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        }, {
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            strategy?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        }>>>;
        columns: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodObject<{
            source: z.ZodString;
            id: z.ZodOptional<z.ZodString>;
            column: z.ZodOptional<z.ZodString>;
            function: z.ZodOptional<z.ZodString>;
            separator: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodTransform<{
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }, {
            source: string;
            id?: string | undefined;
            column?: string | undefined;
            function?: string | undefined;
            separator?: string | undefined;
        }>>>>;
        functions: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodObject<{
            source: z.ZodString;
            id: z.ZodOptional<z.ZodString>;
            column: z.ZodOptional<z.ZodString>;
            function: z.ZodOptional<z.ZodString>;
            separator: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>, z.ZodTransform<{
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }, {
            source: string;
            id?: string | undefined;
            column?: string | undefined;
            function?: string | undefined;
            separator?: string | undefined;
        }>>>>;
        selectedIntervals: z.ZodOptional<z.ZodArray<z.ZodString>>;
        join: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>, z.ZodTransform<{
        columns: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[];
        columnGroup?: {
            strategy: string;
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        } | undefined;
        functions?: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[] | undefined;
        selectedIntervals?: string[] | undefined;
        join?: boolean | undefined;
    }, {
        columnGroup?: {
            strategy: string;
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        } | undefined;
        columns?: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[] | undefined;
        functions?: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[] | undefined;
        selectedIntervals?: string[] | undefined;
        join?: boolean | undefined;
    }>>>>;
    sort: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodObject<{
        column: z.ZodString;
        order: z.ZodOptional<z.ZodEnum<{
            ASCENDING: "ASCENDING";
            DESCENDING: "DESCENDING";
        }>>;
        sortOrder: z.ZodOptional<z.ZodEnum<{
            ASCENDING: "ASCENDING";
            DESCENDING: "DESCENDING";
        }>>;
    }, z.core.$strip>, z.ZodTransform<{
        column: string;
        order: "ASCENDING" | "DESCENDING";
    }, {
        column: string;
        order?: "ASCENDING" | "DESCENDING" | undefined;
        sortOrder?: "ASCENDING" | "DESCENDING" | undefined;
    }>>>>;
    sortOps: z.ZodOptional<z.ZodArray<z.ZodPipe<z.ZodObject<{
        column: z.ZodString;
        order: z.ZodOptional<z.ZodEnum<{
            ASCENDING: "ASCENDING";
            DESCENDING: "DESCENDING";
        }>>;
        sortOrder: z.ZodOptional<z.ZodEnum<{
            ASCENDING: "ASCENDING";
            DESCENDING: "DESCENDING";
        }>>;
    }, z.core.$strip>, z.ZodTransform<{
        column: string;
        order: "ASCENDING" | "DESCENDING";
    }, {
        column: string;
        order?: "ASCENDING" | "DESCENDING" | undefined;
        sortOrder?: "ASCENDING" | "DESCENDING" | undefined;
    }>>>>;
}, z.core.$strip>, z.ZodTransform<{
    uuid: string;
    filter: FilterNodeInput[] | undefined;
    group: {
        columns: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[];
        columnGroup?: {
            strategy: string;
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        } | undefined;
        functions?: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[] | undefined;
        selectedIntervals?: string[] | undefined;
        join?: boolean | undefined;
    }[] | undefined;
    sort: {
        column: string;
        order: "ASCENDING" | "DESCENDING";
    }[] | undefined;
}, {
    uuid?: string | undefined;
    dataSetUuid?: string | undefined;
    filter?: FilterNodeInput[] | undefined;
    group?: {
        columns: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[];
        columnGroup?: {
            strategy: string;
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        } | undefined;
        functions?: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[] | undefined;
        selectedIntervals?: string[] | undefined;
        join?: boolean | undefined;
    }[] | undefined;
    groupOps?: {
        columns: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[];
        columnGroup?: {
            strategy: string;
            source: string;
            maxIntervals: number;
            emptyIntervals: boolean;
            ascendingOrder: boolean;
            id?: string | undefined;
            groupStrategy?: string | undefined;
            unit?: "SECOND" | "MINUTE" | "HOUR" | "DAY_OF_WEEK" | "MONTH" | "QUARTER" | undefined;
            preferredUnit?: "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM" | undefined;
            firstMonthOfYear?: "JANUARY" | "FEBRUARY" | "MARCH" | "APRIL" | "MAY" | "JUNE" | "JULY" | "AUGUST" | "SEPTEMBER" | "OCTOBER" | "NOVEMBER" | "DECEMBER" | undefined;
            firstDayOfWeek?: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY" | undefined;
        } | undefined;
        functions?: {
            source: string;
            id: string | undefined;
            function: "SUM" | "AVERAGE" | "MEDIAN" | "COUNT" | "DISTINCT" | "MIN" | "MAX" | "JOIN" | "DISTINCTJOIN" | undefined;
            separator: string | undefined;
        }[] | undefined;
        selectedIntervals?: string[] | undefined;
        join?: boolean | undefined;
    }[] | undefined;
    sort?: {
        column: string;
        order: "ASCENDING" | "DESCENDING";
    }[] | undefined;
    sortOps?: {
        column: string;
        order: "ASCENDING" | "DESCENDING";
    }[] | undefined;
}>>;
export declare function parseLookup(raw: unknown): DataSetLookup;
export {};
//# sourceMappingURL=lookup-parser.d.ts.map