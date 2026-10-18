import { BuyerOrganization } from '@/components/growth/organization';
import { ChatUnreadBadge } from '@/components/marketplace-chat';
import { prepareImageUpload } from '@/lib/image-upload';
import { useT, useLocale } from '@/lib/i18n';
import { useState, useRef, useCallback } from 'react';
import { BuyerWorkspaceMenu } from '@/components/buyer-workspace-menu';
import './buyer-dashboard.css';
import { Link, NavLink, Outlet, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Package,
  Building2,
  Heart,
  MessageSquare,
  FileText,
  ShieldCheck,
  Users,
  Tags,
  Flag,
  Settings,
  LogOut,
  ArrowUpRight,
  Bookmark,
  Bell,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { State, Notice, SectionTitle, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
export default function Dashboard() {
  const tr = useT();
  const { session, role, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menu, setMenu] = useState({ path: '', open: false });
  const menuButton = useRef<HTMLButtonElement>(null);
  const expanded = menu.path === location.pathname && menu.open;
  const buyer = role === 'buyer';
  const closeMenu = useCallback(
    () => setMenu({ path: location.pathname, open: false }),
    [location.pathname],
  );
  const signOut = async () => {
    const { error } = await db().auth.signOut();
    // The SDK clears the local session even when remote token revocation fails.
    // Keep an error visible only if the account is actually still signed in.
    if (error) {
      const { data } = await db().auth.getSession();
      if (data.session) throw error;
    }
    navigate('/');
  };
  const links =
    role === 'admin'
      ? [
          ['/dashboard', 'Overview', LayoutDashboard],
          ['/dashboard/users', 'Accounts', Users],
          ['/dashboard/verifications', 'Verifications', ShieldCheck],
          ['/dashboard/moderation', 'Product moderation', Package],
          ['/dashboard/categories', 'Categories', Tags],
          ['/dashboard/reports', 'Reports & audit', Flag],
        ]
      : role === 'supplier'
        ? [
            ['/dashboard', 'Overview', LayoutDashboard],
            ['/dashboard/business', 'Business profile', Building2],
            ['/dashboard/products', 'My products', Package],
            ['/dashboard/tools', 'Supplier tools', Package],
            ['/dashboard/orders', 'Orders', FileText],
            ['/dashboard/verification', 'Get verified', ShieldCheck],
            ['/dashboard/supplier-actions', 'Supplier action centre', Flag],
            ['/dashboard/requests', 'Sourcing requests', FileText],
            ['/dashboard/reviews', 'Customer reviews', FileText],
            ['/dashboard/quotations', 'Quotations', FileText],
            ['/tenders', 'Open tenders', FileText],
            ['/dashboard/messages', 'Messages', MessageSquare],
          ]
        : [
            ['/dashboard', 'Overview', LayoutDashboard],
            ['/dashboard/orders', 'Orders', FileText],
            ['/cart', 'Cart', Package],
            ['/dashboard/favorites', 'Saved products', Heart],
            ['/dashboard/suppliers', 'Saved suppliers', Bookmark],
            ['/dashboard/requests', 'Sourcing requests', FileText],
            ['/dashboard/quotations', 'My quotations', FileText],
            ['/dashboard/messages', 'Messages', MessageSquare],
            ['/dashboard/business', 'Become a supplier', Building2],
          ];
  if (role === 'admin' || role === 'super_admin') {
    const module = location.pathname.split('/')[2] ?? '';
    const redirect: Record<string, string> = {
      users: 'accounts',
      moderation: 'products',
      verifications: 'verifications',
      categories: 'categories',
      reports: 'reports',
      settings: 'settings',
    };
    return <Navigate replace to={`/admin/${redirect[module] ?? ''}`} />;
  }
  return (
    <div className={`container dashboard-layout${buyer ? ' buyer-dashboard' : ''}`}>
      <aside className="dashboard-sidebar">
        {buyer && (
          <div className="buyer-mobile-heading">
            <div>
              <span>{tr('YOUR WORKSPACE')}</span>
              <strong>{tr('Buyer dashboard')}</strong>
            </div>
            <button
              ref={menuButton}
              type="button"
              aria-expanded={expanded}
              aria-controls="buyer-workspace-menu"
              aria-haspopup="dialog"
              onClick={() => setMenu({ path: location.pathname, open: !expanded })}
            >
              <Menu size={18} />
              {tr('Menu')}
            </button>
          </div>
        )}
        <span className="eyebrow">{tr('YOUR WORKSPACE')}</span>
        <div className="account-label">
          <strong>{session?.user.email?.split('@')[0]}</strong>
          <span className="status-badge">{tr(role ?? 'buyer')}</span>
        </div>
        <nav id="workspace-navigation" aria-label={tr('Dashboard navigation')}>
          {links.map(([to, label, Icon]) => {
            const I = Icon as typeof Package;
            return (
              <NavLink
                key={String(to)}
                to={String(to)}
                end={to === '/dashboard'}
                className={
                  ['Overview', 'Orders', 'Cart', 'Messages'].includes(String(label))
                    ? 'workspace-primary'
                    : 'workspace-secondary'
                }
                onClick={closeMenu}
              >
                <I size={18} />
                {tr(String(label))}
                {label === 'Messages' && <ChatUnreadBadge />}
              </NavLink>
            );
          })}
          <NavLink
            className="workspace-secondary"
            onClick={closeMenu}
            to="/dashboard/notifications"
          >
            <Bell size={18} />
            {tr('Notifications')}
          </NavLink>
          <NavLink className="workspace-secondary" onClick={closeMenu} to="/dashboard/settings">
            <Settings size={18} />
            {tr('Account settings')}
          </NavLink>
        </nav>
        <button
          className="signout"
          onClick={async () => {
            await db().auth.signOut();
            navigate('/');
          }}
        >
          <LogOut size={16} />
          {tr('Sign out')}
        </button>
        <div className="sidebar-help">
          <ShieldCheck size={22} />
          <strong>{tr('Here to help you grow.')}</strong>
          <Link to="/info/support">{tr('Visit our help centre \u2197')}</Link>
        </div>
      </aside>
      {buyer && (
        <BuyerWorkspaceMenu
          open={expanded}
          email={session?.user.email}
          items={[
            ...links.map(([to, label, Icon]) => ({
              to: String(to),
              label: String(label),
              Icon: Icon as typeof Package,
            })),
            { to: '/dashboard/notifications', label: 'Notifications', Icon: Bell },
            { to: '/dashboard/settings', label: 'Account settings', Icon: Settings },
          ]}
          onClose={closeMenu}
          onSignOut={signOut}
        />
      )}
      <div className="dashboard-content">
        {status?.status === 'suspended' && (
          <div role="status" className="notice error">
            <div>
              <strong>{tr('Account suspended')}</strong>
              <p>{status.reason}</p>
              <small>
                {tr('Existing conversations and quotation follow-up remain available.')}
              </small>
            </div>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
export function Overview() {
  const tr = useT();
  const { session, role } = useAuth();
  useTitle('Your dashboard');
  const { locale } = useLocale();
  const statLinks: Record<string, { to: string; label: string; icon: typeof Heart }> = {
    favorites: { to: '/dashboard/favorites', label: 'Saved products', icon: Heart },
    'saved suppliers': { to: '/dashboard/suppliers', label: 'Saved suppliers', icon: Bookmark },
    'quotation requests': { to: '/dashboard/quotations', label: 'My quotations', icon: FileText },
    conversations: { to: '/dashboard/messages', label: 'Messages', icon: MessageSquare },
  };
  const data = useQuery({
    queryKey: ['overview', session!.user.id, role],
    queryFn: async () => {
      const tables =
        role === 'admin'
          ? (['products', 'businesses', 'profiles', 'reports'] as const)
          : role === 'supplier'
            ? ([
                'products',
                'quotation_requests',
                'conversations',
                'supplier_verifications',
              ] as const)
            : (['favorites', 'saved_suppliers', 'quotation_requests', 'conversations'] as const);
      const own =
        role === 'supplier'
          ? await db()
              .from('businesses')
              .select('id')
              .eq('owner_id', session!.user.id)
              .maybeSingle()
          : null;
      if (own?.error) throw own.error;
      return Promise.all(
        tables.map(async (table) => {
          const { count, error } =
            table === 'products' && role === 'supplier'
              ? await db()
                  .from('products')
                  .select('*', { count: 'exact', head: true })
                  .eq('business_id', own?.data?.id ?? '00000000-0000-0000-0000-000000000000')
              : await db().from(table).select('*', { count: 'exact', head: true });
          if (error) throw error;
          return { label: table.replaceAll('_', ' '), count };
        }),
      );
    },
  });
  const content = (
    <>
      <SectionTitle
        eyebrow={role === 'buyer' ? undefined : tr('LET’S GET TO BUSINESS')}
        title={tr(role === 'buyer' ? 'Your dashboard' : 'Your opportunities, in one place.')}
        description={tr(
          role === 'buyer'
            ? 'Manage your purchases and supplier connections.'
            : 'Welcome to your workspace.',
        )}
      />
      <Notice error={data.error} />
      {data.isError && (
        <Button variant="outline" onClick={() => data.refetch()}>
          {tr('Try again')}
        </Button>
      )}
      {role === 'buyer' && (
        <div className="buyer-quick-actions" aria-label={tr('Quick actions')}>
          <Link to="/dashboard/orders">
            <FileText size={21} />
            <span>
              {tr('Orders')}
              <small>{tr('Track your purchases')}</small>
            </span>
            <ArrowUpRight size={18} />
          </Link>
          <Link to="/cart">
            <Package size={21} />
            <span>
              {tr('Cart')}
              <small>{tr('Review items for checkout')}</small>
            </span>
            <ArrowUpRight size={18} />
          </Link>
        </div>
      )}
      <div className="stat-grid" aria-busy={data.isPending} aria-label={tr('Workspace summary')}>
        {data.isPending
          ? Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="stat-card workspace-skeleton" aria-hidden="true" />
            ))
          : data.data?.map((s) => {
              const target = role === 'buyer' ? statLinks[s.label] : undefined;
              const Icon = target?.icon;
              const content = (
                <>
                  <span className="workspace-stat-label">
                    {tr(target?.label ?? s.label)}
                    {Icon && <Icon size={18} aria-hidden="true" />}
                  </span>
                  <strong>
                    {new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-BD').format(
                      s.count ?? 0,
                    )}
                  </strong>
                  <small>
                    {tr(target ? 'View details' : 'Across your workspace')}
                    {target && <ArrowUpRight size={14} />}
                  </small>
                </>
              );
              return target ? (
                <Link className="stat-card" key={s.label} to={target.to}>
                  {content}
                </Link>
              ) : (
                <div className="stat-card" key={s.label}>
                  {content}
                </div>
              );
            })}
      </div>
      <div className="dashboard-welcome">
        <span className="eyebrow">{tr('YOUR NEXT STEP')}</span>
        <h2>
          {tr(
            role === 'supplier'
              ? 'Build a business buyers can trust.'
              : role === 'admin'
                ? 'Keep the marketplace moving.'
                : 'Find your next wholesale product.',
          )}
        </h2>
        <p>
          {tr(
            role === 'supplier'
              ? 'Complete your profile, submit verification documents, and add your wholesale products.'
              : role === 'admin'
                ? 'Review pending products, verify businesses, and respond to reported content.'
                : 'Discover wholesale products, save your shortlist, and request your first quotation.',
          )}
        </p>
        <Button asChild>
          <Link
            to={
              role === 'supplier'
                ? '/dashboard/products/new'
                : role === 'admin'
                  ? '/dashboard/moderation'
                  : '/products'
            }
          >
            {tr(
              role === 'supplier'
                ? 'Add a product'
                : role === 'admin'
                  ? 'Review products'
                  : 'Explore products',
            )}
            <ArrowUpRight size={16} />
          </Link>
        </Button>
      </div>
      <div className="dashboard-note">
        <ShieldCheck />
        <div>
          <h3>{tr('Your business, protected.')}</h3>
          <p>
            {tr(
              'Private documents stay private. Contact suppliers and manage your conversations in your workspace.',
            )}
          </p>
        </div>
      </div>
    </>
  );
  return role === 'buyer' ? <div className="buyer-overview">{content}</div> : content;
}
export function AccountSettings() {
  const tr = useT();
  const { session, role } = useAuth();
  useTitle('Account settings');
  const profile = useQuery({
    queryKey: ['profile', session!.user.id],
    queryFn: async () => {
      const { data, error } = await db()
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .single();
      if (error) throw error;
      return data;
    },
  });
  return (
    <>
      <SectionTitle
        title={tr('Account settings')}
        description={tr('Keep your business contact information up to date.')}
      />
      {role === 'buyer' && <BuyerOrganization />}
      <Notice error={profile.error} />
      {profile.data ? (
        <ProfileForm key={profile.data.updated_at} profile={profile.data} />
      ) : (
        <State title={tr('Loading profile…')} />
      )}
    </>
  );
}
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { Profile } from '@/lib/models';
import { validateUpload, randomUUID } from '@/lib/utils';
import { Field } from '@/components/shared';
function ProfileForm({ profile }: { profile: Profile }) {
  const tr = useT();
  const { session } = useAuth();
  const cache = useQueryClient();
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [avatar, setAvatar] = useState<File>();
  const mutation = useMutation({
    mutationFn: async () => {
      z.string().min(2).max(120).parse(name);
      if (phone)
        z.string()
          .regex(/^\+?8801[3-9][0-9]{8}$/)
          .parse(phone);
      let path = profile.avatar_path;
      if (avatar) {
        const prepared = await prepareImageUpload(avatar, 'avatars');
        const ext = validateUpload(prepared, 'avatars');
        path = `${session!.user.id}/${randomUUID()}.${ext}`;
        const { error } = await db()
          .storage.from('avatars')
          .upload(path, prepared, { upsert: false, contentType: prepared.type });
        if (error) throw error;
      }
      const { error } = await db()
        .from('profiles')
        .update({ full_name: name, phone: phone || null, avatar_path: path })
        .eq('id', session!.user.id);
      if (error) throw error;
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: ['profile'] }),
  });
  return (
    <form
      className="form-stack panel max-form"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <Field label={tr('Email address')}>
        <input value={session?.user.email ?? ''} disabled />
      </Field>
      <Field label={tr('Full name')}>
        <input
          required
          minLength={2}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label={tr('Bangladesh mobile number')}>
        <input
          type="tel"
          placeholder={'+8801712345678'}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </Field>
      <p className="muted">
        {tr('Images are automatically compressed before upload. Source images up to 20 MB.')}
      </p>
      <Field label={tr('Profile image (JPEG, PNG or WebP; 2 MB)')}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setAvatar(e.target.files?.[0])}
        />
      </Field>
      <Notice
        error={mutation.error}
        success={mutation.isSuccess ? tr('Profile updated.') : undefined}
      />
      <Button disabled={mutation.isPending}>{tr('Save profile')}</Button>
      <Link to="/auth/forgot">{tr('Send a password reset email \u2197')}</Link>
    </form>
  );
}
