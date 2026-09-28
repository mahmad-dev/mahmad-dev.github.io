/**
 * Generates the German edition of the site into /de/.
 *
 *   node build-i18n.mjs            build /de/ and inject the language switch
 *   node build-i18n.mjs --report   list untranslated strings, write nothing
 *
 * Design notes
 * ------------
 * Translations are keyed by the English source string, not by a `data-i18n`
 * attribute. That keeps the English HTML clean and means adding a paragraph
 * needs no markup change: the build simply reports it as untranslated until a
 * German line exists for it.
 *
 * Real files are written rather than swapping text with JavaScript at runtime,
 * because a German recruiter searching in German has to be able to find the
 * page. A client-side swap leaves Google indexing only the English.
 *
 * The English pages remain the single source of truth. This script only ever
 * edits them to keep the language switch in sync, and that edit is idempotent.
 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DE_DIR = path.join(ROOT, 'de');
const DICT_PATH = path.join(ROOT, 'i18n', 'de.json');
const BASE_URL = 'https://mahmad-dev.github.io';

const PAGES = [
  'index.html',
  'project-career-os.html',
  'project-rag-guard.html',
  'project-sdlc.html',
  'project-mcp.html',
  'project-rag.html',
  'project-research.html',
  'project-crm.html',
  'portfolio-details.html',
];

const REPORT_ONLY = process.argv.includes('--report');

/** Attributes whose value is human-readable text. */
/**
 * `data-words` is deliberately absent: the rotator sits inside a paragraph
 * that walkText already translates as a whole unit, attribute and all.
 * Handling it here too would translate the German a second time.
 */
const TEXT_ATTRS = ['alt', 'title', 'placeholder', 'aria-label'];

/** Meta tags whose content is prose. */
const META_NAMES = ['description', 'keywords'];
const META_PROPS = ['og:title', 'og:description'];

const dict = JSON.parse(await readFile(DICT_PATH, 'utf8'));

const missing = new Set();
let translatedCount = 0;

/** Look up a string, remembering anything we could not translate. */
function tr(raw) {
  const text = raw.trim();
  if (!text) return null;
  // Punctuation-only and separator runs need no translation.
  if (/^[\s·—–\-|/()·,.:0-9]+$/.test(text)) return null;
  // The doctype and any stray markup arrive as text nodes; they are not copy.
  if (text.startsWith('<!')) return null;

  const hit = dict[text];
  if (hit === undefined) {
    missing.add(text);
    return null;
  }
  translatedCount++;
  return hit;
}

/**
 * Elements that establish their own block of text. An element containing any
 * of these is a container to recurse into, not a sentence to translate.
 */
const BLOCK = new Set([
  'html', 'head', 'body', 'div', 'section', 'article', 'header', 'footer', 'nav',
  'main', 'aside', 'figure', 'ul', 'ol', 'li', 'p', 'h1', 'h2', 'h3', 'h4', 'h5',
  'h6', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'form', 'blockquote', 'dl',
  'dt', 'dd', 'pre', 'script', 'style',
  // Images carry their copy in `alt`, handled by the attribute pass. Treating
  // one as a block stops its container being swallowed whole, so a caption or
  // badge beside it still becomes its own translatable unit.
  'img',
  // `svg` is deliberately NOT here. It was, and it silently dropped every
  // button label on the site: an <a> holding an icon and the words "Download
  // CV" counted as having a block child, so the walk recursed past it and the
  // bare text node was never visited. Left inline, the whole anchor becomes
  // one unit, icon markup and all, and the label gets translated.
]);

const SKIP = new Set(['script', 'style', 'svg', 'code', 'pre']);

/** Generated markup: the build owns it, so it must not enter the dictionary. */
const SKIP_CLASS = ['lang-switch'];

/**
 * Translate whole sentences, including their inline markup.
 *
 * A paragraph like "Built an <strong>end-to-end mortgage feature</strong>
 * adopted by 5,000+ clients" arrives as three separate text nodes. Translating
 * each in isolation cannot work: German puts the verb somewhere else entirely,
 * so the fragments would have to be reassembled in an order the English markup
 * does not allow.
 *
 * So the unit of translation is the innerHTML of the innermost element that
 * holds text, tags and all. The German string carries its own <strong> in the
 * right place for German.
 */
function walkText(node) {
  for (const child of node.childNodes) {
    if (child.nodeType !== 1) continue;

    const tag = child.rawTagName?.toLowerCase() ?? '';
    if (SKIP.has(tag)) continue;
    if (SKIP_CLASS.some((cls) => child.classList?.contains(cls))) continue;

    const hasBlockChild = child.childNodes.some(
      (c) => c.nodeType === 1 && BLOCK.has(c.rawTagName?.toLowerCase() ?? ''),
    );

    if (hasBlockChild) {
      walkText(child);
      continue;
    }

    // Markup with no visible text (an icon wrapper, a spacer) has nothing to
    // translate, and including it would put raw HTML in the dictionary.
    if (!child.text.replace(/&nbsp;/g, ' ').trim()) continue;

    const inner = child.innerHTML;
    const trimmed = inner.replace(/&nbsp;/g, ' ').trim();
    if (!trimmed) continue;

    const out = tr(trimmed);
    if (out === null) continue;

    const leading = inner.match(/^\s*/)?.[0] ?? '';
    const trailing = inner.match(/\s*$/)?.[0] ?? '';
    child.set_content(`${leading}${out}${trailing}`);
  }
}

function translateAttributes(root) {
  for (const attr of TEXT_ATTRS) {
    for (const el of root.querySelectorAll(`[${attr}]`)) {
      const value = el.getAttribute(attr);
      if (!value) continue;

      // data-words is a pipe-separated list; translate each item.
      if (attr === 'data-words') {
        const parts = value.split('|').map((part) => tr(part) ?? part);
        el.setAttribute(attr, parts.join('|'));
        continue;
      }

      const out = tr(value);
      if (out !== null) el.setAttribute(attr, out);
    }
  }

  for (const name of META_NAMES) {
    const el = root.querySelector(`meta[name="${name}"]`);
    const out = el && tr(el.getAttribute('content') ?? '');
    if (el && out !== null) el.setAttribute('content', out);
  }
  for (const prop of META_PROPS) {
    const el = root.querySelector(`meta[property="${prop}"]`);
    const out = el && tr(el.getAttribute('content') ?? '');
    if (el && out !== null) el.setAttribute('content', out);
  }

  // <title> is deliberately not handled here. walkText already treats it as a
  // text unit, and translating it twice means the second lookup reads the
  // German just written and reports it as an untranslated string.
}

/**
 * Rewrite paths for a page that now lives one directory deeper.
 * Root-relative and absolute URLs are already correct and are left alone.
 */
function rewritePaths(html) {
  return html.replace(/\b(href|src)="(?!https?:|\/\/|\/|#|mailto:|tel:|data:)([^"]+)"/g, (m, attr, url) => {
    // Page links stay relative: de/project-x.html sits beside de/index.html.
    if (PAGES.includes(url) || url.startsWith('#')) return m;
    // Already points out of /de/ (the language switch writes ../index.html),
    // so prefixing again would produce ../../ and a 404.
    if (url.startsWith('../')) return m;
    return `${attr}="../${url}"`;
  });
}

/** The EN | DE control, rendered for whichever edition is being written. */
function languageSwitch(page, lang) {
  const en = lang === 'de' ? `../${page}` : page;
  const de = lang === 'de' ? page : `de/${page}`;
  const mark = (active) => (active ? ' class="active" aria-current="true"' : '');
  return (
    `<div class="lang-switch" role="group" aria-label="Language / Sprache">` +
    `<a href="${en}" hreflang="en" lang="en"${mark(lang === 'en')}>EN</a>` +
    `<a href="${de}" hreflang="de" lang="de"${mark(lang === 'de')}>DE</a>` +
    `</div>`
  );
}

/** Insert or refresh the switch. Idempotent, so re-running never stacks them. */
function applyLanguageSwitch(html, page, lang) {
  const markup = languageSwitch(page, lang);

  if (/<div class="lang-switch"/.test(html)) {
    return html.replace(/<div class="lang-switch"[\s\S]*?<\/div>/, markup);
  }

  // Sits immediately before the CV button, as asked.
  const cvAnchor = html.indexOf('<a class="btn btn-ghost btn-sm header-cta"');
  if (cvAnchor === -1) {
    console.warn(`  ! ${page}: no CV button found, language switch not inserted`);
    return html;
  }
  return html.slice(0, cvAnchor) + markup + '\n        ' + html.slice(cvAnchor);
}

/** hreflang alternates, so search engines pair the two editions. */
function applyAlternates(html, page) {
  const cleaned = html.replace(/\s*<link rel="alternate"[^>]*>/g, '');
  const enUrl = `${BASE_URL}/${page}`;
  const deUrl = `${BASE_URL}/de/${page}`;
  const tags =
    `\n  <link rel="alternate" hreflang="en" href="${enUrl}">` +
    `\n  <link rel="alternate" hreflang="de" href="${deUrl}">` +
    `\n  <link rel="alternate" hreflang="x-default" href="${enUrl}">`;
  return cleaned.replace(/(<link rel="canonical"[^>]*>)/, `$1${tags}`) ||
    cleaned.replace(/(<\/head>)/, `${tags}\n$1`);
}

// ---------------------------------------------------------------- build

if (!REPORT_ONLY) await mkdir(DE_DIR, { recursive: true });

for (const page of PAGES) {
  const srcPath = path.join(ROOT, page);
  if (!existsSync(srcPath)) {
    console.warn(`  ! missing ${page}`);
    continue;
  }

  let english = await readFile(srcPath, 'utf8');

  // Keep the English edition's own switch and alternates current.
  const englishOut = applyAlternates(applyLanguageSwitch(english, page, 'en'), page);
  if (!REPORT_ONLY && englishOut !== english) await writeFile(srcPath, englishOut, 'utf8');

  // German edition.
  const root = parse(englishOut, { comment: true });
  walkText(root);
  translateAttributes(root);

  const htmlEl = root.querySelector('html');
  htmlEl?.setAttribute('lang', 'de');

  const canonical = root.querySelector('link[rel="canonical"]');
  canonical?.setAttribute('href', `${BASE_URL}/de/${page}`);

  let german = root.toString();
  german = applyLanguageSwitch(german, page, 'de');
  german = rewritePaths(german);

  if (!REPORT_ONLY) await writeFile(path.join(DE_DIR, page), german, 'utf8');
  console.log(`  ${page.padEnd(28)} -> de/${page}`);
}

// --------------------------------------------------------------- report

const total = translatedCount + missing.size;
console.log(`\ntranslated ${translatedCount} strings, ${missing.size} still English`);

const missingPath = path.join(ROOT, 'i18n', 'missing.json');

// A stale report from a previous run reads as an outstanding problem, so it
// goes away as soon as there is nothing left to report.
if (missing.size === 0 && existsSync(missingPath) && !REPORT_ONLY) {
  await rm(missingPath);
}

if (missing.size > 0) {
  const out = missingPath;
  const stub = Object.fromEntries([...missing].sort().map((s) => [s, '']));
  if (!REPORT_ONLY) await writeFile(out, `${JSON.stringify(stub, null, 2)}\n`, 'utf8');
  console.log(`untranslated strings written to i18n/missing.json`);
  console.log('\nfirst few:');
  for (const s of [...missing].slice(0, 8)) {
    console.log(`  ${s.length > 88 ? s.slice(0, 88) + '...' : s}`);
  }
}
