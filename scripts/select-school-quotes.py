from pathlib import Path
import json,re
# Exact excerpts; the full review remains available beside every quote.
selections={
'78f9eb7164ca4f6b':'Прошло больше года обучения в академии',
'830c13d7142eb363':'Все это стало возможным только под наставничеством Карины',
'a67b530f7b69854d':'Ребята, это просто невозможно передать словами',
'490aa844be77ab11':'Я очень благодарна Карине',
'5fb31df3e6bae166':'Данная работа – это не только результат',
'e69aca135f30d8ac':'Хочу выразить благодарность Евгению',
'f483e9f9262b53d6':'Как всегда огромная благодарность',
'0180388e032fa37c':'И конечно огромное спасибо всей команде школы',
'058f9b8e1a984e52':'Очень ценю и обожаю наших преподавателей',
'0e49dd23a05ade36':'Отдельно на этом рефе хотел поблагодарить',
'2a04a5ca285e0086':'Когда только решила начать осваивать',
'358432c2ea002ddd':'Здесь действительно нацелены научить',
'3788d348f64f8a0f':'К моей радости в школе прекрасные педагоги',
'3db1eb58558cd7a6':'Огромное спасибо преподавателям',
'42070a725b11c356':'Хотел бы выразить благодарность всем преподавателям',
'50d9ba80d3a63d36':'Очень рад и приятно удивлен',
'5571576176fa6962':'Уроки идут последовательно и понятно',
'5726c8e1ae696c1a':'Благодаря урокам и общению в чатах',
'5805af9d26676c57':'Я очень благодарна Евгению',
'5d722b398cb3d19f':'Когда только решила начать осваивать',
'64b8459393a70fef':'Я хочу выразить огромную благодарность школе',
'69a3e716ab3bf874':'Ребята, которые работают как визуализаторы',
'6ad9f86e717cdb25':'Также хочу выразить свою благодарность Евгению',
'6df92abafc944a9d':'Огромная благодарность всей команде академии',
'70bda7aa1b3cd358':'Огромное спасибо всем преподавателям',
'71e5d219af3f30d1':'Спасибо Школе и преподавателям',
'749f520d4f830f8b':'Такого прекрасного результата не было бы',
'ab6813971dd856ca':'Я очень, очень рада',
'abd485bc56384636':'В академии уроки построены так',
'acbf804cf4e76663':'Благодарю за это всех кураторов',
'b1053a23b602ebd6':'Также хочу поблагодарить Евгения',
'b1279233faf13612':'Впечатления о школе очень хорошие',
'b331102da4599100':'Спасибо преподавателям за их обратную связь',
'baf9ea5312ac8c30':'Всем спасибо, и очень приятно обучаться',
'c93083ec2924f57c':'Сейчас хочу поблагодарить педагогов',
'cb98739baa82540c':'Огромная благодарность школе',
'e53a4206a8e685e7':'Хочу искренне поблагодарить всех преподавателей',
'e8ba9700c2bb6104':'Спасибо преподавателям Виктору и Александру',
'f8c65b92c3936548':'Не устану благодарить Евгения и команду',
'fb4c17a43c5fcd68':'Хочу поблагодарить всю команду академии',
'fc9f853b43c10210':'Придя на курс, была приятно удивлена',
'fe6b79e8e79ccb2e':'Преподаватели действительно выкладываются',
}
selected={};missing=[]
for suffix,start in selections.items():
 p=Path(f'src/content/reviews/import-{suffix}.json')
 if not p.exists():missing.append(suffix);continue
 r=json.loads(p.read_text());t=r['text'];pos=t.find(start)
 if pos<0:missing.append(suffix);continue
 tail=t[pos:];stop=re.search(r'[.!?](?:[.!?]*)(?=\s|[А-ЯЁ]|$)|\n',tail)
 quote=tail[:stop.end() if stop else len(tail)].strip()
 if '[контакт скрыт]' in quote:quote=quote.split('[контакт скрыт]')[0].strip()
 quote=quote.split('мой вк')[0].strip()
 if suffix=='0180388e032fa37c':quote=quote.split(' Начиная')[0]
 if suffix in ['2a04a5ca285e0086','5d722b398cb3d19f']:quote=t[t.index('до сих пор подача'):].split('мой вк')[0].split('\n')[0].strip()
 if suffix=='e69aca135f30d8ac':quote=quote.split(' , а так же')[0]
 assert quote in t
 r['quote']=quote;p.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n')
 for wid in r['works']:
  wfile=Path(f'src/content/works/{wid}.json');w=json.loads(wfile.read_text())
  # Keep the excerpt attached to the same full text, including original whitespace.
  if quote in w.get('reviewText',''):w['reviewQuote']=quote;wfile.write_text(json.dumps(w,ensure_ascii=False,indent=2)+'\n')
 selected[r['author']+' / '+suffix]=quote
Path('docs/content/school-quotes.json').write_text(json.dumps(selected,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(selected,ensure_ascii=False,indent=2));print('Missing:',missing)
