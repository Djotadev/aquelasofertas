import { all, one, run, now, getSetting } from './db.server';
import { sendText, wahaConfigured } from './waha.server';
import { offerText } from './messages.server';

let started: boolean = (globalThis as any).__aqWorker ?? false;
let nextOfferAt = 0;
let busy = false;

/** Dia atual em Brasília (UTC-3), usado para o limite diário de mensagens por pessoa. */
const dayStart = () => { const d = new Date(Date.now() - 3 * 3600 * 1000); d.setUTCHours(0, 0, 0, 0); return new Date(d.getTime() + 3 * 3600 * 1000).toISOString(); };

export function enqueueSystem(phone: string, text: string, subscriberId?: number) {
	run('INSERT INTO outbox (subscriber_id, phone, kind, text, created_at) VALUES (?, ?, ?, ?, ?)', subscriberId ?? null, phone, 'sistema', text, now());
}
/** Coloca a oferta na fila de envio de cada inscrito ativo que escolheu a categoria, respeitando o limite diário. */
export function enqueueOffer(offer: Record<string, any>, baseUrl: string): { enviados: number; ignorados: number } {
	const max = getSetting('max_per_day', 5);
	const since = dayStart();
	const text = offerText(offer, baseUrl);
	let enviados = 0, ignorados = 0;
	for (const sub of all("SELECT id, phone, categories FROM subscribers WHERE status = 'ativo'")) {
		let cats: string[] = [];
		try { cats = JSON.parse(sub.categories); } catch { /* vazio */ }
		if (!cats.includes(offer.category)) continue;
		const today = one("SELECT COUNT(*) AS n FROM outbox WHERE subscriber_id = ? AND kind = 'oferta' AND created_at >= ?", sub.id, since)!.n as number;
		if (today >= max) { ignorados++; continue; }
		run('INSERT INTO outbox (subscriber_id, phone, kind, text, offer_id, created_at) VALUES (?, ?, ?, ?, ?, ?)', sub.id, sub.phone, 'oferta', text, offer.id, now());
		enviados++;
	}
	return { enviados, ignorados };
}

async function tick(): Promise<boolean> {
	if (busy) return false;
	busy = true;
	try {
		const row = one("SELECT * FROM outbox WHERE status = 'pendente' AND send_after <= ? AND (kind = 'sistema' OR ? >= ?) ORDER BY (kind = 'sistema') DESC, id LIMIT 1", Date.now(), Date.now(), nextOfferAt);
		if (!row) return false;
		const still = row.kind === 'oferta' ? one("SELECT status FROM subscribers WHERE id = ?", row.subscriber_id) : null;
		if (row.kind === 'oferta' && still?.status !== 'ativo') { run("UPDATE outbox SET status = 'cancelada' WHERE id = ?", row.id); return true; }
		if (!wahaConfigured()) { run("UPDATE outbox SET status = 'falhou', error = ? WHERE id = ?", 'WAHA_URL não configurado', row.id); return true; }
		try {
			await sendText(row.phone, row.text);
			run("UPDATE outbox SET status = 'enviada', sent_at = ?, attempts = attempts + 1 WHERE id = ?", now(), row.id);
			if (row.kind === 'oferta') {
				const min = getSetting('delay_min', 4), max = Math.max(min, getSetting('delay_max', 9));
				nextOfferAt = Date.now() + (min + Math.random() * (max - min)) * 1000;
			}
		} catch (error) {
			const attempts = row.attempts + 1;
			run('UPDATE outbox SET attempts = ?, error = ?, status = ?, send_after = ? WHERE id = ?', attempts, String((error as Error).message).slice(0, 240), attempts >= 3 ? 'falhou' : 'pendente', Date.now() + 30_000 * attempts, row.id);
		}
		return true;
	} finally { busy = false; }
}
export function startWorker() {
	if (started) return;
	started = true;
	(globalThis as any).__aqWorker = true;
	const loop = () => { tick().then(worked => setTimeout(loop, worked ? 300 : 2000)).catch(e => { console.error('[fila]', e); setTimeout(loop, 5000); }); };
	setTimeout(loop, 1000);
}
