import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const dir='src/content/works';
const records=fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>({id:f.slice(0,-5),data:JSON.parse(fs.readFileSync(path.join(dir,f))),file:path.join(dir,f)}));
const manifest=JSON.parse(fs.readFileSync('docs/content/student-import-manifest.json')).items;
const sources=new Map(manifest.map(m=>['import-'+m.hash.slice(0,16),m]));
// Слайды первого экрана теперь в src/content/hero-slides
const selected=new Set(fs.readdirSync('src/content/hero-slides').map(f=>JSON.parse(fs.readFileSync('src/content/hero-slides/'+f,'utf8')).work));
const excluded=new Map();
const beforePaths=new Set(records.flatMap(r=>[r.data.beforeImage,...(r.data.processImages??[])].filter(Boolean)));
for(const r of records){const source=sources.get(r.id);if(beforePaths.has(r.data.image)|| /сермат|sermat|grey|gray|clay|wireframe/i.test(source?.path.split('/').at(-1)??''))excluded.set(r.id,{reason:'process-image'});}
const eligible=records.filter(r=>r.data.inGallery!==false&&!excluded.has(r.id));
const rank=r=>(r.data.awards?.includes('tsar-gory')?100:0)+(selected.has(r.id)?50:0)+(r.data.beforeImage?20:0)+(r.id.startsWith('import-')?0:10);
const groups=new Map();
for(const r of eligible){const source=sources.get(r.id);let key=r.data.beforeImage ? `${r.data.author}|${r.data.beforeImage}` : null;
// A named student submission folder identifies a project; shared category folders do not.
if(!key&&source){const folder=path.basename(path.dirname(source.path));if(folder.includes(' ')&&!/LEVEL|интерьер|экстерьер|модел|сент|окт|категор|рендер|стрим/i.test(folder)&&!source.category?.includes('model'))key=r.data.author+'|submission|'+path.dirname(source.path);}
if(key){const g=groups.get(key)??[];g.push(r);groups.set(key,g);}}
for(const g of groups.values()){g.sort((a,b)=>rank(b)-rank(a)||a.data.order-b.data.order);for(const r of g.slice(1))excluded.set(r.id,{reason:'same-project',keep:g[0].id});}
const fingerprints=[];
for(const r of eligible.filter(r=>!excluded.has(r.id))){const p=path.resolve(dir,r.data.image);const pixels=await sharp(p).resize(24,24,{fit:'fill'}).removeAlpha().raw().toBuffer();fingerprints.push({r,pixels});}
for(let i=0;i<fingerprints.length;i++){const a=fingerprints[i];if(excluded.has(a.r.id))continue;for(let j=i+1;j<fingerprints.length;j++){const b=fingerprints[j];if(excluded.has(b.r.id)||a.r.data.author!==b.r.data.author)continue;let mse=0;for(let k=0;k<a.pixels.length;k++)mse+=(a.pixels[k]-b.pixels[k])**2;mse/=a.pixels.length;if(mse<220){const keep=rank(a.r)>=rank(b.r)?a.r:b.r;const drop=keep===a.r?b.r:a.r;excluded.set(drop.id,{reason:'visual-duplicate',keep:keep.id,mse});}}}
// Two selected views of the same winter chalet.
excluded.set('import-baa91ff2f796f855',{reason:'same-project',keep:'import-9f7270fd7fb6c545'});
for(const r of records)if(excluded.has(r.id)){r.data.inGallery=false;fs.writeFileSync(r.file,JSON.stringify(r.data,null,2)+'\n');}
fs.writeFileSync('docs/content/gallery-deduplication.json',JSON.stringify({excluded:[...excluded].map(([id,details])=>({id,...details})),retained:records.filter(r=>r.data.inGallery!==false).length},null,2));
console.log('Excluded:',excluded.size,'remaining:',records.filter(r=>r.data.inGallery!==false).length);
