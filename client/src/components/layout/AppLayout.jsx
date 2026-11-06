import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Bell, Check, ChevronDown, ChevronsUpDown, Command, ExternalLink, LogOut, Menu, Monitor,
  Moon, PanelLeftClose, PanelLeftOpen, Search, Settings as SettingsIcon, Sun, User, X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api, unwrap } from '../../lib/api';
import { cn, timeAgo } from '../../lib/utils';
import { Avatar, Badge, Button, Dropdown, DropdownItem, IconButton, Spinner } from '../ui';
import { clientNav, staffNav } from './nav';
import CommandPalette from './CommandPalette';

function Brand({ collapsed = false }) {
  return (
    <div className={cn('flex items-center gap-2.5', collapsed && 'justify-center')}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-500 font-display text-base font-extrabold text-white shadow-glow">
        P
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-bold tracking-tight text-ink">PixelForge</span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Client OS</span>
        </span>
      ) : null}
    </div>
  );
}

function isPathActive(pathname, to, end) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

function SidebarContent({ collapsed, onNavigate, onCollapse }) {
  const { user, isClient, isAdmin, isManager } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const sections = isClient ? clientNav : staffNav;

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-16 items-center border-b border-line px-4', collapsed ? 'justify-center' : 'justify-between')}>
        <button type="button" onClick={() => navigate(isClient ? '/client-portal' : '/dashboard')} className="min-w-0">
          <Brand collapsed={collapsed} />
        </button>
        {!collapsed ? (
          <IconButton label="Collapse sidebar" onClick={onCollapse} className="hidden lg:inline-flex">
            <PanelLeftClose className="h-4 w-4" />
          </IconButton>
        ) : null}
      </div>

      <nav className={cn('flex-1 overflow-y-auto scrollbar-thin py-3', collapsed ? 'px-2' : 'px-3')}>
        {sections.map((section) => {
          const items = section.items.filter((item) => (!item.adminOnly || isAdmin) && (!item.managerOnly || isManager));
          if (!items.length) return null;
          return (
            <div key={section.label}>
              {!collapsed ? <p className="nav-section">{section.label}</p> : <div className="my-3 border-t border-line first:hidden" />}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = isPathActive(location.pathname, item.to, item.end);
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn('nav-link', active && 'nav-link-active', collapsed && 'justify-center px-2')}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge ? <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">{item.badge}</span> : null}
                        </>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className={cn('border-t border-line p-3', collapsed && 'px-2')}>
        {!collapsed ? (
          <div className="mb-3 rounded-xl border border-line bg-gradient-to-br from-primary-soft to-surface p-3">
            <div className="flex items-center justify-between">
              <Badge tone="primary">{user?.plan?.name || 'Pro'} plan</Badge>
              <span className="text-[10px] text-muted">{user?.subscription?.renewal_date ? `Renews ${new Date(user.subscription.renewal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}` : 'Active'}</span>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="flex justify-between text-[11px] text-muted">
                <span>AI requests</span>
                <span className="font-semibold text-ink">
                  {user?.usage?.ai_requests?.used ?? 0}/{user?.usage?.ai_requests?.limit >= 0 ? user.usage.ai_requests.limit : '∞'}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(100, ((user?.usage?.ai_requests?.used || 0) / Math.max(1, user?.usage?.ai_requests?.limit || 25)) * 100)}%` }}
                />
              </div>
            </div>
            <button type="button" onClick={() => navigate('/plans')} className="mt-3 w-full rounded-lg bg-primary px-2 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110">
              Manage plan
            </button>
          </div>
        ) : null}
        <div className={cn('flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between')}>
          <button type="button" onClick={() => navigate('/settings')} className={cn('flex min-w-0 items-center gap-2 rounded-lg p-1 text-left hover:bg-surface2', collapsed && 'justify-center')}>
            <Avatar name={user?.name} src={user?.avatar_url} size="sm" />
            {!collapsed ? (
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-ink">{user?.name}</span>
                <span className="block truncate text-[10px] text-muted">{user?.role_label}</span>
              </span>
            ) : null}
          </button>
          {!collapsed ? (
            <IconButton label="Open settings" onClick={() => navigate('/settings')}><SettingsIcon className="h-4 w-4" /></IconButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NotificationsMenu() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications', 'topbar'],
    queryFn: async () => {
      const response = await api.get('/notifications', { params: { limit: 8 } });
      return { items: response.data.data || [], unread: response.data.unread || 0 };
    },
    refetchInterval: 60_000,
  });

  const markAll = async () => {
    await api.put('/notifications/read-all');
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast.success('All notifications marked as read.');
  };

  const markOne = async (item) => {
    if (!item.is_read) {
      await api.put(`/notifications/${item.id}/read`);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
    if (item.link) navigate(item.link);
  };

  return (
    <Dropdown
      className="shrink-0"
      trigger={(
        <button type="button" className="icon-btn relative" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5" />
          {data?.unread ? (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[9px] font-bold text-white">
              {data.unread > 9 ? '9+' : data.unread}
            </span>
          ) : null}
        </button>
      )}
    >
      <div className="w-[340px] max-w-[calc(100vw-2rem)]">
        <div className="flex items-center justify-between px-2 pb-2 pt-1">
          <div>
            <p className="text-sm font-semibold text-ink">Notifications</p>
            <p className="text-[11px] text-muted">{data?.unread || 0} unread</p>
          </div>
          {data?.unread ? (
            <button type="button" onClick={markAll} className="text-[11px] font-semibold text-primary hover:underline">Mark all read</button>
          ) : null}
        </div>
        <div className="max-h-[330px] overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="grid place-items-center py-8"><Spinner className="h-5 w-5" /></div>
          ) : data?.items?.length ? (
            data.items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => markOne(item)}
                className={cn('flex w-full gap-2.5 rounded-lg p-2 text-left transition hover:bg-surface2', !item.is_read && 'bg-primary-soft/40')}
              >
                <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', item.is_read ? 'bg-line' : 'bg-primary')} />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-ink">{item.title}</span>
                  <span className="mt-0.5 line-clamp-2 block text-[11px] leading-relaxed text-muted">{item.message}</span>
                  <span className="mt-0.5 block text-[10px] text-muted/80">{timeAgo(item.created_at)}</span>
                </span>
              </button>
            ))
          ) : (
            <p className="px-2 py-8 text-center text-xs text-muted">You are all caught up.</p>
          )}
        </div>
        <div className="mt-1 border-t border-line pt-1">
          <button type="button" onClick={() => navigate('/notifications')} className="w-full rounded-lg px-2 py-2 text-center text-[11px] font-semibold text-primary hover:bg-surface2">
            View all notifications
          </button>
        </div>
      </div>
    </Dropdown>
  );
}

function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  const items = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];
  const current = items.find((item) => item.value === theme) || items[2];
  return (
    <Dropdown
      trigger={<button type="button" className="icon-btn" aria-label="Change theme"><current.icon className="h-4.5 w-4.5" /></button>}
    >
      <p className="px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Theme</p>
      {items.map((item) => (
        <DropdownItem key={item.value} icon={item.icon} onClick={() => setTheme(item.value)}>
          <span className="flex-1">{item.label}</span>
          {theme === item.value ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
        </DropdownItem>
      ))}
    </Dropdown>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <Dropdown
      trigger={(
        <button type="button" className="flex items-center gap-2 rounded-xl px-1 py-1 transition hover:bg-surface2" aria-label="User menu">
          <Avatar name={user?.name} src={user?.avatar_url} size="sm" />
          <span className="hidden min-w-0 text-left md:block">
            <span className="block max-w-[130px] truncate text-xs font-semibold text-ink">{user?.name}</span>
            <span className="block text-[10px] text-muted">{user?.role_label}</span>
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-muted md:block" />
        </button>
      )}
    >
      <div className="mb-1 border-b border-line px-2.5 pb-2 pt-1">
        <p className="truncate text-xs font-semibold text-ink">{user?.name}</p>
        <p className="truncate text-[10px] text-muted">{user?.email}</p>
      </div>
      <DropdownItem icon={User} onClick={() => navigate('/settings/profile')}>My profile</DropdownItem>
      <DropdownItem icon={SettingsIcon} onClick={() => navigate('/settings')}>Settings</DropdownItem>
      <DropdownItem icon={ExternalLink} onClick={() => navigate('/plans')}>Plan & billing</DropdownItem>
      <div className="my-1 border-t border-line" />
      <DropdownItem icon={LogOut} danger onClick={async () => { await logout(); navigate('/login'); }}>
        Sign out
      </DropdownItem>
    </Dropdown>
  );
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cms_sidebar_collapsed') === 'true');
  const location = useLocation();
  const { isClient } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('cms_sidebar_collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const crumbs = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => ({
      label: segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      to: `/${segments.slice(0, index + 1).join('/')}`,
    }));
  }, [location.pathname]);

  return (
    <div className="min-h-full bg-canvas">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-surface transition-[width] duration-200 lg:block',
        collapsed ? 'w-[76px]' : 'w-[264px]',
      )}>
        <SidebarContent collapsed={collapsed} onCollapse={() => setCollapsed(true)} />
      </aside>

      {collapsed ? (
        <button
          type="button"
          aria-label="Expand sidebar"
          onClick={() => setCollapsed(false)}
          className="fixed bottom-5 left-4 z-40 hidden h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-muted shadow-soft hover:text-ink lg:grid"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      ) : null}

      {mobileOpen ? (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-[280px] animate-slide-in border-r border-line bg-surface">
            <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 z-10 icon-btn">
              <X className="h-4 w-4" />
            </button>
            <SidebarContent collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className={cn('flex min-h-full flex-col transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
            <IconButton label="Open menu" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </IconButton>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="group flex h-9 flex-1 items-center gap-2 rounded-xl border border-line bg-surface2/70 px-3 text-left text-xs text-muted transition hover:border-primary/30 hover:bg-surface sm:max-w-sm"
            >
              <Search className="h-4 w-4" />
              <span className="flex-1 truncate">Search workspace…</span>
              <kbd className="hidden items-center gap-0.5 rounded-md border border-line bg-surface px-1.5 py-0.5 text-[10px] font-semibold sm:flex">
                <Command className="h-2.5 w-2.5" /> K
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-1">
              <ThemeMenu />
              <NotificationsMenu />
              <div className="mx-1 hidden h-6 w-px bg-line sm:block" />
              <UserMenu />
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-4 pb-2 text-[11px] text-muted sm:px-6">
            <span className="font-medium text-ink">{isClient ? 'Client portal' : 'Workspace'}</span>
            {crumbs.map((crumb) => (
              <span key={crumb.to} className="flex items-center gap-1.5">
                <span className="text-muted/50">/</span>
                <span className="capitalize">{crumb.label}</span>
              </span>
            ))}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1500px]">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-line px-4 py-4 text-center text-[11px] text-muted sm:px-6">
          PixelForge Client OS · Local demo workspace · <button type="button" className="font-medium text-primary hover:underline" onClick={() => setPaletteOpen(true)}>Press Ctrl+K to search</button>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
