import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { hashPassword } from './crypto.server';

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS subscribers (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	phone TEXT NOT NULL UNIQUE,
	name TEXT, categories TEXT NOT NULL DEFAULT '[]',
	pending_name TEXT, pending_categories TEXT,
	status TEXT NOT NULL DEFAULT 'pendente',
	code_hash TEXT, code_expires INTEGER, code_attempts INTEGER NOT NULL DEFAULT 0,
	consent_at TEXT, created_at TEXT NOT NULL, confirmed_at TEXT, left_at TEXT
);
CREATE TABLE IF NOT EXISTS offers (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	title TEXT NOT NULL, description TEXT, price REAL, old_price REAL,
	store TEXT, category TEXT NOT NULL, url TEXT NOT NULL, image TEXT, coupon TEXT,
	status TEXT NOT NULL DEFAULT 'nova', source TEXT NOT NULL DEFAULT 'manual',
	clicks INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, published_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status, id);
CREATE TABLE IF NOT EXISTS outbox (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	subscriber_id INTEGER, phone TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL,
	offer_id INTEGER, status TEXT NOT NULL DEFAULT 'pendente', attempts INTEGER NOT NULL DEFAULT 0,
	error TEXT, send_after INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(status, send_after);
CREATE TABLE IF NOT EXISTS admins (
	id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
	token_hash TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sources (
	id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT NOT NULL, category TEXT NOT NULL,
	config TEXT NOT NULL DEFAULT '{}', enabled INTEGER NOT NULL DEFAULT 1,
	last_run TEXT, last_status TEXT, last_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS price_watch (item_id TEXT PRIMARY KEY, last_price REAL NOT NULL, min_price REAL NOT NULL, updated_at TEXT NOT NULL);
`;

type Row = Record<string, any>;
let db: DatabaseSync | undefined = (globalThis as any).__aqDb;

export function getDb(): DatabaseSync {
	if (db) return db;
	const dir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
	fs.mkdirSync(dir, { recursive: true });
	const instance = new DatabaseSync(path.join(dir, 'aquelas.db'));
	instance.exec(SCHEMA);
	const cols = (instance.prepare('PRAGMA table_info(offers)').all() as Row[]).map(c => c.name);
	if (!cols.includes('external_id')) instance.exec('ALTER TABLE offers ADD COLUMN external_id TEXT');
	if (!cols.includes('score')) instance.exec('ALTER TABLE offers ADD COLUMN score REAL NOT NULL DEFAULT 0');
	instance.exec('CREATE INDEX IF NOT EXISTS idx_offers_ext ON offers(external_id)');
	const defaults: Record<string, string> = { max_per_day: '5', delay_min: '4', delay_max: '9', auto_enabled: '0', auto_mode: 'revisar', collect_hour: '06:00', publish_hours: '09:00,13:00,19:00', per_slot: '2', min_discount: '15', min_rating: '4.5', min_sales: '50' };
	for (const [key, value] of Object.entries(defaults)) instance.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)').run(key, value);
	if (!(instance.prepare('SELECT COUNT(*) AS n FROM admins').get() as Row).n) {
		const username = process.env.ADMIN_USER || 'admin';
		const generated = crypto.randomBytes(9).toString('base64url');
		const password = process.env.ADMIN_PASSWORD || generated;
		instance.prepare('INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)').run(username, hashPassword(password), new Date().toISOString());
		if (!process.env.ADMIN_PASSWORD) console.log(`[admin] Usuário "${username}" criado com a senha temporária: ${password}  (troque no painel e defina ADMIN_PASSWORD)`);
	}
	db = instance;
	(globalThis as any).__aqDb = instance;
	return instance;
}

export const all = (sql: string, ...params: any[]): Row[] => getDb().prepare(sql).all(...params).map(r => ({ ...r }));
export const one = (sql: string, ...params: any[]): Row | null => { const r = getDb().prepare(sql).get(...params); return r ? { ...r } : null; };
export const run = (sql: string, ...params: any[]) => getDb().prepare(sql).run(...params);
export const now = () => new Date().toISOString();
export const getSetting = (key: string, fallback: number) => { const r = one('SELECT value FROM settings WHERE key = ?', key); const n = Number(r?.value); return Number.isFinite(n) ? n : fallback; };
export const getText = (key: string, fallback: string) => one('SELECT value FROM settings WHERE key = ?', key)?.value ?? fallback;
export const setSetting = (key: string, value: number) => run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, String(value));
