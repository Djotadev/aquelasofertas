import type { Route } from './+types/api.confirmar';
import { one, run, now } from '@/lib/db.server';
import { normalizePhone } from '@/lib/phone';
import { codeHash, safeEqual } from '@/lib/crypto.server';
import { allow } from '@/lib/limits.server';
import { sameOrigin } from '@/lib/auth.server';
import { welcomeText } from '@/lib/messages.server';
import { enqueueSystem, startWorker } from '@/lib/queue.server';

const reply = (data: unknown, status = 200) => Response.json(data, { status });

export async function action({ request }: Route.ActionArgs) {
	if (request.method !== 'POST') return reply({ error: 'Método não permitido' }, 405);
	if (!sameOrigin(request)) return reply({ error: 'Origem inválida' }, 403);
	let body: any;
	try { body = await request.json(); } catch { return reply({ error: 'Dados inválidos' }, 400); }
	const phone = normalizePhone(body.phone);
	const code = String(body.code || '').replace(/\D/g, '');
	if (!phone || code.length !== 6) return reply({ error: 'Digite o código de 6 dígitos.' }, 400);
	if (!allow(`cf:${phone}`, 12, 3_600_000)) return reply({ error: 'Muitas tentativas. Peça um novo código mais tarde.' }, 429);
	const sub = one('SELECT * FROM subscribers WHERE phone = ?', phone);
	if (!sub?.code_hash || sub.code_expires < Date.now()) return reply({ error: 'Código expirado. Peça um novo código.' }, 400);
	if (sub.code_attempts >= 5) return reply({ error: 'Muitas tentativas erradas. Peça um novo código.' }, 429);
	if (!safeEqual(codeHash(phone, code), sub.code_hash)) {
		run('UPDATE subscribers SET code_attempts = code_attempts + 1 WHERE id = ?', sub.id);
		return reply({ error: 'Código incorreto. Confira e tente de novo.' }, 400);
	}
	let cats: string[] = [];
	try { cats = JSON.parse(sub.pending_categories || sub.categories); } catch { /* vazio */ }
	run("UPDATE subscribers SET status = 'ativo', categories = ?, name = COALESCE(?, name), pending_categories = NULL, pending_name = NULL, code_hash = NULL, code_expires = NULL, code_attempts = 0, confirmed_at = ?, left_at = NULL WHERE id = ?", JSON.stringify(cats), sub.pending_name ?? null, now(), sub.id);
	enqueueSystem(phone, welcomeText(cats), sub.id);
	startWorker();
	return reply({ ok: true });
}
