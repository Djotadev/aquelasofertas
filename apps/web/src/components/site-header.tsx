import { NavLink, Link } from 'react-router';
import { ArrowUpRight } from 'lucide-react';
export function SiteHeader() {
 return <><div className="top-note">Ofertas e cupons garimpados todo dia. <a href="/#cadastro"><span>Receber no WhatsApp <ArrowUpRight size={12}/></span></a></div><header className="site-header"><Link to="/" className="brand"><img src="/logo.png" alt="Aquelas Ofertas" className="brand-logo" width="52" height="52"/><span className="brand-name">Aquelas <b>Ofertas</b></span></Link><nav aria-label="Navegação principal"><NavLink to="/" end>Início</NavLink><NavLink to="/ofertas">Ofertas</NavLink><NavLink to="/guias">Guias</NavLink><NavLink to="/sobre">Sobre</NavLink></nav><Link to="/#cadastro" className="header-cta">Cadastre-se <ArrowUpRight size={16}/></Link></header></>;
}
