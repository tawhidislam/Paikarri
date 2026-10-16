import { useT } from '@/lib/i18n';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { db } from '@/lib/supabase';
import { State, Notice, SectionTitle, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
export default function Dashboard() {
  const tr = useT();
  const { session, role } = useAuth();
  const navigate = useNavigate();
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
            ['/dashboard/verification', 'Get verified', ShieldCheck],
            ['/dashboard/quotations', 'Quotations', FileText],
            ['/dashboard/messages', 'Messages', MessageSquare],
          ]
        : [
            ['/dashboard', 'Overview', LayoutDashboard],
            ['/dashboard/favorites', 'Saved products', Heart],
            ['/dashboard/suppliers', 'Saved suppliers', Bookmark],
            ['/dashboard/quotations', 'My quotations', FileText],
            ['/dashboard/messages', 'Messages', MessageSquare],
            ['/dashboard/business', 'Become a supplier', Building2],
          ];
  return (
    <div className="container dashboard-layout">
      <aside className="dashboard-sidebar">
        <span className="eyebrow">{tr('YOUR WORKSPACE')}</span>
        <div className="account-label">
          <strong>{session?.user.email?.split('@')[0]}</strong>
          <span className="status-badge">{tr(role ?? 'buyer')}</span>
        </div>
        <nav aria-label={tr('Dashboard navigation')}>
          {links.map(([to, label, Icon]) => {
            const I = Icon as typeof Package;
            return (
              <NavLink key={String(to)} to={String(to)} end={to === '/dashboard'}>
                <I size={18} />
                {tr(String(label))}
              </NavLink>
            );
          })}
          <NavLink to="/dashboard/settings">
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
      <div className="dashboard-content">
        <Outlet />
      </div>
    </div>
  );
}
export function Overview() {
  const tr = useT();
  const { session, role } = useAuth();
  useTitle('Your dashboard');
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
  return (
    <>
      <SectionTitle
        eyebrow="LET’S GET TO BUSINESS"
        title={tr('Your opportunities, in one place.')}
        description={tr('Welcome to your workspace.')}
      />
      <Notice error={data.error} />
      <div className="stat-grid">
        {data.data?.map((s) => (
          <div className="stat-card" key={s.label}>
            <span>{tr(s.label)}</span>
            <strong>{s.count ?? 0}</strong>
            <small>{tr('Across your workspace')}</small>
          </div>
        ))}
      </div>
      <div className="dashboard-welcome">
        <span className="eyebrow">{tr('YOUR NEXT STEP')}</span>
        <h2>
          {tr(
            role === 'supplier'
              ? 'Build a business buyers can trust.'
              : role === 'admin'
                ? 'Keep the marketplace moving.'
                : 'Your next opportunity is out there.',
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
}
export function AccountSettings() {
  const tr = useT();
  const { session } = useAuth();
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
      <Notice error={profile.error} />
      {profile.data ? (
        <ProfileForm key={profile.data.updated_at} profile={profile.data} />
      ) : (
        <State title={tr('Loading profile…')} />
      )}
    </>
  );
}
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import type { Profile } from '@/lib/models';
import { validateUpload } from '@/lib/utils';
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
        const ext = validateUpload(avatar, 'avatars');
        path = `${session!.user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await db()
          .storage.from('avatars')
          .upload(path, avatar, { upsert: false, contentType: avatar.type });
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
