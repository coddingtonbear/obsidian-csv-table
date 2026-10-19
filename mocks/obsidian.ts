// A minimal stand-in for the parts of the `obsidian` package this plugin
// uses. The real package ships only type declarations; its runtime is
// provided by the Obsidian app, so unit tests need this replacement.
import { load } from "js-yaml";

// Mirrors the real declaration, which returns `any`. Obsidian 1.14 bundles
// js-yaml 4 with its default schema (checked in its app bundle), so
// unquoted dates such as `2021-01-01` arrive as Date objects, as they do
// in the app.
export function parseYaml(text: string): any {
  return load(text);
}

export class Component {
  load(): void {
    this.onload();
  }
  onload(): void {}
  unload(): void {
    this.onunload();
  }
  onunload(): void {}
  addChild<T extends Component>(component: T): T {
    component.load();
    return component;
  }
}

export class MarkdownRenderChild extends Component {
  constructor(public containerEl: HTMLElement) {
    super();
  }
}

export class Plugin extends Component {}

// The app's implementation collapses separators and strips leading and
// trailing slashes; this mirrors what the plugin relies on.
export function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "");
}

// Obsidian adds DOM helpers to every element; tests running in a jsdom
// environment get the subset this plugin uses.
type ElementInfo = { cls?: string | string[]; text?: string };

function installDomHelpers(proto: HTMLElement): void {
  proto.createEl = function <K extends keyof HTMLElementTagNameMap>(
    this: HTMLElement,
    tag: K,
    o?: ElementInfo | string
  ): HTMLElementTagNameMap[K] {
    const el = this.ownerDocument.createElement(tag);
    const info: ElementInfo = typeof o === "string" ? { cls: o } : (o ?? {});
    if (info.cls !== undefined) {
      const classes = Array.isArray(info.cls) ? info.cls : info.cls.split(" ");
      el.classList.add(...classes.filter((c) => c.length > 0));
    }
    if (info.text !== undefined) {
      el.textContent = info.text;
    }
    this.appendChild(el);
    return el;
  } as HTMLElement["createEl"];
  proto.appendText = function (this: HTMLElement, text: string): void {
    this.appendChild(this.ownerDocument.createTextNode(text));
  };
  proto.empty = function (this: HTMLElement): void {
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  };
}

if (typeof HTMLElement !== "undefined") {
  installDomHelpers(HTMLElement.prototype);
}
