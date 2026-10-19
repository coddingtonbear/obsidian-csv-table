// @vitest-environment jsdom
import { describe, test, expect } from "vitest";

import { TableRenderer, renderErrorPre } from "./render";

describe("render/TableRenderer", () => {
  test("renders a header row and one row per record", () => {
    const container = document.createElement("div");
    const renderer = new TableRenderer(
      ["name", "population"],
      [
        { name: "Colombia", population: 50340000 },
        { name: "Russia", population: 144400000, extra: "ignored" },
      ],
      container
    );
    renderer.load();

    expect(container.querySelector("table")).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll("thead th")).map(
        (th) => th.textContent
      )
    ).toEqual(["name", "population"]);
    expect(
      Array.from(container.querySelectorAll("tbody tr")).map((tr) =>
        Array.from(tr.querySelectorAll("td")).map((td) => td.textContent)
      )
    ).toEqual([
      ["Colombia", "50340000"],
      ["Russia", "144400000"],
    ]);
  });

  test("renders cell text literally", () => {
    const container = document.createElement("div");
    new TableRenderer(["html"], [{ html: "<b>bold</b>" }], container).load();
    const cell = container.querySelector("td");
    expect(cell?.textContent).toBe("<b>bold</b>");
    expect(cell?.querySelector("b")).toBeNull();
  });
});

describe("render/renderErrorPre", () => {
  test("renders the error text in a marked pre element", () => {
    const container = document.createElement("div");
    const pre = renderErrorPre(container, "Something went wrong");
    expect(pre.tagName).toBe("PRE");
    expect(pre.classList.contains("csv-error")).toBe(true);
    expect(pre.textContent).toBe("Something went wrong");
    expect(container.firstChild).toBe(pre);
  });
});
