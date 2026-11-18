import { all, run, now, getText, getSetting } from './db.server';
import { collectAll } from './collector.server';
import { publishOffer } from './publish.server';

export type Auto = { enabled: boolean; mode: 'revisar' | 'automatico'; collect_hour: string; publish_hours: string[]; per_slot: number };
export const loadAuto = (): Auto => ({
	enabled: getText('auto_enabled', '0') === '1', mode: getText('auto_mode', 'revisar') === 'automatico' ? 'automatico' : 'revisar',
	collect_hour: getText('collect_hour', '06:00'), publish_hours: getText('publish_hours', '09:00,13:00,19:00').split(',').map(s => s.trim()).filter(Boolean), per_slot: getSetting('per_slot', 2),
});
/** Hora de Brasília (UTC-3). */
export const brNow = (d = new Date()) => { const x = new Date(d.getTime() - 3 * 3600 * 1000).toISOString(); return { day: x.slice(0, 10), hm: x.slice(11, 16) }; };
const minutes = (hm: string) => Number(hm.slice(0, 2)) * 60 + Number(hm.slice(3, 5));

/** Decide o que está na hora de fazer. Um horário perdido só é recuperado se passou menos de 3 horas. */
export function dueWork(n: { day: string; hm: string }, auto: Auto, state: { lastCollectDay: string; doneSlots: string[] }) {
	if (!auto.enabled) return { collect: false, slots: [] as string[] };
	const collect = n.hm >= auto.collect_hour && state.lastCollectDay !== n.day;
	const slots = auto.publish_hours.filter(h => n.hm >= h && minutes(n.hm) - minutes(h) <= 180 && !state.doneSlots.includes(`${n.day} ${h}`));
	return { collect, slots };
}
export function publishRound(count: number, baseUrl: string) {
	const rows = all("SELECT id FROM offers WHERE status = 'fila' ORDER BY score DESC, id LIMIT ?", Math.max(1, count));
	let enviados = 0;
	for (const r of rows) enviados += Number(publishOffer(r.id, baseUrl).enviados || 0);
	return { publicadas: rows.length, enviados };
}
const save = (key: string, value: string) => run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
export const saveRunInfo = (info: Record<string, unknown>) => save('last_run_info', JSON.stringify({ at: now(), ...info }));

export async function runCycle(): Promise<void> {
	const n = brNow(); const auto = loadAuto();
	let doneSlots: string[] = []; try { doneSlots = JSON.parse(getText('done_slots', '[]')); } catch { /* vazio */ }
	doneSlots = doneSlots.filter(s => s.startsWith(n.day));
	const due = dueWork(n, auto, { lastCollectDay: getText('last_collect_day', ''), doneSlots });
	if (!due.collect && !due.slots.length) return;
	const info: Record<string, unknown> = {};
	if (due.collect) {
		save('last_collect_day', n.day);
		const r = await collectAll();
		Object.assign(info, { coletadas_novas: r.novas, coletadas_fila: r.fila, erros: r.erros });
	}
	if (due.slots.length) {
		const baseUrl = process.env.PUBLIC_URL?.replace(/\/+$/, '');
		for (const h of due.slots) doneSlots.push(`${n.day} ${h}`);
		save('done_slots', JSON.stringify(doneSlots));
		if (!baseUrl) info.erro = 'PUBLIC_URL não configurado: nada foi publicado';
		else Object.assign(info, publishRound(auto.per_slot * due.slots.length, baseUrl));
	}
	saveRunInfo(info);
}
let started: boolean = (globalThis as any).__aqScheduler ?? false;
export function startScheduler() {
	if (started) return;
	started = true; (globalThis as any).__aqScheduler = true;
	setInterval(() => { runCycle().catch(e => console.error('[automação]', e)); }, 60_000).unref?.();
}
