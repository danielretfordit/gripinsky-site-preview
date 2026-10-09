// Хранилище заказов для прямой оплаты Robokassa (SQLite из стандартной библиотеки Node, без отдельного сервера БД).
// Зачем: номер счёта без совпадений, проверка суммы на Result URL, повторное уведомление не создаёт второй лид.
// Файл базы: ORDERS_DB (на сервере /var/lib/gripinsky/orders.db), резервная копия по ночам (deploy/README.md).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { toKopecks } from './robokassa-sign.ts';

export type PaidResult = 'paid' | 'duplicate' | 'unknown' | 'amount_mismatch';

export interface OrderRow { inv_id: number; total_kop: number; status: 'pending' | 'paid'; summary: string; email: string; created_at: string; paid_at: string | null }

export class OrderStore {
  private db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 3000;
      CREATE TABLE IF NOT EXISTS orders (
        inv_id     INTEGER PRIMARY KEY AUTOINCREMENT,
        total_kop  INTEGER NOT NULL,
        status     TEXT NOT NULL DEFAULT 'pending',
        summary    TEXT NOT NULL,
        email      TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        paid_at    TEXT
      );
      -- Номера счетов не начинаются с 1: старт выше номеров, которые могли выдаваться раньше по времени
      INSERT INTO sqlite_sequence (name, seq) SELECT 'orders', 100000 WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'orders');
    `);
  }

  /** Новый заказ перед переходом к оплате: возвращает номер счёта (InvId) */
  create(total: number, summary: string, email: string): number {
    const r = this.db.prepare('INSERT INTO orders (total_kop, summary, email) VALUES (?, ?, ?)').run(toKopecks(total), summary.slice(0, 500), email.slice(0, 120));
    return Number(r.lastInsertRowid);
  }

  /** Отметка об оплате по уведомлению Robokassa. Одна транзакция: два одновременных уведомления не дадут двух оплат. */
  markPaid(invId: number, outSum: string): PaidResult {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const row = this.db.prepare('SELECT total_kop, status FROM orders WHERE inv_id = ?').get(invId) as { total_kop: number; status: string } | undefined;
      let result: PaidResult;
      if (!row) result = 'unknown';
      else if (row.total_kop !== toKopecks(outSum)) result = 'amount_mismatch';
      else if (row.status === 'paid') result = 'duplicate';
      else {
        this.db.prepare("UPDATE orders SET status = 'paid', paid_at = datetime('now') WHERE inv_id = ?").run(invId);
        result = 'paid';
      }
      this.db.exec('COMMIT');
      return result;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }

  get(invId: number): OrderRow | undefined {
    return this.db.prepare('SELECT * FROM orders WHERE inv_id = ?').get(invId) as OrderRow | undefined;
  }

  /** Проверка, что база открыта и пишется (для /api/health) */
  healthy(): boolean {
    try { this.db.prepare('SELECT 1').get(); return true; } catch { return false; }
  }

  close() { this.db.close(); }
}

let shared: OrderStore | undefined;
/** Общее хранилище процесса (путь из ORDERS_DB) */
export function orderStore(path = process.env.ORDERS_DB || './var/orders.db'): OrderStore {
  shared ??= new OrderStore(path);
  return shared;
}
