import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');

async function filesUnder(directory, prefix = '') {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(path.join(directory, entry.name), relative));
    else if (entry.isFile()) files.push(relative);
  }
  return files.sort();
}

function versionUrl(value, version) {
  const [withoutHash, fragment] = value.split('#', 2);
  const [filename, query] = withoutHash.split('?', 2);
  const parameters = new URLSearchParams(query || '');
  parameters.set('v', version);
  return `${filename}?${parameters}${fragment === undefined ? '' : `#${fragment}`}`;
}

function versionModule(source, version) {
  // This site uses literal relative specifiers. Apply the same version to every
  // module edge so shared imports keep a single browser module identity.
  return source.replace(
    /(\bfrom\s*['"]|\bimport\s*['"]|\bimport\s*\(\s*['"])(\.{1,2}\/[^'"?#]+\.js(?:[?#][^'"]*)?)(['"])/g,
    (_match, before, specifier, after) => `${before}${versionUrl(specifier, version)}${after}`
  );
}

export async function buildSite({ sourceDir = path.join(root, 'site'), assetsDir = path.join(root, 'assets'), outputDir = path.join(root, 'dist') } = {}) {
  const files = await filesUnder(sourceDir);
  const hasher = createHash('sha256');
  for (const filename of files.filter(name => /\.(js|css)$/i.test(name))) {
    const content = await fs.readFile(path.join(sourceDir, filename));
    hasher.update(filename).update('\0').update(String(content.length)).update('\0').update(content);
  }
  const version = hasher.digest('hex').slice(0, 16);
  await fs.mkdir(outputDir, { recursive: true });
  // Preserve unrelated local harness files. CI starts with an empty dist folder.
  await fs.cp(sourceDir, outputDir, { recursive: true });
  for (const filename of files.filter(name => /\.(js|html)$/i.test(name))) {
    const source = await fs.readFile(path.join(sourceDir, filename), 'utf8');
    const result = /\.js$/i.test(filename)
      ? versionModule(source, version)
      : source.replace(/((?:src|href)\s*=\s*['"])(\.{1,2}\/[^'"?#]+\.(?:js|css)(?:[?#][^'"]*)?)(['"])/gi,
        (_match, before, url, after) => `${before}${versionUrl(url, version)}${after}`);
    await fs.writeFile(path.join(outputDir, filename), result);
  }
  await fs.mkdir(path.join(outputDir, 'assets'), { recursive: true });
  const assetFiles = (await fs.readdir(assetsDir).catch(() => [])).filter(name => /\.(png|jpe?g|webp)$/i.test(name)).sort();
  const manifest = { study_version: '1.0.0', build_version: version, image_status: assetFiles.length ? 'pending-human-review' : 'missing', assets: [] };
  for (const filename of assetFiles) {
    const bytes = await fs.readFile(path.join(assetsDir, filename));
    await fs.copyFile(path.join(assetsDir, filename), path.join(outputDir, 'assets', filename));
    manifest.assets.push({ file: filename, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  await fs.writeFile(path.join(outputDir, '.nojekyll'), '');
  await fs.writeFile(path.join(outputDir, 'stimulus-manifest.json'), JSON.stringify(manifest, null, 2));
  return { outputDir, version, manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await buildSite();
  console.log(`Built static site: ${result.outputDir}. Version: ${result.version}. Image status: ${result.manifest.image_status}.`);
}
