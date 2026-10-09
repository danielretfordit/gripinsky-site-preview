# Аудит до правок (этап 0, 09.10.2026)

Сборка коммита 6290ca9. 18 шаблонов × 8 ширин (360–1920), Chromium.

## Стили (`npm run lint:css`)

```
  38  точка перелома вне набора 560/768/1024/1280
  27  hex-цвет вне токенов global.css
  33  :hover без @media (hover: hover)
  15  радиус вне правила 2 px (rounded-full, rounded-[Npx], border-radius в px)
  33  фиксированная высота h-[Npx] / height: Npx у блока
   1  100vh (на телефоне и в Telegram нужен svh/dvh)
  29  кегль в px вне ролей --type-* (font-size: Npx, text-[Npx])

Всего: 176 (режим предупреждений; подробно: --verbose)
```

Страниц × ширин: 144
Итого: горизонтальная прокрутка 0, за краем 0, обрезано 0, мелкие цели 334


## / (w360)
- Мелкая цель: шапка: <summary> «» 40×40
- Мелкая цель: hero: <button> «←» 38×38
- Мелкая цель: hero: <button> «→» 38×38
- Мелкая цель: wrap: <a> «5,0» 36×30
- Мелкая цель: wrap: <a> «160 000» 96×30
- Мелкая цель: directions: <a.program-catalog-link> «Смотреть каталог курсов ↗» 193×30
- Мелкая цель: directions: <a.program-catalog-link> «Посмотреть пробный урок →» 204×30
- Мелкая цель: quiz: <a.quiz-entry-link> «Перейти к подбору ↗» 149×30
- …и ещё 1 мелких целей

## / (w375)
- Мелкая цель: hero: <button> «←» 38×38
- Мелкая цель: hero: <button> «→» 38×38
- Мелкая цель: wrap: <a> «5,0» 36×30
- Мелкая цель: wrap: <a> «160 000» 96×30
- Мелкая цель: directions: <a.program-catalog-link> «Смотреть каталог курсов ↗» 193×30
- Мелкая цель: directions: <a.program-catalog-link> «Посмотреть пробный урок →» 204×30
- Мелкая цель: quiz: <a.quiz-entry-link> «Перейти к подбору ↗» 149×30
- Мелкая цель: section: <a> «↗» 12×24

## / (w414)
- Мелкая цель: hero: <button> «←» 38×38
- Мелкая цель: hero: <button> «→» 38×38
- Мелкая цель: wrap: <a> «5,0» 36×30
- Мелкая цель: wrap: <a> «160 000» 96×30
- Мелкая цель: directions: <a.program-catalog-link> «Смотреть каталог курсов ↗» 193×30
- Мелкая цель: directions: <a.program-catalog-link> «Посмотреть пробный урок →» 204×30
- Мелкая цель: quiz: <a.quiz-entry-link> «Перейти к подбору ↗» 149×30
- Мелкая цель: section: <a> «↗» 12×24

## /404-несуществующая (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /ai (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /blog (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /blog/kompyuter-dlya-3ds-max-i-corona (w360)
- Мелкая цель: шапка: <summary> «» 40×40
- Мелкая цель: mt-14: <a.text-ink> «База 3D-визуализатора» 240×26

## /blog/kompyuter-dlya-3ds-max-i-corona (w375)
- Мелкая цель: mt-14: <a.text-ink> «База 3D-визуализатора» 240×26

## /blog/kompyuter-dlya-3ds-max-i-corona (w414)
- Мелкая цель: mt-14: <a.text-ink> «База 3D-визуализатора» 240×26

## /club (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /courses (w360)
- Мелкая цель: шапка: <summary> «» 40×40
- Мелкая цель: wrap: <a.text-ink> «База 3D-визуализатора» 240×26
- Мелкая цель: wrap: <a.text-ink> «ИИ в 3D» 80×26
- Мелкая цель: wrap: <a.text-ink> «ИИ в 3D: Лаборатория» 226×26
- Мелкая цель: wrap: <a.text-ink> «SpeedTree» 107×26
- Мелкая цель: wrap: <a.text-ink> «Marvelous Designer Furniture» 290×26
- Мелкая цель: wrap: <a.text-ink> «Substance Painter» 178×26
- Мелкая цель: wrap: <a.text-ink> «Азбука Adobe Photoshop» 253×26
- …и ещё 22 мелких целей

## /courses (w375)
- Мелкая цель: wrap: <a.text-ink> «База 3D-визуализатора» 240×26
- Мелкая цель: wrap: <a.text-ink> «ИИ в 3D» 80×26
- Мелкая цель: wrap: <a.text-ink> «ИИ в 3D: Лаборатория» 226×26
- Мелкая цель: wrap: <a.text-ink> «SpeedTree» 107×26
- Мелкая цель: wrap: <a.text-ink> «Marvelous Designer Furniture» 290×26
- Мелкая цель: wrap: <a.text-ink> «Substance Painter» 178×26
- Мелкая цель: wrap: <a.text-ink> «Визуализация в 3ds Max и V-Ray» 330×26
- Мелкая цель: wrap: <a.text-ink> «Азбука Adobe Photoshop» 253×26
- …и ещё 23 мелких целей

## /courses (w414)
- Мелкая цель: wrap: <a.text-ink> «База 3D-визуализатора» 240×26
- Мелкая цель: wrap: <a.text-ink> «ИИ в 3D» 80×26
- Мелкая цель: wrap: <a.text-ink> «ИИ в 3D: Лаборатория» 226×26
- Мелкая цель: wrap: <a.text-ink> «SpeedTree» 107×26
- Мелкая цель: wrap: <a.text-ink> «Моделирование в 3ds Max. Level 1» 347×26
- Мелкая цель: wrap: <a.text-ink> «Marvelous Designer Furniture» 290×26
- Мелкая цель: wrap: <a.text-ink> «Substance Painter» 178×26
- Мелкая цель: wrap: <a.text-ink> «Визуализация в 3ds Max и V-Ray» 330×26
- …и ещё 26 мелких целей

## /courses-page/3ds-max (w360)
- Мелкая цель: шапка: <summary> «» 40×40
- Мелкая цель: wrap: <a.text-ink> «ИИ в 3D: Лаборатория» 226×26
- Мелкая цель: wrap: <a.text-ink> «Marvelous Designer Furniture» 290×26
- Мелкая цель: wrap: <a.text-ink> «Моделирование под стоки» 273×26
- Мелкая цель: wrap: <a.text-ink> «Пакет Forest Pack + RailClone» 293×26
- Мелкая цель: wrap: <a.text-ink> «Материалы Corona PRO» 242×26
- Мелкая цель: wrap: <a.text-ink> «База 3D-визуализатора» 240×26
- Мелкая цель: wrap: <a.text-ink> «Масштабные ЖК» 177×26

## /courses-page/3ds-max (w375)
- Мелкая цель: wrap: <a.text-ink> «ИИ в 3D: Лаборатория» 226×26
- Мелкая цель: wrap: <a.text-ink> «Marvelous Designer Furniture» 290×26
- Мелкая цель: wrap: <a.text-ink> «Моделирование под стоки» 273×26
- Мелкая цель: wrap: <a.text-ink> «Пакет Forest Pack + RailClone» 293×26
- Мелкая цель: wrap: <a.text-ink> «Материалы Corona PRO» 242×26
- Мелкая цель: wrap: <a.text-ink> «База 3D-визуализатора» 240×26
- Мелкая цель: wrap: <a.text-ink> «Интерьерная визуализация PRO» 329×26
- Мелкая цель: wrap: <a.text-ink> «Масштабные ЖК» 177×26

## /courses-page/3ds-max (w414)
- Мелкая цель: wrap: <a.text-ink> «ИИ в 3D: Лаборатория» 226×26
- Мелкая цель: wrap: <a.text-ink> «Моделирование в 3ds Max. Level 1» 347×26
- Мелкая цель: wrap: <a.text-ink> «Marvelous Designer Furniture» 290×26
- Мелкая цель: wrap: <a.text-ink> «Моделирование под стоки» 273×26
- Мелкая цель: wrap: <a.text-ink> «Пакет Forest Pack + RailClone» 293×26
- Мелкая цель: wrap: <a.text-ink> «Материалы Corona PRO» 242×26
- Мелкая цель: wrap: <a.text-ink> «База 3D-визуализатора» 240×26
- Мелкая цель: wrap: <a.text-ink> «Интерьерная визуализация PRO» 329×26
- …и ещё 2 мелких целей

## /courses-page/gamedev (w360)
- Мелкая цель: шапка: <summary> «» 40×40
- Мелкая цель: hero: <button> «←» 38×38
- Мелкая цель: hero: <button> «→» 38×38
- Мелкая цель: profession: <a.text-ink> «Визуализация в Blender» 197×21
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <a.text-ink> «GameDev. Level 1» 140×21
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <input> «» 24×24
- …и ещё 7 мелких целей

## /courses-page/gamedev (w375)
- Мелкая цель: hero: <button> «←» 38×38
- Мелкая цель: hero: <button> «→» 38×38
- Мелкая цель: profession: <a.text-ink> «Визуализация в Blender» 197×21
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <a.text-ink> «GameDev. Level 1» 140×21
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <input> «» 24×24
- …и ещё 6 мелких целей

## /courses-page/gamedev (w414)
- Мелкая цель: hero: <button> «←» 38×38
- Мелкая цель: hero: <button> «→» 38×38
- Мелкая цель: profession: <a.text-ink> «Визуализация в Blender» 197×21
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <a.text-ink> «GameDev. Level 1» 140×21
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <input> «» 24×24
- …и ещё 6 мелких целей

## /courses-page/interior (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /courses-page/visualization (w360)
- Мелкая цель: шапка: <summary> «» 40×40
- Мелкая цель: hero: <button> «←» 38×38
- Мелкая цель: hero: <button> «→» 38×38
- Мелкая цель: profession: <a.text-ink> «Моделирование в 3ds Max. Level 1» 273×41
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <a.text-ink> «Сложное моделирование в 3ds Max. Level 2» 263×41
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <a.text-ink> «Визуализация в 3ds Max и Corona. Level 3» 217×41
- …и ещё 12 мелких целей

## /courses-page/visualization (w375)
- Мелкая цель: hero: <button> «←» 38×38
- Мелкая цель: hero: <button> «→» 38×38
- Мелкая цель: profession: <a.text-ink> «Моделирование в 3ds Max. Level 1» 284×21
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <a.text-ink> «Сложное моделирование в 3ds Max. Level 2» 263×41
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <a.text-ink> «Визуализация в 3ds Max и Corona. Level 3» 284×41
- Мелкая цель: profession: <input> «» 24×24
- …и ещё 11 мелких целей

## /courses-page/visualization (w414)
- Мелкая цель: hero: <button> «←» 38×38
- Мелкая цель: hero: <button> «→» 38×38
- Мелкая цель: profession: <a.text-ink> «Моделирование в 3ds Max. Level 1» 284×21
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <a.text-ink> «Сложное моделирование в 3ds Max. Level 2» 306×41
- Мелкая цель: profession: <input> «» 24×24
- Мелкая цель: profession: <a.text-ink> «Визуализация в 3ds Max и Corona. Level 3» 330×41
- Мелкая цель: profession: <input> «» 24×24
- …и ещё 11 мелких целей

## /gallery (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /interiorpro (w360)
- Мелкая цель: шапка: <summary> «» 40×40
- Мелкая цель: страница: <a> «Результат» 63×20
- Мелкая цель: страница: <a> «Программа» 74×20
- Мелкая цель: страница: <a> «Обучение» 63×20
- Мелкая цель: страница: <a> «Стоимость» 70×20
- Мелкая цель: страница: <a> «Вопросы» 57×20
- Мелкая цель: wrap: <summary.t-title> «Подробнее о курсе и навыках» 320×23
- Мелкая цель: wrap: <summary.t-title> «Компьютер и программы» 320×23
- …и ещё 3 мелких целей

## /interiorpro (w375)
- Мелкая цель: страница: <a> «Результат» 63×20
- Мелкая цель: страница: <a> «Программа» 74×20
- Мелкая цель: страница: <a> «Обучение» 63×20
- Мелкая цель: страница: <a> «Стоимость» 70×20
- Мелкая цель: страница: <a> «Вопросы» 57×20
- Мелкая цель: wrap: <summary.t-title> «Подробнее о курсе и навыках» 335×23
- Мелкая цель: wrap: <summary.t-title> «Компьютер и программы» 335×23
- Мелкая цель: wrap: <summary.t-title> «Чем курс отличается от Level 3?+» 335×23
- …и ещё 3 мелких целей

## /interiorpro (w414)
- Мелкая цель: страница: <a> «Результат» 63×20
- Мелкая цель: страница: <a> «Программа» 74×20
- Мелкая цель: страница: <a> «Обучение» 63×20
- Мелкая цель: страница: <a> «Стоимость» 70×20
- Мелкая цель: страница: <a> «Вопросы» 57×20
- Мелкая цель: wrap: <summary.t-title> «Подробнее о курсе и навыках» 374×23
- Мелкая цель: wrap: <summary.t-title> «Компьютер и программы» 374×23
- Мелкая цель: wrap: <summary.t-title> «Чем курс отличается от Level 3?+» 374×23
- …и ещё 4 мелких целей

## /oferta (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /otzyvy (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /stories/bolshunova (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /teachers (w360)
- Мелкая цель: шапка: <summary> «» 40×40

## /vizualization3 (w360)
- Мелкая цель: шапка: <summary> «» 40×40
- Мелкая цель: страница: <a> «Результат» 63×20
- Мелкая цель: страница: <a> «Программа» 74×20
- Мелкая цель: страница: <a> «Обучение» 63×20
- Мелкая цель: страница: <a> «Стоимость» 70×20
- Мелкая цель: страница: <a> «Вопросы» 57×20
- Мелкая цель: wrap: <summary.t-title> «Подробнее о курсе и навыках» 320×23
- Мелкая цель: wrap: <summary.t-title> «Компьютер и программы» 320×23
- …и ещё 4 мелких целей

## /vizualization3 (w375)
- Мелкая цель: страница: <a> «Результат» 63×20
- Мелкая цель: страница: <a> «Программа» 74×20
- Мелкая цель: страница: <a> «Обучение» 63×20
- Мелкая цель: страница: <a> «Стоимость» 70×20
- Мелкая цель: страница: <a> «Вопросы» 57×20
- Мелкая цель: wrap: <summary.t-title> «Подробнее о курсе и навыках» 335×23
- Мелкая цель: wrap: <summary.t-title> «Компьютер и программы» 335×23
- Мелкая цель: wrap: <summary.t-title> «Это курс только по интерьерам?+» 335×23
- …и ещё 5 мелких целей

## /vizualization3 (w414)
- Мелкая цель: страница: <a> «Результат» 63×20
- Мелкая цель: страница: <a> «Программа» 74×20
- Мелкая цель: страница: <a> «Обучение» 63×20
- Мелкая цель: страница: <a> «Стоимость» 70×20
- Мелкая цель: страница: <a> «Вопросы» 57×20
- Мелкая цель: wrap: <summary.t-title> «Подробнее о курсе и навыках» 374×23
- Мелкая цель: wrap: <summary.t-title> «Компьютер и программы» 374×23
- Мелкая цель: wrap: <summary.t-title> «Это курс только по интерьерам?+» 374×23
- …и ещё 6 мелких целей
