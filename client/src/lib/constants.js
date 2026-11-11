export const DEMO_USERS = [
  { label: 'User (Arjun)', email: 'varjunarjun9@gmail.com', password: 'Arjun@123', role: 'user', hint: 'User login' },
  { label: 'Admin (Arjun)', email: 'varjunarjun9@gmail.com', password: 'Arjun@123', role: 'admin', hint: 'Admin login' },
  { label: 'Super Admin', email: 'superadmin@cms.dev', password: 'Admin@123', role: 'super_admin', hint: 'Platform-wide access' },
  { label: 'Admin', email: 'admin@cms.dev', password: 'Admin@123', role: 'admin', hint: 'Organization owner' },
  { label: 'Manager', email: 'manager@cms.dev', password: 'Manager@123', role: 'manager', hint: 'Delivery & clients' },
  { label: 'Team Member', email: 'member@cms.dev', password: 'Member@123', role: 'team_member', hint: 'Assigned work' },
  { label: 'Client', email: 'client@cms.dev', password: 'Client@123', role: 'client', hint: 'Portal access only' },
];

export const ADMIN_ROLES = ['super_admin', 'admin'];
export const MANAGER_ROLES = ['super_admin', 'admin', 'manager'];
export const STAFF_ROLES = ['super_admin', 'admin', 'manager', 'team_member', 'user'];

export const TASK_STATUSES = ['To Do', 'In Progress', 'Review', 'Completed'];

export const PAYMENT_METHODS = ['UPI', 'Bank Transfer', 'Razorpay', 'Card', 'Cash', 'Cheque'];
export const PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
