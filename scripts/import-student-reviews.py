from pathlib import Path
import json,hashlib,re,zipfile,xml.etree.ElementTree as E,subprocess
root=Path.home()/'Downloads'
names=['Картинки РД (отдельно по категориям)-2024','Работа с наставником','РД по категориям 2025','4. Стрим 26.02.25','5. Стрим 2.04.25','6. Стрим 28.05.25','7. Стрим 08.10.25','01. Стрим 18.02.26','2. Стрим 22.01.25','3. Стрим 5.02.25','_Рендер_Дня_2026','1. Стрим 15.01.25','_Модели_Зал Славы','_Рендер_Дня_2025']
works={p.stem:json.loads(p.read_text()) for p in Path('src/content/works').glob('import-*.json')}
people={p.stem:json.loads(p.read_text()) for p in Path('src/content/people').glob('*.json')}
reviews={};errors=[];excluded=[]
for name in names:
 for p in sorted((root/name).rglob('*')):
  if not p.is_file() or p.suffix.lower() not in ['.docx','.rtf','.txt']:continue
  try:
   if p.suffix.lower()=='.docx':
    tree=E.fromstring(zipfile.ZipFile(p).read('word/document.xml'));ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    t='\n'.join(''.join(n.text or '' for n in para.findall('.//w:t',ns)) for para in tree.findall('.//w:p',ns))
   elif p.suffix.lower()=='.rtf':t=subprocess.check_output(['textutil','-convert','txt','-stdout',str(p)]).decode()
   else:
    try:t=p.read_text()
    except UnicodeDecodeError:t=p.read_text(encoding='cp1251')
   t=re.sub(r'https?://\S+|[\w.+-]+@[\w.-]+\.[a-zA-Z]+|\+\d[\d ()-]{8,}\d|@\S+','[контакт скрыт]',t).strip()
   if not t:continue
   ids=[]
   for image in p.parent.iterdir():
    if image.suffix.lower() not in ['.jpg','.png','.jpeg','.webp','.tif']:continue
    wid='import-'+hashlib.sha256(image.read_bytes()).hexdigest()[:16]
    if wid in works:ids.append(wid)
   if not ids:excluded.append(str(p));continue
   person=works[ids[0]]['author']; rid='import-'+hashlib.sha256(t.encode()).hexdigest()[:16]
   if rid not in reviews:reviews[rid]={'author':people[person]['name'],'person':person,'role':'Ученик академии','source':'site','text':t,'topic':'general','order':1000+len(reviews),'works':[]}
   reviews[rid]['works']=list(dict.fromkeys(reviews[rid]['works']+ids))
  except Exception as e:errors.append({'path':str(p),'error':str(e)})
for p in Path('src/content/reviews').glob('import-*.json'):p.unlink()
for rid,data in reviews.items():Path(f'src/content/reviews/{rid}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
report=json.loads(Path('docs/content/student-import-report.json').read_text());report.update(reviews=len(reviews),reviewErrors=errors,unlinkedReviews=excluded)
Path('docs/content/student-import-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('Reviews:',len(reviews),'errors:',errors,'unlinked:',excluded)
