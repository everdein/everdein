import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRoot = fileURLToPath(new URL("../", import.meta.url));
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
    .map(([, name, double, single]) => [name.toLowerCase(), (double ?? single).replaceAll("&amp;", "&")]));
}

function assetPath(reference) {
  const local = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
  if (!local || /[\\\u0000-\u001f]/.test(local) || /^[a-z][a-z\d+.-]*:|^\//i.test(local)) {
    throw new Error("Expected a relative repository asset path");
  }
  const normalized = path.posix.normalize(local);
  if (normalized === ".." || normalized.startsWith("../")) throw new Error("Asset escapes repository");
  return normalized;
}

function section(markdown, heading) {
  const start = markdown.indexOf(`## ${heading}`);
  if (start < 0) return "";
  const end = markdown.indexOf("\n## ", start + 3);
  return markdown.slice(start, end < 0 ? undefined : end);
}

export async function checkProfile({ root = defaultRoot, markdown, policy } = {}) {
  markdown ??= await readFile(path.join(root, "README.md"), "utf8");
  policy ??= JSON.parse(await readFile(path.join(root, "presence.json"), "utf8"));
  const findings = [];
  const images = [];
  const markdownCards = [...markdown.matchAll(/\[!\[([^\]]*)\]\(([^\s)]+)\)\]\(([^\s)]+)\)/g)];
  for (const [, , src, destination] of markdownCards) {
    images.push({ src, destination });
  }
  for (const image of markdown.matchAll(/!\[([^\]]*)\]\(([^\s)]+)\)/g)) {
    if (!markdownCards.some((card) => image.index >= card.index && image.index < card.index + card[0].length)) {
      images.push({ src: image[2] });
    }
  }
  const htmlCards = [...markdown.matchAll(/(<a\b[^>]*>)([\s\S]*?)<\/a>/gi)];
  for (const image of markdown.matchAll(/<img\b[^>]*>/gi)) {
    const enclosing = htmlCards.find((card) => image.index >= card.index + card[1].length && image.index < card.index + card[0].length);
    images.push({ src: attributes(image[0]).src, destination: enclosing ? attributes(enclosing[1]).href : undefined });
  }

  const checked = new Set();
  for (const image of images) {
    if (!image.src) { findings.push("Image has no source"); continue; }
    if (/^https?:\/\//i.test(image.src)) {
      findings.push(`Profile imagery must use reviewed local assets: ${image.src}`);
      continue;
    }
    let relative;
    try { relative = assetPath(image.src); }
    catch { findings.push(`Malformed or escaping asset reference: ${image.src}`); continue; }
    image.asset = relative;
    if (checked.has(relative)) continue;
    checked.add(relative);
    try {
      const target = path.join(root, relative);
      if (!(await stat(target)).isFile()) throw new Error("Not a file");
      const data = await readFile(target);
      const extension = path.extname(target).toLowerCase();
      if (extension === ".png" && !data.subarray(0, 8).equals(pngSignature)) throw new Error("Invalid PNG header");
      if ([".jpg", ".jpeg"].includes(extension) && (data[0] !== 255 || data[1] !== 216 || data[2] !== 255)) throw new Error("Invalid JPEG header");
      if (extension === ".svg" && !/<svg\b[\s\S]*<\/svg>/.test(data.toString("utf8"))) throw new Error("Invalid SVG document");
    } catch { findings.push(`Missing or malformed local image: ${relative}`); }
  }
  // Each actual image occurrence owns its destination. Another occurrence's
  // valid link cannot satisfy an image-only or incorrectly linked card.
  for (const rule of policy.artwork) {
    const occurrences = images.filter((image) => image.asset === rule.asset);
    if (rule.required && !occurrences.length) findings.push(`Required artwork missing: ${rule.asset}`);
    if (!rule.destination || !occurrences.length) continue;
    if (occurrences.some((image) => image.destination !== rule.destination)) {
      findings.push(`Wrong or missing artwork destination: ${rule.asset}; expected ${rule.destination}`);
    }
  }

  const opening = markdown.split(/^## /m, 1)[0];
  if (!opening.includes(`**${policy.currentTitle} |`)) findings.push("Profile headline does not match approved current title");
  const current = section(markdown, `Current Work at ${policy.currentEmployer}`);
  if (!current.includes(`${policy.currentTitle} at ${policy.currentEmployer}`)) findings.push("Current role/employer attribution is missing");
  const impact = section(markdown, "Professional Impact");
  const beforeBullets = impact.split(/^\s*-/m, 1)[0];
  if (!beforeBullets.includes(policy.historicalImpactEmployer)) findings.push("Historical impact needs employer attribution before its outcomes");
  if (/1,200\+/.test(current) && !/ongoing|in progress|intended/i.test(current)) findings.push("Current project scope must retain its ongoing/intended qualifier");
  return { passed: findings.length === 0, checkedImages: checked.size, findings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await checkProfile();
    console.log(JSON.stringify(result, null, 2));
    if (!result.passed) process.exitCode = 1;
  } catch (error) {
    console.error(`Profile check unavailable: ${error.message}`);
    process.exitCode = 1;
  }
}
