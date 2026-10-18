import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, LogOut, X, type LucideIcon } from 'lucide-react';
import { NavLink, Link } from 'react-router-dom';
import { ChatUnreadBadge } from './marketplace-chat';
import { useT } from '@/lib/i18n';
import { errorMessage } from '@/lib/utils';
import './buyer-workspace-menu.css';

export type WorkspaceMenuItem = { to: string; label: string; Icon: LucideIcon };
export function BuyerWorkspaceMenu({
  open,
  email,
  items,
  onClose,
  onSignOut,
}: {
  open: boolean;
  email?: string;
  items: WorkspaceMenuItem[];
  onClose: () => void;
  onSignOut: () => Promise<void>;
}) {
  const tr = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const sheet = dialog.current!;
    const mobile = window.matchMedia('(max-width: 800px)');
    if (!mobile.matches) {
      onClose();
      return;
    }
    const overflow = document.body.style.overflow;
    if (!sheet.open) {
      sheet.showModal();
    }
    document.body.style.overflow = 'hidden';
    const resize = () => {
      if (!mobile.matches) onClose();
    };
    mobile.addEventListener('change', resize);
    return () => {
      mobile.removeEventListener('change', resize);
      if (sheet?.open) {
        sheet.close();
      }
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);
  const shopping = ['Overview', 'Orders', 'Cart'];
  const sourcing = ['Saved products', 'Saved suppliers', 'Sourcing requests', 'My quotations'];
  const sections = [
    {
      title: 'Buying',
      className: 'workspace-menu-buying',
      rows: items.filter((i) => shopping.includes(i.label)),
    },
    {
      title: 'Saved & sourcing',
      className: 'workspace-menu-sourcing',
      rows: items.filter((i) => sourcing.includes(i.label)),
    },
    {
      title: 'Messages & account',
      className: 'workspace-menu-account',
      rows: items.filter(
        (i) =>
          !shopping.includes(i.label) &&
          !sourcing.includes(i.label) &&
          i.label !== 'Become a supplier',
      ),
    },
  ];
  const business = items.find((i) => i.label === 'Become a supplier');
  const signOut = async () => {
    setPending(true);
    setError('');
    try {
      await onSignOut();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  };
  return createPortal(
    <dialog
      ref={dialog}
      id="buyer-workspace-menu"
      className="buyer-workspace-dialog"
      aria-labelledby="workspace-menu-title"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const elements = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
        ).filter((element) => element.getClientRects().length > 0);
        const first = elements[0];
        const last = elements.at(-1);
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(e) => {
        if (e.target !== e.currentTarget || pending) return;
        const bounds = e.currentTarget.getBoundingClientRect();
        if (
          e.clientX < bounds.left ||
          e.clientX > bounds.right ||
          e.clientY < bounds.top ||
          e.clientY > bounds.bottom
        )
          onClose();
      }}
    >
      <header className="workspace-menu-header">
        <span className="workspace-menu-avatar" aria-hidden="true">
          {email?.charAt(0).toUpperCase() || 'B'}
        </span>
        <div>
          <h2 id="workspace-menu-title">{tr('Your workspace')}</h2>
          <p>{email || tr('Buyer account')}</p>
        </div>
        <button
          type="button"
          autoFocus
          aria-label={tr('Close menu')}
          disabled={pending}
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <nav className="workspace-menu-body" aria-label={tr('Workspace menu')}>
        {sections.map((section) => (
          <section key={section.title} className={section.className} aria-label={tr(section.title)}>
            <h3>{tr(section.title)}</h3>
            <div>
              {section.rows.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/dashboard'}
                  onClick={(e) => {
                    if (pending) e.preventDefault();
                    else onClose();
                  }}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{tr(label)}</span>
                  {label === 'Messages' && <ChatUnreadBadge />}
                  <ChevronRight className="workspace-menu-chevron" size={16} aria-hidden="true" />
                </NavLink>
              ))}
            </div>
          </section>
        ))}
        {business && (
          <NavLink
            to={business.to}
            className="workspace-menu-business"
            onClick={(e) => {
              if (pending) e.preventDefault();
              else onClose();
            }}
          >
            <business.Icon size={20} />
            <span>{tr(business.label)}</span>
            <ChevronRight size={16} />
          </NavLink>
        )}
      </nav>
      <footer className="workspace-menu-footer">
        {error && <p role="alert">{error}</p>}
        <Link
          to="/info/support"
          onClick={(e) => {
            if (pending) e.preventDefault();
            else onClose();
          }}
        >
          {tr('Help & support')}
        </Link>
        <button
          className="workspace-menu-signout"
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() => void signOut()}
        >
          <LogOut size={18} />
          {tr(pending ? 'Signing out…' : 'Sign out')}
        </button>
      </footer>
    </dialog>,
    document.body,
  );
}
