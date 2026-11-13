import { redirect } from 'react-router';
import type { Route } from './+types/go.offer';
import { one, run } from '@/lib/db.server';

export function loader({ params }: Route.LoaderArgs) {
	const offer = one("SELECT id, url, status FROM offers WHERE id = ? AND status IN ('publicada', 'fila')", Number(params.id));
	if (!offer) throw new Response('Oferta não encontrada', { status: 404 });
	let destination: URL;
	try { destination = new URL(offer.url); } catch { throw new Response('Link indisponível', { status: 400 }); }
	if (destination.protocol !== 'https:') throw new Response('Link indisponível', { status: 400 });
	run('UPDATE offers SET clicks = clicks + 1 WHERE id = ?', offer.id);
	return redirect(destination.href, 302);
}
