import type { Route } from './+types/admin';
import { useCallback, useEffect, useState } from 'react';
import { categories, categoryLabel } from '@/lib/categories';
import { money } from '@/lib/format';

export function meta(_: Route.MetaArgs) { return [{ title: 'Painel — Aquelas Ofertas' }, { name: 'robots', content: 'noindex,nofollow' }]; }

async function call(op: string, body?: unknown) {
	const res = body === undefined ? await fetch(`/api/admin/${op}`) : await fetch(`/api/admin/${op}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
	const json = await res.json().catch(() => ({}));
	if (!res.ok) throw Object.assign(new Error(json.error || 'Erro'), { status: res.status });
	return json;
}
type Offer = { id: number; title: string; price: number | null; old_price: number | null; store: string | null; category: string; url: string; image: string | null; coupon: string | null; description: string | null; clicks: number; status: string };
const TABS: [string, string][] = [['nova', 'Novas'], ['fila', 'Na fila'], ['publicada', 'Publicadas'], ['rejeitada', 'Rejeitadas'], ['manual', '+ Oferta manual'], ['whatsapp', 'WhatsApp'], ['admins', 'Admins']];

export default function Admin() {
	const [admin, setAdmin] = useState<{ username: string } | null | undefined>(undefined);
	useEffect(() => { call('me').then(r => setAdmin(r.admin)).catch(() => setAdmin(null)); }, []);
	if (admin === undefined) return <main className="lp"><p className="muted pad">Carregando…</p></main>;
	return <main className="lp admin">{admin ? <Panel admin={admin} onExit={() => setAdmin(null)} /> : <Login onOk={u => setAdmin({ username: u })} />}</main>;
}

function Login({ onOk }: { onOk: (u: string) => void }) {
	const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
	return <form className="signup-card login" onSubmit={async e => { e.preventDefault(); setBusy(true); setErr(''); try { await call('login', { username: u, password: p }); onOk(u); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); } }}>
		<h2>Painel</h2><label htmlFor="a-u">Usuário</label><input id="a-u" autoComplete="username" value={u} onChange={e => setU(e.target.value)} /><label htmlFor="a-p">Senha</label><input id="a-p" type="password" autoComplete="current-password" value={p} onChange={e => setP(e.target.value)} />
		{err && <p className="form-error">{err}</p>}<button className="primary-button wide" disabled={busy || !u || !p}>Entrar</button></form>;
}

function Panel({ admin, onExit }: { admin: { username: string }; onExit: () => void }) {
	const [tab, setTab] = useState('nova'); const [stats, setStats] = useState<any>(null); const [editing, setEditing] = useState<Offer | null>(null); const [tick, setTick] = useState(0);
	const refresh = useCallback(() => { setTick(t => t + 1); call('stats').then(setStats).catch(e => { if (e.status === 401) onExit(); }); }, [onExit]);
	useEffect(refresh, [refresh]);
	const n = (s: string) => stats?.ofertas?.[s] ?? 0;
	return <>
		<div className="admin-top"><span>Olá, <b>{admin.username}</b></span><button className="ghost-button" onClick={async () => { await call('logout', {}); onExit(); }}>Sair</button></div>
		<div className="stat-row"><div><b>{stats?.ativos ?? 0}</b><span>inscritos ativos</span></div><div><b>{stats?.pendentes ?? 0}</b><span>pendentes</span></div><div><b>{stats?.saiu ?? 0}</b><span>saíram</span></div></div>
		<div className="tab-row" role="tablist">{TABS.map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => { setTab(id); setEditing(null); }}>{label}{['nova', 'fila'].includes(id) && n(id) ? ` (${n(id)})` : ''}</button>)}</div>
		{tab === 'manual' || editing ? <OfferForm key={editing?.id ?? 'novo'} initial={editing} onDone={() => { setEditing(null); setTab(editing ? editing.status : 'fila'); refresh(); }} /> : tab === 'whatsapp' ? <WhatsApp /> : tab === 'admins' ? <Admins me={admin.username} /> : <OfferList key={`${tab}-${tick}`} status={tab} onChange={refresh} onEdit={setEditing} />}
	</>;
}

function OfferList({ status, onChange, onEdit }: { status: string; onChange: () => void; onEdit: (o: Offer) => void }) {
	const [rows, setRows] = useState<Offer[] | null>(null); const [msg, setMsg] = useState('');
	useEffect(() => { call(`offers?status=${status}`).then(r => setRows(r.offers)).catch(e => setMsg(e.message)); }, [status]);
	const act = async (op: string, body: unknown, ok?: (r: any) => string) => { try { const r = await call(op, body); if (ok) setMsg(ok(r)); onChange(); } catch (e) { setMsg((e as Error).message); } };
	if (!rows) return <p className="muted pad">{msg || 'Carregando…'}</p>;
	return <div className="admin-list">
		{msg && <p className="form-msg">{msg}</p>}
		{status === 'fila' && rows.length > 0 && <button className="primary-button" onClick={() => confirm(`Publicar as ${rows.length} ofertas da fila e enviar para os inscritos?`) && act('publish-queue', {}, r => `${r.publicadas} publicada(s), ${r.enviados} mensagem(ns) na fila de envio.`)}>Publicar todas da fila</button>}
		{rows.length === 0 && <p className="muted pad">Nada aqui.</p>}
		{rows.map(o => <div className="admin-row" key={o.id}>
			<div className="admin-row-main"><b>{o.title}</b><span>{categoryLabel(o.category)}{o.store ? ` · ${o.store}` : ''}{o.price !== null ? ` · ${money(o.price)}` : ''}{status === 'publicada' ? ` · ${o.clicks} clique(s)` : ''}</span></div>
			<div className="admin-actions">
				{status === 'nova' && <button onClick={() => act('offer-status', { id: o.id, status: 'fila' })}>Aprovar</button>}
				{['nova', 'fila'].includes(status) && <button className="hot" onClick={() => confirm('Publicar agora e enviar para os inscritos dessa categoria?') && act('offer-status', { id: o.id, status: 'publicada' }, r => `Publicada. ${r.enviados ?? 0} mensagem(ns) na fila, ${r.ignorados ?? 0} ignorada(s) pelo limite diário.`)}>Publicar</button>}
				{status !== 'publicada' && <button onClick={() => onEdit(o)}>Editar</button>}
				{['nova', 'fila'].includes(status) && <button onClick={() => act('offer-status', { id: o.id, status: 'rejeitada' })}>Rejeitar</button>}
				{status === 'rejeitada' && <button onClick={() => act('offer-status', { id: o.id, status: 'nova' })}>Reabrir</button>}
				{status !== 'publicada' && <button className="danger" onClick={() => confirm('Apagar esta oferta?') && act('offer-delete', { id: o.id })}>Apagar</button>}
			</div>
		</div>)}
	</div>;
}

function OfferForm({ initial, onDone }: { initial: Offer | null; onDone: () => void }) {
	const [f, setF] = useState({ title: initial?.title ?? '', category: initial?.category ?? categories[0].id, price: initial?.price?.toString().replace('.', ',') ?? '', old_price: initial?.old_price?.toString().replace('.', ',') ?? '', store: initial?.store ?? '', coupon: initial?.coupon ?? '', url: initial?.url ?? '', image: initial?.image ?? '', description: initial?.description ?? '' });
	const [publishNow, setPublishNow] = useState(false); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
	const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF(v => ({ ...v, [k]: e.target.value }));
	return <form className="admin-form" onSubmit={async e => { e.preventDefault(); setBusy(true); setErr(''); try { await call('offer-save', { ...f, id: initial?.id, publishNow }); onDone(); } catch (x) { setErr((x as Error).message); } finally { setBusy(false); } }}>
		<h2>{initial ? 'Editar oferta' : 'Nova oferta manual'}</h2>
		<label>Título<input value={f.title} onChange={set('title')} maxLength={140} required /></label>
		<div className="two"><label>Categoria<select value={f.category} onChange={set('category')}>{categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label><label>Loja<input value={f.store} onChange={set('store')} maxLength={40} placeholder="Mercado Livre" /></label></div>
		<div className="two"><label>Preço (R$)<input value={f.price} onChange={set('price')} inputMode="decimal" placeholder="189,90" /></label><label>Preço antes (R$)<input value={f.old_price} onChange={set('old_price')} inputMode="decimal" placeholder="249,90" /></label></div>
		<label>Seu link de afiliado (https://)<input value={f.url} onChange={set('url')} required placeholder="https://meli.la/..." /></label>
		<label>Link da imagem (opcional)<input value={f.image} onChange={set('image')} placeholder="https://..." /></label>
		<div className="two"><label>Cupom (opcional)<input value={f.coupon} onChange={set('coupon')} maxLength={30} /></label><label>Descrição curta (opcional)<input value={f.description} onChange={set('description')} maxLength={300} /></label></div>
		{!initial || initial.status !== 'publicada' ? <label className="consent"><input type="checkbox" checked={publishNow} onChange={e => setPublishNow(e.target.checked)} /> <span>Publicar agora e enviar para os inscritos da categoria</span></label> : null}
		{err && <p className="form-error">{err}</p>}<button className="primary-button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button>
	</form>;
}

function WhatsApp() {
	const [info, setInfo] = useState<any>(null); const [msg, setMsg] = useState(''); const [phone, setPhone] = useState(''); const [s, setS] = useState({ max_per_day: 5, delay_min: 4, delay_max: 9 }); const [stamp, setStamp] = useState(Date.now());
	const load = useCallback(() => call('whatsapp').then(r => { setInfo(r); setS(r.settings); setStamp(Date.now()); }).catch(e => setMsg(e.message)), []);
	useEffect(() => { load(); }, [load]);
	const run = async (fn: () => Promise<any>, ok: string) => { setMsg(''); try { await fn(); setMsg(ok); load(); } catch (e) { setMsg((e as Error).message); } };
	if (!info) return <p className="muted pad">{msg || 'Carregando…'}</p>;
	const num = (k: keyof typeof s) => <input type="number" value={s[k]} onChange={e => setS(v => ({ ...v, [k]: Number(e.target.value) }))} />;
	return <div className="admin-wa">
		<div className="wa-status"><span className={`pill ${info.status === 'WORKING' ? 'ok' : 'warn'}`}>{info.status}</span><button onClick={load}>Atualizar</button>{info.configured && <button onClick={() => run(() => call('whatsapp-start', {}), 'Sessão iniciada. Atualize em alguns segundos.')}>Iniciar sessão</button>}</div>
		{!info.configured && <p className="form-error">Defina WAHA_URL (e WAHA_API_KEY) nas variáveis de ambiente do app.</p>}
		{info.error && <p className="form-error">{info.error}</p>}
		{info.status === 'SCAN_QR_CODE' && <div className="qr-box"><p>No celular: WhatsApp → Aparelhos conectados → Conectar aparelho, e leia o QR abaixo.</p><img src={`/api/admin/whatsapp-qr?t=${stamp}`} alt="QR code do WhatsApp" width="260" height="260" /></div>}
		<h3>Fila de envio</h3><p className="muted">Pendentes: {info.outbox.pendente ?? 0} · Enviadas: {info.outbox.enviada ?? 0} · Falhas: {info.outbox.falhou ?? 0}</p>
		{info.falhas.length > 0 && <ul className="fail-list">{info.falhas.map((f: any, i: number) => <li key={i}>{f.phone}: {f.error}</li>)}</ul>}
		<h3>Limites de envio</h3>
		<div className="two"><label>Máx. ofertas por pessoa por dia{num('max_per_day')}</label><label>Intervalo mínimo (s){num('delay_min')}</label><label>Intervalo máximo (s){num('delay_max')}</label></div>
		<button className="primary-button" onClick={() => run(() => call('settings-save', s), 'Limites salvos.')}>Salvar limites</button>
		<h3>Mensagem de teste</h3><div className="two"><input placeholder="(79) 99999-8888" value={phone} onChange={e => setPhone(e.target.value)} /><button className="primary-button" onClick={() => run(() => call('whatsapp-test', { phone }), 'Mensagem enviada.')}>Enviar teste</button></div>
		{msg && <p className="form-msg">{msg}</p>}
	</div>;
}

function Admins({ me }: { me: string }) {
	const [rows, setRows] = useState<any[]>([]); const [u, setU] = useState(''); const [p, setP] = useState(''); const [msg, setMsg] = useState('');
	const load = useCallback(() => call('admins').then(r => setRows(r.admins)).catch(e => setMsg(e.message)), []);
	useEffect(() => { load(); }, [load]);
	const act = async (op: string, body: unknown, ok: string) => { setMsg(''); try { await call(op, body); setMsg(ok); load(); } catch (e) { setMsg((e as Error).message); } };
	return <div className="admin-list">
		{rows.map(a => <div className="admin-row" key={a.id}><div className="admin-row-main"><b>{a.username}</b>{a.username === me && <span>você</span>}</div><div className="admin-actions"><button onClick={() => { const pw = prompt('Nova senha (mínimo 8 caracteres):'); if (pw) act('admin-password', { id: a.id, password: pw }, 'Senha alterada.'); }}>Trocar senha</button>{a.username !== me && <button className="danger" onClick={() => confirm(`Apagar o usuário ${a.username}?`) && act('admin-delete', { id: a.id }, 'Usuário apagado.')}>Apagar</button>}</div></div>)}
		<form className="admin-form" onSubmit={e => { e.preventDefault(); act('admin-add', { username: u, password: p }, 'Usuário criado.'); setU(''); setP(''); }}><h3>Novo administrador</h3><div className="two"><label>Usuário<input value={u} onChange={e => setU(e.target.value)} /></label><label>Senha<input type="password" autoComplete="new-password" value={p} onChange={e => setP(e.target.value)} /></label></div><button className="primary-button" disabled={!u || p.length < 8}>Criar</button></form>
		{msg && <p className="form-msg">{msg}</p>}
	</div>;
}
