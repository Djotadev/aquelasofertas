import { useState } from 'react';
import { categories } from '@/lib/categories';

const mask = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 11); if (d.length <= 2) return d ? `(${d}` : ''; if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`; return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`; };
async function post(url: string, body: unknown) {
	const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
	const json = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(json.error || 'Algo deu errado. Tente de novo.');
	return json;
}
export function SignupForm() {
	const [step, setStep] = useState<'form' | 'code' | 'done'>('form');
	const [phone, setPhone] = useState(''); const [name, setName] = useState(''); const [cats, setCats] = useState<string[]>([]);
	const [consent, setConsent] = useState(false); const [code, setCode] = useState(''); const [trap, setTrap] = useState('');
	const [busy, setBusy] = useState(false); const [error, setError] = useState('');
	const ready = phone.replace(/\D/g, '').length === 11 && cats.length > 0 && consent;
	const toggle = (id: string) => setCats(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]));
	async function send(e: React.FormEvent) {
		e.preventDefault(); setBusy(true); setError('');
		try { await post('/api/inscrever', { phone, name, categories: cats, consent, website: trap }); setStep('code'); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
	}
	async function confirm(e: React.FormEvent) {
		e.preventDefault(); setBusy(true); setError('');
		try { await post('/api/confirmar', { phone, code }); setStep('done'); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
	}
	return <div className="signup-card" id="cadastro">
		{step === 'form' && <form onSubmit={send} noValidate>
			<h2>Receba as ofertas no WhatsApp</h2><p className="muted">Grátis. Só as categorias que você escolher.</p>
			<label htmlFor="su-phone">WhatsApp</label>
			<input id="su-phone" inputMode="tel" autoComplete="tel" placeholder="(79) 99999-8888" value={phone} onChange={e => setPhone(mask(e.target.value))} />
			<label htmlFor="su-name">Seu nome <small>(opcional)</small></label>
			<input id="su-name" autoComplete="given-name" maxLength={60} value={name} onChange={e => setName(e.target.value)} />
			<input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" name="website" value={trap} onChange={e => setTrap(e.target.value)} />
			<span className="label">O que você quer receber?</span>
			<div className="chips" role="group" aria-label="Categorias">{categories.map(c => <button type="button" key={c.id} aria-pressed={cats.includes(c.id)} className={cats.includes(c.id) ? 'on' : ''} onClick={() => toggle(c.id)}>{c.label}</button>)}</div>
			<label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> <span>Aceito receber ofertas pelo WhatsApp e concordo com os <a href="/termos" target="_blank">termos e a política de privacidade</a>.</span></label>
			{error && <p className="form-error" role="alert">{error}</p>}
			<button className="primary-button wide" disabled={!ready || busy}>{busy ? 'Enviando…' : 'Receber código no WhatsApp'}</button>
		</form>}
		{step === 'code' && <form onSubmit={confirm} noValidate>
			<h2>Digite o código</h2><p className="muted">Enviamos um código de 6 dígitos para o WhatsApp {phone}. Ele vale por 10 minutos.</p>
			<label htmlFor="su-code">Código</label>
			<input id="su-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
			{error && <p className="form-error" role="alert">{error}</p>}
			<button className="primary-button wide" disabled={code.length !== 6 || busy}>{busy ? 'Confirmando…' : 'Confirmar cadastro'}</button>
			<button type="button" className="link-button" onClick={() => { setStep('form'); setCode(''); setError(''); }}>Corrigir o número</button>
		</form>}
		{step === 'done' && <div className="signup-done"><h2>Tudo certo! ✅</h2><p>Você vai receber as ofertas das categorias escolhidas direto no WhatsApp. Para parar, é só responder <b>SAIR</b>.</p></div>}
	</div>;
}
