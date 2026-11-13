/** Normaliza um celular brasileiro para 55 + DDD + número (11 dígitos). Retorna null se inválido. */
export function normalizePhone(input: string): string | null {
	let d = String(input || '').replace(/\D/g, '');
	if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
	d = d.replace(/^0+/, '');
	if (d.length !== 11) return null;
	if (!/^[1-9][1-9]9/.test(d)) return null;
	return '55' + d;
}
