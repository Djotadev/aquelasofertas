import { NavLink, Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
export function SiteHeader() {
 return <><div className="top-note">Guias e dicas para comprar melhor. <a href="/go/mercadolivre" target="_blank" rel="sponsored noopener"><span>Ver ofertas no Mercado Livre <ArrowUpRight size={12}/></span></a></div><header className="site-header"><Link to="/" className="brand"><img src="/logo.png" alt="Aquelas Orfetas" className="brand-logo" width="52" height="52"/><span className="brand-name">Aquelas <b>Orfetas</b></span></Link><nav aria-label="Navegação principal"><NavLink to="/" end>Início</NavLink><NavLink to="/tecnologia">Tecnologia</NavLink><NavLink to="/fitness">Fitness</NavLink><NavLink to="/casa">Casa</NavLink><NavLink to="/sobre">Sobre</NavLink></nav><Link to="/#posts" className="header-cta">Ler o blog <ArrowUpRight size={16}/></Link></header></>;
}
