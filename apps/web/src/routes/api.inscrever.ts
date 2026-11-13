import type { Route } from './+types/api.inscrever';
import { one, run, now } from '@/lib/db.server';
import { categoryIds } from '@/lib/categories';
import { normalizePhone } from '@/lib/phone';
import { randomCode, codeHash } from '@/lib/crypto.server';
import { allow, clientIp } from '@/lib/limits.server';
import { sameOrigin } from '@/lib/auth.server';
import { sendText } from '@/lib/waha.server';
import { codeText } from '@/lib/messages.server';

const reply = (data: unknown, status = 200) => Response.json(data, { status });

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') return reply({ error: 'Método não permitido' }, 405);
	if (!sameOrigin(request)) return reply({ error: 'Origem inválida' }, 403);
	let body: any;
	try { body = await request.json(); } catch { return reply({ error: 'Dados inválidos' }, 400); }
	if (body.website) return reply({ ok: true }); // campo-isca contra robôs
	const phone = normalizePhone(body.phone);
	if (!phone) return reply({ error: 'Digite o WhatsApp com DDD e 9 dígitos. Ex.: (79) 99999-8888' }, 400);
	const cats = [...new Set<string>((Array.isArray(body.categories) ? body.categories : []).filter((c: unknown) => typeof c === 'string' && categoryIds.includes(c)))];
	if (!cats.length) return reply({ error: 'Escolha pelo menos uma categoria.' }, 400);
	if (body.consent !== true) return reply({ error: 'Para receber ofertas, aceite os termos e a política de privacidade.' }, 400);
	const name = String(body.name || '').replace(/[\r\n]+/g, ' ').trim().slice(0, 60) || null;
	if (!allow(`ip:${clientIp(request)}`, 8, 3_600_000) || !allow(`ph:${phone}`, 3, 3_600_000)) return reply({ error: 'Muitas tentativas. Tente de novo mais tarde.' }, 429);

	const code = randomCode();
	const expires = Date.now() + 10 * 60_000;
	const existing = one('SELECT id FROM subscribers WHERE phone = ?', phone);
	if (existing) run('UPDATE subscribers SET pending_name = ?, pending_categories = ?, code_hash = ?, code_expires = ?, code_attempts = 0, consent_at = ? WHERE id = ?', name, JSON.stringify(cats), codeHash(phone, code), expires, now(), existing.id);
	else run("INSERT INTO subscribers (phone, pending_name, pending_categories, status, code_hash, code_expires, consent_at, created_at) VALUES (?, ?, ?, 'pendente', ?, ?, ?, ?)", phone, name, JSON.stringify(cats), codeHash(phone, code), expires, now(), now());
	try {
		await sendText(phone, codeText(code));
	} catch (error) {
		console.error('[inscrever] falha ao enviar o código:', (error as Error).message);
		return reply({ error: 'Não conseguimos enviar o código agora. Confira o número e tente de novo em instantes.' }, 502);
	}
	return reply({ ok: true });
}
