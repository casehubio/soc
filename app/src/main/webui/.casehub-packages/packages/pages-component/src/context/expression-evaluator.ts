import type { RuntimeContext } from "./types.js";
import { resolveTemplate } from "./template-parser.js";

/**
 * Create a new RuntimeContext with the row property set.
 * Row values are accessible via #{row.fieldName}.
 */
export function createRowContext(
  base: RuntimeContext,
  row: Record<string, unknown>
): RuntimeContext {
  return {
    ...base,
    row,
  };
}

/**
 * Evaluate a boolean expression against the runtime context.
 * Supports: &&, ||, !, ==, !=, <, >, <=, >=, parentheses, #{...} references,
 * string literals (single/double quotes), numeric literals, true/false/null.
 *
 * Type coercion: when both operands parse as finite numbers, compare numerically.
 * Otherwise compare as strings. Consistent across all operators.
 */
export function evaluateExpression(
  expression: string,
  context: RuntimeContext
): boolean {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens, context);
  return parser.parseOr();
}

// Token types
type TokenType =
  | "LPAREN"
  | "RPAREN"
  | "NOT"
  | "AND"
  | "OR"
  | "EQ"
  | "NE"
  | "LT"
  | "LE"
  | "GT"
  | "GE"
  | "STRING"
  | "NUMBER"
  | "TRUE"
  | "FALSE"
  | "NULL"
  | "TEMPLATE"
  | "EOF";

interface Token {
  type: TokenType;
  value?: string | number | boolean | null;
}

/**
 * Tokenize the expression string.
 */
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    if (!ch) {
      i++;
      continue;
    }

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Parentheses
    if (ch === "(") {
      tokens.push({ type: "LPAREN" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN" });
      i++;
      continue;
    }

    // Negation
    if (ch === "!") {
      if (expr[i + 1] === "=") {
        tokens.push({ type: "NE" });
        i += 2;
      } else {
        tokens.push({ type: "NOT" });
        i++;
      }
      continue;
    }

    // AND
    if (ch === "&" && expr[i + 1] === "&") {
      tokens.push({ type: "AND" });
      i += 2;
      continue;
    }

    // OR
    if (ch === "|" && expr[i + 1] === "|") {
      tokens.push({ type: "OR" });
      i += 2;
      continue;
    }

    // Comparison operators
    if (ch === "=") {
      if (expr[i + 1] === "=") {
        tokens.push({ type: "EQ" });
        i += 2;
        continue;
      }
    }
    if (ch === "<") {
      if (expr[i + 1] === "=") {
        tokens.push({ type: "LE" });
        i += 2;
      } else {
        tokens.push({ type: "LT" });
        i++;
      }
      continue;
    }
    if (ch === ">") {
      if (expr[i + 1] === "=") {
        tokens.push({ type: "GE" });
        i += 2;
      } else {
        tokens.push({ type: "GT" });
        i++;
      }
      continue;
    }

    // String literals
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let str = "";
      i++;
      while (i < expr.length && expr[i] !== quote) {
        const current = expr[i];
        if (current === "\\") {
          i++;
          if (i < expr.length) {
            str += expr[i];
            i++;
          }
        } else {
          str += current;
          i++;
        }
      }
      i++; // Skip closing quote
      tokens.push({ type: "STRING", value: str });
      continue;
    }

    // Template variables #{...}
    if (ch === "#" && expr[i + 1] === "{") {
      let template = "#{";
      i += 2;
      while (i < expr.length && expr[i] !== "}") {
        template += expr[i];
        i++;
      }
      template += "}";
      i++;
      tokens.push({ type: "TEMPLATE", value: template });
      continue;
    }

    // Keywords and identifiers
    const match = expr.slice(i).match(/^(true|false|null)\b/);
    if (match) {
      const keyword = match[1];
      if (!keyword) {
        throw new Error("Invalid keyword match");
      }
      if (keyword === "true") {
        tokens.push({ type: "TRUE", value: true });
      } else if (keyword === "false") {
        tokens.push({ type: "FALSE", value: false });
      } else if (keyword === "null") {
        tokens.push({ type: "NULL", value: null });
      }
      i += keyword.length;
      continue;
    }

    // Numbers
    const numMatch = expr.slice(i).match(/^-?\d+(\.\d+)?/);
    if (numMatch) {
      const num = parseFloat(numMatch[0]);
      tokens.push({ type: "NUMBER", value: num });
      i += numMatch[0].length;
      continue;
    }

    // Unknown character — skip it
    i++;
  }

  tokens.push({ type: "EOF" });
  return tokens;
}

/**
 * Recursive descent parser for boolean expressions.
 * Precedence (lowest to highest): OR < AND < equality < comparison < unary
 */
class Parser {
  private pos = 0;

  constructor(
    private tokens: Token[],
    private context: RuntimeContext
  ) {}

  private current(): Token {
    const token = this.tokens[this.pos];
    if (!token) {
      throw new Error(`Unexpected end of input at position ${this.pos}`);
    }
    return token;
  }

  private advance(): void {
    this.pos++;
  }

  private expect(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      throw new Error(
        `Expected ${type} but got ${token.type} at position ${this.pos}`
      );
    }
    this.advance();
    return token;
  }

  parseOr(): boolean {
    let left = this.parseAnd();
    while (this.current().type === "OR") {
      this.advance();
      const right = this.parseAnd();
      left = left || right;
    }
    return left;
  }

  private parseAnd(): boolean {
    let left = this.parseEquality();
    while (this.current().type === "AND") {
      this.advance();
      const right = this.parseEquality();
      left = left && right;
    }
    return left;
  }

  private parseEquality(): boolean {
    let left: string | number | boolean | null = this.parseComparison();
    while (true) {
      const op = this.current().type;
      if (op !== "EQ" && op !== "NE") {
        break;
      }
      this.advance();
      const right = this.parseComparison();

      if (op === "EQ") {
        left = this.compare(left, right) === 0;
      } else {
        left = this.compare(left, right) !== 0;
      }
    }
    return typeof left === "boolean" ? left : this.isTruthy(left);
  }

  private parseComparison(): string | number | boolean | null {
    let left = this.parseUnary();
    while (true) {
      const op = this.current().type;
      if (op !== "LT" && op !== "LE" && op !== "GT" && op !== "GE") {
        break;
      }
      this.advance();
      const right = this.parseUnary();

      const cmp = this.compare(left, right);
      if (op === "LT") {
        left = cmp < 0;
      } else if (op === "LE") {
        left = cmp <= 0;
      } else if (op === "GT") {
        left = cmp > 0;
      } else {
        // GE
        left = cmp >= 0;
      }
    }
    return left;
  }

  private parseUnary(): string | number | boolean | null {
    if (this.current().type === "NOT") {
      this.advance();
      const operand = this.parseUnary();
      return !this.isTruthy(operand);
    }
    return this.parsePrimary();
  }

  private parsePrimary(): string | number | boolean | null {
    const token = this.current();

    if (token.type === "LPAREN") {
      this.advance();
      const result = this.parseOr();
      this.expect("RPAREN");
      return result;
    }

    if (token.type === "TRUE") {
      this.advance();
      return true;
    }

    if (token.type === "FALSE") {
      this.advance();
      return false;
    }

    if (token.type === "NULL") {
      this.advance();
      return null;
    }

    if (token.type === "STRING") {
      this.advance();
      return String(token.value);
    }

    if (token.type === "NUMBER") {
      this.advance();
      return Number(token.value);
    }

    if (token.type === "TEMPLATE") {
      this.advance();
      const resolved = resolveTemplate(
        String(token.value),
        this.context,
        "none"
      );
      return resolved;
    }

    throw new Error(`Unexpected token ${token.type} at position ${this.pos}`);
  }

  /**
   * Compare two values using type coercion rules.
   * If both parse as finite numbers, compare numerically.
   * Otherwise compare as strings.
   * null is treated as a distinct value.
   * Returns: -1 if a < b, 0 if a == b, 1 if a > b
   */
  private compare(
    a: string | number | boolean | null,
    b: string | number | boolean | null
  ): number {
    // Handle null comparisons
    if (a === null && b === null) {
      return 0;
    }
    if (a === null) {
      return -1;
    }
    if (b === null) {
      return 1;
    }

    const aStr = String(a);
    const bStr = String(b);

    const aNum = parseFloat(aStr);
    const bNum = parseFloat(bStr);

    if (isFinite(aNum) && isFinite(bNum)) {
      // Both are numbers — compare numerically
      return aNum < bNum ? -1 : aNum > bNum ? 1 : 0;
    }

    // String comparison
    return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
  }

  /**
   * Determine truthiness of a value.
   * Empty string, "false", 0, false, null → false
   * Everything else → true
   */
  private isTruthy(value: string | number | boolean | null): boolean {
    if (value === null) {
      return false;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value !== 0;
    }
    if (value === "" || value === "false" || value === "null") {
      return false;
    }
    return true;
  }
}
