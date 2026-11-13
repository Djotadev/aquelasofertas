/** Cliente do WAHA (WhatsApp HTTP API). Variáveis: WAHA_URL, WAHA_API_KEY, WAHA_SESSION. */
const base = () => (process.env.WAHA_URL || '').replace(/\/+$/, '');
const session = () => process.env.WAHA_SESSION || 'default';
const headers = () => ({ 'content-type': 'application/json', accept: 'application/json', ...(process.env.WAHA_API_KEY ? { 'X-Api-Key': process.env.WAHA_API_KEY } : {}) });
export const wahaConfigured = () => !!base();

export async function sendText(phone: string, text: string): Promise<void> {
	if (!wahaConfigured()) throw new Error('WAHA_URL não configurado');
	const res = await fetch(`${base()}/api/sendText`, { method: 'POST', headers: headers(), body: JSON.stringify({ session: session(), chatId: `${phone}@c.us`, text }), signal: AbortSignal.timeout(15000) });
	if (!res.ok) throw new Error(`WAHA respondeu ${res.status}: ${(await res.text()).slice(0, 160)}`);
}
export async function sessionStatus(): Promise<{ configured: boolean; status: string; error?: string }> {
	if (!wahaConfigured()) return { configured: false, status: 'NAO_CONFIGURADO' };
	try {
		const res = await fetch(`${base()}/api/sessions/${session()}`, { headers: headers(), signal: AbortSignal.timeout(8000) });
		if (res.status === 404) return { configured: true, status: 'SEM_SESSAO' };
		if (!res.ok) return { configured: true, status: 'ERRO', error: `HTTP ${res.status}` };
		const json: any = await res.json();
		return { configured: true, status: String(json.status || 'DESCONHECIDO') };
	} catch (error) {
		return { configured: true, status: 'INACESSIVEL', error: String((error as Error).message) };
	}
}
export async function startSession(): Promise<string> {
	const res = await fetch(`${base()}/api/sessions/${session()}/start`, { method: 'POST', headers: headers(), signal: AbortSignal.timeout(15000) });
	if (res.ok) return 'iniciada';
	// Sessão ainda não existe: cria e inicia.
	const created = await fetch(`${base()}/api/sessions`, { method: 'POST', headers: headers(), body: JSON.stringify({ name: session(), start: true }), signal: AbortSignal.timeout(15000) });
	if (!created.ok) throw new Error(`WAHA respondeu ${created.status}`);
	return 'criada';
}
export async function qrImage(): Promise<{ type: string; body: ArrayBuffer } | null> {
	for (const url of [`${base()}/api/${session()}/auth/qr?format=image`, `${base()}/api/screenshot?session=${session()}`]) {
		try {
			const res = await fetch(url, { headers: { ...(process.env.WAHA_API_KEY ? { 'X-Api-Key': process.env.WAHA_API_KEY } : {}), accept: 'image/png' }, signal: AbortSignal.timeout(10000) });
			const type = res.headers.get('content-type') || '';
			if (res.ok && type.startsWith('image/')) return { type, body: await res.arrayBuffer() };
		} catch { /* tenta o próximo */ }
	}
	return null;
}
