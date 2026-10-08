import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import sharp from 'sharp';
const m=JSON.parse(await fs.readFile('docs/content/student-import-manifest.json'));const digest=b=>crypto.createHash('sha256').update(b).digest('hex').slice(0,16);
const processed=new Map();let videos=0,sermats=0;await fs.mkdir('public/student-videos',{recursive:true});
for(const i of m.items){
 const file=`src/content/works/import-${i.hash.slice(0,16)}.json`;let w;try{w=JSON.parse(await fs.readFile(file));}catch{continue;}
 if(!processed.has(i.folder)){
  const images=[],clips=[];
  for(const name of await fs.readdir(i.folder)){
   const source=path.join(i.folder,name);const ext=path.extname(name).toLowerCase();
   if(!['.jpg','.jpeg','.png','.mp4'].includes(ext))continue;
   if(ext==='.mp4'){const id=digest(await fs.readFile(source));await fs.copyFile(source,`public/student-videos/${id}.mp4`);clips.push(`/student-videos/${id}.mp4`);videos++;}
   else if(/сермат|sermat|grey|gray/i.test(name)){const id=digest(await fs.readFile(source));const dest=`src/assets/student-import/${id}.webp`;try{await fs.access(dest);}catch{await sharp(source).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:0}).toFile(dest);}images.push(`../../assets/student-import/${id}.webp`);sermats++;}
  }
  processed.set(i.folder,{images,clips});
 }
 const extras=processed.get(i.folder);w.processImages=extras.images.filter(p=>p!==w.beforeImage);w.videos=extras.clips;
 if(w.categories[0]==='int'&&/экстерьер|exterior/i.test(i.review)&&!/интерьер|interior/i.test(i.review))w.categories=['ext'];
 await fs.writeFile(file,JSON.stringify(w,null,2)+'\n');
}
const report=JSON.parse(await fs.readFile('docs/content/student-import-report.json'));report.videoFiles=videos;report.sermatFiles=sermats;await fs.writeFile('docs/content/student-import-report.json',JSON.stringify(report,null,2)+'\n');console.log({videos,sermats});
