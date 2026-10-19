import { describe, test, expect } from "vitest";

import { compileRowExpression, errorMessage } from "./expression";

const evaluate = (expression: string, row: Record<string, unknown> = {}) =>
  compileRowExpression(expression)(row);

describe("expression/compileRowExpression", () => {
  test("compares numbers", () => {
    expect(evaluate("n < 10", { n: 5 })).toBe(true);
    expect(evaluate("n >= 10", { n: 5 })).toBe(false);
  });

  test("compares text alphabetically", () => {
    expect(evaluate('name < "b"', { name: "a" })).toBe(true);
    expect(evaluate('name > "b"', { name: "a" })).toBe(false);
  });

  test("compares a number with text naming a number, as filtrex 2 did", () => {
    expect(evaluate("n < 10", { n: "5" })).toBe(true);
    expect(evaluate('n == "5"', { n: 5 })).toBe(true);
    expect(evaluate('n != "5"', { n: 5 })).toBe(false);
  });

  test("compares two dates by instant", () => {
    const row = { a: new Date("2021-01-01"), b: new Date("2022-01-01") };
    expect(evaluate("a < b", row)).toBe(true);
    expect(evaluate("a > b", row)).toBe(false);
    expect(evaluate("a == b", row)).toBe(false);
    expect(evaluate("a == a", row)).toBe(true);
    expect(evaluate("a != b", row)).toBe(true);
  });

  test("compares a date with text naming a date", () => {
    const row = { start: new Date("2021-10-28T12:00:00Z") };
    expect(evaluate('start >= "2021-10-28"', row)).toBe(true);
    expect(evaluate('start < "2021-10-28"', row)).toBe(false);
    expect(evaluate('start <= "2021-10-29"', row)).toBe(true);
    expect(evaluate('"2021-10-29" > start', row)).toBe(true);
    expect(evaluate('start == "2021-10-28T12:00:00Z"', row)).toBe(true);
  });

  test("treats a date and text that is not a date as unequal", () => {
    const row = { start: new Date("2021-01-01"), none: "" };
    expect(evaluate('start > "yesterday"', row)).toBe(false);
    expect(evaluate('start < "yesterday"', row)).toBe(false);
    expect(evaluate('start == "TBD"', row)).toBe(false);
    expect(evaluate('start != ""', row)).toBe(true);
    expect(evaluate('none != ""', row)).toBe(false);
  });

  test("reads a bare date as local midnight, like a date with a time", () => {
    const row = { start: new Date(2021, 9, 27, 20, 0) };
    expect(evaluate('start >= "2021-10-28"', row)).toBe(false);
    expect(evaluate('start >= "2021-10-27"', row)).toBe(true);
    expect(evaluate('start < "2021-10-27 21:00"', row)).toBe(true);
    expect(
      evaluate('start == "2021-10-27"', { start: new Date(2021, 9, 27) })
    ).toBe(true);
  });

  test("applies JavaScript's arithmetic coercions, as filtrex 2 did", () => {
    const row = { n: 5, s: "abc", e: "", z: 90210, d: new Date(2021, 0, 1), neg: -3 };
    expect(evaluate("e * 2", row)).toBe(0);
    expect(evaluate("missing * 2", row)).toBeNaN();
    expect(evaluate("s * 2", row)).toBeNaN();
    expect(evaluate("-s", row)).toBeNaN();
    expect(evaluate("-e", row)).toBe(-0); // JavaScript's -"" is -0
    expect(evaluate("n % 2", row)).toBe(1);
    expect(evaluate("n mod 2", row)).toBe(1);
    expect(evaluate("e % 2", row)).toBe(0);
    expect(evaluate("neg % 2", row)).toBe(-1);
    expect(evaluate("missing % 2", row)).toBeNaN();
    expect(evaluate("n ^ 2", row)).toBe(25);
    expect(evaluate("n / 0", row)).toBe(Infinity);
    expect(evaluate("0 / 0", row)).toBeNaN();
    expect(evaluate("e + 1", row)).toBe("1");
    expect(evaluate("missing + 1", row)).toBeNaN();
    expect(evaluate("s + 1", row)).toBe("abc1");
    expect(evaluate("n + e", row)).toBe("5");
    expect(evaluate("n - e", row)).toBe(5);
    expect(evaluate("s - 1", row)).toBeNaN();
    expect(evaluate("n - missing", row)).toBeNaN();
    expect(evaluate("missing - n", row)).toBeNaN();
    expect(evaluate("d * 1", row)).toBe(row.d.getTime());
    expect(evaluate("d + 1", row)).toBe("2021-01-011");
    expect(evaluate('n * "2"', row)).toBe(10);
    expect(evaluate('"3" * "2"', row)).toBe(6);
    expect(evaluate('"3" + 2', row)).toBe("32");
    expect(evaluate("e * 2 > 1", row)).toBe(false);
    expect(evaluate("e / 1000000", row)).toBe(0);
  });

  test("compares NaN and Infinity as JavaScript does", () => {
    const row = { n: 5, area: "" };
    expect(evaluate("n / area > 1000", row)).toBe(true);
    expect(evaluate("(missing * 2) < 1", row)).toBe(false);
    expect(evaluate("(missing * 2) >= 1", row)).toBe(false);
    expect(evaluate("(missing * 2) == 0", row)).toBe(false);
  });

  test("matches ~= against numbers and missing columns, as filtrex 2 did", () => {
    const row = { z: 90210, t: "9x", e: "", d: new Date(2021, 0, 11) };
    expect(evaluate('z ~= "^9"', row)).toBe(true);
    expect(evaluate('t ~= "^9"', row)).toBe(true);
    expect(evaluate('e ~= "^$"', row)).toBe(true);
    expect(evaluate('missing ~= "x"', row)).toBe(false);
    expect(evaluate("t ~= missing", row)).toBe(false);
    expect(evaluate("z ~= 5", row)).toBe(false);
    expect(evaluate("z ~= 9", row)).toBe(true);
    expect(evaluate('d ~= "^2021-01"', row)).toBe(true);
    expect(() => evaluate('t ~= "("', row)).toThrow(/Invalid regular expression/);
  });

  test("never matches a comparison involving a value with no number", () => {
    expect(evaluate('name < 5', { name: "abc" })).toBe(false);
    expect(evaluate('name > 5', { name: "abc" })).toBe(false);
    expect(evaluate('name >= 5', { name: "abc" })).toBe(false);
  });

  test("reads a missing column as undefined rather than an error", () => {
    expect(evaluate("missing")).toBe(undefined);
    expect(evaluate("missing == 1")).toBe(false);
    expect(evaluate('name == "x" or missing', { name: "x" })).toBe(true);
  });

  test("does not read properties from the prototype", () => {
    expect(evaluate("constructor")).toBe(undefined);
    expect(evaluate("toString")).toBe(undefined);
  });

  test("provides true and false", () => {
    expect(evaluate("done == true", { done: true })).toBe(true);
    expect(evaluate("done == false", { done: true })).toBe(false);
    expect(evaluate("not done", { done: false })).toBe(true);
  });

  test("supports arithmetic for column expressions", () => {
    expect(evaluate("population / 1000000", { population: 328200000 })).toBe(
      328.2
    );
  });

  test("throws a syntax error when compiling", () => {
    expect(() => compileRowExpression("a ==")).toThrow(/Parse error/);
  });

  test("throws runtime errors instead of returning them", () => {
    expect(() => evaluate("nope(1)")).toThrow(/Unknown function/);
    expect(() => evaluate("not name", { name: "x" })).toThrow(
      /logical value/
    );
  });
});

describe("expression/errorMessage", () => {
  test("uses an Error's message", () => {
    expect(errorMessage(new Error("boom"))).toBe("boom");
  });

  test("stringifies anything else", () => {
    expect(errorMessage("boom")).toBe("boom");
    expect(errorMessage(42)).toBe("42");
  });
});
