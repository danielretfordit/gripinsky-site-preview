# -*- coding: utf-8 -*-
from pathlib import Path
import json,re
rows=json.loads(Path('/private/tmp/gripinsky-screenshot-ocr.json').read_text())
# Quotes selected from the cropped user-supplied screenshots, without contact handles.
starts={
'1.png':'Большое спасибо команде помощников!',
'10.png':'Вообще, по завершении курса и пары работ',
'11.jpeg':'На любую сложную и',
'12.png':'Я рада',
'13.jpeg':'В целом, я очень довольна результатами этого',
'14.png':'Это действительно школа',
'15.png':'У Вас очень классная школа',
'16.png':'Да, курс реально классный.',
'17.png':'Спасибо большое за уроки по воде',
'18.png':'Еще раз огромное спасибо за классную',
'19.png':'Столько информации и фишек по освещению',
'2.jpeg':'Вы человек-аналитическая формула',
'20.png':'В очередной раз убеждаюсь',
'21.png':'Курс превосходит мои ожидания',
'22.png':'Курс просто шикарный',
'23.png':'Ваши уроки настолько понятны',
'24.png':'И всей школе Евгения',
'25.png':'Спасибо преподавателям школы за труд',
'26.png':'Спасибо наставникам!',
'27.jpeg':'Но потом собралась и пришла к вам',
'28.jpeg':'Спасибо Вам за интересную',
'29.png':'Все понятно где что находится',
'3.png':'Отдельная благодарность за группу в тг.',
'30.png':'Спасибо, огромное, очень интересная подача',
'31.png':'Все очень',
'32.png':'Но тут все разложено по полочкам',
'33.png':'Пока прохожу марвелус и просмотрела пеинтер',
'34.png':'А у Вас очень',
'35.png':'Уроки очень информативные',
'36.png':'Евгений, вы самый крутой',
'37.png':'Ваша заслуга, в этом долгом',
'38.png':'Спасибо вам за уроки',
'4.jpeg':'И спасибо да очень понятные',
'5.png':'Благодарю Иоанна за тщательные',
'6.png':'Мои работы в 3D далеки от идеала',
'7.png':'Пользуясь случаем хочу выразить',
'8.png':'Большое спасибо преподавателям',
'9.png':'Он супер крутой',
}
# Explicit end markers avoid UI counters, personal questions, and context irrelevant to the quote.
ends={'1.png':'Желаю школе','10.png':'Лично у меня','11.jpeg':'Каждый раз','12.png':'Вы лучшие!','13.jpeg':'Спасибо большое','14.png':None,'15.png':'Спасибо Вам','16.png':'Я учился','17.png':'3\n2','18.png':'6\nA1','19.png':'3\n1','2.jpeg':'Когда я увидела','20.png':'5\n2','21.png':'@tveritin','22.png':'Виктор @','23.png':'Спасибо Вам','24.png':'• 3','25.png':'Смотрю с удовольствием','26.png':'14','27.jpeg':None,'28.jpeg':None,'29.png':'4','3.png':'Случайная встреча','30.png':'И огромное','31.png':'Вот эти базовые','32.png':'Еще раз','33.png':'С нетерпением','34.png':'https://','35.png':'Видел выложили','36.png':None,'37.png':'Большое вам спасибо','38.png':'Нет,','4.jpeg':'Каждый раз','5.png':'Надеюсь','6.png':'Хочу Вас','7.png':'Надеюсь','8.png':'Даже','9.png':'Как закончу'}
existing={'1.png':'natalya-approach','3.png':'bitum-community','11.jpeg':'darya-client'}
result=[]
for row in rows:
 p=Path(row['path']);name=p.name
 if p.parent.name!='скрины' or name not in starts:continue
 t=row['text'];start=t.find(starts[name])
 if start<0:raise Exception(f'Missing quote: {name}')
 quote=t[start:];end=ends[name]
 if end and end in quote:quote=quote.split(end)[0]
 if name=='12.png':quote+=end
 quote=re.sub(r'\s+',' ',quote).strip()
 quote=re.sub(r'@\S+|https?://\S+','',quote).strip()
 author=re.sub(r'\s+\d{2}\.\d{2}\.\d{2}$','',t.splitlines()[0].strip(' *-'))
 if name in ['6.png','36.png']:author='Автор отзыва'
 if name=='18.png':author='Dmitrii Nikiforov'
 if name=='19.png':author='khantu_3dviz'
 if name=='34.png':author='Юлия'
 if name=='14.png':author='Наталья К.'
 if name=='21.png':quote=quote.replace('•.', '😊.')
 # Do not retain OCR source screenshots in public assets: they contain private chat UI.
 rid=existing.get(name,'screenshot-'+name.split('.')[0]);file=Path(f'src/content/reviews/{rid}.json')
 if name in existing:r=json.loads(file.read_text());r['quote']=quote
 else:r={'author':author,'role':'Отзыв об обучении','source':'telegram','text':re.sub(r'@\S+|https?://\S+','[контакт скрыт]',t),'quote':quote,'topic':'general','order':100+int(name.split('.')[0])}
 file.write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');result.append({'file':str(p),'author':author,'quote':quote,'reviewId':rid})
Path('docs/content/screenshot-quotes.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
