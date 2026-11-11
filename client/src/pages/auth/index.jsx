import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, BadgeCheck, BarChart3, CheckCircle2, Eye, EyeOff, Lock, Mail,
  ShieldCheck, Sparkles, User, Building2, Users, Zap,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api, unwrap } from '../../lib/api';
import { DEMO_USERS } from '../../lib/constants';
import { Button, Card, Field, Input } from '../../components/ui';
import { cn } from '../../lib/utils';

function AuthShell({ children, title, subtitle, footer, compact = false }) {
  return (
    <div className="min-h-full bg-canvas lg:grid lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col">
        <div className="absolute inset-0 bg-glow opacity-80" />
        <div className="absolute inset-0 bg-grid opacity-[0.08]" />
        <div className="relative z-10 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 font-display text-lg font-extrabold shadow-glow">P</span>
          <div>
            <p className="font-display text-base font-bold">PixelForge</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Client OS</p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-lg py-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" /> The operating system for client work
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.1] tracking-tight">
            Run your agency from one calm, connected workspace.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            Leads, projects, retainers, payments, documents and a client portal — with AI assistance that always waits for your approval.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {[
              { icon: BarChart3, label: 'Live revenue & pipeline' },
              { icon: Users, label: 'Client portal included' },
              { icon: Zap, label: 'AI drafting & insights' },
              { icon: ShieldCheck, label: 'Role-based access' },
            ].map((feature) => (
              <div key={feature.label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-white/75">
                <feature.icon className="h-4 w-4 shrink-0 text-indigo-300" />
                {feature.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-[11px] text-white/45">
          <span>Local-first demo · No cloud account required</span>
          <span>v1.0</span>
        </div>
      </div>

      <div className="flex min-h-full flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between lg:justify-end">
          <Link to="/" className="flex items-center gap-2 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-sm font-extrabold text-white">P</span>
            <span className="font-display text-sm font-bold text-ink">PixelForge</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to site
          </Link>
        </div>

        <div className={cn('mx-auto flex w-full flex-1 flex-col justify-center py-8', compact ? 'max-w-sm' : 'max-w-md')}>
          <div className="mb-7">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">{title}</h2>
            {subtitle ? <p className="mt-1.5 text-sm text-muted">{subtitle}</p> : null}
          </div>
          {children}
          {footer ? <div className="mt-6 text-center text-sm text-muted">{footer}</div> : null}
        </div>

        <p className="text-center text-[11px] text-muted">
          © {new Date().getFullYear()} PixelForge Studio. Demo environment — data stays on this machine.
        </p>
      </div>
    </div>
  );
}

function PasswordInput({ register, name, label = 'Password', placeholder = '••••••••', error, rules }) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error}>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete={name === 'password' ? 'current-password' : 'new-password'}
          className={`input pr-10 ${error ? 'border-danger/60' : ''}`}
          {...register(name, rules)}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

function DemoAccounts({ admin = false, onPick }) {
  const users = admin
    ? DEMO_USERS.filter((user) => ['super_admin', 'admin'].includes(user.role))
    : DEMO_USERS.filter((user) => ['user', 'team_member', 'client'].includes(user.role));
  return (
    <div className="mt-5 rounded-xl border border-dashed border-line bg-surface2/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Demo accounts</p>
        <span className="text-[10px] text-muted">Click to fill</span>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {users.map((user) => (
          <button
            key={`${user.role}-${user.email}`}
            type="button"
            onClick={() => onPick(user)}
            className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-2 text-left transition hover:border-primary/30 hover:bg-primary-soft/40"
          >
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-semibold text-ink">{user.label}</span>
              <span className="block truncate text-[10px] text-muted">{user.email}</span>
            </span>
            <ArrowRight className="h-3 w-3 shrink-0 text-muted" />
          </button>
        ))}
      </div>
    </div>
  );
}

function useRedirectUser(admin = false) {
  const { user } = useAuth();
  const location = useLocation();
  if (user) {
    const currentMode = user.role === 'admin' || user.role === 'super_admin' ? 'admin' : 'user';
    const targetMode = admin ? 'admin' : 'user';
    if (currentMode !== targetMode) {
      return null;
    }
    const from = location.state?.from;
    const fallback = user.role === 'client' ? '/client-portal' : (targetMode === 'admin' ? '/admin' : '/dashboard');
    return <Navigate to={from || fallback} replace />;
  }
  return null;
}

export function LoginPage({ admin: adminProp = false }) {
  const location = useLocation();
  const isAdminPath = adminProp || location.pathname.startsWith('/admin') || location.search.includes('role=admin');
  const redirect = useRedirectUser(isAdminPath);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: { email: 'varjunarjun9@gmail.com', password: 'Arjun@123' },
  });

  if (redirect) return redirect;

  const submit = async (values) => {
    setError('');
    try {
      const user = await login({ ...values, admin: isAdminPath });
      toast.success(`Welcome back${isAdminPath ? ' Administrator' : ''}, ${user.name.split(' ')[0]}.`);
      const from = location.state?.from;
      navigate(from || (user.role === 'client' ? '/client-portal' : '/dashboard'), { replace: true });
    } catch (err) {
      setError(err.message || 'Could not sign in.');
    }
  };

  return (
    <AuthShell
      title={isAdminPath ? 'Administrator sign in' : 'User sign in'}
      subtitle={isAdminPath ? 'Restricted to Admin and Super Admin roles.' : 'Sign in to your user workspace to pick up where you left off.'}
      footer={(
        <>
          {isAdminPath ? (
            <span>Not an administrator? <Link to="/login" className="font-semibold text-primary hover:underline">Use user login</Link></span>
          ) : (
            <span>New here? <Link to="/register" className="font-semibold text-primary hover:underline">Create a workspace</Link></span>
          )}
          <span className="mt-2 block text-xs">
            {isAdminPath ? <Link to="/login" className="text-muted hover:text-ink">← Standard user sign in</Link> : <Link to="/admin/login" className="inline-flex items-center gap-1 text-muted hover:text-ink"><ShieldCheck className="h-3 w-3" /> Administrator login (/admin)</Link>}
          </span>
        </>
      )}
    >
      {isAdminPath ? (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary-soft/50 p-3 text-xs text-primary">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Admin sign-in grants Administrator role and access. Regular users should use standard login.</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          prefix={<Mail className="h-4 w-4" />}
          error={error || undefined}
          {...register('email', { required: 'Email is required.' })}
        />
        <PasswordInput register={register} name="password" placeholder="Your password" />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" defaultChecked className="checkbox" /> Remember me
          </label>
          <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">Forgot password?</Link>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          {isAdminPath ? <ShieldCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
          {isAdminPath ? 'Sign in as Administrator' : 'Sign in as User'}
        </Button>
      </form>

      <DemoAccounts
        admin={isAdminPath}
        onPick={(user) => {
          setValue('email', user.email);
          setValue('password', user.password);
        }}
      />
    </AuthShell>
  );
}

export function AdminLoginPage() {
  return <LoginPage admin />;
}

export function RegisterPage() {
  const redirect = useRedirectUser();
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  if (redirect) return redirect;

  const submit = async (values) => {
    setError('');
    try {
      const user = await signUp(values);
      toast.success('Workspace created. Welcome to PixelForge.');
      navigate(user.role === 'client' ? '/client-portal' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create your workspace.');
    }
  };

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Start with a free plan. Upgrade any time — no card required for the demo."
      compact
      footer={<span>Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></span>}
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input label="Full name" placeholder="Aarav Malhotra" prefix={<User className="h-4 w-4" />} error={errors.name?.message} {...register('name', { required: 'Your name is required.' })} />
        <Input label="Company / workspace" placeholder="PixelForge Studio" prefix={<Building2 className="h-4 w-4" />} {...register('company')} />
        <Input label="Work email" type="email" placeholder="you@company.com" prefix={<Mail className="h-4 w-4" />} error={errors.email?.message} {...register('email', { required: 'Email is required.' })} />
        <PasswordInput register={register} name="password" label="Password" placeholder="At least 8 characters" error={errors.password?.message} rules={{ required: 'Password is required.', minLength: { value: 8, message: 'Use at least 8 characters.' } }} />
        <PasswordInput register={register} name="confirmPassword" label="Confirm password" placeholder="Confirm password" error={errors.confirmPassword?.message} rules={{ required: 'Confirm your password.' }} />
        <label className="flex items-start gap-2 text-xs text-muted">
          <input type="checkbox" className="checkbox mt-0.5" {...register('terms', { required: true })} />
          <span>I agree to the demo terms and understand this workspace stores data locally.</span>
        </label>
        {error ? <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
          Create workspace <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(null);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm();

  const submit = async (values) => {
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', values);
      const payload = response.data;
      setSent(payload.data || payload);
    } catch (error) {
      toast.error(error.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email linked to your account and we will send reset instructions."
      footer={<Link to="/login" className="font-semibold text-primary hover:underline">← Back to sign in</Link>}
      compact
    >
      {sent ? (
        <div className="rounded-xl border border-success/25 bg-success/5 p-4">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <p className="mt-2 text-sm font-semibold text-ink">Check your inbox</p>
          <p className="mt-1 text-xs text-muted">{sent.message}</p>
          {sent.devToken ? (
            <div className="mt-3 rounded-lg border border-line bg-surface p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Development reset link</p>
              <Link to={`/reset-password?token=${sent.devToken}`} className="mt-1 block break-all text-xs font-semibold text-primary hover:underline">
                /reset-password?token={sent.devToken.slice(0, 18)}…
              </Link>
              <p className="mt-1 text-[10px] text-muted">Email delivery is not configured, so the token is shown in this demo.</p>
            </div>
          ) : null}
        </div>
      ) : (
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <Input label="Email address" type="email" placeholder="you@company.com" prefix={<Mail className="h-4 w-4" />} {...register('email', { required: true })} />
          <Button type="submit" size="lg" className="w-full" loading={loading}>Send reset instructions</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { token: params.get('token') || '' },
  });

  const submit = async (values) => {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', values);
      toast.success('Password updated. You can sign in now.');
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" subtitle="Use at least 8 characters and something you have not used before." footer={<Link to="/login" className="font-semibold text-primary hover:underline">← Back to sign in</Link>} compact>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {!params.get('token') ? <Input label="Reset token" placeholder="Paste your reset token" {...register('token', { required: 'Reset token is required.' })} /> : null}
        <PasswordInput register={register} name="password" label="New password" placeholder="New password" error={errors.password?.message} rules={{ required: 'Password is required.', minLength: { value: 8, message: 'Use at least 8 characters.' } }} />
        <PasswordInput register={register} name="confirmPassword" label="Confirm new password" placeholder="Confirm new password" error={errors.confirmPassword?.message} rules={{ required: 'Confirm your password.' }} />
        {watch('confirmPassword') && watch('password') !== watch('confirmPassword') ? <p className="text-xs font-medium text-danger">Passwords do not match.</p> : null}
        <Button type="submit" size="lg" className="w-full" loading={loading}>Update password</Button>
      </form>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const { user } = useAuth();
  const [sent, setSent] = useState(false);
  const resend = async () => {
    try {
      await api.post('/auth/resend-verification');
      setSent(true);
      toast.success('Verification instructions requested.');
    } catch (error) {
      toast.error(error.message || 'Could not send verification.');
    }
  };
  return (
    <AuthShell title="Verify your email" subtitle="A verified email keeps your workspace secure and unlocks account recovery." footer={<Link to="/dashboard" className="font-semibold text-primary hover:underline">Continue to dashboard →</Link>} compact>
      <Card className="p-5">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-soft text-primary"><BadgeCheck className="h-6 w-6" /></span>
        <p className="mt-4 text-sm font-semibold text-ink">{user?.email_verified ? 'Your email is verified' : `We are ready to verify ${user?.email || 'your email'}`}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Email delivery is optional in this demo. You can keep using the workspace, and configure a provider later from Settings → Integrations.
        </p>
        {!user?.email_verified ? (
          <Button className="mt-4 w-full" variant={sent ? 'secondary' : 'primary'} onClick={resend} disabled={sent}>
            {sent ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {sent ? 'Instructions requested' : 'Resend verification'}
          </Button>
        ) : null}
      </Card>
    </AuthShell>
  );
}

export function UnauthorizedPage() {
  const { user } = useAuth();
  return (
    <AuthShell title="Access restricted" subtitle="Your current role does not include permission for that area." footer={<Link to="/dashboard" className="font-semibold text-primary hover:underline">← Back to dashboard</Link>} compact>
      <div className="rounded-xl border border-warning/25 bg-warning/5 p-5 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-warning" />
        <p className="mt-3 text-sm font-semibold text-ink">Administrator access required</p>
        <p className="mt-1 text-xs text-muted">
          You are currently signed in as {user?.role_label || 'User'}. To access admin pages, sign in via the administrator path (/admin).
        </p>
        <div className="mt-4">
          <Link to="/admin/login" className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110">
            <ShieldCheck className="h-3.5 w-3.5" /> Sign in as Administrator
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
