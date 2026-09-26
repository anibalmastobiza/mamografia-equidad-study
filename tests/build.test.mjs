import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite } from '../scripts/build.mjs';

test('actual site output versions HTML assets and every relative module import consistently', async t => {
  const outputDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mamografia-build-'));
  t.after(() => fs.rm(outputDir, { recursive: true, force: true }));
  await fs.writeFile(path.join(outputDir, 'local-harness.html'), 'preserve');
  const sourceApp = await fs.readFile(new URL('../site/app.js', import.meta.url), 'utf8');
  const { version, manifest } = await buildSite({ outputDir });
  assert.match(version, /^[a-f0-9]{16}$/);
  for (const page of ['index.html', 'investigacion.html']) {
    const html = await fs.readFile(path.join(outputDir, page), 'utf8');
    assert.ok(html.includes(`./styles.css?v=${version}`), `${page}: stylesheet version`);
    if (page === 'index.html') assert.ok(html.includes(`./app.js?v=${version}`));
  }
  let importCount = 0;
  for (const filename of ['app.js', 'study.js', 'config.js', 'transport.js']) {
    const content = await fs.readFile(path.join(outputDir, filename), 'utf8');
    for (const match of content.matchAll(/\bfrom\s*['"](\.[^'"]+\.js[^'"]*)['"]/g)) {
      importCount++;
      assert.equal(new URL(match[1], 'https://example.org/').searchParams.get('v'), version);
    }
    assert.doesNotMatch(content, /\bfrom\s*['"]\.[^'"?]+\.js['"]/);
  }
  assert.ok(importCount >= 4);
  assert.equal(await fs.readFile(path.join(outputDir, 'local-harness.html'), 'utf8'), 'preserve');
  assert.equal(await fs.readFile(new URL('../site/app.js', import.meta.url), 'utf8'), sourceApp);
  assert.equal(manifest.image_status, 'synthetic-context-available');
  assert.equal(manifest.clinical_validation, false);
  const image = manifest.assets.find(asset => asset.file === 'mammogram-msynth-01.jpg');
  assert.equal(image.license, 'CC0-1.0');
  assert.match(image.source_url, /^https:\/\/raw\.githubusercontent\.com\/DIDSR\/msynth-release\//);
  const provenance = JSON.parse(await fs.readFile(path.join(outputDir, image.provenance), 'utf8'));
  assert.equal(provenance.sha256, image.sha256);
  assert.ok((await fs.stat(path.join(outputDir, 'assets', 'LICENSE-M-SYNTH-CC0.txt'))).size > 0);
});

test('build hash is stable and changes when CSS or JavaScript changes', async t => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mamografia-build-hash-'));
  t.after(() => fs.rm(tempDir, { recursive: true, force: true }));
  const sourceDir = path.join(tempDir, 'site');
  const outputDir = path.join(tempDir, 'dist');
  await fs.mkdir(sourceDir);
  await fs.writeFile(path.join(sourceDir, 'app.js'), "import './shared.js';\nconst load = () => import('./shared.js');\n");
  await fs.writeFile(path.join(sourceDir, 'shared.js'), 'export const shared = true;');
  await fs.writeFile(path.join(sourceDir, 'styles.css'), 'body{color:black}');
  const options = { sourceDir, outputDir, assetsDir: path.join(tempDir, 'assets') };
  const first = await buildSite(options);
  const second = await buildSite(options);
  assert.equal(first.version, second.version);
  const module = await fs.readFile(path.join(outputDir, 'app.js'), 'utf8');
  assert.equal(module.split(`./shared.js?v=${first.version}`).length - 1, 2);
  await fs.appendFile(path.join(sourceDir, 'styles.css'), '\nbody{color:blue}');
  const third = await buildSite(options);
  assert.notEqual(second.version, third.version);
  await fs.appendFile(path.join(sourceDir, 'shared.js'), '\nexport const changed = true;');
  assert.notEqual((await buildSite(options)).version, third.version);
});
