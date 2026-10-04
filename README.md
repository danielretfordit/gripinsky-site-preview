# gripinsky-site

Новый сайт Академии 3D GRIPINSKY (пилот). Astro 7, Tailwind 4, Preact, Keystatic.

## Запуск на своём Mac

```bash
npm install          # один раз
npm run dev          # сайт: http://localhost:4321, админка: http://localhost:4321/keystatic
npx astro dev stop   # остановить dev-сервер
```

Посмотреть с телефона в той же Wi-Fi сети: `npm run dev:lan`, затем на телефоне открыть адрес из вывода команды.

## Перед показом или выкладкой

```bash
npm test             # расчёт цен пакета
npm run build        # проверка типов и схем контента, сборка в dist/
npm run lint:copy    # тексты по правилам брифа
npm run check:urls   # адреса старого сайта: что уже на новом, карта в docs/url-map.md
npm run preview      # собранный сайт на http://localhost:4322
```

## Где что менять

- Цены, курсы, тарифы, профессии, работы, «Цари горы», отзывы, вопросы: в админке `/keystatic` или в `src/content/`.
- Контакты, цифры на первом экране, реквизиты, рассрочка: `src/content/settings.json` («Настройки сайта» в админке).
- Ключи GetCourse, Robokassa, Bitrix24: файл `.env` (образец `.env.example`). В git не попадает, в чат не присылать.

## Документы

`docs/HANDOFF.md` (бриф), `docs/analysis/` (UX/UI, маркетинг и SEO, архитектура), `docs/decisions.md`, `docs/open-questions.md`, `docs/url-map.md`.
