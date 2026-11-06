import { Outlet, Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import { ClientOnly, ProtectedRoute, RoleRoute } from './components/layout/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFound';
import {
  AdminLoginPage, ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage,
  UnauthorizedPage, VerifyEmailPage,
} from './pages/auth';
import AdminPage from './pages/admin';
import AiWorkspacePage from './pages/ai';
import BillingPage from './pages/billing';
import { ClientDetailPage, ClientsPage } from './pages/clients';
import { DocumentsPage } from './pages/documents';
import { ExpensesPage, PaymentsPage, PayrollPage, RetainersPage, RevenuePage, TransactionsPage } from './pages/finance';
import HelpPage from './pages/help';
import { LeadDetailPage, LeadsPage, SalesPipelinePage } from './pages/leads';
import { MeetingsPage } from './pages/meetings';
import MessagesPage from './pages/messages';
import NotificationsPage from './pages/notifications';
import PlansPage from './pages/plans';
import ClientPortalPage from './pages/portal';
import { ProjectDetailPage, ProjectsPage } from './pages/projects';
import { LandingPage, PublicBusinessPage, PublicPageManager } from './pages/public';
import ReferralsPage from './pages/referrals';
import SettingsPage from './pages/settings';
import { TasksPage } from './pages/tasks';
import TeamPage from './pages/team';

const ADMIN_ROLES = ['super_admin', 'admin'];
const MANAGER_ROLES = ['super_admin', 'admin', 'manager'];

function StaffOnly() {
  return (
    <RoleRoute>
      <Outlet />
    </RoleRoute>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/p/:slug" element={<PublicBusinessPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Authenticated workspace */}
      <Route
        element={(
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        )}
      >
        {/* Shared by staff and clients */}
        <Route path="messages" element={<MessagesPage />} />
        <Route path="help" element={<HelpPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="settings/:tab" element={<SettingsPage />} />

        {/* Staff workspace */}
        <Route element={<StaffOnly />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="ai" element={<AiWorkspacePage />} />

          <Route path="leads" element={<LeadsPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          <Route path="sales-pipeline" element={<SalesPipelinePage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />

          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="meetings" element={<MeetingsPage />} />
          <Route path="documents" element={<DocumentsPage />} />

          <Route
            path="revenue-management"
            element={<RoleRoute roles={MANAGER_ROLES}><RevenuePage /></RoleRoute>}
          />
          <Route
            path="payments"
            element={<RoleRoute roles={MANAGER_ROLES}><PaymentsPage /></RoleRoute>}
          />
          <Route
            path="transactions"
            element={<RoleRoute roles={MANAGER_ROLES}><TransactionsPage /></RoleRoute>}
          />
          <Route
            path="expenses"
            element={<RoleRoute roles={MANAGER_ROLES}><ExpensesPage /></RoleRoute>}
          />
          <Route
            path="active-retainers"
            element={<RoleRoute roles={MANAGER_ROLES}><RetainersPage /></RoleRoute>}
          />
          <Route
            path="payroll"
            element={<RoleRoute roles={ADMIN_ROLES}><PayrollPage /></RoleRoute>}
          />
          <Route
            path="billing"
            element={<RoleRoute roles={ADMIN_ROLES}><BillingPage /></RoleRoute>}
          />

          <Route path="plans" element={<PlansPage />} />
          <Route path="team" element={<TeamPage />} />
          <Route
            path="referrals"
            element={<RoleRoute roles={MANAGER_ROLES}><ReferralsPage /></RoleRoute>}
          />
          <Route
            path="public-page"
            element={<RoleRoute roles={ADMIN_ROLES}><PublicPageManager /></RoleRoute>}
          />
          <Route
            path="admin"
            element={<RoleRoute roles={ADMIN_ROLES}><AdminPage /></RoleRoute>}
          />
        </Route>

        {/* Client portal */}
        <Route element={<ClientOnly><Outlet /></ClientOnly>}>
          <Route path="client-portal" element={<ClientPortalPage section="overview" />} />
          <Route path="client-portal/projects" element={<ClientPortalPage section="projects" />} />
          <Route path="client-portal/documents" element={<ClientPortalPage section="documents" />} />
          <Route path="client-portal/invoices" element={<ClientPortalPage section="invoices" />} />
          <Route path="client-portal/announcements" element={<ClientPortalPage section="announcements" />} />
          <Route path="client-portal/meetings" element={<ClientPortalPage section="meetings" />} />
        </Route>
      </Route>

      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
