import { useT } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowUpRight, ShieldCheck, Mail } from 'lucide-react';
import { db, configured } from '@/lib/supabase';
import { safeRedirect } from '@/lib/utils';
import { Field, Notice, State, useTitle } from '@/components/shared';
import { Button } from '@/components/ui/button';
export default function AuthPage() {
  const tr = useT();
  const { mode = 'login' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState('');
  const [callbackLoading, setCallbackLoading] = useState(mode === 'callback');
  const registerMode = mode === 'register',
    reset = mode === 'reset',
    forgot = mode === 'forgot';
  useTitle(
    registerMode
      ? 'Create your account'
      : forgot
        ? 'Reset your password'
        : reset
          ? 'Choose a new password'
          : 'Welcome back',
  );
  const schema = z.object({
    email: forgot || registerMode || mode === 'login' ? z.email() : z.string(),
    password: forgot
      ? z.string()
      : z
          .string()
          .min(registerMode || reset ? 10 : 1)
          .max(128),
    full_name: registerMode ? z.string().min(2).max(120) : z.string(),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', full_name: '' },
  });
  useEffect(() => {
    if (mode !== 'callback') return;
    let active = true;
    db()
      .auth.getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data.session) {
          setError(
            error ??
              new Error('The sign-in link is invalid or expired. Please request another one.'),
          );
          setCallbackLoading(false);
        } else navigate(safeRedirect(params.get('next')), { replace: true });
      });
    return () => {
      active = false;
    };
  }, [mode, navigate, params]);
  if (mode === 'callback')
    return (
      <div className="container page-content">
        {callbackLoading ? (
          <State title={tr('Confirming your email…')} />
        ) : (
          <State
            title={tr('Could not confirm sign-in')}
            action={<Link to="/auth/login">{tr('Back to sign in')}</Link>}
          />
        )}
        <Notice error={error} />
      </div>
    );
  if (!['login', 'register', 'forgot', 'reset'].includes(mode))
    return <State title={tr('Page not found')} />;
  async function submit(values: z.infer<typeof schema>) {
    setError(undefined);
    setSuccess('');
    try {
      const client = db();
      const site = window.location.origin;
      if (registerMode) {
        const { data, error } = await client.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: { full_name: values.full_name },
            emailRedirectTo: `${site}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) navigate('/dashboard');
        else setSuccess('Check your email to verify your account, then sign in.');
      } else if (forgot) {
        const { error } = await client.auth.resetPasswordForEmail(values.email, {
          redirectTo: `${site}/auth/reset`,
        });
        if (error) throw error;
        setSuccess('If an account exists for this email, a password reset link is on its way.');
      } else if (reset) {
        const { data } = await client.auth.getUser();
        if (!data.user) throw new Error('Open the password reset link in your email first.');
        const { error } = await client.auth.updateUser({ password: values.password });
        if (error) throw error;
        setSuccess('Your password has been updated.');
      } else {
        const { error } = await client.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        if (error) throw error;
        navigate(safeRedirect(params.get('next')));
      }
    } catch (e) {
      setError(e);
    }
  }
  return (
    <div className="auth-layout container">
      <div className="auth-intro">
        <span className="eyebrow">{tr('YOUR NEXT BUSINESS CHAPTER')}</span>
        <h1>
          {tr('Good connections.')}
          <br />
          <em>{tr('Great possibilities.')}</em>
        </h1>
        <p>
          {tr(
            'Join a marketplace built for Bangladesh\u2019s businesses. Find your products, your suppliers, and your next opportunity.',
          )}
        </p>
        <div>
          <ShieldCheck />
          {tr('Secure accounts. Direct connections. Local possibilities.')}
        </div>
      </div>
      <div className="auth-card" key={mode}>
        <span className="eyebrow">{tr('WELCOME TO PAIKARI')}</span>
        <h2>
          {tr(
            registerMode
              ? 'Let’s grow your business.'
              : forgot
                ? 'Forgot your password?'
                : reset
                  ? 'A fresh start.'
                  : 'Welcome back.',
          )}
        </h2>
        <p>
          {tr(
            registerMode
              ? 'Create your free buyer account. You can become a supplier from your dashboard.'
              : forgot
                ? 'We’ll send you a link to reset it.'
                : reset
                  ? 'Choose a strong password for your account.'
                  : 'Sign in to your business opportunities.',
          )}
        </p>
        {!configured && (
          <Notice error={new Error('Supabase Cloud is not configured yet. See the setup guide.')} />
        )}
        <form onSubmit={form.handleSubmit(submit)} className="form-stack">
          {registerMode && (
            <Field label={tr('Full name')} error={form.formState.errors.full_name?.message}>
              <input autoComplete="name" {...form.register('full_name')} />
            </Field>
          )}
          {!reset && (
            <Field label={tr('Email address')} error={form.formState.errors.email?.message}>
              <input type="email" autoComplete="email" {...form.register('email')} />
            </Field>
          )}
          {!forgot && (
            <Field label={tr('Password')} error={form.formState.errors.password?.message}>
              <input
                type="password"
                autoComplete={registerMode || reset ? 'new-password' : 'current-password'}
                {...form.register('password')}
              />
            </Field>
          )}
          <Notice error={error} success={success} />
          <Button type="submit" disabled={form.formState.isSubmitting || !configured}>
            {tr(
              form.formState.isSubmitting
                ? 'Please wait…'
                : registerMode
                  ? 'Create account'
                  : forgot
                    ? 'Send reset link'
                    : reset
                      ? 'Update password'
                      : 'Sign in',
            )}
            {forgot ? <Mail size={16} /> : <ArrowUpRight size={16} />}
          </Button>
        </form>
        {mode === 'login' && (
          <Link className="auth-forgot" to="/auth/forgot">
            {tr('Forgot password?')}
          </Link>
        )}
        <div className="auth-switch">
          {registerMode ? (
            <>
              {tr('Already have an account?')} <Link to="/auth/login">{tr('Sign in')}</Link>
            </>
          ) : (
            <>
              {tr('New to Paikari?')} <Link to="/auth/register">{tr('Join free')}</Link>
            </>
          )}
        </div>
        <small>
          {tr('By continuing, you agree to our')} <Link to="/info/terms">{tr('terms')}</Link>{' '}
          {tr('and')} <Link to="/info/privacy">{tr('privacy policy')}</Link>.
        </small>
      </div>
    </div>
  );
}
