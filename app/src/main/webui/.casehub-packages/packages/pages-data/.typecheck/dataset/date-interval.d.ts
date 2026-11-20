export type DateIntervalType = "MILLISECOND" | "HUNDRETH" | "TENTH" | "SECOND" | "MINUTE" | "HOUR" | "DAY" | "DAY_OF_WEEK" | "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "DECADE" | "CENTURY" | "MILLENIUM";
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export declare const APPROXIMATE_DURATION_MS: Readonly<Record<DateIntervalType, number>>;
export interface TruncateOptions {
    /**
     * First month of the fiscal year (1-based). Default: 1 (January).
     * Used for YEAR and QUARTER truncation.
     */
    firstMonthOfYear?: Month;
}
/**
 * Truncate a date to the start of a given interval unit.
 * Does not mutate the input date.
 * All date operations use UTC methods.
 *
 * @param date - The date to truncate
 * @param unit - The interval unit
 * @param opts - Options for truncation (e.g., firstMonthOfYear for fiscal year)
 * @returns A new Date truncated to the start of the interval
 */
export declare function truncateToInterval(date: Date, unit: DateIntervalType, opts?: TruncateOptions): Date;
/**
 * Advance a date by a given number of intervals.
 * Does not mutate the input date.
 * All date operations use UTC methods.
 *
 * @param date - The date to advance
 * @param unit - The interval unit
 * @param count - Number of intervals to advance (can be negative)
 * @returns A new Date advanced by the specified interval count
 */
export declare function advanceByInterval(date: Date, unit: DateIntervalType, count: number): Date;
//# sourceMappingURL=date-interval.d.ts.map