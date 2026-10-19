# Agent Instructions

## Project Layout

| File | Purpose |
|---|---|
| `src/main.ts` | Plugin entry point: registers the `csvtable` code block processor, reads the CSV file from the vault and hands off to the modules below. Obsidian glue only. |
| `src/spec.ts` | Parses and validates a `csvtable` block's YAML into a `CsvTableSpec`. |
| `src/csv_table.ts` | Parses the CSV (csv-parse), evaluates `columns` expressions, then filters, sorts and limits the rows. |
| `src/expression.ts` | Compiles filtrex expressions for `columns`, `filter` and `sortBy`, keeping the comparison semantics of filtrex 2 (which the plugin used until 1.2.0). |
| `src/util.ts` | Row filtering, sorting and cell display helpers. |
| `src/render.ts` | Renders the table, and the error block shown when a code block fails. |
| `src/types.ts` | Shared types. |
| `styles.css` | Plugin styles, committed as-is (no build step). |
| `mocks/obsidian.ts` | Runtime stand-in for the `obsidian` package in unit tests (Vitest). |

Keep logic out of `main.ts` and `render.ts` where possible: everything else is unit-tested without Obsidian. `render.ts` is tested under jsdom (see the `@vitest-environment jsdom` comment at the top of `src/render.test.ts`).

## Commit Process

### Commit cadence

Commit frequently in small, self-contained increments. Each commit on `master` must leave the repository in a working state — no broken builds, no failing unit tests. A commit that fixes a bug, a commit that adds a test, and a commit that updates documentation are all valid atomic units. Do not batch unrelated changes into a single commit.

When working on fixing a bug while on a branch off of `master`, follow a Test-Driven Development approach and start by creating (and committing) failing tests that will later be fixed by fixes your subsequent commits.

### Push Automatically

After making any particular commit, you can feel free to push that branch to the remote.

### Checks before committing

Run these before every commit; CI runs the same set:

```
npm run lint
npm run typecheck
npm test
npm run build
```

### Commit message format

Use a plain imperative subject line (no `type:` prefix). Always include a `Co-Authored-By` trailer crediting the AI assistant that helped author the commit.

```
Short imperative description

Longer description of what this work is, why these changes were made, and any decisions, trade-offs, and known limitations that may be useful to future readers.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Keeping Documentation in Sync

`README.md` documents every `csvtable` option. When an option is added, removed, or changes behavior, update the Readme in the same commit.

## Release Process

Releases are performed on the `master` branch after all feature branches have been merged.

### Steps

1. Ensure you are on `master` with all intended changes merged.

   Before proceeding, read the current version from `package.json`. Ask the user whether this is a **major**, **minor**, or **patch** bump and calculate the new version number from their answer — do not ask them to supply the version number directly.

2. Edit the `version` field in `package.json` to the new version number.

3. Delete `node_modules` **and** `package-lock.json`, then regenerate the lockfile with npm 11:
   ```
   rm -rf node_modules package-lock.json
   npx -y npm@11 i
   ```

   npm 10 (bundled with Node 22) crashes resolving Vitest's dependency tree from scratch ("Cannot read properties of null (reading 'edgesOut')"); npm 11 resolves it, and npm 10's `npm ci` installs from the result without trouble.

   Obsidian's post-release source review rejects a release whose lockfile it cannot install from with "The npm lockfile is out of date". Leaving `node_modules` in place makes npm record only the optional platform-specific packages for *this* machine (e.g. one `@esbuild/*` binary instead of all of them), which npm 11's `npm ci` rejects; regenerating before the version bump in step 2 leaves the lockfile naming the previous version.

   Before moving on, confirm the lockfile agrees with `package.json`, then do a clean install with npm 11 specifically:
   ```
   node -e 'const p=require("./package.json"),l=require("./package-lock.json");if(p.version!==l.version||p.version!==l.packages[""].version)throw new Error(`lockfile is ${l.version}, package.json is ${p.version}`)'
   rm -rf node_modules
   npx -y npm@11 ci
   ```

4. Run the version script to update `manifest.json` and `versions.json` (this also stages those two files automatically):
   ```
   npm run version
   ```

5. Stage the remaining changed files (`package.json` and `package-lock.json`):
   ```
   git add package.json package-lock.json
   ```

6. Create a commit named:
   ```
   Release X.Y.Z
   ```

7. Before creating the tag, draft the full tag message and present it to the user for review. Incorporate any requested changes before proceeding. Then create the annotated tag named exactly after the new version number (e.g. `1.3.0`); the release workflow publishes the tag message as the GitHub release notes:
   ```
   git tag -a 1.3.0
   ```

   **Tag message format:**

   ```
   Release X.Y.Z

   - Adds/Fixes/Updates/Removes [description of change]. (#issue if applicable; Thanks @contributor if applicable.)
   - Adds/Fixes/Updates/Removes [description of change].
   ```

   - Subject line is `Release X.Y.Z`, optionally followed by ` -- Short description` for especially notable releases.
   - Body is one or more bullet points summarizing user-visible changes.
   - Each bullet starts with a verb (`Adds`, `Fixes`, `Updates`, `Removes`).
   - Reference GitHub issues and PR numbers where relevant (e.g. `(#23)`).
   - Credit external contributors where relevant (e.g. `Thanks @username!`). GitHub handles are not present in commit messages — look them up via `gh pr view <number>` for any PR-sourced changes.
