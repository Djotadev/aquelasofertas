import { one, run, now } from './db.server';
import { enqueueOffer, startWorker } from './queue.server';

/** Marca a oferta como publicada e coloca o envio na fila dos inscritos da categoria. */
export function publishOffer(id: number, baseUrl: string): Record<string, any> {
	const offer = one('SELECT * FROM offers WHERE id = ?', id);
	if (!offer) return { error: 'Oferta não encontrada' };
	if (offer.status === 'publicada') return { ok: true, enviados: 0, ignorados: 0, jaPublicada: true };
	run("UPDATE offers SET status = 'publicada', published_at = ? WHERE id = ?", now(), id);
	startWorker();
	return { ok: true, ...enqueueOffer({ ...offer, id }, baseUrl) };
}
