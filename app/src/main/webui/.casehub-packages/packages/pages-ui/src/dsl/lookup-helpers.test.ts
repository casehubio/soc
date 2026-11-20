import { describe, it, expect } from "vitest";
import {
  lookup,
  groupBy,
  groupByCalendar,
  filterBy,
  and,
  or,
  not,
  sortBy,
  col,
  sum,
  avg,
  count,
  min,
  max,
  distinct,
  join,
  distinctJoin,
} from "./lookup-helpers.js";
import type { UnresolvedLeaf } from "@casehubio/pages-data";
import type { GroupOp } from "@casehubio/pages-data";

describe("lookup()", () => {
  it("creates DataSetLookup with branded DataSetId", () => {
    const l = lookup("sales");
    expect(l.dataSetId).toBe("sales");
    expect(l.operations).toEqual([]);
  });

  it("accepts operations", () => {
    const l = lookup("sales", sortBy("revenue", "DESCENDING"));
    expect(l.operations.length).toBe(1);
    expect(l.operations[0]!.type).toBe("sort");
  });
});

describe("groupBy()", () => {
  it("creates group op with distinct strategy default", () => {
    const g = groupBy("region", col("region"), sum("revenue"));
    expect(g.type).toBe("group");
    expect(g.groupingKey!.strategy).toEqual({ mode: "distinct" });
    expect(g.columns.length).toBe(2);
  });

  it("null source produces null groupingKey", () => {
    const g = groupBy(null, sum("revenue"));
    expect(g.groupingKey).toBeNull();
  });

  it("infers key column kind when source matches groupBy source", () => {
    const g = groupBy("region", col("region"));
    expect(g.columns[0]!.kind).toBe("key");
  });

  it("infers select column kind when source differs", () => {
    const g = groupBy("region", col("region"), col("name"));
    expect(g.columns[1]!.kind).toBe("select");
  });

  it("rejects non-string/null source with clear error (clinical#107)", () => {
    const badSource = [] as unknown as string;
    expect(() => groupBy(badSource, col("phase"))).toThrow(/groupBy source must be a string/);
  });

  it("auto-injects key column when groupBy source not in result columns", () => {
    const g = groupBy("caseId", col("prNumber"), sum("revenue"));
    expect(g.columns.length).toBe(3);
    expect(g.columns[0]!.kind).toBe("key");
    expect(g.columns[0]!.sourceId).toBe("caseId");
    expect(g.columns[0]!.columnId).toBe("caseId");
  });

  it("does not double-inject key column when already explicitly included", () => {
    const g = groupBy("region", col("region"), sum("revenue"));
    expect(g.columns.length).toBe(2);
    expect(g.columns[0]!.kind).toBe("key");
  });

  it("auto-injected key column works with groupByCalendar too", () => {
    const g = groupByCalendar("created", "MONTH", sum("revenue"));
    expect(g.columns.length).toBe(2);
    expect(g.columns[0]!.kind).toBe("key");
    expect(g.columns[0]!.sourceId).toBe("created");
  });
});

describe("groupByCalendar()", () => {
  it("creates group op with fixedCalendar strategy", () => {
    const g = groupByCalendar("created", "MONTH", col("created"), count("id"));
    expect(g.type).toBe("group");
    expect(g.groupingKey!.strategy).toEqual({ mode: "fixedCalendar", unit: "MONTH" });
    expect(g.columns.length).toBe(2);
  });

  it("infers key column kind for calendar group", () => {
    const g = groupByCalendar("created", "DAY_OF_WEEK", col("created"));
    expect(g.columns[0]!.kind).toBe("key");
  });
});

describe("filterBy()", () => {
  it("creates unresolved filter op", () => {
    const f = filterBy("region", "EQUALS_TO", "North");
    expect(f.type).toBe("filter");
    expect(f.expressions.length).toBe(1);
  });

  it("serializes Date args as ISO 8601", () => {
    const date = new Date("2024-06-15T00:00:00Z");
    const f = filterBy("created", "GREATER_THAN", date);
    const expr = f.expressions[0] as UnresolvedLeaf;
    expect(expr.args[0]).toBe("2024-06-15T00:00:00.000Z");
  });

  it("serializes number args", () => {
    const f = filterBy("age", "GREATER_THAN", 25);
    const expr = f.expressions[0] as UnresolvedLeaf;
    expect(expr.args[0]).toBe("25");
  });

  it("handles multiple args for BETWEEN", () => {
    const f = filterBy("age", "BETWEEN", 18, 65);
    const expr = f.expressions[0] as UnresolvedLeaf;
    expect(expr.args).toEqual(["18", "65"]);
  });
});

describe("boolean combinators", () => {
  it("and() combines filters", () => {
    const f = and(filterBy("region", "EQUALS_TO", "North"), filterBy("year", "EQUALS_TO", "2024"));
    expect(f.expressions.length).toBe(1);
    const expr = f.expressions[0]!;
    expect(expr.type).toBe("and");
    if (expr.type === "and") {
      expect(expr.children.length).toBe(2);
    }
  });

  it("or() combines filters", () => {
    const f = or(filterBy("region", "EQUALS_TO", "North"), filterBy("region", "EQUALS_TO", "South"));
    const expr = f.expressions[0]!;
    expect(expr.type).toBe("or");
    if (expr.type === "or") {
      expect(expr.children.length).toBe(2);
    }
  });

  it("not() wraps a filter", () => {
    const f = not(filterBy("archived", "EQUALS_TO", "true"));
    expect(f.expressions[0]!.type).toBe("not");
  });

  it("combines nested boolean logic", () => {
    const f = and(
      or(filterBy("region", "EQUALS_TO", "North"), filterBy("region", "EQUALS_TO", "South")),
      not(filterBy("archived", "EQUALS_TO", "true")),
    );
    const expr = f.expressions[0]!;
    expect(expr.type).toBe("and");
    if (expr.type === "and") {
      expect(expr.children.length).toBe(2);
      expect(expr.children[0]!.type).toBe("or");
      expect(expr.children[1]!.type).toBe("not");
    }
  });
});

describe("sortBy()", () => {
  it("creates sort op with ASCENDING default", () => {
    const s = sortBy("revenue");
    expect(s.type).toBe("sort");
    expect(s.columns[0]!.order).toBe("ASCENDING");
  });

  it("accepts explicit order", () => {
    const s = sortBy("revenue", "DESCENDING");
    expect(s.columns[0]!.order).toBe("DESCENDING");
  });
});

describe("result column helpers", () => {
  it("col() creates select column by default", () => {
    const c = col("name");
    expect(c.kind).toBe("select");
    expect(c.sourceId).toBe("name");
    expect(c.columnId).toBe("name");
  });

  it("sum() creates aggregate column", () => {
    const c = sum("revenue");
    expect(c.kind).toBe("aggregate");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "SUM" });
    }
  });

  it("avg() creates aggregate column", () => {
    const c = avg("revenue");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "AVERAGE" });
    }
  });

  it("count() creates aggregate column", () => {
    const c = count("id");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "COUNT" });
    }
  });

  it("min() creates aggregate column", () => {
    const c = min("price");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "MIN" });
    }
  });

  it("max() creates aggregate column", () => {
    const c = max("price");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "MAX" });
    }
  });

  it("distinct() creates aggregate column", () => {
    const c = distinct("category");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "DISTINCT" });
    }
  });

  it("join() with default separator", () => {
    const c = join("names");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "JOIN", separator: ", " });
    }
  });

  it("join() with custom separator", () => {
    const c = join("names", " | ");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "JOIN", separator: " | " });
    }
  });

  it("distinctJoin() with default separator", () => {
    const c = distinctJoin("names");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "DISTINCTJOIN", separator: ", " });
    }
  });

  it("distinctJoin() with custom separator", () => {
    const c = distinctJoin("names", "; ");
    if (c.kind === "aggregate") {
      expect(c.fn).toEqual({ fn: "DISTINCTJOIN", separator: "; " });
    }
  });

  describe("alias parameter", () => {
    it("col() with alias sets different columnId", () => {
      const c = col("date", "Month");
      expect(c.sourceId).toBe("date");
      expect(c.columnId).toBe("Month");
    });

    it("sum() with alias sets different columnId", () => {
      const c = sum("amount", "Revenue");
      expect(c.sourceId).toBe("amount");
      expect(c.columnId).toBe("Revenue");
    });

    it("avg() with alias sets different columnId", () => {
      const c = avg("price", "AvgPrice");
      expect(c.sourceId).toBe("price");
      expect(c.columnId).toBe("AvgPrice");
    });

    it("count() with alias sets different columnId", () => {
      const c = count("id", "Total");
      expect(c.sourceId).toBe("id");
      expect(c.columnId).toBe("Total");
    });

    it("min() with alias sets different columnId", () => {
      const c = min("price", "Lowest");
      expect(c.sourceId).toBe("price");
      expect(c.columnId).toBe("Lowest");
    });

    it("max() with alias sets different columnId", () => {
      const c = max("price", "Highest");
      expect(c.sourceId).toBe("price");
      expect(c.columnId).toBe("Highest");
    });

    it("distinct() with alias sets different columnId", () => {
      const c = distinct("category", "UniqueCategories");
      expect(c.sourceId).toBe("category");
      expect(c.columnId).toBe("UniqueCategories");
    });

    it("join() with alias as third parameter", () => {
      const c = join("names", " | ", "AllNames");
      expect(c.sourceId).toBe("names");
      expect(c.columnId).toBe("AllNames");
      if (c.kind === "aggregate") {
        expect(c.fn).toEqual({ fn: "JOIN", separator: " | " });
      }
    });

    it("distinctJoin() with alias as third parameter", () => {
      const c = distinctJoin("names", "; ", "UniqueNames");
      expect(c.sourceId).toBe("names");
      expect(c.columnId).toBe("UniqueNames");
      if (c.kind === "aggregate") {
        expect(c.fn).toEqual({ fn: "DISTINCTJOIN", separator: "; " });
      }
    });

    it("without alias, columnId defaults to source (unchanged behaviour)", () => {
      expect(col("x").columnId).toBe("x");
      expect(sum("x").columnId).toBe("x");
      expect(avg("x").columnId).toBe("x");
      expect(count("x").columnId).toBe("x");
      expect(min("x").columnId).toBe("x");
      expect(max("x").columnId).toBe("x");
      expect(distinct("x").columnId).toBe("x");
      expect(join("x").columnId).toBe("x");
      expect(distinctJoin("x").columnId).toBe("x");
    });
  });
});

describe("integration examples", () => {
  it("builds complete lookup with group and sort", () => {
    const l = lookup(
      "sales",
      groupBy("region", col("region"), sum("revenue")),
      sortBy("revenue", "DESCENDING"),
    );

    expect(l.dataSetId).toBe("sales");
    expect(l.operations.length).toBe(2);
    expect(l.operations[0]!.type).toBe("group");
    expect(l.operations[1]!.type).toBe("sort");
  });

  it("builds lookup with filter, group, and sort", () => {
    const l = lookup(
      "sales",
      filterBy("year", "EQUALS_TO", "2024"),
      groupBy("region", col("region"), sum("revenue")),
      sortBy("revenue", "DESCENDING"),
    );

    expect(l.operations.length).toBe(3);
    expect(l.operations[0]!.type).toBe("filter");
    expect(l.operations[1]!.type).toBe("group");
    expect(l.operations[2]!.type).toBe("sort");
  });

  it("builds whole-dataset aggregation with null groupBy source", () => {
    const l = lookup("sales", groupBy(null, sum("revenue"), avg("revenue"), count("id")));

    const op = l.operations[0]!;
    expect(op.type).toBe("group");
    const groupOp = op as GroupOp;
    expect(groupOp.groupingKey).toBeNull();
    expect(groupOp.columns.length).toBe(3);
  });

  it("builds calendar grouping with fixedCalendar strategy", () => {
    const l = lookup(
      "events",
      groupByCalendar("created", "MONTH", col("created"), count("id")),
      sortBy("created", "ASCENDING"),
    );

    const op = l.operations[0]!;
    expect(op.type).toBe("group");
    const groupOp = op as GroupOp;
    expect(groupOp.groupingKey!.strategy).toEqual({ mode: "fixedCalendar", unit: "MONTH" });
  });
});
