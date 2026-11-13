import crypto from 'node:crypto';
import { all, one, run, now } from './db.server';
import { sha256, verifyPassword } from './crypto.server';

const WEEK = 7 * 24 * 3600 * 1000;
export const COOKIE = 'aq_admin';
export function login(username: string, password: string): string | null {
	const admin = one('SELECT id, password_hash FROM admins WHERE username = ?', String(username).trim());
	if (!admin || !verifyPassword(String(password), admin.password_hash)) return null;
	const token = crypto.randomBytes(32).toString('base64url');
	run('INSERT INTO sessions (token_hash, admin_id, expires) VALUES (?, ?, ?)', sha256(token), admin.id, Date.now() + WEEK);
	run('DELETE FROM sessions WHERE expires < ?', Date.now());
	return token;
}
const tokenOf = (request: Request) => /(?:^|;\s*)aq_admin=([^;]+)/.exec(request.headers.get('cookie') || '')?.[1] ?? null;
export function getAdmin(request: Request): { id: number; username: string } | null {
	const token = tokenOf(request);
	if (!token) return null;
	const row = one('SELECT a.id, a.username, s.expires FROM sessions s JOIN admins a ON a.id = s.admin_id WHERE s.token_hash = ?', sha256(token));
	return row && row.expires > Date.now() ? { id: row.id, username: row.username } : null;
}
export function logout(request: Request) { const t = tokenOf(request); if (t) run('DELETE FROM sessions WHERE token_hash = ?', sha256(t)); }
export const isSecure = (request: Request) => request.headers.get('x-forwarded-proto') === 'https' || new URL(request.url).protocol === 'https:';
export const sessionCookie = (token: string, secure: boolean) => `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${WEEK / 1000}${secure ? '; Secure' : ''}`;
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
/** Bloqueia POSTs de outros sites: se houver Origin, ele precisa ser o mesmo host. */
export function sameOrigin(request: Request): boolean {
	const origin = request.headers.get('origin');
	if (!origin) return true;
	const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
	try { return new URL(origin).host === host; } catch { return false; }
}
export const listAdmins = () => all('SELECT id, username, created_at FROM admins ORDER BY id');
export const touch = now;
