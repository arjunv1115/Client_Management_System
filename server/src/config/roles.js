export const ROLES = ['super_admin', 'admin', 'manager', 'team_member', 'client'];
export const ADMIN_ROLES = ['super_admin', 'admin'];
export const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'team_member'];
export const MANAGER_ROLES = ['super_admin', 'admin', 'manager'];
export const FINANCE_ROLES = ['super_admin', 'admin'];

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  team_member: 'Team Member',
  client: 'Client',
};

export const ROLE_LEVEL = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  team_member: 40,
  client: 20,
};

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}
