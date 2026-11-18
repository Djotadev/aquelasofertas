import type { Route } from './+types/api.admin';
import { all, one, run, now, getSetting, setSetting, getText } from '@/lib/db.server';
import { parseSource, testSource, collectAll, loadFilters, validCategory } from '@/lib/collector.server';
import { loadAuto, publishRound } from '@/lib/scheduler.server';
import { shopeeConfigured } from '@/lib/shopee.server';
import { login, logout, getAdmin, isSecure, sessionCookie, clearCookie, sameOrigin, listAdmins } from '@/lib/auth.server';
import { hashPassword } from '@/lib/crypto.server';
import { allow, clientIp } from '@/lib/limits.server';
import { categoryIds } from '@/lib/categories';
import { normalizePhone } from '@/lib/phone';
import { startWorker } from '@/lib/queue.server';
import { publishOffer } from '@/lib/publish.server';
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
const publish = (id: number, request: Request) => publishOffer(id, baseUrl(request));

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
		case 'sources': return json({ sources: all('SELECT * FROM sources ORDER BY id').map(parseSource), credenciais: { shopee: shopeeConfigured(), ml: !!(process.env.ML_CLIENT_ID && process.env.ML_CLIENT_SECRET) } });
		case 'automation': {
			let last = null; try { last = JSON.parse(getText('last_run_info', 'null')); } catch { /* vazio */ }
			return json({ ...loadAuto(), filters: loadFilters(), max_per_day: getSetting('max_per_day', 5), last, publicUrl: !!process.env.PUBLIC_URL });
		}
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
		case 'source-save': {
			const name = String(b.name || '').trim();
			if (name.length < 2 || name.length > 40) return json({ error: 'Dê um nome à fonte (2 a 40 caracteres).' }, 400);
			if (!['shopee', 'ml_watch'].includes(b.type)) return json({ error: 'Tipo de fonte inválido.' }, 400);
			if (!validCategory(b.category)) return json({ error: 'Escolha uma categoria.' }, 400);
			const keyword = String(b.keyword || '').trim().slice(0, 60);
			if (b.type === 'shopee' && keyword.length < 2) return json({ error: 'Informe a palavra-chave da busca na Shopee.' }, 400);
			const config = JSON.stringify(b.type === 'shopee' ? { keyword, limit: Math.min(50, Math.max(1, Math.round(Number(b.limit)) || 20)), sortType: Math.min(5, Math.max(1, Math.round(Number(b.sortType)) || 2)) } : {});
			if (Number(b.id)) run('UPDATE sources SET name = ?, type = ?, category = ?, config = ? WHERE id = ?', name, b.type, b.category, config, Number(b.id));
			else run('INSERT INTO sources (name, type, category, config, created_at) VALUES (?, ?, ?, ?, ?)', name, b.type, b.category, config, now());
			return json({ ok: true });
		}
		case 'source-delete': run('DELETE FROM sources WHERE id = ?', Number(b.id)); return json({ ok: true });
		case 'source-toggle': run('UPDATE sources SET enabled = 1 - enabled WHERE id = ?', Number(b.id)); return json({ ok: true });
		case 'source-test': {
			const row = one('SELECT * FROM sources WHERE id = ?', Number(b.id));
			if (!row) return json({ error: 'Fonte não encontrada' }, 404);
			try { return json({ preview: await testSource(parseSource(row)) }); } catch (e) { return json({ error: (e as Error).message }, 502); }
		}
		case 'collect-now': return json({ ok: true, ...(await collectAll()) });
		case 'publish-round': return json({ ok: true, ...publishRound(Math.min(20, Math.max(1, Math.round(Number(b.count)) || 2)), baseUrl(request)) });
		case 'automation-save': {
			const hours = String(b.publish_hours || '').split(',').map((s: string) => s.trim()).filter(Boolean);
			const okHour = (h: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(h);
			if (!okHour(String(b.collect_hour)) || !hours.length || hours.length > 8 || !hours.every(okHour)) return json({ error: 'Horários no formato HH:MM, por exemplo 09:00,13:00,19:00 (até 8).' }, 400);
			const perSlot = Math.round(Number(b.per_slot)), disc = Number(b.min_discount), rating = Number(b.min_rating), sales = Math.round(Number(b.min_sales));
			if (!(perSlot >= 1 && perSlot <= 10) || !(disc >= 0 && disc <= 90) || !(rating >= 0 && rating <= 5) || !(sales >= 0)) return json({ error: 'Confira os números: 1 a 10 ofertas por horário, desconto 0 a 90, nota 0 a 5.' }, 400);
			const put = (k: string, v: string) => run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', k, v);
			put('auto_enabled', b.enabled ? '1' : '0'); put('auto_mode', b.mode === 'automatico' ? 'automatico' : 'revisar'); put('collect_hour', String(b.collect_hour)); put('publish_hours', hours.join(','));
			put('per_slot', String(perSlot)); put('min_discount', String(disc)); put('min_rating', String(rating)); put('min_sales', String(sales));
			return json({ ok: true });
		}
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
