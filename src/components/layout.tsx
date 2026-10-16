import { useT } from '@/lib/i18n';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Search,
  ArrowUpRight,
  Globe2,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  MessageSquare,
  MapPin,
  MoveUpRight,
} from 'lucide-react';
import { useLocale } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';
import { Button } from './ui/button';
export function Brand() {
  const tr = useT();
  return (
    <Link to="/" className="brand" aria-label={tr('Paikari home')}>
      <span className="brand-icon">
        <MoveUpRight size={25} />
      </span>
      paikari<span className="brand-dot">.</span>
    </Link>
  );
}
export function Layout({ children }: { children: React.ReactNode }) {
  const tr = useT();
  const { t, toggle } = useLocale();
  const { session } = useAuth();
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  return (
    <>
      <a href="#main" className="skip-link">
        {tr('Skip to content')}
      </a>
      <div className="topbar">
        <div className="container">
          <span>
            <MapPin size={12} />
            {tr('Connecting businesses across Bangladesh')}
          </span>
          <span>
            {tr('Source local. Grow together.')}
            <span className="topbar-separator">{'|'}</span>{' '}
            <Link to="/info/support">
              {tr('Need help?')}
              <ArrowUpRight size={12} />
            </Link>
          </span>
        </div>
      </div>
      <header className="site-header">
        <div className="container header-main">
          <Brand />
          <form
            className="header-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/products?q=${encodeURIComponent(q)}`);
            }}
          >
            <Search size={19} />
            <input
              aria-label={t.search}
              placeholder={t.search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button type="submit">{t.searchButton}</button>
          </form>
          <div className="header-actions">
            <button className="language" onClick={toggle}>
              <Globe2 size={16} />
              {t.language}
            </button>
            {session ? (
              <Button asChild size="sm">
                <Link to="/dashboard">
                  {t.dashboard}
                  <ArrowUpRight size={14} />
                </Link>
              </Button>
            ) : (
              <>
                <Link className="signin" to="/auth/login">
                  {t.signin}
                </Link>
                <Button asChild size="sm">
                  <Link to="/auth/register">
                    {t.join}
                    <ArrowUpRight size={14} />
                  </Link>
                </Button>
              </>
            )}
          </div>
          <button
            className="mobile-menu"
            aria-label={tr('Toggle navigation')}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        <div className={`nav-row ${menu ? 'open' : ''}`}>
          <nav className="container" aria-label={tr('Main navigation')}>
            <Link to="/products" className="category-nav" onClick={() => setMenu(false)}>
              <Menu size={17} />
              {t.categories}
              <ChevronDown size={13} />
            </Link>
            <NavLink to="/products" onClick={() => setMenu(false)}>
              {t.products}
            </NavLink>
            <NavLink to="/suppliers" onClick={() => setMenu(false)}>
              {t.suppliers}
            </NavLink>
            <Link to="/products?sort=newest" onClick={() => setMenu(false)}>
              {t.newArrivals}
            </Link>
            <Link to="/products?sort=price-asc" onClick={() => setMenu(false)}>
              {tr('Wholesale deals')}
              <span className="new-pill">{tr('NEW')}</span>
            </Link>
            <Link to="/dashboard/business" className="nav-sell" onClick={() => setMenu(false)}>
              {t.sell}
              <ArrowUpRight size={15} />
            </Link>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <Brand />
            <p>{t.footer}</p>
            <span className="footer-made">
              {tr('Proudly built for Bangladesh')}
              <span>{tr('\u25CF')}</span>
            </span>
          </div>
          <div>
            <h4>{tr('Marketplace')}</h4>
            <Link to="/products">{t.products}</Link>
            <Link to="/suppliers">{t.suppliers}</Link>
            <Link to="/dashboard/business">{t.sell}</Link>
          </div>
          <div>
            <h4>{tr('Get to know us')}</h4>
            <Link to="/info/about">{t.about}</Link>
            <Link to="/info/support">{t.support}</Link>
            <Link to="/info/trust">{tr('Trust & verification')}</Link>
          </div>
          <div className="footer-note">
            <ShieldCheck size={23} />
            <h4>{tr('Better business starts with trust.')}</h4>
            <p>{tr('Connect directly. Ask questions. Build lasting partnerships.')}</p>
            <Link to="/info/trust">
              {tr('How sourcing works')}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>
            © {new Date().getFullYear()} {tr('Paikari. All rights reserved.')}
          </span>
          <div>
            <Link to="/info/privacy">{t.privacy}</Link>
            <Link to="/info/terms">{t.terms}</Link>
            <span>
              <MessageSquare size={13} />
              {tr('English / \u09AC\u09BE\u0982\u09B2\u09BE')}
            </span>
          </div>
        </div>
      </footer>
    </>
  );
}
