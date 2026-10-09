import type { APIRoute } from 'astro';
import { json } from '../../lib/security';

export const prerender = false;

// Проверка живости для выкладки (nginx пускает только с самого сервера). Ничего секретного не отдаёт.
const startedAt = new Date().toISOString();
export const GET: APIRoute = () => json({ ok: true, version: import.meta.env.PUBLIC_BUILD_SHA ?? 'local', startedAt });
