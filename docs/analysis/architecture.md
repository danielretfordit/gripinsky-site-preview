# Отчёт: архитектура, стек и порядок разработки сайта «Академии 3D GRIPINSKY»

## 0. Что проверено 4 октября 2026

**Версии по реестрам.**
- **Node.js.** Версия 24.21.0 «Krypton» сейчас Active LTS: до 20.10.2026, потом поддержка до 30.04.2028. Ветка 26.x станет LTS только 28.10.2026. В комплекте с Node 24.21.0 идёт npm 11.19.0.
- **Ядро стека.**
  - astro 7.3.5: требует Node ≥22.12, работает на Vite 8 и Zod 4.
  - @astrojs/node 11.1.6, @astrojs/sitemap 3.7.4, @astrojs/markdoc 2.0.9.
  - tailwindcss и @tailwindcss/vite 4.3.3.
  - nanostores 1.5.4 и @nanostores/preact 1.1.0.
  - sharp 0.35.5.
- **Две несовместимости, которые надо закрепить версиями:**
  - @astrojs/preact 6.0.5 требует preact `^10.6.5`, а preact 11.0.0 стал latest 30.09.2026. Ставить нужно preact 10.29.8.
  - @astrojs/check 0.9.10 требует TypeScript `^5 || ^6`, а latest уже 7.0.2. Ставить нужно typescript 6.0.3.
- **CMS:** @keystatic/core 0.6.9, @keystatic/astro 6.0.0 (поддерживает Astro 5, 6 и 7), @astrojs/react 7.0.0, react 19.3.0.
- **Альтернативы:** next 16.3.8, @sveltejs/kit 3.0.0, nuxt 4.5.2, payload 3.90.2, directus 12.4.1, @strapi/strapi 5.56.0, sanity 6.17.0, tinacms 3.14.2, decap-cms-app 3.16.3.

**Текущий сайт (только GET-запросы).**
- В sitemap 90 адресов, все без слэша на конце. Среди них есть `/courses-page/visualization`, это естественный адрес для новой страницы направления.
- Tilda отдаёт 200 и на `/interiorpro/`, canonical указывает на адрес без слэша. С http и www стоит 301 на https без www.
- DNS у hoster.by (NS u1/u2.hoster.by). Там же почта: MX `mailbe04.hoster.by` и SPF. При переезде менять только A-записи для `@` и `www`.
- На страницах есть кнопка-виджет Bitrix24, Метрика и Telegram-бот @Academy3D_bot.

**Машина.** Имя папки «сайт GRIPINSKY» записано на диске в форме NFD: буква «й» хранится как «и» плюс комбинируемый знак U+0306, поэтому в имени 15 символов вместо 14. Это ровно тот класс багов, что описан в [Astro #17381](https://github.com/withastro/astro/issues/17381), [Vite #11757](https://github.com/vitejs/vite/issues/11757) и [Claude Code #40946](https://github.com/anthropics/claude-code/issues/40946).

**Сетевая среда РФ в 2026 году (по поиску):**
- Cloudflare с 10.06.2025 обрывает соединения после примерно 16 КБ ([Хабр](https://habr.com/ru/news/922532/)).
- ngrok блокирует российские IP, ошибка ERR_NGROK_9040 ([vc.ru](https://vc.ru/services/1907831-ngrok-bolshe-ne-rabotayet-v-rossii-oshchibka-err_ngrok_9040)).
- YouTube заблокирован с февраля 2026.
- Telegram ограничен с 01.04.2026 и работает нестабильно ([Хакер](https://xakep.ru/2026/05/04/telegram-chronicle/)).

**Следствия для проекта:**
- хостинг только в РФ;
- никаких внешних CDN, в том числе Google Fonts, которые сейчас подключены в прототипе;
- без встраивания видео с YouTube;
- у кнопки «Задать вопрос (Telegram)» и у рассрочки через бота нужен запасной канал.

---

## 1. Сравнение архитектур

| Критерий | (а) Astro static + острова | (б) Astro + адаптер Node (статика + 2–3 эндпоинта) | (в) Next.js 16 + headless CMS | (г) SvelteKit 3 / Nuxt 4 | (д) Tilda или сайт GetCourse + свой код | (е) WordPress |
|---|---|---|---|---|---|---|
| Core Web Vitals, SEO | Отлично: на страницах 0 КБ JS, кроме островов | Так же, как (а) | Хорошо, но рантайм React на каждой странице, нужна дисциплина | Хорошо (Svelte компактный) | Tilda средне, страницы GetCourse слабо: тяжёлые, мало контроля над SEO | Средне: зависит от темы и плагинов |
| Редактирование непрограммистом | Через Git-CMS (Keystatic) | Так же, как (а) | Лучшая админка (Payload), но нужны БД и сервер | Nuxt Content или Studio, экосистема беднее | Лучше всего: заказчица уже знает Tilda | Привычная админка |
| GetCourse | Только виджеты и ссылки | Виджеты, API deals с секретом на сервере, заказ из нескольких предложений | Полностью | Полностью | Нативно (GetCourse) или виджеты | Плагины или свой код |
| Robokassa | Только заранее созданные ссылки. Подписать произвольную сумму нельзя: Пароль №1 оказался бы в браузере | Подпись на сервере, Result URL | Полностью | Полностью | Корзина Tilda | Плагины |
| Bitrix24 | Встроенная CRM-форма | Форма или свой эндпоинт с вебхуком `crm.lead.add` | Полностью | Полностью | Нативно | Плагин |
| Хостинг в РФ | Любая статика, от десятков рублей в месяц | VPS с Node и nginx или статика плюс функции | Node, на сервере от 2 ГБ RAM; Vercel не подходит | Node или статика | Подписка конструктора | Любой PHP-хостинг |
| M1 с 8 ГБ | Легко | Легко | Тяжелее; с Payload и БД тесно | Нормально | Не важно | Нужен Docker или MAMP |
| Порог входа | Низкий | Низкий или средний | Высокий | Средний или высокий | Минимальный | Средний, плюс постоянные обновления |

**Рекомендация: (б).** Astro 7 с `output: 'static'` (страницы собираются заранее), адаптер `@astrojs/node` и всего несколько эндпоинтов с `prerender = false`: `/api/checkout`, `/api/lead`, `/api/robokassa/result`. Для SEO и скорости это то же самое, что (а). Но только (б) позволяет оплатить собранный пакет с динамической суммой, не раскрывая секреты GetCourse и Robokassa. Вариант (д) оставляем как запасной на переходный период: старые страницы и так остаются на Tilda.

**Что поменять в ранее предложенном плане:**
1. **Astro 5 устарел.** Сейчас Astro 7.3.5. В нём:
   - Rust-компилятор строго проверяет HTML: неверная вложенность вроде `<p><div>` даёт ошибку. Вёрстку из `snapshot/` придётся чистить.
   - `compressHTML` по умолчанию `'jsx'`: он может убрать пробелы между строчными элементами в заголовках вида «Слово: жёлтая часть». Ставить `compressHTML: true` и сверять на скриншотах.
   - Content Layer: файл `src/content.config.ts`, загрузчики `glob()` и `file()`, `import { z } from 'astro/zod'` (Zod 4).
2. **Preact закрепить на 10.29.8.** Островов делать минимум: тест, конструктор и липкую панель. Вкладки, слайдер до/после (`<input type="range">`), FAQ (`<details>`), фильтры и лайтбокс галереи (`<dialog>`) сделать обычными `<script>` в `.astro`, без фреймворка.
3. **nanostores оставить.** Тест записывает в хранилище `{base, prof, tariff}`, конструктор и липкая панель читают. Расчёт цены вынести в чистую функцию `src/lib/pricing.ts`, общую для острова и сервера.
4. **JSON и Zod оставить, добавить Keystatic.** Он пишет JSON прямо в папки коллекций. Схема живёт в двух местах (Keystatic и Zod), поэтому `astro build` должен падать на несовпадении.
5. **Импорт 53 курсов из Tilda: одноразовое наполнение плюс отчёт о расхождениях.** Пока старые страницы на Tilda, цены их товаров ведутся в Tilda. Скрипт повторно запускается для сверки цен.
6. **`build.format: 'file'` и `trailingSlash: 'never'` — верный выбор.** Но:
   - при `file` в `Astro.url.pathname` попадает `.html`, поэтому canonical и Open Graph строить хелпером, а не из `Astro.url`;
   - на хостинге нужны `try_files $uri $uri.html` и 301 с `/x/` и `/x.html` на `/x`;
   - после сборки проверить, нет ли `.html` в `sitemap-0.xml`.
7. **`config/checkout.json` оставить только запасным режимом `links`.** Сочетаний слишком много: 4 варианта базы × 5 вариантов профессии × до 32 наборов доп. курсов. Плюс цены дублируются. Основной режим — серверный `/api/checkout` (раздел 3). Коды предложений GetCourse хранить в записях курса и тарифа, а не в отдельном файле.
8. **Встроенную CRM-форму Bitrix24 подходит для пилота, но грузить её только по клику или прокрутке.** Скрипт тяжёлый, а тёмный бренд в ней не настроить. В продакшене своя форма шлёт данные на `/api/lead`, а тот вызывает вебхук `crm.lead.add` (или сделку, если CRM в простом режиме без лидов). Обязательна отдельная галочка согласия по 152-ФЗ.
9. **@fontsource заменить на стабильный Fonts API в Astro.** Шрифты скачиваются при сборке и раздаются с нашего сервера, `preload` и метрики запасного шрифта (меньше CLS) он делает сам.
10. **В прошлом плане не было:**
    - CMS;
    - серверных эндпоинтов;
    - `.env` и `astro:env`;
    - мобильной версии (в прототипе её нет, а оценка в поисковиках идёт по мобильной);
    - карты 90 адресов;
    - ограничений сети РФ;
    - переноса проекта на путь латиницей.

---

## 2. CMS для непрограммиста

| CMS | Локально в пилоте | Продакшен в РФ | Вывод |
|---|---|---|---|
| **Keystatic** 0.6.9 | Режим `local`: админка на `localhost:4321/keystatic`, записи сохраняются как JSON и картинки в репозитории | Режим `local` с коммитом и деплоем из CI: сервер не нужен. Или режим `github` на нашем Node (нужен GitHub App, у редактора аккаунт GitHub). Keystatic Cloud зарубежный, оплатить из РФ нельзя | **Рекомендую** |
| Decap 3.16 | `npx decap-server` и `local_backend: true` | Нужен свой OAuth-прокси для GitHub. Сборку по умолчанию грузит с unpkg (Cloudflare), значит её надо собирать у себя | Запасной вариант. Интерфейс устаревший |
| TinaCMS 3.14 | Работает (`tinacms dev`) | Tina Cloud в США или своя сложная серверная часть | Нет |
| Payload 3.90 | Нужен Next.js и БД; на 8 ГБ тесно | VPS от 2 ГБ, два приложения | Если сайт вырастет в каталог с ролями |
| Directus 12.4 | Docker Desktop плюс БД, тяжело | VPS, лицензия BSL | Избыточно |
| Strapi 5.56 | Сборка админки около 1,5–2 ГБ RAM | VPS от 2 ГБ | Избыточно |
| Sanity 6.17 | Работает | SaaS за рубежом: оплата невозможна, данные за границей, риск белых списков | Нет |

**Как это будет у заказчицы.**
1. В Claude Code нажимает Run, конфигурация `dev`.
2. Открывает `/keystatic` → «Награды» → «Добавить»: загружает картинку, выбирает человека, указывает месяц.
3. Сразу видит результат на `localhost`.
4. Изменение уходит в GitHub через GitHub Desktop или кнопку в Claude Code, CI сам выкладывает сайт.

Цены меняются в записях «Тариф» и «Курс». Позже, если редакторов станет несколько, включается режим `github` на продакшен-сервере за авторизацией.

Технические детали:
- Keystatic требует `@astrojs/react` и `@astrojs/markdoc`. Подключать их только в dev: `const isDev = process.argv.includes('dev')`. Иначе адаптер Node соберёт `/keystatic` в продакшен, и сервер станет записывать файлы.
- Одновременно с Preact нужны шаблоны `include`, это проверить на этапе 2.
- Работает ли хелпер `image()` в схеме для JSON-коллекций, по документации подтвердить не удалось. Проверить на первой записи. Запасной вариант: хранить путь строкой и находить файл через `import.meta.glob('/src/assets/**/*.{jpg,png}')`.

---

## 3. Оплата собранного пакета

**Основной путь: GetCourse API через `/api/checkout`.**
1. Браузер отправляет только идентификаторы: `{items:['base:opt','course:int','addon:mat'], name, email, phone}`. **Сумму из браузера не принимаем.**
2. Сервер пересчитывает итог той же функцией `pricing.ts` по данным коллекций.
3. Вызывает `POST https://{account}.getcourse.ru/pl/api/deals`, параметры `action=add`, `key`, `params` (JSON в base64):
   - первый запрос создаёт заказ с первым предложением и `system.return_deal_number: 1`;
   - следующие добавляют предложения с `deal_number` и `multiple_offers: 1`. Несколько предложений в одном запросе API отклоняет, проверено по документации и обсуждениям;
   - последний запрос с `return_payment_link: 1` возвращает ссылку на оплату.
4. Сервер отвечает редиректом на эту ссылку.

Оплату проводит GetCourse: Robokassa подключается внутри GetCourse как платёжный модуль, там же рассрочки банков-партнёров. Доступ к курсам GetCourse выдаёт сам, Result URL для Robokassa обрабатывает тоже он. Подарочные курсы оформляются предложениями за 0 ₽.

Уточнить у заказчицы:
- название аккаунта GetCourse;
- есть ли API на её тарифе и какие лимиты на создание заказов (на один заказ уходит до 6 запросов);
- подключена ли Robokassa внутри GetCourse.

**Robokassa напрямую** — когда продукт не в GetCourse или чтобы не платить комиссию GetCourse.
1. Сервер собирает форму на `https://auth.robokassa.ru/Merchant/Index.aspx`. Подпись: `MerchantLogin:OutSum:InvId:Receipt:Пароль№1:Shp_*`, параметры `Shp_` по алфавиту. Хеш MD5 или SHA256 по настройке магазина.
2. `Receipt` — чек по 54-ФЗ: JSON без пробелов, закодированный для URL.
3. Result URL проверяет подпись `OutSum:InvId:Пароль№2:Shp_*` и отвечает `OK{InvId}`.
4. После этого сервер сам создаёт оплаченный заказ в GetCourse (`deal_is_paid`) и лид в Bitrix24.
5. Нужно хранилище заказов (`node:sqlite`) и защита от двойной обработки. Частей больше, чем в основном пути.

Тонкость: Astro по умолчанию включает `security.checkOrigin`. POST формой с чужого домена без совпадающего `Origin` может получить 403. Поэтому в кабинете Robokassa выбрать для Result URL метод GET или проверить это на этапе 6.

**Ссылки-счета.** Invoice API Robokassa (JWT) и готовые предложения GetCourse подходят только для фиксированных сумм. У Invoice API нет тестового режима. Это режим `links` на случай статического хостинга без сервера.

**Как проверить в пилоте на localhost:**
- **Robokassa.**
  - `IsTest=1` и **тестовые** пароли №1 и №2 из технических настроек; уведомления на Result URL в тестовом режиме приходят.
  - Адрес «успеха» указать на `http://localhost:4321/oplata/uspeh` через подписанный параметр `SuccessUrl2`: это обычный редирект в браузере, туннель не нужен.
  - Result URL через туннель tuna: `ResultUrl2=https://<имя>.ru.tuna.am/api/robokassa/result`.
  - Или без туннеля: опрашивать статус через `OpStateExt`.
- **GetCourse.** Тестовое предложение за 1 ₽ или промокод на 100 %. Заказы с пометкой `deal_comment: "ТЕСТ сайта"` потом отменять.
- **Переключатель режима:** `CHECKOUT_MODE=api|links|demo`. В режиме `demo` показывается состав заказа без вызовов API, его и показывать команде.

**Секреты.**
- Хранятся в `.env` (в git не попадает), в репозитории только `.env.example` с пустыми значениями.
- Схема через `astro:env` с `envField.string({ context: 'server', access: 'secret', optional: true })`, так секрет не попадёт в браузер.
- Префикс `PUBLIC_` только для ID Метрики.
- Заказчица вписывает ключи сама в редакторе, **не присылает их в чат**, и хранит копию в «Паролях» macOS.
- На продакшене ключи лежат в `/etc/gripinsky.env` с правами `chmod 600`.

---

## 4. Порядок локальной разработки на этой машине

**Шаг 1. Путь латиницей.** Папку с кириллицей и пробелом (имя к тому же хранится в NFD) проектом не делать. Создать `~/Projects/gripinsky-site` и открыть её в Claude Code **новой сессией**. Бриф и прототип скопировать в `docs/` внутри проекта.
```bash
mkdir -p ~/Projects && cd ~/Projects
```

**Шаг 2. Node.js 24 LTS из официального .pkg.** Рекомендую .pkg, а не fnm. Node встанет в `/usr/local/bin`, который уже есть в системном PATH, поэтому `npm` из `.claude/launch.json` найдётся без правки `~/.zshrc`. С fnm приложения, открытые из Dock, могут не увидеть `npm`.
```bash
cd ~/Downloads
curl -fLO https://nodejs.org/dist/v24.21.0/node-v24.21.0.pkg
shasum -a 256 node-v24.21.0.pkg   # должно совпасть: 9831a74b04c270a429bd5a240e37712c4fe229b02b032e18ff2e0702c17c20fd
sudo installer -pkg node-v24.21.0.pkg -target /    # или двойной клик по файлу
node -v   # v24.21.0
npm -v    # 11.19.0
```
- `sudo npm -g` не использовать, вместо глобальных установок `npx`.
- fnm 1.39.0 (`curl -fsSL https://fnm.vercel.app/install | bash`, затем `fnm install 24`) имеет смысл, только если понадобится несколько версий Node.
- Сайты nodejs.org и npm стоят за Cloudflare. Сейчас с этой машины они открываются, но если загрузка оборвётся, проблема в сети, а не в команде.

**Шаг 3. npm, а не pnpm.** npm уже в комплекте, а в Node 25+ corepack убрали из поставки. `package-lock.json` хранить в git, на CI ставить через `npm ci`.

**Шаг 4. Создание проекта.**
```bash
cd ~/Projects
npm create astro@latest gripinsky-site -- --template minimal --install --git --skip-houston
cd gripinsky-site
npx astro add tailwind --yes
npx astro add node --yes
npm i preact@10.29.8 @astrojs/preact@6.0.5 nanostores@1.5.4 @nanostores/preact@1.1.0 @astrojs/sitemap@3.7.4
npm i react@19.3.0 react-dom@19.3.0 @astrojs/react@7.0.0 @astrojs/markdoc@2.0.9 @keystatic/core@0.6.9 @keystatic/astro@6.0.0
npm i -D @astrojs/check@0.9.10 typescript@6.0.3
```
Preact и Keystatic подключить в `astro.config.mjs` вручную. `astro add preact` может подтянуть preact 11 и упасть на конфликте зависимостей.

Ключевые настройки:
```js
const isDev = process.argv.includes('dev');
export default defineConfig({
  site: 'https://gripinsky.ru', output: 'static', adapter: node({ mode: 'standalone' }),
  trailingSlash: 'never', build: { format: 'file' }, compressHTML: true,
  server: { port: 4321, allowedHosts: ['.tuna.am'] },
  integrations: [preact({ include: ['**/islands/**'] }), markdoc(), sitemap(),
    ...(isDev ? [react({ exclude: ['**/islands/**'] }), keystatic()] : [])],
  fonts: [
    { provider: fontProviders.fontsource(), name: 'Inter Tight', cssVariable: '--font-sans', weights: [400,500,600,700,800], subsets: ['latin','cyrillic'] },
    { provider: fontProviders.fontsource(), name: 'Caveat', cssVariable: '--font-hand', weights: [500], subsets: ['latin','cyrillic'] }],
  vite: { plugins: [tailwindcss()] },
});
```
Скрипты в `package.json`:
```json
"dev": "astro dev", "dev:lan": "astro dev --host",
"build": "astro check && astro build",
"preview": "astro preview --port 4322", "preview:lan": "astro preview --host --port 4322",
"import:tilda": "node scripts/import-tilda.mjs"
```

**Шаг 5. Файлы `.env.example`, `.gitignore` и git.** Переменные в `.env.example`:
`CHECKOUT_MODE=demo`, `GETCOURSE_ACCOUNT=`, `GETCOURSE_API_KEY=`, `ROBOKASSA_LOGIN=`, `ROBOKASSA_PASS1=`, `ROBOKASSA_PASS2=`, `ROBOKASSA_IS_TEST=1`, `ROBOKASSA_HASH=sha256`, `B24_WEBHOOK_URL=`, `PUBLIC_YM_ID=`.

Добавить в `.gitignore` к шаблонным строкам:
```
.env
.env.*
!.env.example
.claude/settings.local.json
originals/
```
Затем:
```bash
cp .env.example .env
git config --global user.name "Имя"
git config --global user.email "<noreply-адрес GitHub>"
git add -A && git commit -m "Каркас Astro 7"
```
Приватный репозиторий на GitHub подключать через GitHub Desktop: это проще для непрограммиста и не требует SSH-ключей. Если GitHub станет недоступен, запасные площадки — GitVerse или GitFlic.

**Шаг 6. `.claude/launch.json`.**
```json
{ "version": "0.0.1", "configurations": [
  { "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run","dev"], "port": 4321 },
  { "name": "preview", "runtimeExecutable": "npm", "runtimeArgs": ["run","preview"], "port": 4322 } ] }
```
Скриншоты во встроенном браузере снимать на ширинах 375, 768, 1024 и 1440.

**Шаг 7. Просмотр с телефона.**
1. `npm run dev:lan`.
2. Адрес машины в сети: `ipconfig getifaddr en0`.
3. На телефоне открыть `http://192.168.x.x:4321`.
4. На запрос брандмауэра macOS «Разрешить node входящие соединения» ответить «Разрешить».

Гостевая сеть Wi-Fi с изоляцией клиентов не подойдёт.

**Шаг 8. Сборка и предпросмотр.** `npm run build` проверяет типы и схемы контента. `npm run preview` запускает собранный сервер с эндпоинтами. Всё, что показывается команде, смотреть именно через preview.

**Шаг 9. Как показать пилот без хостинга:**
- **tuna.am** — российский туннель, есть узел в Москве, есть бесплатный тариф (лимиты уточнить на сайте). Установка `curl -sSLf https://get.tuna.am | sh`, сохранить токен из личного кабинета, затем `tuna http 4322`. Включить базовую авторизацию. Рекомендую для живых показов с эндпоинтами.
- **cloudflared 2026.9.3** технически работает, но зрители в РФ упрутся в замедление Cloudflare. Не подходит.
- **ngrok** не пускает российские IP. Не подходит.
- **localtunnel** нестабилен и показывает промежуточную страницу с паролем. Не подходит.
- **Временный статический хостинг** для показа без созвона: Timeweb Cloud Apps (автодеплой из GitHub) или Yandex Object Storage (1 ГБ бесплатно). Обязательно `noindex` и `CHECKOUT_MODE=demo`.

**Шаг 10. Бэкапы.** Каждый рабочий день коммит и push в GitHub, плюс Time Machine. Копия `.env` хранится в «Паролях» macOS.

**Шаг 11. Ограничения 8 ГБ и картинки.**
- sharp ставит готовую сборку `@img/sharp-darwin-arm64`, компилировать ничего не нужно.
- Исходники перед добавлением уменьшать встроенной утилитой: `sips -Z 2400 -s formatOptions 85 --out ./resized/ *.jpg`.
- Огромные оригиналы держать в `originals/` вне git.
- Для героя `<Picture formats={['avif','webp']}>`, для остального `<Image>` в WebP. Кодирование AVIF медленное и прожорливое по памяти.
- Ширины ограничить через `image.breakpoints` (например, 480, 960, 1440, 1920).
- Обработанные картинки кешируются, повторные сборки быстрые.
- Если сборка падает по памяти: `NODE_OPTIONS=--max-old-space-size=4096 npm run build`, Chrome закрыть.

---

## 5. Целевая структура проекта

```
gripinsky-site/
  .claude/launch.json        .env.example   astro.config.mjs   keystatic.config.ts
  docs/ (HANDOFF, прототип)  scripts/import-tilda.mjs  scripts/check-urls.mjs (90 адресов → 200)
  public/ robots.txt favicon
  src/
    content.config.ts
    content/
      courses/*.json  tariffs/*.json  professions/*.json  people/*.json
      works/*.json  stories/*.mdoc  awards/*.json  reviews/*.json  faq/*.json
      settings/site.json  settings/legacy-urls.json
    assets/ works/ people/ courses/ brand/
    lib/ pricing.ts  seo.ts (canonical без .html)  getcourse.ts  robokassa.ts  b24.ts
    stores/ package.ts (nanostores: base, prof, tariff, csel, sel)
    islands/ Quiz.tsx  PackageBuilder.tsx  StickyPackageBar.tsx
    components/ Header Footer Section H2Split BeforeAfter Tabs Faq WorkCard StoryCard
                AwardCard ReviewCard TariffRow LeadForm B24FormFacade Gallery Lightbox
    layouts/ Base.astro
    pages/ index.astro  courses-page/visualization.astro  gallery.astro  ai.astro
           [legacy]/... (позже)  oplata/uspeh.astro  oplata/oshibka.astro
           api/checkout.ts  api/lead.ts  api/robokassa/result.ts   (prerender = false)
    styles/global.css (@import "tailwindcss"; @theme: #0D2023, #F8F61A, #92BABE, #E7E7E7…)
```

**Модель данных.** Связи между записями через `reference()`. Люди собраны в одну коллекцию `people`, потому что Тверитин одновременно выпускник и педагог.

- **course:**
  - slug, title, legacyPath (адрес на Tilda), status (active, hidden, archive);
  - price, oldPrice (`null` допустим, тогда показывается «[цена]»);
  - meta, lessons, accessMonths, blocks[], finalProject, description;
  - cover, teachers[];
  - gift, addons[];
  - separatelyBuyable;
  - getcourse.offerCode / offerId;
  - seo {title, description, ogImage}.
- **tariff:** id (lite, opt, mentor), name, sub, short, extra (+15 000 или +40 000), fullOld, features[{ok, text}], badge, appliesTo, getcourse.offerCode.
- **profession:** id (int, ext, stock), title, short, lead, income, image, imagePos, fit, courses[], defaultCourses[], gift, addons[], order.
- **person:** name, roles[student, teacher], photo, bio, achievements[], **consent** (согласие на публикацию: да или нет, дата).
- **work:** image, beforeImage?, title, author, categories[interior, exterior, model, mentor, teacher], course, year, sourceUrl (3DDD), featured, order. Показывается только при consent автора.
- **story:** person, headline, body (markdoc), images[], coursesTaken[], result, featured.
- **award («Царь горы»):** person, work, date (месяц), contest, isTeacherVote, place?
- **review:** author, handle, source (telegram, yandex, vk), text, date, course?, rating. Без телефонов и e-mail.
- **faq:** question, answer, pages[] (направления), order.
- **settings:** installment {months: 12, provider, note}, telegram, ymId, b24FormId, контакты.

Тест и конструктор берут логику из `renderVals()` прототипа (строки 451–598 `prototype/index.html`): таблицу `PR`, `PROFS`, `TAR`, правила «ИИ входит в базу» и «нельзя снять последний курс профессии».

---

## 6. От пилота к продакшену

**Хостинг в РФ.** Цены ориентировочные, проверять по прайсам.

| Вариант | Состав | Стоимость | Комментарий |
|---|---|---|---|
| **VPS Timeweb Cloud или Selectel** (рекомендую) | 2 vCPU, 2 ГБ RAM; nginx раздаёт `dist/client` (`try_files $uri $uri.html =404`) и проксирует `/api/*` на Node (systemd); certbot | Несколько сотен рублей, до 1–1,5 тыс. ₽ в месяц | Полный контроль: редиректы, эндпоинты, прокси на Tilda. Собирать на CI, не на сервере |
| Timeweb Cloud Apps + Yandex Cloud Functions | Статика с автодеплоем, `/api` на `api.gripinsky.ru` | От копеек до сотен рублей в месяц | Меньше администрирования, больше связок (CORS, два места для секретов) |
| Beget (shared) | Только статика и `.htaccess` | Порядка 200–400 ₽ в месяц | Только при оплате через режим `links` |
| Yandex Object Storage + CDN + API Gateway | Статика, функции | Самое дешёвое при росте | Самая сложная настройка адресов без `.html` |

**CI/CD.** GitHub Actions на push в `main`:
1. `npm ci && npm run build`.
2. `rsync` в `releases/<sha>` на VPS.
3. Переключение симлинка и `systemctl restart`.

Ветки выкладываются на `stage.gripinsky.ru` с базовой авторизацией и заголовком `X-Robots-Tag: noindex`. Откат — вернуть предыдущий симлинк.

**Поэтапная замена против полного переезда.** Tilda Export не выход: в экспортированных страницах не работают корзина и каталог ([справка Tilda](https://help-ru.tilda.cc/export)). Порядок такой:
1. **Тестовый стенд** `new.gripinsky.ru` (noindex): на нём команда принимает работу.
2. **Новая страница на поддомене** (например, `3d.gripinsky.ru`) под рекламный трафик: Директу SEO не нужно, а старый сайт не рискует.
3. **Гибрид на основном домене — только если пройдёт однодневная проверка.** nginx на VPS отдаёт новые адреса из Astro, остальное проксирует на технический домен проекта `*.tilda.ws`. Проверить, что работают корзина, формы, Robokassa и сертификат. Не обещать заранее.
4. **Полный переезд.** Шаблон курса заполняется из 53 импортированных курсов, корзину Tilda заменяет `/api/checkout`, все 90 адресов воспроизводятся один в один.

**Переключение домена без потери SEO:**
1. Инвентаризация 90 адресов: title, description, H1, canonical. Файл `legacy-urls.json` и карта 301 для всего, что меняет адрес.
2. Скрипт `check-urls.mjs` подтверждает, что все адреса на тестовом стенде отвечают 200.
3. Подтвердить сайт в Яндекс Вебмастере на новом сервере заранее, мета-тегом.
4. За 48 часов снизить TTL A-записей в hoster.by.
5. Сменить **только** A-записи для `@` и `www` на IP VPS. MX `mailbe04.hoster.by` и SPF-запись не трогать.
6. Тот же счётчик Метрики, `sitemap.xml`, перенести из `robots.txt` запреты для технических `/page*.html`.
7. Две недели следить за 404 в логах nginx и в Вебмастере.
8. Подписку Tilda держать ещё 1–2 месяца ради отката.

---

## 7. План работ и критерии готовности

| Этап | Содержание | Готово, когда |
|---|---|---|
| 0. Окружение (0,5 дня) | Node 24.21.0, папка `~/Projects/gripinsky-site`, git, GitHub, `launch.json` | `node -v` показывает v24.21.0; встроенный браузер открывает `localhost:4321`; первый push сделан |
| 1. Каркас и бренд (1–2 дня) | Токены в `@theme`, Fonts API, Base layout, шапка и подвал, `seo.ts`, Метрика только в продакшене | Lighthouse mobile ≥95 на пустой странице; ни одного запроса к Google и другим зарубежным CDN; кириллица со своего сервера |
| 2. Данные и CMS (2–3 дня) | `content.config.ts`, `keystatic.config.ts`, импорт 53 курсов, перенос цен из HANDOFF | Заказчица сама добавляет «Царя горы» и работу через `/keystatic`; невалидная запись роняет `build` с понятной ошибкой |
| 3. Страница «3D-визуализация» (4–6 дней) | Секции из snapshot, обычные скрипты, острова `Quiz`, `PackageBuilder`, `StickyPackageBar`, мобильная версия | 10 сценариев цен совпадают с прототипом (`node --test` для `pricing.ts`); скриншоты на 375, 768, 1024 и 1440; LCP <2,5 с, CLS <0,1; JS на странице ≤ ~25 КБ gzip; в текстах нет « — », «·», «→» |
| 4. Галерея (1–2 дня) | Фильтры, `<dialog>`-лайтбокс, ленивая загрузка | 100+ работ без просадки; управление с клавиатуры; показываются только работы с consent |
| 5. Главная и «ИИ в 3D» (2–3 дня) | Из черновиков, на тех же компонентах | Отдельные картинки из одного источника не повторяются; тексты по правилам брифа |
| 6. Формы и оплата в пилоте (2–4 дня) | Bitrix24 по клику, `/api/checkout` в режимах demo, links и api, Robokassa в тестовом режиме | Тестовый заказ в GetCourse с верным составом и суммой; тестовый платёж Robokassa получает `OK{InvId}` через tuna; секретов нет ни в git, ни в бандле |
| 7. Показ команде (0,5 дня) | tuna и статический стенд | Команда открывает пилот с телефона в РФ без VPN |
| 8. Продакшен (после решений заказчицы) | VPS, CI, тестовый стенд, проверка прокси, инвентаризация адресов, переключение DNS | 90 из 90 адресов отвечают 200 или 301; Метрика и Вебмастер без провалов 2 недели; откат описан |

**Нужно от заказчицы до этапа 6:**
- открытые вопросы из §9 HANDOFF: цена «Наставничества» и условия рассрочки (сейчас рассрочка через Telegram-бота, а Telegram в РФ нестабилен; нужен вариант на сайте);
- доступы к GetCourse: аккаунт, тариф с API, подключена ли Robokassa;
- режим CRM в Bitrix24: лиды или простой режим со сделками;
- политика конфиденциальности и текст согласия по 152-ФЗ;
- согласия учеников на публикацию.

**Источники:**
- [Astro: переход на v7](https://docs.astro.build/en/guides/upgrade-to/v7/), [на v6](https://docs.astro.build/en/guides/upgrade-to/v6/), [справочник настроек](https://docs.astro.build/en/reference/configuration-reference/), [Fonts API](https://docs.astro.build/en/guides/fonts/), [адаптер Node](https://docs.astro.build/en/guides/integrations-guide/node/)
- [Keystatic + Astro](https://keystatic.com/docs/installation-astro), [Keystatic и статическая сборка](https://github.com/Thinkmill/keystatic/discussions/826)
- [GetCourse API](https://getcourse.ru/help/api)
- [Robokassa: платёжный интерфейс](https://docs.robokassa.ru/ru/pay-interface), [уведомления](https://docs.robokassa.ru/ru/notifications-and-redirects), [тестовый режим](https://docs.robokassa.ru//ru/testing-mode), [Invoice API](https://docs.robokassa.ru/ru/invoice-api)
- [Tilda: экспорт](https://help-ru.tilda.cc/export)
- [Tuna](https://tuna.am/tunnels/), [установка tuna](https://tuna.am/en/docs/guides/install-manual/), [ERR_NGROK_9040](https://tuna.am/en/blog/err-ngrok-9040/)
- [Cloudflare в РФ](https://habr.com/ru/news/922532/), [хроника Telegram](https://xakep.ru/2026/05/04/telegram-chronicle/)
- [Timeweb Cloud Apps](https://timeweb.cloud/services/apps), [цены Yandex Object Storage](https://cloud.yandex.ru/docs/storage/pricing)

### Critical Files for Implementation
- /Users/aleksandragripinskaa/Projects/gripinsky-site/astro.config.mjs (предлагаемый путь)
- /Users/aleksandragripinskaa/Projects/gripinsky-site/src/content.config.ts (предлагаемый путь)
- /Users/aleksandragripinskaa/Projects/gripinsky-site/keystatic.config.ts (предлагаемый путь)
- /Users/aleksandragripinskaa/Projects/gripinsky-site/src/lib/pricing.ts (предлагаемый путь, общий для острова и `/api/checkout`)
- /private/tmp/claude-501/-Users-aleksandragripinskaa------GRIPINSKY/324ac47a-3d0b-47a5-ae98-7a80b12f1a15/scratchpad/ref/gripinsky-3d-viz/prototype/index.html (логика цен, теста и пакета, строки 451–598)