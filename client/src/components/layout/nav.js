import {
  ArrowLeftRight, BarChart3, Bell, BriefcaseBusiness, CalendarDays, CheckSquare, CreditCard,
  FileText, FolderKanban, Gift, Globe2, HandCoins, LayoutDashboard, LifeBuoy, MessageSquare,
  Package, ReceiptText, Settings, ShieldCheck, Sparkles, Target, UserCog, Users, Wallet,
} from 'lucide-react';

export const staffNav = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'AI Workspace', to: '/ai', icon: Sparkles, badge: 'AI' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Leads', to: '/leads', icon: Target },
      { label: 'Sales Pipeline', to: '/sales-pipeline', icon: BarChart3 },
      { label: 'Clients', to: '/clients', icon: Users },
    ],
  },
  {
    label: 'Delivery',
    items: [
      { label: 'Projects', to: '/projects', icon: FolderKanban },
      { label: 'Tasks', to: '/tasks', icon: CheckSquare },
      { label: 'Meetings', to: '/meetings', icon: CalendarDays },
      { label: 'Messages', to: '/messages', icon: MessageSquare },
      { label: 'Documents', to: '/documents', icon: FileText },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Revenue', to: '/revenue-management', icon: HandCoins, managerOnly: true },
      { label: 'Payments', to: '/payments', icon: CreditCard, managerOnly: true },
      { label: 'Transactions', to: '/transactions', icon: ArrowLeftRight, managerOnly: true },
      { label: 'Expenses', to: '/expenses', icon: ReceiptText, managerOnly: true },
      { label: 'Retainers', to: '/active-retainers', icon: Package, managerOnly: true },
      { label: 'Payroll', to: '/payroll', icon: Wallet, adminOnly: true },
      { label: 'Billing', to: '/billing', icon: BriefcaseBusiness, adminOnly: true },
    ],
  },
  {
    label: 'Growth',
    items: [
      { label: 'Public Page', to: '/public-page', icon: Globe2 },
      { label: 'Referrals', to: '/referrals', icon: Gift },
      { label: 'Plans & Pricing', to: '/plans', icon: ShieldCheck },
    ],
  },
  {
    label: 'Manage',
    items: [
      { label: 'Team', to: '/team', icon: UserCog },
      { label: 'Admin', to: '/admin', icon: ShieldCheck, adminOnly: true },
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Help & Support', to: '/help', icon: LifeBuoy },
    ],
  },
];

export const clientNav = [
  {
    label: 'Client portal',
    items: [
      { label: 'Overview', to: '/client-portal', icon: LayoutDashboard, end: true },
      { label: 'Projects', to: '/client-portal/projects', icon: FolderKanban },
      { label: 'Documents', to: '/client-portal/documents', icon: FileText },
      { label: 'Invoices', to: '/client-portal/invoices', icon: CreditCard },
      { label: 'Announcements', to: '/client-portal/announcements', icon: Bell },
      { label: 'Meetings', to: '/client-portal/meetings', icon: CalendarDays },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Messages', to: '/messages', icon: MessageSquare },
      { label: 'Help & AI', to: '/help', icon: LifeBuoy },
      { label: 'Settings', to: '/settings', icon: Settings },
    ],
  },
];

export const settingsTabs = [
  { label: 'Profile', value: 'profile' },
  { label: 'Organization', value: 'organization' },
  { label: 'Appearance', value: 'appearance' },
  { label: 'Notifications', value: 'notifications' },
  { label: 'Security', value: 'security' },
  { label: 'Integrations', value: 'integrations' },
  { label: 'Data & Export', value: 'data' },
];
