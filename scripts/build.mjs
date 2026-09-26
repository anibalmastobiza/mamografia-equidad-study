import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
await fs.mkdir(path.join(root,'dist'),{recursive:true});
await fs.cp(path.join(root,'site'),path.join(root,'dist'),{recursive:true});
await fs.mkdir(path.join(root,'dist','assets'),{recursive:true});
const assetFiles=await fs.readdir(path.join(root,'assets')).catch(()=>[]);
const manifest={study_version:'1.0.0',image_status:assetFiles.length?'pending-human-review':'missing',assets:[]};
for(const filename of assetFiles){
  if(!/\.(png|jpe?g|webp)$/i.test(filename))continue;
  const bytes=await fs.readFile(path.join(root,'assets',filename));
  await fs.copyFile(path.join(root,'assets',filename),path.join(root,'dist','assets',filename));
  manifest.assets.push({file:filename,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile(path.join(root,'dist','.nojekyll'),'');
await fs.writeFile(path.join(root,'dist','stimulus-manifest.json'),JSON.stringify(manifest,null,2));
console.log(`Built static site: ${path.join(root,'dist')}. Image status: ${manifest.image_status}.`);
