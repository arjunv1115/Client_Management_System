import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LifeBuoy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from '../components/ui';

export default function NotFoundPage() {
  const { user, isClient } = useAuth();
  const home = !user ? '/' : isClient ? '/client-portal' : '/dashboard';

  return (
    <div className="grid min-h-[70vh] place-items-center bg-canvas px-4 py-16">
      <Card className="w-full max-w-lg text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Compass className="h-7 w-7" />
        </div>
        <p className="mt-5 font-display text-5xl font-extrabold tracking-tight text-ink">404</p>
        <h1 className="mt-2 font-display text-xl font-bold text-ink">This page wandered off</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          The link may be outdated, the record may have been deleted, or you may not have access to this area.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link to={home}>
            <Button>
              <ArrowLeft className="h-4 w-4" /> {user ? 'Back to dashboard' : 'Back to home'}
            </Button>
          </Link>
          <Link to={user ? (isClient ? '/help' : '/help') : '/login'}>
            <Button variant="secondary">
              <LifeBuoy className="h-4 w-4" /> {user ? 'Get help' : 'Sign in'}
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
