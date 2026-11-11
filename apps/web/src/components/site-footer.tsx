import { Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
import { openCookiePreferences } from '@/lib/cookie-consent';
import { disclosure, updatedAt } from '@/lib/posts';
export function SiteFooter(){return <footer className="site-footer"><div className="footer-top"><div><Link to="/" className="brand"><img src="/logo.png" alt="Aquelas Orfetas" className="brand-logo" width="52" height="52"/><span className="brand-name">Aquelas <b>Orfetas</b></span></Link><p>Boas escolhas. Bons preços.</p></div><div className="footer-links"><Link to="/sobre">Sobre nós <ArrowUpRight size={14}/></Link><Link to="/aviso-de-afiliados">Aviso de afiliados <ArrowUpRight size={14}/></Link><button onClick={openCookiePreferences}>Configurações de cookies</button></div></div><p className="affiliate-notice">{disclosure}</p><div className="footer-bottom"><span>© 2026 Aquelas Orfetas. Feito para economizar.</span><span>Conteúdo atualizado em {updatedAt}</span></div></footer>}
