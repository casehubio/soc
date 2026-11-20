import { type DateIntervalType, type Month } from "./date-interval.js";
export type { DateIntervalType, Month };
export type TruncationUnit = Extract<DateIntervalType, "MINUTE" | "HOUR" | "DAY" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM">;
export type OffsetUnit = Extract<DateIntervalType, "SECOND" | "MINUTE" | "HOUR" | "DAY" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM">;
export interface TimeFrame {
    readonly from: TimeInstant;
    readonly to: TimeInstant;
}
export type TimeInstant = {
    readonly mode: "now";
    readonly offset?: TimeOffset;
} | {
    readonly mode: "begin";
    readonly unit: TruncationUnit;
    readonly firstMonthOfYear?: Month;
    readonly offset?: TimeOffset;
} | {
    readonly mode: "end";
    readonly unit: TruncationUnit;
    readonly firstMonthOfYear?: Month;
    readonly offset?: TimeOffset;
} | {
    readonly mode: "relative";
    readonly offset: TimeOffset;
};
export interface TimeOffset {
    readonly amount: number;
    readonly unit: OffsetUnit;
}
export declare function parseTimeFrame(expr: string): TimeFrame;
export declare function resolveInstant(instant: TimeInstant, referenceDate: Date): Date;
export declare function resolveTimeFrame(tf: TimeFrame, referenceDate: Date): {
    from: Date;
    to: Date;
};
//# sourceMappingURL=timeframe.d.ts.map