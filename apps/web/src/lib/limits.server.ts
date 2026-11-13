const buckets = new Map<string, number[]>();
/** Retorna true se ainda está dentro do limite (e registra a tentativa). */
export function allow(key: string, max: number, windowMs: number): boolean {
	const now = Date.now();
	const list = (buckets.get(key) ?? []).filter(t => now - t < windowMs);
	if (list.length >= max) { buckets.set(key, list); return false; }
	list.push(now);
	buckets.set(key, list);
	if (buckets.size > 5000) for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
	return true;
}
export const clientIp = (request: Request) => request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
