import type { Route } from './+types/api.admin';
import { all, one, run, now, getSetting, setSetting } from '@/lib/db.server';
import { login, logout, getAdmin, isSecure, sessionCookie, clearCookie, sameOrigin, listAdmins } from '@/lib/auth.server';
import { hashPassword } from '@/lib/crypto.server';
import { allow, clientIp } from '@/lib/limits.server';
import { categoryIds } from '@/lib/categories';
import { normalizePhone } from '@/lib/phone';
import { enqueueOffer, startWorker } from '@/lib/queue.server';
import { sendText, sessionStatus, startSession, qrImage } from '@/lib/waha.server';

const json = (data: unknown, status = 200, headers?: HeadersInit) => Response.json(data, { status, headers });
const STATUSES = ['nova', 'fila', 'publicada', 'rejeitada'];
const baseUrl = (request: Request) => process.env.PUBLIC_URL?.replace(/\/+$/, '') || `${request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.replace(':', '')}://${request.headers.get('x-forwarded-host') || request.headers.get('host')}`;
const money = (v: unknown): number | null | 'erro' => { if (v === '' || v == null) return null; const n = Number(String(v).replace(/\./g, '').replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 'erro'; };
const httpsUrl = (v: unknown) => { try { const u = new URL(String(v)); return u.protocol === 'https:' ? u.href : null; } catch { return null; } };

function cleanOffer(b: any) {
	const title = String(b.title || '').trim();
	if (title.length < 3 || title.length > 140) return { error: 'O título precisa ter de 3 a 140 caracteres.' };
	if (!categoryIds.includes(b.category)) return { error: 'Escolha uma categoria.' };
	const url = httpsUrl(b.url);
	if (!url) return { error: 'O link da oferta precisa começar com https://' };
	const price = money(b.price), old = money(b.old_price);
	if (price === 'erro' || old === 'erro') return { error: 'Preço inválido.' };
	const image = b.image ? httpsUrl(b.image) : null;
	if (b.image && !image) return { error: 'A imagem precisa ser um link https://' };
	return { value: { title, category: b.category, url, price, old_price: old, image, store: String(b.store || '').trim().slice(0, 40) || null, coupon: String(b.coupon || '').trim().slice(0, 30) || null, description: String(b.description || '').trim().slice(0, 300) || null } };
}
function publish(id: number, request: Request) {
	const offer = one('SELECT * FROM offers WHERE id = ?', id);
	if (!offer) return { error: 'Oferta não encontrada' };
	if (offer.status === 'publicada') return { ok: true, enviados: 0, ignorados: 0, jaPublicada: true };
	run("UPDATE offers SET status = 'publicada', published_at = ? WHERE id = ?", now(), id);
	startWorker();
	return { ok: true, ...enqueueOffer({ ...offer, id }, baseUrl(request)) };
}

export async function loader({ request, params }: Route.LoaderArgs) {
	startWorker();
	const admin = getAdmin(request);
	if (params.op === 'me') return json({ admin });
	if (!admin) return json({ error: 'Não autenticado' }, 401);
	const url = new URL(request.url);
	switch (params.op) {
		case 'stats': {
			const s = one("SELECT SUM(status = 'ativo') AS ativos, SUM(status = 'pendente') AS pendentes, SUM(status = 'saiu') AS saiu FROM subscribers")!;
			const o = Object.fromEntries(all('SELECT status, COUNT(*) AS n FROM offers GROUP BY status').map(r => [r.status, r.n]));
			return json({ ativos: s.ativos || 0, pendentes: s.pendentes || 0, saiu: s.saiu || 0, ofertas: o });
		}
		case 'offers': {
			const status = url.searchParams.get('status') || 'nova';
			if (!STATUSES.includes(status)) return json({ error: 'Status inválido' }, 400);
			return json({ offers: all('SELECT * FROM offers WHERE status = ? ORDER BY id DESC LIMIT 200', status) });
		}
		case 'admins': return json({ admins: listAdmins() });
		case 'whatsapp': {
			const box = Object.fromEntries(all('SELECT status, COUNT(*) AS n FROM outbox GROUP BY status').map(r => [r.status, r.n]));
			return json({ ...(await sessionStatus()), settings: { max_per_day: getSetting('max_per_day', 5), delay_min: getSetting('delay_min', 4), delay_max: getSetting('delay_max', 9) }, outbox: box, falhas: all("SELECT phone, error, created_at FROM outbox WHERE status = 'falhou' ORDER BY id DESC LIMIT 5").map(f => ({ ...f, phone: f.phone.replace(/^(\d{4})\d+(\d{2})$/, '$1*****$2') })) });
		}
		case 'whatsapp-qr': {
			const qr = await qrImage();
			return qr ? new Response(qr.body, { headers: { 'content-type': qr.type, 'cache-control': 'no-store' } }) : json({ error: 'QR indisponível' }, 404);
		}
	}
	return json({ error: 'Não encontrado' }, 404);
}

export async function action({ request, params }: Route.ActionArgs) {
	startWorker();
	if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405);
	if (!sameOrigin(request)) return json({ error: 'Origem inválida' }, 403);
	let b: any = {};
	try { b = await request.json(); } catch { /* corpo vazio */ }
	if (params.op === 'login') {
		if (!allow(`login:${clientIp(request)}`, 10, 15 * 60_000)) return json({ error: 'Muitas tentativas. Aguarde alguns minutos.' }, 429);
		const token = login(b.username, b.password);
		return token ? json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(token, isSecure(request)) }) : json({ error: 'Usuário ou senha incorretos.' }, 401);
	}
	const admin = getAdmin(request);
	if (!admin) return json({ error: 'Não autenticado' }, 401);
	switch (params.op) {
		case 'logout': logout(request); return json({ ok: true }, 200, { 'Set-Cookie': clearCookie() });
		case 'offer-save': {
			const c = cleanOffer(b);
			if (!c.value) return json({ error: c.error }, 400);
			const v = c.value;
			let id = Number(b.id);
			if (id) run('UPDATE offers SET title=?, description=?, price=?, old_price=?, store=?, category=?, url=?, image=?, coupon=? WHERE id=?', v.title, v.description, v.price, v.old_price, v.store, v.category, v.url, v.image, v.coupon, id);
			else id = Number(run("INSERT INTO offers (title, description, price, old_price, store, category, url, image, coupon, status, source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'fila', 'manual', ?)", v.title, v.description, v.price, v.old_price, v.store, v.category, v.url, v.image, v.coupon, now()).lastInsertRowid);
			return json(b.publishNow ? publish(id, request) : { ok: true, id });
		}
		case 'offer-status': {
			const id = Number(b.id);
			if (!STATUSES.includes(b.status)) return json({ error: 'Status inválido' }, 400);
			if (b.status === 'publicada') { const r = publish(id, request); return json(r, 'error' in r ? 404 : 200); }
			run('UPDATE offers SET status = ? WHERE id = ? AND status != ?', b.status, id, 'publicada');
			return json({ ok: true });
		}
		case 'offer-delete': run('DELETE FROM offers WHERE id = ?', Number(b.id)); return json({ ok: true });
		case 'publish-queue': {
			let n = 0, enviados = 0;
			for (const o of all("SELECT id FROM offers WHERE status = 'fila' ORDER BY id")) { const r: any = publish(o.id, request); n++; enviados += r.enviados || 0; }
			return json({ ok: true, publicadas: n, enviados });
		}
		case 'admin-add': {
			const username = String(b.username || '').trim(), password = String(b.password || '');
			if (!/^[a-zA-Z0-9._-]{3,30}$/.test(username)) return json({ error: 'Usuário: 3 a 30 letras, números, ponto, hífen ou underline.' }, 400);
			if (password.length < 8) return json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400);
			if (one('SELECT id FROM admins WHERE username = ?', username)) return json({ error: 'Esse usuário já existe.' }, 400);
			run('INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)', username, hashPassword(password), now());
			return json({ ok: true });
		}
		case 'admin-delete': {
			const id = Number(b.id);
			if (id === admin.id) return json({ error: 'Você não pode apagar o seu próprio usuário.' }, 400);
			run('DELETE FROM sessions WHERE admin_id = ?', id); run('DELETE FROM admins WHERE id = ?', id);
			return json({ ok: true });
		}
		case 'admin-password': {
			const password = String(b.password || '');
			if (password.length < 8) return json({ error: 'A senha precisa ter pelo menos 8 caracteres.' }, 400);
			const id = Number(b.id);
			run('UPDATE admins SET password_hash = ? WHERE id = ?', hashPassword(password), id);
			if (id !== admin.id) run('DELETE FROM sessions WHERE admin_id = ?', id);
			return json({ ok: true });
		}
		case 'whatsapp-start':
			try { return json({ ok: true, resultado: await startSession() }); } catch (e) { return json({ error: (e as Error).message }, 502); }
		case 'whatsapp-test': {
			const phone = normalizePhone(b.phone);
			if (!phone) return json({ error: 'Número inválido.' }, 400);
			try { await sendText(phone, String(b.text || 'Teste da Aquelas Ofertas ✅').slice(0, 500)); return json({ ok: true }); } catch (e) { return json({ error: (e as Error).message }, 502); }
		}
		case 'settings-save': {
			const max = Math.round(Number(b.max_per_day)), min = Math.round(Number(b.delay_min)), hi = Math.round(Number(b.delay_max));
			if (!(max >= 1 && max <= 20) || !(min >= 1 && min <= 60) || !(hi >= min && hi <= 120)) return json({ error: 'Valores fora do limite (máx. 1–20 por dia, intervalo de 1–60 s até 120 s).' }, 400);
			setSetting('max_per_day', max); setSetting('delay_min', min); setSetting('delay_max', hi);
			return json({ ok: true });
		}
	}
	return json({ error: 'Não encontrado' }, 404);
}
