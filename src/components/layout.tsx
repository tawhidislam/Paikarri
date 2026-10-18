import { LiveSearch } from './live-search';
import { CartNavigationLink } from './order-purchase';
import { ChatNavigationLink } from './marketplace-chat';
import { NotificationLink } from './notification-link';
import { usePlatformSettings } from '@/lib/platform';
import { useT } from '@/lib/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
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
import { categories } from '@/lib/catalog';
import { configured } from '@/lib/supabase';
import { SupplierAccessLink } from './supplier-access-link';
import './marketplace-navigation.css';

function CategoryPicker({ onNavigate }: { onNavigate: () => void }) {
  const { t, locale } = useLocale();
  const tr = useT();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const items = useQuery({ queryKey: ['categories'], queryFn: categories, enabled: configured });
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', keyboard, true);
    };
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const select = () => {
    setOpen(false);
    onNavigate();
  };
  const parents = items.data?.filter((item) => !item.parent_id) ?? [];
  return (
    <div
      className="category-picker"
      ref={container}
      onBlur={(event) => {
        if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
    >
      <button
        className="category-nav"
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        ref={trigger}
        onClick={() => setOpen(!open)}
      >
        <Menu size={17} aria-hidden="true" />
        {t.categories}
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {open && (
        <div className="category-popover" id={panelId}>
          <div className="category-popover-heading">
            <strong>{t.categories}</strong>
            <button type="button" aria-label={tr('Close categories')} onClick={close}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          {items.isLoading ? (
            <p className="category-picker-status" role="status">
              {t.loading}
            </p>
          ) : items.isError ? (
            <p className="category-picker-status" role="status">
              {tr('Categories are temporarily unavailable.')}
            </p>
          ) : !parents.length ? (
            <p className="category-picker-status">
              {tr('Explore all products while categories are being updated.')}
            </p>
          ) : (
            <ul>
              {parents.map((parent) => {
                const children = items.data?.filter((item) => item.parent_id === parent.id) ?? [];
                return (
                  <li key={parent.id}>
                    <Link
                      to={`/products?category=${encodeURIComponent(parent.slug)}`}
                      onClick={select}
                    >
                      {locale === 'bn' ? parent.name_bn || parent.name : parent.name}
                    </Link>
                    {!!children.length && (
                      <ul>
                        {children.map((child) => (
                          <li key={child.id}>
                            <Link
                              to={`/products?category=${encodeURIComponent(child.slug)}`}
                              onClick={select}
                            >
                              {locale === 'bn' ? child.name_bn || child.name : child.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <Link to="/tenders" onClick={select}>
            {tr('Open tenders')}
          </Link>
          <Link to="/products" onClick={select}>
            {t.viewAll}
            <ArrowUpRight size={16} />
          </Link>
        </div>
      )}
    </div>
  );
}
export function Brand() {
  const platform = usePlatformSettings();
  const { locale } = useLocale();
  const name =
    (locale === 'bn' ? platform.data?.name_bn : platform.data?.name_en) ?? 'Paikarii.com';
  const tr = useT();
  return (
    <Link to="/" className="brand" aria-label={tr('Paikarii.com home')}>
      <span className="brand-icon">
        <MoveUpRight size={25} />
      </span>
      <span className="brand-wordmark">
        {name.endsWith('.com') ? (
          <>
            {name.slice(0, -4)}
            <span className="brand-domain">.com</span>
          </>
        ) : (
          name
        )}
      </span>
    </Link>
  );
}
export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = useLocation().pathname;
  const adminRoute = pathname.startsWith('/admin');
  const homeRoute = pathname === '/';
  const tr = useT();
  const { t, toggle } = useLocale();
  const platform = usePlatformSettings();
  const { session, role } = useAuth();
  const [menu, setMenu] = useState(false);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setMenu(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menu]);
  if (adminRoute) return <>{children}</>;
  return (
    <>
      <a href="#main" className="skip-link">
        {tr('Skip to content')}
      </a>
      <div className={`topbar ${homeRoute ? 'homepage-topbar' : ''}`}>
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
      <header
        className={`site-header ${homeRoute ? 'homepage-header' : ''}`}
        ref={header}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && menu && !event.defaultPrevented) {
            setMenu(false);
            mobileTrigger.current?.focus();
          }
        }}
      >
        <div className="container header-main">
          <Brand />
          <LiveSearch onNavigate={() => setMenu(false)} />
          <div className="header-actions">
            <CartNavigationLink />
            <ChatNavigationLink />
            <NotificationLink />
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
            aria-controls="marketplace-navigation"
            ref={mobileTrigger}
            type="button"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
        <div id="marketplace-navigation" className={`nav-row ${menu ? 'open' : ''}`}>
          <nav className="container" aria-label={tr('Main navigation')}>
            <CategoryPicker onNavigate={() => setMenu(false)} />
            <NavLink to="/products" onClick={() => setMenu(false)}>
              {t.products}
            </NavLink>
            <NavLink to="/suppliers" onClick={() => setMenu(false)}>
              {t.suppliers}
            </NavLink>
            <NavLink to="/tenders" onClick={() => setMenu(false)}>
              {tr('Open tenders')}
            </NavLink>
            <Link to="/products?sort=newest" onClick={() => setMenu(false)}>
              {t.newArrivals}
            </Link>
            <Link to="/products?sort=price-asc" onClick={() => setMenu(false)}>
              {tr('Wholesale prices')}
            </Link>
            <SupplierAccessLink className="nav-sell" onClick={() => setMenu(false)}>
              {t.sell}
              <ArrowUpRight size={15} />
            </SupplierAccessLink>
            <div className="mobile-auth-links">
              {(!role || role === 'buyer') && (
                <Link to="/cart" onClick={() => setMenu(false)}>
                  {tr('Cart')}
                </Link>
              )}
              {session ? (
                <Link to="/dashboard" onClick={() => setMenu(false)}>
                  {t.dashboard}
                </Link>
              ) : (
                <>
                  <Link to="/auth/login" onClick={() => setMenu(false)}>
                    {t.signin}
                  </Link>
                  <Link to="/auth/register" onClick={() => setMenu(false)}>
                    {t.join}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>
      <main id="main">{children}</main>
      <footer className={`site-footer ${homeRoute ? 'homepage-footer' : ''}`}>
        {homeRoute && (
          <div className="container home-footer-intro">
            <div>
              <span>{tr('ROOTED HERE. READY FOR WHAT’S NEXT.')}</span>
              <h2>{tr('Good business starts with a connection.')}</h2>
            </div>
            <Link to="/suppliers">
              {tr('Find your next supplier')}
              <ArrowUpRight size={22} />
            </Link>
          </div>
        )}
        <div className="container footer-grid">
          <div>
            <Brand />
            <p>{t.footer}</p>
            <p>
              {platform.data?.support_email && (
                <a href={`mailto:${platform.data.support_email}`}>{platform.data.support_email}</a>
              )}
            </p>
            {platform.data?.support_phone && (
              <p>
                <a href={`tel:${platform.data.support_phone}`}>{platform.data.support_phone}</a>
              </p>
            )}
            <span className="footer-made">
              {tr('Proudly built for Bangladesh')}
              <span>{tr('\u25CF')}</span>
            </span>
          </div>
          <div>
            <h4>{tr('Marketplace')}</h4>
            <Link to="/products">{t.products}</Link>
            <Link to="/suppliers">{t.suppliers}</Link>
            <SupplierAccessLink />
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
            © {new Date().getFullYear()} {tr('Paikarii.com. All rights reserved.')}
          </span>
          <div>
            <Link to="/info/privacy">{t.privacy}</Link>
            <Link to="/info/terms">{t.terms}</Link>
            <Link to="/info/refund">{tr('Refund Policy')}</Link>
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
