import type { Route } from './+types/api.waha.webhook';
import { one, run, now } from '@/lib/db.server';
import { safeEqual } from '@/lib/crypto.server';
import { leftText } from '@/lib/messages.server';
import { enqueueSystem, startWorker } from '@/lib/queue.server';

const STOP_WORDS = ['sair', 'parar', 'cancelar', 'stop', 'descadastrar', 'remover'];

/** Recebe mensagens do WAHA. Quem responde SAIR deixa de receber ofertas. */
export async function action({ request }: Route.ActionArgs) {
	const expected = process.env.WAHA_WEBHOOK_TOKEN;
	const token = new URL(request.url).searchParams.get('token') || '';
	if (!expected) return Response.json({ error: 'WAHA_WEBHOOK_TOKEN não configurado' }, { status: 503 });
	if (!safeEqual(token, expected)) return Response.json({ error: 'Token inválido' }, { status: 401 });
	let body: any;
	try { body = await request.json(); } catch { return Response.json({ ok: true }); }
	const payload = body?.payload;
	if (body?.event !== 'message' || !payload || payload.fromMe) return Response.json({ ok: true });
	const match = /^(\d+)@c\.us$/.exec(String(payload.from || ''));
	if (!match) { console.log('[webhook] remetente sem número (ex.: @lid), ignorado'); return Response.json({ ok: true }); }
	const text = String(payload.body || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
	if (!STOP_WORDS.includes(text)) return Response.json({ ok: true });
	const sub = one('SELECT id, status FROM subscribers WHERE phone = ?', match[1]);
	if (sub && sub.status === 'ativo') {
		run("UPDATE subscribers SET status = 'saiu', left_at = ? WHERE id = ?", now(), sub.id);
		run("UPDATE outbox SET status = 'cancelada' WHERE subscriber_id = ? AND status = 'pendente' AND kind = 'oferta'", sub.id);
		enqueueSystem(match[1], leftText(), sub.id);
		startWorker();
	}
	return Response.json({ ok: true });
}
