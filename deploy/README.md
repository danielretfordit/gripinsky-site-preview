# Выкладка на VPS

Схема: nginx отдаёт готовые страницы из `dist/client`, а `/api/*` и `/keystatic` проксирует в Node (Astro, адаптер `@astrojs/node`). Node работает под systemd от отдельного пользователя и слушает только `127.0.0.1:4321`.

```
/var/www/gripinsky/
  releases/<sha>/      собранные версии (последние 5)
  current -> releases/<sha>
/etc/gripinsky/env     секреты (0600, root)
/var/lib/gripinsky/    данные приложения: orders.db (заказы Robokassa)
```

## Сервер (один раз)

Ubuntu 24.04, 2 vCPU, 2 ГБ RAM (Timeweb Cloud или Selectel, хостинг в РФ).

1. Обновления и защита:
   - `apt update && apt upgrade`;
   - `apt install nginx certbot python3-certbot-nginx fail2ban ufw unattended-upgrades`;
   - `ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable`;
   - вход по SSH только по ключу: `PasswordAuthentication no`, `PermitRootLogin no` в `/etc/ssh/sshd_config`.
2. Node.js 24 LTS из официального репозитория NodeSource.
3. Пользователи:
   - `useradd --system --home /var/www/gripinsky --shell /usr/sbin/nologin gripinsky`: от него работает сайт;
   - `deploy` (ключ из GitHub Actions): право только на `rsync` в `releases/` и одну команду `sudo systemctl restart gripinsky`.
4. Секреты: `install -m 600 -o root /dev/null /etc/gripinsky/env`, заполнить по образцу `.env.example`. В git и в чат не отправлять.
5. nginx:
   - в `http {}` файла `/etc/nginx/nginx.conf` добавить `include /var/www/gripinsky/current/deploy/nginx/http-limits.conf;`;
   - `ln -s /var/www/gripinsky/current/deploy/nginx/gripinsky.conf /etc/nginx/sites-enabled/`;
   - сертификат: `certbot certonly --webroot -w /var/www/letsencrypt -d gripinsky.ru -d www.gripinsky.ru`;
   - пароль на админку: `htpasswd -c /etc/nginx/gripinsky-admin.htpasswd editor`;
   - `nginx -t && systemctl reload nginx`.
6. systemd: `cp deploy/systemd/gripinsky.service /etc/systemd/system/ && systemctl daemon-reload && systemctl enable --now gripinsky`.
7. fail2ban: включить `nginx-limit-req` (бан IP, которые упираются в лимит запросов) и `sshd`.

## Выкладка версии

Делает GitHub Actions (`.github/workflows/deploy-vps.yml`) после проверок. Шаги:
1. Сборка: `npm ci && npm run build`.
2. Загрузка `dist/`, `deploy/`, `package.json`, `package-lock.json` в `releases/<sha>`.
3. В папке релиза: `npm ci --omit=dev`.
4. Переключение: `ln -sfn releases/<sha> current && sudo systemctl restart gripinsky`.
5. Проверка: `curl -fsS http://127.0.0.1:4321/api/health`. Если проверка не прошла, `current` возвращается на прошлый релиз и сервис перезапускается.
6. Старые релизы удаляются, кроме последних пяти.

Откат вручную: `ln -sfn releases/<прошлый sha> current && sudo systemctl restart gripinsky`.

## Резервные копии

- `orders.db`: каждую ночь `sqlite3 /var/lib/gripinsky/orders.db ".backup /var/backups/gripinsky/orders-$(date +%F).db"`. Копии хранятся 30 дней и отправляются в Yandex Object Storage.
- `/etc/gripinsky/env`: копия в менеджере паролей заказчицы.
- Контент сайта хранится в git (GitHub), отдельная копия не нужна.

## Проверка после выкладки

```bash
curl -I https://gripinsky.ru/                       # 200, заголовки безопасности
curl -I https://gripinsky.ru/interiorpro/           # 301 на /interiorpro
curl -I http://www.gripinsky.ru/                    # 301 на https://gripinsky.ru/
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://gripinsky.ru/api/lead -H 'Origin: https://evil.example'   # 403
```
