import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { checkProfile } from "../scripts/check-profile.mjs";

const policy = {
  currentTitle: "Senior Software Engineer", currentEmployer: "PBK", historicalImpactEmployer: "State Farm",
  artwork: [{ asset: "assets/live.png", destination: "https://example.com/live/", required: true }, { asset: "assets/source.png", destination: "https://example.com/source/" }],
};
const copy = "**Senior Software Engineer | Architecture**\n\n## Current Work at PBK\nSenior Software Engineer at PBK\n\n## Professional Impact\nOutcomes from State Farm.\n- An approved result.\n";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-presence-"));
  t.after(() => {
    const target = path.resolve(root);
    assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
    assert.ok(path.basename(target).startsWith("profile-presence-"));
    return rm(target, { recursive: true, force: true });
  });
  await mkdir(path.join(root, "assets"));
  for (const file of ["live.png", "source.png"]) {
    await writeFile(path.join(root, "assets", file), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]));
  }
  return root;
}

test("current profile passes approved destination and local asset checks", async () => {
  assert.equal((await checkProfile()).passed, true);
});

test("linked Markdown artwork passes; unlinked artwork cannot borrow a URL elsewhere", async (t) => {
  const root = await fixture(t);
  const linked = `${copy}\n[![Live](assets/live.png?v=2)](https://example.com/live/)`;
  assert.equal((await checkProfile({ root, markdown: linked, policy })).passed, true);
  const unlinked = `${copy}\n![Live](assets/live.png)\n[Other](https://example.com/live/)`;
  assert.match((await checkProfile({ root, markdown: unlinked, policy })).findings.join("\n"), /Wrong or missing artwork destination/);
});

test("source-art HTML link cannot point to the live site", async (t) => {
  const root = await fixture(t);
  const markdown = `${copy}\n[![Live](assets/live.png)](https://example.com/live/)\n<a href="https://example.com/live/"><img src="assets/source.png"></a>`;
  assert.match((await checkProfile({ root, markdown, policy })).findings.join("\n"), /source.png/);
});

test("an image-only duplicate cannot borrow another occurrence's valid destination", async (t) => {
  const root = await fixture(t);
  const linked = `${copy}\n[![Live](assets/live.png)](https://example.com/live/)`;
  for (const duplicate of ['![Unlinked](assets/live.png)', '<img src="assets/live.png">']) {
    const result = await checkProfile({ root, markdown: `${linked}\n${duplicate}`, policy });
    assert.match(result.findings.join("\n"), /Wrong or missing artwork destination/);
  }
  const htmlLinked = `${copy}\n<a href="https://example.com/live/"><img src="assets/live.png"></a>`;
  assert.equal((await checkProfile({ root, markdown: htmlLinked, policy })).passed, true);
});

test("missing files, malformed paths and corrupt image headers fail", async (t) => {
  const root = await fixture(t);
  await writeFile(path.join(root, "assets", "live.png"), "not a PNG");
  const markdown = `${copy}\n[![Live](assets/live.png)](https://example.com/live/)\n![Missing](assets/missing.png)\n![Bad](assets/%ZZ.png)\n![Escape](../secret.png)`;
  const result = await checkProfile({ root, markdown, policy });
  assert.equal(result.passed, false);
  assert.match(result.findings.join("\n"), /malformed local image: assets\/live.png/);
  assert.match(result.findings.join("\n"), /assets\/missing.png/);
  assert.match(result.findings.join("\n"), /Malformed or escaping asset reference: assets\/%ZZ.png/);
  assert.match(result.findings.join("\n"), /Malformed or escaping asset reference: ..\/secret.png/);
});

test("current title and historical attribution remain separate", async (t) => {
  const root = await fixture(t);
  const markdown = `${copy.replace("**Senior Software Engineer |", "**Lead Software Engineer |").replace("Outcomes from State Farm.", "Outcomes.")}\n[![Live](assets/live.png)](https://example.com/live/)`;
  const findings = (await checkProfile({ root, markdown, policy })).findings.join("\n");
  assert.match(findings, /headline/);
  assert.match(findings, /Historical impact/);
});
