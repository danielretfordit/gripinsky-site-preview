import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
const manifest=JSON.parse(await fs.readFile('docs/content/student-import-manifest.json','utf8'));
const hash=s=>crypto.createHash('sha256').update(s).digest('hex').slice(0,16);
const clean=s=>s.replace(/@\S+/g,'').split(/\(|_(?:ВК|ТГ|ИГ|Дзен)/)[0].replace(/[_ -]*\d+\s*$/,'').replace(/_пистолет$/,'').replace(/,\s*г\..*$/,'').trim();
const aliases={'Лапин Антон':'Антон Лапин','Захаров Дмитрий':'Дмитрий Захаров','Карабельников Евгений':'Евгений Карабельников','Россошанский Артем':'Артем Россошанский','ЕленаГущина':'Елена Гущина'};
const existing=new Map();
for(const f of await fs.readdir('src/content/people')){const p=JSON.parse(await fs.readFile(`src/content/people/${f}`));existing.set(p.name.toLowerCase().replaceAll('ё','е'),f.slice(0,-5));}
await fs.mkdir('src/assets/student-import',{recursive:true});
const errors=[]; const reviews=new Map(); let imported=0;
const save=async (file,data)=>fs.writeFile(file,JSON.stringify(data,null,2)+'\n');
const convert=async(file)=>{const id=hash(await fs.readFile(file)), dest=`src/assets/student-import/${id}.webp`;try{await fs.access(dest);}catch{await sharp(file).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:82,effort:0}).toFile(dest);}return `../../assets/student-import/${id}.webp`;};
sharp.concurrency(1);
const pending=[...new Set(manifest.items.flatMap(i=>[i.path,...(i.before?[i.before]:[])]))];
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{while(cursor<pending.length){const file=pending[cursor++];try{await convert(file);}catch{ /* recorded during content import */ }}}));
for(const [index,item] of manifest.items.entries()){
 try{
 let name=item.author;
 if(/^(модели|скорпионы|свободная|1\.12)/i.test(name)) name=path.parse(item.path).name;
 name=clean(name);name=aliases[name]||name;
 const key=name.toLowerCase().replaceAll('ё','е'); const person=existing.get(key)||`import-${hash(key)}`;
 if(!existing.has(key)){await save(`src/content/people/${person}.json`,{name,roles:['student'],consent:'pending'});existing.set(key,person);}
 const id=`import-${item.hash.slice(0,16)}`;
 const image=await convert(item.path);
 const beforeImage=item.before?await convert(item.before):undefined;
 const text=item.review.replace(/@\S+/g,'[контакт скрыт]');
 const labels={int:'Учебная визуализация',ext:'Учебная визуализация',model:'Учебная модель',mentor:'Проект с наставником'};
 await save(`src/content/works/${id}.json`,{title:labels[item.category],author:person,image,beforeImage,alt:`${labels[item.category]}, ${name}`,categories:[item.category],awards:[],inGallery:true,order:1000+index,reviewText:text||undefined});
 if(text){const rid=`import-${hash(text)}`;const r=reviews.get(rid)||{author:name,role:'Ученик академии',source:'site',text,topic:'general',order:1000+reviews.size,works:[],person};r.works.push(id);reviews.set(rid,r);}
 imported++;
 }catch(e){errors.push({path:item.path,error:String(e)});}
}
for(const [id,r] of reviews)await save(`src/content/reviews/${id}.json`,r);
await save('docs/content/student-import-report.json',{works:imported,reviews:reviews.size,duplicates:manifest.duplicates,comparisons:manifest.items.filter(i=>i.before).length,errors,consent:'New authors pending; existing consent preserved. No consent inferred from folder labels.'});
console.log({works:imported,reviews:reviews.size,errors});
