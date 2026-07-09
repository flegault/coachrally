const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { buildPages, generatedFiles, staticFiles } = require('../scripts/build-pages');

const rootDir = path.resolve(__dirname, '..');

function normalizeAsset(value) {
  if (!value) return null;
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)) return null;
  if (/^(?:mailto|tel):/i.test(value)) return null;
  if (value.startsWith('#')) return null;
  const clean = value.split('#')[0].split('?')[0].replace(/^\.?\//, '');
  return clean || null;
}

function referencedStaticAssets(html) {
  const assets = new Set();
  const patterns = [
    /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["']stylesheet["'][^>]*>/gi,
    /<link\b[^>]*\brel=["'](?:icon|shortcut icon)["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi,
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\brel=["'](?:icon|shortcut icon)["'][^>]*>/gi
  ];
  patterns.forEach(pattern => {
    for (const match of html.matchAll(pattern)) {
      const asset = normalizeAsset(match[1]);
      if (asset) assets.add(asset);
    }
  });
  return [...assets].sort();
}

test('les assets chargés par index.html sont inclus dans le build Pages', () => {
  const html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
  const references = referencedStaticAssets(html);
  const published = new Set(staticFiles.concat(generatedFiles));
  const missing = references.filter(asset => !published.has(asset));
  assert.deepEqual(missing, [], `Assets absents du déploiement Pages: ${missing.join(', ')}`);
});

test('le build Pages produit tous les fichiers statiques et la config Firebase générée', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'coachrally-pages-'));
  const distDir = path.join(tmpRoot, 'dist');
  try {
    const result = buildPages({ distDir, env: {} });
    assert.equal(result.distDir, distDir);
    staticFiles.concat(generatedFiles).forEach(file => {
      assert.equal(
        fs.existsSync(path.join(distDir, file)),
        true,
        `Fichier absent de l'artifact Pages: ${file}`
      );
    });
    const firebaseConfig = fs.readFileSync(path.join(distDir, 'firebase-config.js'), 'utf8');
    assert.match(firebaseConfig, /^export default \{/);
    assert.match(firebaseConfig, /"appCheckSiteKey": ""/);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
