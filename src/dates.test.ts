import { describe, test, expect } from "vitest";

import { formatDate, parseDateText } from "./dates";

describe("dates/parseDateText", () => {
  test("reads bare dates as local midnight", () => {
    expect(parseDateText("2021-01-11")).toEqual(new Date(2021, 0, 11));
    expect(parseDateText("2021-1-5")).toEqual(new Date(2021, 0, 5));
    expect(parseDateText("2021-01")).toEqual(new Date(2021, 0, 1));
    expect(parseDateText("2021")).toEqual(new Date(2021, 0, 1));
  });

  test("reads years before 100 as written", () => {
    const date = parseDateText("0099-01-01");
    expect(date?.getFullYear()).toBe(99);
  });

  test("reads dates with times through Date.parse", () => {
    expect(parseDateText("2021-01-11 08:00")).toEqual(
      new Date(2021, 0, 11, 8, 0)
    );
    expect(parseDateText("2021-01-11T08:00:00Z")).toEqual(
      new Date("2021-01-11T08:00:00Z")
    );
    expect(parseDateText("01/11/2021")).toEqual(new Date(2021, 0, 11));
  });

  test("rejects text that names no date", () => {
    expect(parseDateText("2021-02-30")).toBeUndefined();
    expect(parseDateText("2021-13-01")).toBeUndefined();
    expect(parseDateText("yesterday")).toBeUndefined();
    expect(parseDateText("")).toBeUndefined();
  });
});

describe("dates/formatDate", () => {
  test("writes local dates and times", () => {
    expect(formatDate(new Date(2021, 0, 11))).toEqual("2021-01-11");
    expect(formatDate(new Date(2021, 11, 1, 8, 5))).toEqual("2021-12-01 08:05");
    expect(formatDate(new Date(2021, 0, 11, 8, 0, 30))).toEqual(
      "2021-01-11 08:00:30"
    );
    expect(formatDate(new Date(2021, 0, 11, 0, 0, 0, 5))).toEqual(
      "2021-01-11 00:00:00"
    );
    expect(formatDate(new Date(NaN))).toEqual("Invalid Date");
  });

  test("round-trips what parseDateText read", () => {
    for (const text of ["2021-01-11", "2021-01-11 08:00", "2021-01-11 08:00:30"]) {
      const date = parseDateText(text);
      expect(date).toBeDefined();
      expect(formatDate(date ?? new Date(NaN))).toEqual(text);
    }
  });
});
