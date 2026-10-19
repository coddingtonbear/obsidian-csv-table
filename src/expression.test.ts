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

  test("reports text that is not a date when compared with a date", () => {
    expect(() =>
      evaluate('start > "yesterday"', { start: new Date("2021-01-01") })
    ).toThrow(/Cannot read "yesterday" as a date/);
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
    expect(() => compileRowExpression("a ==")).toThrow();
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
