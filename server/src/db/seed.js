import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';

const id = () => crypto.randomUUID();
const now = new Date();

const at = (daysOffset = 0, hour = 10, minute = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const dateOnly = (daysOffset = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
};
const monthDay = (monthsAgo, day = 12, hour = 11) =>
  new Date(now.getFullYear(), now.getMonth() - monthsAgo, day, hour, 0, 0).toISOString();
const monthDate = (monthsAgo, day = 12) => monthDay(monthsAgo, day).slice(0, 10);
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

const hash = (password) => bcrypt.hashSync(password, 10);

// ---------------------------------------------------------------- identities
const ORG = 'org_demo';
const ADMIN = 'usr_admin';
const SUPER = 'usr_super';
const MANAGER = 'usr_manager';
const MEMBER = 'usr_member';
const CLIENT_USER = 'usr_client';
const ARJUN = 'ea028906-64cd-47c1-80c8-6f181027fc56';

const clientsSeed = [
  {
    id: 'cl_acme', name: 'Acme Studios', company: 'Acme Studios Pvt Ltd', email: 'hello@acmestudios.in',
    phone: '+91 98200 11223', alt_phone: '+91 22 4000 1122', website: 'https://acmestudios.in',
    billing_address: '14, Design Avenue, Bandra West, Mumbai 400050', location: 'Mumbai, India',
    gst_number: '27AACCA1234F1Z5', industry: 'Media & Entertainment', source: 'Referral',
    manager_id: MANAGER, status: 'active', notes: 'Long-term retainer client. Prefers Friday check-ins.',
    created_at: monthDay(9, 4), updated_at: at(-3), deleted_at: null,
  },
  {
    id: 'cl_bright', name: 'Brightline Media', company: 'Brightline Media LLP', email: 'accounts@brightline.co',
    phone: '+91 99870 55432', alt_phone: '', website: 'https://brightline.co',
    billing_address: '7th Floor, Cyber Greens, Gurugram 122002', location: 'Gurugram, India',
    gst_number: '06AABCB9876P1Z2', industry: 'Marketing', source: 'LinkedIn',
    manager_id: ADMIN, status: 'active', notes: 'Quarterly campaign planning cycle.',
    created_at: monthDay(8, 22), updated_at: at(-6), deleted_at: null,
  },
  {
    id: 'cl_nova', name: 'NovaTech Solutions', company: 'NovaTech Solutions Inc.', email: 'ops@novatech.io',
    phone: '+1 415 555 0142', alt_phone: '', website: 'https://novatech.io',
    billing_address: '500 Market Street, San Francisco, CA 94105', location: 'San Francisco, USA',
    gst_number: '', industry: 'SaaS', source: 'Website',
    manager_id: MANAGER, status: 'active', notes: 'US-based, invoicing in INR with conversion note.',
    created_at: monthDay(7, 8), updated_at: at(-1), deleted_at: null,
  },
  {
    id: 'cl_green', name: 'GreenLeaf Organics', company: 'GreenLeaf Organics Pvt Ltd', email: 'care@greenleaf.in',
    phone: '+91 98765 22110', alt_phone: '', website: 'https://greenleaf.in',
    billing_address: '22, Palm Grove, Indiranagar, Bengaluru 560038', location: 'Bengaluru, India',
    gst_number: '29AAGCG4455K1Z9', industry: 'E-commerce', source: 'Google Ads',
    manager_id: ADMIN, status: 'active', notes: 'Store launch completed. Maintenance retainer offered.',
    created_at: monthDay(6, 15), updated_at: at(-12), deleted_at: null,
  },
  {
    id: 'cl_peak', name: 'Peak Fitness', company: 'Peak Fitness Studio', email: 'team@peakfitness.in',
    phone: '+91 98111 78654', alt_phone: '+91 98111 78655', website: 'https://peakfitness.in',
    billing_address: 'Shop 3, Galleria Market, Pune 411001', location: 'Pune, India',
    gst_number: '27AAECP7788M1Z1', industry: 'Health & Wellness', source: 'Cold Call',
    manager_id: MANAGER, status: 'active', notes: 'Mobile app phase 2 pending approval.',
    created_at: monthDay(5, 9), updated_at: at(-2), deleted_at: null,
  },
  {
    id: 'cl_urban', name: 'UrbanNest Interiors', company: 'UrbanNest Design Studio', email: 'design@urbannest.in',
    phone: '+91 90045 33221', alt_phone: '', website: 'https://urbannest.in',
    billing_address: '88, Lake Road, Kolkata 700029', location: 'Kolkata, India',
    gst_number: '19AAFCU3344Q1Z7', industry: 'Interior Design', source: 'Event',
    manager_id: MANAGER, status: 'active', notes: 'Referral partner. Looking for a monthly content package.',
    created_at: monthDay(4, 19), updated_at: at(-8), deleted_at: null,
  },
  {
    id: 'cl_cloud', name: 'CloudSprint', company: 'CloudSprint Technologies', email: 'billing@cloudsprint.dev',
    phone: '+91 96670 11886', alt_phone: '', website: 'https://cloudsprint.dev',
    billing_address: 'T-Hub, Raidurg, Hyderabad 500081', location: 'Hyderabad, India',
    gst_number: '36AACCC5566R1Z3', industry: 'Cloud Services', source: 'Referral',
    manager_id: ADMIN, status: 'active', notes: 'Annual support contract up for renewal in 60 days.',
    created_at: monthDay(3, 2), updated_at: at(-4), deleted_at: null,
  },
  {
    id: 'cl_loom', name: 'Loom & Thread', company: 'Loom & Thread Fashions', email: 'studio@loomthread.com',
    phone: '+91 97654 98001', alt_phone: '', website: 'https://loomthread.com',
    billing_address: '31, Textile Market, Surat 395003', location: 'Surat, India',
    gst_number: '24AAECL1122T1Z8', industry: 'Fashion', source: 'Website',
    manager_id: MANAGER, status: 'prospect', notes: 'Awaiting brand guidelines from client.',
    created_at: monthDay(1, 21), updated_at: at(-1), deleted_at: null,
  },
];

const leadStages = [
  { id: 'ls_new', name: 'New', color: '#6366f1', position: 1 },
  { id: 'ls_contacted', name: 'Contacted', color: '#0ea5e9', position: 2 },
  { id: 'ls_qualified', name: 'Qualified', color: '#14b8a6', position: 3 },
  { id: 'ls_proposal', name: 'Proposal Sent', color: '#f59e0b', position: 4 },
  { id: 'ls_negotiation', name: 'Negotiation', color: '#f97316', position: 5 },
  { id: 'ls_won', name: 'Won', color: '#10b981', position: 6 },
  { id: 'ls_lost', name: 'Lost', color: '#f43f5e', position: 7 },
];

const leadsSeed = [
  ['Rahul Mehta', 'Nexa Retail', 'rahul@nexaretail.in', '+91 98860 10101', 'Website', 'E-commerce Website', 180000, 'ls_new', 'high', 'open', 3],
  ['Sneha Kapoor', 'BluePeak Ventures', 'sneha@bluepeak.vc', '+91 97670 20202', 'Referral', 'Brand Identity', 95000, 'ls_new', 'medium', 'open', 5],
  ['Amit Verma', 'Verma Legal', 'amit@vermalegal.in', '+91 98330 30303', 'LinkedIn', 'Company Website', 60000, 'ls_new', 'low', 'open', 7],
  ['Priya Nair', 'FreshBasket', 'priya@freshbasket.co', '+91 99400 40404', 'Google Ads', 'Mobile App', 320000, 'ls_contacted', 'high', 'open', 4],
  ['Karan Shah', 'Shah Motors', 'karan@shahmotors.in', '+91 98250 50505', 'Cold Call', 'Digital Marketing', 75000, 'ls_contacted', 'medium', 'open', 9],
  ['Ananya Rao', 'Terra Living', 'ananya@terraliving.com', '+91 96860 60606', 'Website', 'Interior Visualisation', 140000, 'ls_qualified', 'high', 'open', 2],
  ['Vikram Singh', 'Singh Logistics', 'vikram@singhlogistics.in', '+91 98110 70707', 'Event', 'CRM Dashboard', 250000, 'ls_qualified', 'high', 'open', 6],
  ['Meera Iyer', 'Iyer Foods', 'meera@iyerfoods.in', '+91 98450 80808', 'Referral', 'Packaging Design', 80000, 'ls_qualified', 'medium', 'open', 11],
  ['Arjun Gupta', 'PixelWorks', 'arjun@pixelworks.io', '+91 99990 90909', 'Website', 'SaaS Website Redesign', 210000, 'ls_proposal', 'high', 'open', 8],
  ['Divya Menon', 'Wellness Co', 'divya@wellnessco.in', '+91 97440 11111', 'LinkedIn', 'Content Retainer', 45000, 'ls_proposal', 'medium', 'open', 13],
  ['Rohit Malhotra', 'Malhotra Realty', 'rohit@malhotrarealty.in', '+91 98180 22222', 'Referral', 'Property Portal', 380000, 'ls_negotiation', 'high', 'open', 1],
  ['Ishita Bose', 'Bose Couture', 'ishita@bosecouture.com', '+91 98300 33333', 'Event', 'Brand Campaign', 120000, 'ls_negotiation', 'medium', 'open', 15],
  ['Nikhil Jain', 'Jain & Sons', 'nikhil@jainsons.in', '+91 98910 44444', 'Google Ads', 'E-commerce Website', 165000, 'ls_won', 'high', 'won', 18],
  ['Pooja Desai', 'Desai Clinic', 'pooja@desaiclinic.in', '+91 98240 55555', 'Website', 'Local SEO', 55000, 'ls_won', 'medium', 'won', 22],
  ['Sanjay Pillai', 'Pillai Exports', 'sanjay@pillaiexports.com', '+91 98470 66666', 'Cold Call', 'Trade Website', 90000, 'ls_lost', 'low', 'lost', 25],
];

const projectStages = [
  { id: 'ps_new', name: 'New', color: '#6366f1', position: 1 },
  { id: 'ps_ongoing', name: 'Ongoing', color: '#0ea5e9', position: 2 },
  { id: 'ps_completed', name: 'Completed', color: '#10b981', position: 3 },
];

const projectsSeed = [
  ['pr_website', 'Acme Website Redesign', 'cl_acme', 'Web Design', 250000, 150000, 'ongoing', 65, 'high', -40, 25],
  ['pr_brand', 'Brightline Brand Refresh', 'cl_bright', 'Branding', 180000, 90000, 'ongoing', 45, 'high', -25, 35],
  ['pr_saas', 'NovaTech SaaS Dashboard', 'cl_nova', 'Product Design', 480000, 300000, 'ongoing', 80, 'high', -60, 15],
  ['pr_store', 'GreenLeaf Store Launch', 'cl_green', 'E-commerce', 220000, 220000, 'completed', 100, 'medium', -90, -10],
  ['pr_app', 'Peak Fitness Mobile App', 'cl_peak', 'Mobile App', 350000, 100000, 'ongoing', 30, 'medium', -30, 60],
  ['pr_interior', 'UrbanNest Office Experience', 'cl_urban', 'Interior Design', 160000, 80000, 'ongoing', 55, 'medium', -20, 40],
  ['pr_cloud', 'CloudSprint Migration', 'cl_cloud', 'Cloud', 300000, 300000, 'completed', 100, 'high', -120, -30],
  ['pr_campaign', 'Brightline Q3 Campaign', 'cl_bright', 'Marketing', 140000, 140000, 'completed', 100, 'medium', -75, -20],
  ['pr_crm', 'Acme CRM Integration', 'cl_acme', 'Development', 190000, 60000, 'ongoing', 35, 'high', -12, 50],
];

const retainersSeed = [
  {
    id: 'rt_acme', name: 'Acme Growth Retainer', client_id: 'cl_acme', project_id: 'pr_website',
    description: 'Design support, website updates and monthly performance reporting.',
    monthly_amount: 75000, billing_cycle: 'monthly', start_date: monthDate(8, 1),
    end_date: dateOnly(120), next_billing_date: dateOnly(10), payment_status: 'paid', status: 'active',
    created_at: monthDay(8, 1),
  },
  {
    id: 'rt_bright', name: 'Brightline Content Retainer', client_id: 'cl_bright', project_id: 'pr_brand',
    description: '12 social creatives, 4 blogs and campaign support per month.',
    monthly_amount: 45000, billing_cycle: 'monthly', start_date: monthDate(6, 5),
    end_date: dateOnly(75), next_billing_date: dateOnly(18), payment_status: 'pending', status: 'active',
    created_at: monthDay(6, 5),
  },
  {
    id: 'rt_nova', name: 'NovaTech Product Support', client_id: 'cl_nova', project_id: 'pr_saas',
    description: 'Ongoing product design support and release QA.',
    monthly_amount: 90000, billing_cycle: 'monthly', start_date: monthDate(4, 2),
    end_date: dateOnly(14), next_billing_date: dateOnly(2), payment_status: 'paid', status: 'active',
    created_at: monthDay(4, 2),
  },
  {
    id: 'rt_green', name: 'GreenLeaf Maintenance', client_id: 'cl_green', project_id: 'pr_store',
    description: 'Store maintenance and quarterly feature updates.',
    monthly_amount: 25000, billing_cycle: 'quarterly', start_date: monthDate(3, 18),
    end_date: dateOnly(9), next_billing_date: dateOnly(21), payment_status: 'pending', status: 'paused',
    created_at: monthDay(3, 18),
  },
];

const projects = projectsSeed.map(([pid, name, clientId, category, budget, paid, status, progress, priority, start, deadline]) => ({
  id: pid, org_id: ORG, name, description: `${name} delivered by the studio team.`,
  client_id: clientId, category, start_date: dateOnly(start), deadline: dateOnly(deadline),
  budget, amount_paid: paid, team: [MANAGER, MEMBER].slice(0, priority === 'high' ? 2 : 1),
  priority, progress, status, stage_id: status === 'completed' ? 'ps_completed' : status === 'ongoing' ? 'ps_ongoing' : 'ps_new',
  created_at: monthDay(Math.max(0, Math.round(Math.abs(start) / 30)), 3), updated_at: at(-2), deleted_at: null,
}));

const payments = [];
const transactions = [];
const expenses = [];

const paymentSeed = [
  ['pay_1', 'cl_acme', 'pr_website', 150000, 'completed', 'UPI', -5, 'Project Revenue', 'Milestone 2 — design handoff'],
  ['pay_2', 'cl_bright', 'pr_brand', 45000, 'completed', 'Bank Transfer', -12, 'Monthly Retainer Revenue', 'Monthly content retainer'],
  ['pay_3', 'cl_nova', 'pr_saas', 90000, 'completed', 'Razorpay', -18, 'Monthly Retainer Revenue', 'Product support retainer'],
  ['pay_4', 'cl_acme', 'pr_crm', 60000, 'completed', 'Bank Transfer', -35, 'Project Revenue', 'CRM discovery milestone'],
  ['pay_5', 'cl_green', 'pr_store', 60000, 'completed', 'UPI', -48, 'Project Revenue', 'Store launch balance'],
  ['pay_6', 'cl_bright', 'pr_campaign', 120000, 'completed', 'Bank Transfer', -63, 'Project Revenue', 'Q3 campaign final invoice'],
  ['pay_7', 'cl_peak', 'pr_app', 50000, 'completed', 'Razorpay', -75, 'Project Revenue', 'Mobile app phase 1'],
  ['pay_8', 'cl_acme', 'pr_website', 75000, 'completed', 'Bank Transfer', -92, 'Monthly Retainer Revenue', 'Growth retainer'],
  ['pay_9', 'cl_urban', 'pr_interior', 80000, 'completed', 'UPI', -108, 'Project Revenue', 'Concept approval'],
  ['pay_10', 'cl_nova', 'pr_saas', 180000, 'completed', 'Razorpay', -132, 'Project Revenue', 'Dashboard build milestone'],
  ['pay_11', 'cl_loom', null, 65000, 'completed', 'Bank Transfer', -150, 'Consultation Revenue', 'Brand strategy workshop'],
  ['pay_12', 'cl_cloud', 'pr_cloud', 140000, 'completed', 'Bank Transfer', -168, 'Project Revenue', 'Migration phase 2'],
  ['pay_13', 'cl_acme', 'pr_website', 60000, 'pending', 'Bank Transfer', 2, 'Project Revenue', 'Milestone 3 invoice'],
  ['pay_14', 'cl_bright', 'pr_brand', 45000, 'pending', 'UPI', 4, 'Monthly Retainer Revenue', 'November retainer'],
  ['pay_15', 'cl_peak', 'pr_app', 30000, 'failed', 'Razorpay', -3, 'Project Revenue', 'Phase 2 advance'],
  ['pay_16', 'cl_urban', 'pr_interior', 20000, 'refunded', 'Razorpay', -20, 'Service Revenue', 'Scope adjustment refund'],
];

paymentSeed.forEach(([pid, clientId, projectId, amount, status, method, days, category, description], index) => {
  const client = clientsSeed.find((c) => c.id === clientId);
  payments.push({
    id: pid, org_id: ORG, client_id: clientId, project_id: projectId,
    invoice_number: `INV-${new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`,
    amount, method, transaction_id: method === 'Razorpay' ? `pay_rzp_${100000 + index}` : `TXN${880000 + index}`,
    payment_date: dateOnly(days), status, description, gateway: method === 'Razorpay' ? 'razorpay' : 'manual',
    created_at: at(days), updated_at: at(days), deleted_at: null,
  });
  transactions.push({
    id: `tx_${pid}`, org_id: ORG, client_id: clientId, payment_id: pid, expense_id: null,
    title: `${client?.name || 'Client'} — ${description}`, type: 'income', revenue_category: category,
    amount, transaction_date: dateOnly(days), method, status: status === 'refunded' ? 'cancelled' : status === 'failed' ? 'failed' : status,
    description, created_at: at(days), updated_at: at(days), deleted_at: null,
  });
});

const extraIncome = [
  ['Consultation — startup positioning', 'Consultation Revenue', 35000, -8, 'UPI'],
  ['Maintenance — Acme SEO', 'Maintenance Revenue', 28000, -55, 'Bank Transfer'],
  ['Service — design audit', 'Service Revenue', 42000, -115, 'Razorpay'],
  ['Consultation — pricing workshop', 'Consultation Revenue', 30000, -145, 'UPI'],
];
extraIncome.forEach(([title, category, amount, days, method], index) => {
  transactions.push({
    id: `tx_extra_${index}`, org_id: ORG, client_id: 'cl_acme', payment_id: null, expense_id: null,
    title, type: 'income', revenue_category: category, amount, transaction_date: dateOnly(days),
    method, status: 'completed', description: title, created_at: at(days), updated_at: at(days), deleted_at: null,
  });
});

const expenseSeed = [
  ['Software Subscriptions', 'Figma, Adobe and Notion subscriptions', 18500, -4, 'Card'],
  ['Marketing', 'LinkedIn campaign boost', 32000, -16, 'Card'],
  ['Office Rent', 'Studio rent — current month', 45000, -20, 'Bank Transfer'],
  ['Equipments', 'New design workstation monitor', 28000, -37, 'Card'],
  ['Utilities', 'Internet and electricity', 8600, -47, 'UPI'],
  ['Contractors', 'Freelance copywriter', 22000, -61, 'UPI'],
  ['Marketing', 'Google Ads test budget', 40000, -80, 'Card'],
  ['Software Subscriptions', 'Analytics and hosting', 15000, -96, 'Card'],
  ['Office Rent', 'Studio rent — previous month', 45000, -110, 'Bank Transfer'],
  ['Travel', 'Client meeting travel — Bengaluru', 18400, -128, 'Card'],
];
expenseSeed.forEach(([category, description, amount, days, method], index) => {
  const expId = `exp_${index + 1}`;
  expenses.push({
    id: expId, org_id: ORG, category, description, amount, expense_date: dateOnly(days),
    method, recurring: ['Office Rent', 'Software Subscriptions'].includes(category),
    attachment_url: '', created_at: at(days), updated_at: at(days), deleted_at: null,
  });
  transactions.push({
    id: `tx_${expId}`, org_id: ORG, client_id: null, payment_id: null, expense_id: expId,
    title: `${category} — ${description}`, type: 'expense', revenue_category: null, amount,
    transaction_date: dateOnly(days), method, status: 'completed', description,
    created_at: at(days), updated_at: at(days), deleted_at: null,
  });
});

const invoicesSeed = [
  ['inv_1', 'cl_acme', 'pr_website', 60000, 'pending', -2, 12],
  ['inv_2', 'cl_bright', 'pr_brand', 45000, 'overdue', -18, -4],
  ['inv_3', 'cl_nova', 'pr_saas', 90000, 'paid', -12, 2],
  ['inv_4', 'cl_peak', 'pr_app', 30000, 'draft', 0, 15],
  ['inv_5', 'cl_green', 'pr_store', 25000, 'paid', -40, -25],
  ['inv_6', 'cl_cloud', 'pr_cloud', 140000, 'paid', -30, -15],
];

const tasksSeed = [
  ['Finalise Acme homepage hero', 'pr_website', 'cl_acme', MANAGER, 'high', 'In Progress', 'Implement the approved hero direction and responsive behaviour.', -2, 2, 65],
  ['Prepare Brightline brand guidelines', 'pr_brand', 'cl_bright', MEMBER, 'medium', 'In Progress', 'Compile typography, colour and usage rules into the brand PDF.', -1, 4, 40],
  ['NovaTech dashboard QA pass', 'pr_saas', 'cl_nova', MANAGER, 'high', 'Review', 'Cross-browser QA and accessibility review of key screens.', -5, 1, 85],
  ['GreenLeaf product upload', 'pr_store', 'cl_green', MEMBER, 'low', 'Completed', 'Upload 48 SKUs with images and variants.', -12, -5, 100],
  ['Peak Fitness onboarding flow', 'pr_app', 'cl_peak', MEMBER, 'high', 'To Do', 'Design a three-step onboarding flow with goal selection.', 0, 8, 0],
  ['UrbanNest 3D renders', 'pr_interior', 'cl_urban', MEMBER, 'medium', 'In Progress', 'Produce renders for reception and meeting rooms.', -3, 6, 55],
  ['Acme CRM data mapping', 'pr_crm', 'cl_acme', MEMBER, 'high', 'To Do', 'Map legacy fields to the new CRM schema.', 1, 10, 0],
  ['Write October case study', null, 'cl_bright', ADMIN, 'low', 'Completed', 'Publish the Q3 campaign case study.', -20, -10, 100],
  ['Invoice follow-up — Brightline', null, 'cl_bright', MANAGER, 'high', 'To Do', 'Send a polite payment reminder for the overdue retainer invoice.', -4, 0, 0],
  ['Renew CloudSprint contract', null, 'cl_cloud', ADMIN, 'medium', 'Review', 'Prepare renewal proposal and schedule a review call.', -6, 3, 70],
  ['Social calendar for November', 'pr_brand', 'cl_bright', MEMBER, 'medium', 'To Do', 'Draft 12 post concepts aligned with the campaign theme.', 0, 5, 0],
  ['Fix invoice PDF alignment', null, null, MEMBER, 'low', 'Completed', 'Resolve logo alignment in generated invoice PDFs.', -25, -15, 100],
];
const taskStatusColumns = { 'To Do': 'tc_todo', 'In Progress': 'tc_progress', Review: 'tc_review', Completed: 'tc_done' };
const tasks = tasksSeed.map(([title, projectId, clientId, assigned, priority, status, description, start, due, progress], index) => ({
  id: `tk_${index + 1}`, org_id: ORG, title, description, project_id: projectId, client_id: clientId,
  assigned_to: assigned, priority, start_date: dateOnly(start), due_date: dateOnly(due), status,
  progress, board_id: 'tb_main', column_id: taskStatusColumns[status], position: index + 1,
  created_at: at(start - 2), updated_at: at(-1), deleted_at: null,
}));

const meetingsSeed = [
  ['Acme milestone review', 'cl_acme', 'pr_website', 0, '11:00', '11:45', 'Google Meet', 'Shweta, Rahul', 'Review milestone 2 and plan the final sprint.', 'scheduled', 'high', ADMIN],
  ['Brightline campaign kickoff', 'cl_bright', 'pr_brand', 1, '15:00', '16:00', 'Google Meet', 'Aman, Priya', 'Align on campaign goals, deliverables and timeline.', 'scheduled', 'high', MANAGER],
  ['NovaTech weekly sync', 'cl_nova', 'pr_saas', 2, '18:30', '19:00', 'Zoom', 'Shweta, Daniel', 'Weekly product design review.', 'scheduled', 'medium', MANAGER],
  ['Peak Fitness discovery', 'cl_peak', 'pr_app', 5, '10:30', '11:30', 'Client office', 'Arjun, Riya', 'Understand training programmes for app onboarding.', 'scheduled', 'medium', MEMBER],
  ['GreenLeaf retrospective', 'cl_green', 'pr_store', -4, '16:00', '17:00', 'Google Meet', 'Aman, Neha', 'Post-launch retrospective and maintenance handover.', 'completed', 'low', ADMIN],
  ['CloudSprint renewal call', 'cl_cloud', 'pr_cloud', 7, '12:00', '12:30', 'Google Meet', 'Shweta, Ravi', 'Discuss renewal scope and annual pricing.', 'scheduled', 'high', ADMIN],
];
const meetings = meetingsSeed.map(([title, clientId, projectId, offset, start, end, location, participants, agenda, status, priority, assigned], index) => ({
  id: `mt_${index + 1}`, org_id: ORG, title, description: agenda, type: 'client',
  client_id: clientId, project_id: projectId, meeting_date: dateOnly(offset), start_time: start, end_time: end,
  participants, location, meeting_link: location === 'Google Meet' ? `https://meet.google.com/demo-${100 + index}` : '',
  agenda, status, priority, assigned_to: assigned, created_at: at(offset - 7), updated_at: at(-1), deleted_at: null,
}));

const remindersSeed = [
  ['Follow up with Rohit on proposal', 'Rohit asked for revised commercials. Send the updated proposal today.', 'cl_acme', 'Follow-up', 0, '10:00', 'high', 'pending'],
  ['Collect Brightline brand assets', 'Request the final logo pack and typography guidelines.', 'cl_bright', 'Task', 0, '14:30', 'medium', 'pending'],
  ['NovaTech invoice due', 'Retainer invoice of ₹90,000 is due in two days.', 'cl_nova', 'Payment', 2, '09:00', 'high', 'pending'],
  ['Renew CloudSprint contract', 'Contract expires in 14 days. Prepare the renewal document.', 'cl_cloud', 'Contract', 9, '11:00', 'medium', 'pending'],
  ['Send Acme weekly report', 'Share pipeline, task and campaign progress.', 'cl_acme', 'Report', -1, '17:00', 'low', 'overdue'],
  ['Book UrbanNest shoot', 'Coordinate the studio shoot for the portfolio update.', 'cl_urban', 'Meeting', 4, '15:00', 'medium', 'completed'],
];

const documentsSeed = [
  ['Acme Website Proposal.pdf', 'Quotations', 'cl_acme', 'pr_website', 'proposal-v3.pdf', 248000, 1120000],
  ['Brightline Brand Contract.pdf', 'Contracts', 'cl_bright', 'pr_brand', 'brand-contract.pdf', 512000, 5400000],
  ['NovaTech Invoice 2026-003.pdf', 'Invoices', 'cl_nova', 'pr_saas', 'inv-nova-003.pdf', 186000, 2048000],
  ['Acme Brand Assets.zip', 'Client Documents', 'cl_acme', null, 'acme-assets.zip', 18400000, 51200000],
  ['Peak Fitness Research.pdf', 'Project Documents', 'cl_peak', 'pr_app', 'peak-research.pdf', 920000, 1720000],
  ['Team Handbook 2026.pdf', 'Team Documents', null, null, 'team-handbook.pdf', 640000, 1536000],
  ['GreenLeaf Maintenance Quote.pdf', 'Quotations', 'cl_green', 'pr_store', 'greenleaf-quote.pdf', 128000, 486000],
];

const teamSeed = [
  ['tm_admin', ADMIN, 'Shweta Kapoor', 'shweta@cms.dev', '+91 98100 11001', 'Founder & Creative Director', 'Leadership', 'super_admin', -700, 'active'],
  ['tm_manager', MANAGER, 'Aman Sethi', 'aman@cms.dev', '+91 98100 11002', 'Project Manager', 'Delivery', 'manager', -520, 'active'],
  ['tm_member', MEMBER, 'Riya Sharma', 'riya@cms.dev', '+91 98100 11003', 'Product Designer', 'Design', 'team_member', -300, 'active'],
  ['tm_dev', null, 'Karan Bhatia', 'karan@cms.dev', '+91 98100 11004', 'Full-stack Developer', 'Engineering', 'team_member', -220, 'active'],
  ['tm_copy', null, 'Neha Verma', 'neha@cms.dev', '+91 98100 11005', 'Content Strategist', 'Marketing', 'team_member', -90, 'active'],
  ['tm_intern', null, 'Dev Patel', 'dev@cms.dev', '+91 98100 11006', 'Design Intern', 'Design', 'team_member', -10, 'invited'],
];

const payrollSeed = [
  ['tm_admin', 'Shweta Kapoor', 'Founder & Creative Director', 120000, 25000, 10000, 0, 12000, 'paid', -2, 'bank'],
  ['tm_manager', 'Aman Sethi', 'Project Manager', 85000, 15000, 5000, 0, 8500, 'paid', -2, 'bank'],
  ['tm_member', 'Riya Sharma', 'Product Designer', 70000, 8000, 0, 0, 6500, 'paid', -2, 'upi'],
  ['tm_dev', 'Karan Bhatia', 'Full-stack Developer', 95000, 12000, 5000, 0, 9000, 'pending', null, 'bank'],
  ['tm_copy', 'Neha Verma', 'Content Strategist', 55000, 6000, 0, 0, 4500, 'pending', null, 'upi'],
];

const conversationsSeed = [
  ['cv_acme', 'Acme Studios', 'client', 'cl_acme', [ADMIN, MANAGER, CLIENT_USER], -1],
  ['cv_design', 'Design Team', 'team', null, [ADMIN, MANAGER, MEMBER], -2],
  ['cv_campaign', 'Q4 Campaign Group', 'group', 'cl_bright', [ADMIN, MANAGER, MEMBER, CLIENT_USER], -3],
];

const messagesSeed = [
  ['cv_acme', ADMIN, 'Shweta Kapoor', 'Hi Rahul, sharing the latest homepage direction today. Let us know if the hero feels right.', -2, ['usr_manager', 'usr_client']],
  ['cv_acme', CLIENT_USER, 'Rahul Mehta', 'Looks great at first glance. Could we try a lighter gradient in the hero?', -1, ['usr_admin', 'usr_manager']],
  ['cv_acme', MANAGER, 'Aman Sethi', 'Absolutely — we will share two variations by tomorrow afternoon.', -1, ['usr_admin', 'usr_client']],
  ['cv_acme', ADMIN, 'Shweta Kapoor', 'Two hero variations are ready in the review link. Milestone invoice is attached as well.', 0, []],
  ['cv_design', MEMBER, 'Riya Sharma', 'The dashboard component library is ready for review. I have added the dark mode tokens.', -1, ['usr_admin', 'usr_manager']],
  ['cv_design', MANAGER, 'Aman Sethi', 'Nice. I will review after the NovaTech sync and leave comments.', 0, ['usr_member']],
  ['cv_campaign', MANAGER, 'Aman Sethi', 'Campaign performance is up 18% week over week. Adding the report to Documents.', -2, ['usr_admin', 'usr_member']],
  ['cv_campaign', ADMIN, 'Shweta Kapoor', 'Great progress. Let us plan a short client review on Friday.', -1, []],
];

const announcementsSeed = [
  ['November studio update', 'Updates', 'Our studio will be closed on 14 November for a team offsite. Support responses may be slower that day.', 0, 14, 'published'],
  ['New client portal experience', 'Product', 'We have refreshed the client portal. Project updates, invoices and documents are now easier to find.', -3, 30, 'published'],
  ['Q4 campaign reporting', 'Reports', 'Q4 campaign reports will be shared by the 5th of each month.', -1, 45, 'published'],
];

const clientActivitiesSeed = [
  ['cl_acme', 'Milestone 2 approved', 'Acme approved the homepage design milestone.', 'Milestone', -1, 'completed'],
  ['cl_acme', 'Invoice reminder sent', 'Payment reminder for INV-2026-013 sent to accounts.', 'Billing', -2, 'completed'],
  ['cl_bright', 'Campaign assets uploaded', '12 social creatives uploaded to the shared drive.', 'Document', -1, 'completed'],
  ['cl_nova', 'Weekly sync completed', 'Product design review completed with NovaTech.', 'Meeting', -2, 'completed'],
  ['cl_urban', 'Proposal viewed', 'Client viewed the office experience proposal.', 'Proposal', -3, 'viewed'],
];

const quotationsSeed = [
  ['q_acme', 'cl_acme', 'pr_website', 'Acme Website Redesign', 250000, 12500, 12500, 250000, 'sent', -6],
  ['q_nova', 'cl_nova', 'pr_saas', 'NovaTech Product Support', 90000, 9000, 0, 99000, 'accepted', -12],
  ['q_peak', 'cl_peak', 'pr_app', 'Peak Fitness App — Phase 2', 180000, 9000, 9000, 180000, 'draft', -2],
];

const contractsSeed = [
  ['ct_1', 'cl_bright', 'Brightline Annual Retainer Agreement', monthDate(6, 1), dateOnly(75), 540000, 'active'],
  ['ct_2', 'cl_nova', 'NovaTech Product Support Contract', monthDate(4, 1), dateOnly(14), 1080000, 'active'],
  ['ct_3', 'cl_cloud', 'CloudSprint Support Contract', monthDate(11, 1), dateOnly(9), 300000, 'expiring'],
];

const referralSeed = [
  ['ref_1', 'Sunrise Digital', 'Maya Rao', 'maya@sunrisedigital.in', 'successful', 5000, 'paid', -40],
  ['ref_2', 'The Print Room', 'Kabir Shah', 'kabir@printroom.in', 'successful', 5000, 'pending', -18],
  ['ref_3', 'Studio Nine', 'Aarti Menon', 'aarti@studionine.co', 'registered', 0, 'pending', -6],
  ['ref_4', 'Northstar Labs', 'Dev Khanna', 'dev@northstarlabs.io', 'clicked', 0, 'pending', -2],
];

const billingSeed = [
  ['BIL-2026-001', 'cl_acme', 'Growth Retainer', 75000, -5, 10, 'paid', 'Monthly growth retainer invoice'],
  ['BIL-2026-002', 'cl_bright', 'Content Retainer', 45000, -12, 3, 'paid', 'Monthly content retainer'],
  ['BIL-2026-003', 'cl_nova', 'Product Support', 90000, -18, -2, 'paid', 'Product support retainer'],
  ['BIL-2026-004', 'cl_acme', 'Website Milestone 3', 60000, -2, 12, 'pending', 'Website milestone payment'],
  ['BIL-2026-005', 'cl_peak', 'Mobile App Advance', 30000, -3, 7, 'failed', 'Failed gateway payment'],
  ['BIL-2026-006', 'cl_urban', 'Scope Adjustment', 20000, -20, -5, 'refunded', 'Refund processed'],
];

const permissionList = [
  'dashboard.view', 'leads.view', 'leads.manage', 'clients.view', 'clients.manage', 'projects.view',
  'projects.manage', 'retainers.view', 'retainers.manage', 'payments.view', 'payments.manage',
  'payroll.manage', 'messages.use', 'meetings.view', 'meetings.manage', 'tasks.view', 'tasks.manage',
  'documents.view', 'documents.manage', 'team.view', 'team.manage', 'billing.manage', 'public_page.manage',
  'referrals.view', 'plans.view', 'help.use', 'settings.manage', 'admin.users', 'admin.roles',
  'admin.audit', 'admin.ai', 'ai.use', 'ai.finance',
];

const rolePermissionMap = {
  super_admin: permissionList,
  admin: permissionList.filter((p) => !p.startsWith('admin.')),
  manager: ['dashboard.view', 'leads.view', 'leads.manage', 'clients.view', 'clients.manage', 'projects.view',
    'projects.manage', 'retainers.view', 'payments.view', 'messages.use', 'meetings.view', 'meetings.manage',
    'tasks.view', 'tasks.manage', 'documents.view', 'documents.manage', 'team.view', 'referrals.view',
    'plans.view', 'help.use', 'settings.manage', 'ai.use', 'ai.finance'],
  team_member: ['dashboard.view', 'clients.view', 'projects.view', 'messages.use', 'meetings.view',
    'tasks.view', 'tasks.manage', 'documents.view', 'help.use', 'ai.use'],
  client: ['dashboard.view', 'projects.view', 'documents.view', 'payments.view', 'messages.use', 'help.use'],
};

const aiFeatures = [
  'business_assistant', 'lead_scoring', 'follow_up', 'pipeline_insights', 'client_insights',
  'project_insights', 'task_suggestions', 'meeting_assistant', 'document_assistant',
  'financial_insights', 'natural_search', 'report_generator', 'data_quality', 'quotation_builder',
];

const roleRows = [
  { id: 'role_super_admin', name: 'Super Admin', slug: 'super_admin', description: 'Platform-wide administration', level: 100 },
  { id: 'role_admin', name: 'Admin', slug: 'admin', description: 'Organization administration', level: 80 },
  { id: 'role_manager', name: 'Manager', slug: 'manager', description: 'Delivery and client management', level: 60 },
  { id: 'role_team_member', name: 'Team Member', slug: 'team_member', description: 'Assigned work and collaboration', level: 40 },
  { id: 'role_client', name: 'Client', slug: 'client', description: 'Client portal access only', level: 20 },
];

const permissions = permissionList.map((code) => ({
  id: `perm_${code.replace(/\./g, '_')}`,
  code,
  name: code.split('.').map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
  module: code.split('.')[0],
}));

const rolePermissions = [];
Object.entries(rolePermissionMap).forEach(([role, codes]) => {
  codes.forEach((code) => {
    rolePermissions.push({ id: `rp_${role}_${code.replace(/\./g, '_')}`, role, permission: code });
  });
});

const tables = {
  organizations: [{
    id: ORG, name: 'PixelForge Studio', slug: 'pixelforge', owner_id: ADMIN,
    email: 'hello@pixelforge.studio', phone: '+91 98100 11000', website: 'https://pixelforge.studio',
    address: '3rd Floor, Design House, 14 Linking Road, Mumbai 400050', logo_url: '',
    currency: 'INR', opening_balance: 300000, invoice_prefix: 'INV', timezone: 'Asia/Kolkata',
    created_at: monthDay(11, 1), updated_at: at(-1),
  }],

  profiles: [
    {
      id: SUPER, org_id: ORG, name: 'Aarav Malhotra', email: 'superadmin@cms.dev',
      phone: '+91 90000 00001', avatar_url: '', role: 'super_admin', client_id: null,
      status: 'active', email_verified: true, mfa_enabled: false, last_login_at: at(0, 9),
      password_hash: hash('Admin@123'), designation: 'Platform Owner',
      created_at: monthDay(11, 1), updated_at: at(-1),
    },
    {
      id: ADMIN, org_id: ORG, name: 'Shweta Kapoor', email: 'admin@cms.dev',
      phone: '+91 98100 11001', avatar_url: '', role: 'admin', client_id: null,
      status: 'active', email_verified: true, mfa_enabled: false, last_login_at: at(0, 9, 15),
      password_hash: hash('Admin@123'), designation: 'Founder & Creative Director',
      created_at: monthDay(11, 1), updated_at: at(-1),
    },
    {
      id: MANAGER, org_id: ORG, name: 'Aman Sethi', email: 'manager@cms.dev',
      phone: '+91 98100 11002', avatar_url: '', role: 'manager', client_id: null,
      status: 'active', email_verified: true, mfa_enabled: false, last_login_at: at(-1, 17),
      password_hash: hash('Manager@123'), designation: 'Project Manager',
      created_at: monthDay(11, 2), updated_at: at(-2),
    },
    {
      id: MEMBER, org_id: ORG, name: 'Riya Sharma', email: 'member@cms.dev',
      phone: '+91 98100 11003', avatar_url: '', role: 'team_member', client_id: null,
      status: 'active', email_verified: true, mfa_enabled: false, last_login_at: at(-2, 11),
      password_hash: hash('Member@123'), designation: 'Product Designer',
      created_at: monthDay(10, 5), updated_at: at(-3),
    },
    {
      id: CLIENT_USER, org_id: ORG, name: 'Rahul Mehta', email: 'client@cms.dev',
      phone: '+91 98200 11223', avatar_url: '', role: 'client', client_id: 'cl_acme',
      status: 'active', email_verified: true, mfa_enabled: false, last_login_at: at(-1, 10),
      password_hash: hash('Client@123'), designation: 'Founder, Acme Studios',
      created_at: monthDay(9, 4), updated_at: at(-1),
    },
    {
      id: ARJUN, org_id: ORG, name: 'Arjun', email: 'varjunarjun9@gmail.com',
      phone: '+91 98100 99999', avatar_url: '', role: 'admin', client_id: null,
      status: 'active', email_verified: true, mfa_enabled: false, last_login_at: at(0, 9, 30),
      password_hash: hash('Arjun@123'), designation: 'Administrator',
      created_at: monthDay(11, 1), updated_at: at(-1),
    },
  ],

  organization_members: [
    { id: 'om_1', org_id: ORG, profile_id: SUPER, role: 'super_admin', status: 'active', joined_at: monthDay(11, 1) },
    { id: 'om_2', org_id: ORG, profile_id: ADMIN, role: 'admin', status: 'active', joined_at: monthDay(11, 1) },
    { id: 'om_3', org_id: ORG, profile_id: MANAGER, role: 'manager', status: 'active', joined_at: monthDay(10, 12) },
    { id: 'om_4', org_id: ORG, profile_id: MEMBER, role: 'team_member', status: 'active', joined_at: monthDay(9, 20) },
    { id: 'om_5', org_id: ORG, profile_id: CLIENT_USER, role: 'client', status: 'active', joined_at: monthDay(9, 4) },
    { id: 'om_6', org_id: ORG, profile_id: ARJUN, role: 'admin', status: 'active', joined_at: monthDay(11, 1) },
  ],

  roles: roleRows,
  permissions,
  role_permissions: rolePermissions,
  invitations: [
    { id: 'inv_1', org_id: ORG, email: 'neha@cms.dev', role: 'team_member', status: 'accepted', invited_by: ADMIN, created_at: monthDay(3, 4) },
    { id: 'inv_2', org_id: ORG, email: 'dev@cms.dev', role: 'team_member', status: 'pending', invited_by: ADMIN, created_at: at(-10) },
  ],

  lead_stages: leadStages.map((s) => ({ ...s, org_id: ORG, created_at: monthDay(11, 1) })),
  lead_sources: ['Website', 'Referral', 'LinkedIn', 'Google Ads', 'Cold Call', 'Event', 'Public Page', 'Import'].map((name, i) => ({
    id: `src_${i + 1}`, org_id: ORG, name, active: true,
  })),
  leads: leadsSeed.map(([name, company, email, phone, source, service, budget, stageId, priority, status, createdDaysAgo], index) => {
    const stage = leadStages.find((s) => s.id === stageId);
    return {
      id: `lead_${index + 1}`, org_id: ORG, name, company, email, phone, website: '',
      location: ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Surat'][index % 6], source,
      service, estimated_budget: budget, expected_close_date: dateOnly(10 + index * 2),
      assigned_to: [MANAGER, ADMIN, MEMBER][index % 3], priority, stage_id: stageId, stage: stage.name,
      status, score: stageId === 'ls_won' ? 92 : stageId === 'ls_lost' ? 18 : 45 + ((index * 7) % 40),
      notes: `Interested in ${service.toLowerCase()}. Budget discussed: ₹${budget.toLocaleString('en-IN')}.`,
      created_at: at(-createdDaysAgo), updated_at: at(-Math.min(createdDaysAgo, 2)), deleted_at: null,
    };
  }),
  lead_activities: [],
  lead_notes: [],

  clients: clientsSeed.map((c) => ({ ...c, org_id: ORG })),
  projects,
  project_stages: projectStages.map((s) => ({ ...s, org_id: ORG })),
  project_members: projects.flatMap((p) => p.team.map((profileId, index) => ({
    id: `pm_${p.id}_${index}`, org_id: ORG, project_id: p.id, profile_id: profileId, role: index === 0 ? 'lead' : 'member',
  }))),
  project_activities: [],

  retainers: retainersSeed.map((r) => ({ ...r, org_id: ORG })),
  payments,
  expenses,
  expense_categories: ['Software Subscriptions', 'Marketing', 'Office Rent', 'Equipments', 'Utilities', 'Contractors', 'Travel', 'Salaries', 'Other'].map((name, i) => ({
    id: `expc_${i + 1}`, org_id: ORG, name,
  })),
  revenue_categories: ['Project Revenue', 'Monthly Retainer Revenue', 'Consultation Revenue', 'Service Revenue', 'Maintenance Revenue', 'Other Revenue'].map((name, i) => ({
    id: `revc_${i + 1}`, org_id: ORG, name,
  })),
  transactions,
  invoices: invoicesSeed.map(([iid, clientId, projectId, total, status, issue, due], index) => ({
    id: iid, org_id: ORG, client_id: clientId, project_id: projectId,
    invoice_number: `INV-${new Date().getFullYear()}-${String(index + 13).padStart(3, '0')}`,
    issue_date: dateOnly(issue), due_date: dateOnly(due), subtotal: total, tax: 0, discount: 0,
    total, status, notes: 'Payment due within 15 days.',
    created_at: at(issue), updated_at: at(issue), deleted_at: null,
  })),
  invoice_items: invoicesSeed.flatMap(([iid, , , total], index) => [{
    id: `ii_${index + 1}`, invoice_id: iid, description: 'Professional services', quantity: 1, rate: total, amount: total,
  }]),

  payroll: payrollSeed.map(([memberId, name, designation, basic, allowances, bonus, deductions, tax, status, paidDays, method], index) => ({
    id: `pr_${index + 1}`, org_id: ORG, member_id: memberId, employee_name: name, designation,
    month: currentMonth, basic_salary: basic, allowances, bonus, deductions, tax_deduction: tax,
    net_salary: basic + allowances + bonus - deductions - tax,
    payment_date: paidDays == null ? null : dateOnly(paidDays), status, payment_method: method,
    created_at: monthDay(0, 1), updated_at: at(-1),
  })),

  conversations: conversationsSeed.map(([cid, name, type, clientId, memberIds, lastDays]) => ({
    id: cid, org_id: ORG, name, type, client_id: clientId, created_by: ADMIN,
    last_message_at: at(lastDays), created_at: at(lastDays - 10),
  })),
  conversation_members: conversationsSeed.flatMap(([cid, , , , memberIds]) => memberIds.map((profileId) => ({
    id: `cm_${cid}_${profileId}`, conversation_id: cid, profile_id: profileId,
  }))),
  messages: messagesSeed.map(([conversationId, senderId, senderName, body, days, readBy], index) => ({
    id: `msg_${index + 1}`, org_id: ORG, conversation_id: conversationId, sender_id: senderId,
    sender_name: senderName, body, attachment_url: '', read_by: readBy,
    created_at: at(days, 9 + index), edited_at: null, deleted_at: null,
  })),
  message_attachments: [],

  meetings,
  reminders: remindersSeed.map(([title, description, clientId, type, offset, time, priority, status], index) => ({
    id: `rm_${index + 1}`, org_id: ORG, title, description, client_id: clientId, type,
    reminder_date: dateOnly(offset), reminder_time: time, priority, status,
    created_by: ADMIN, created_at: at(offset - 5), updated_at: at(-1), deleted_at: null,
  })),

  task_boards: [{ id: 'tb_main', org_id: ORG, name: 'Studio Board', created_at: monthDay(10, 1) }],
  task_columns: [
    { id: 'tc_todo', org_id: ORG, board_id: 'tb_main', name: 'To Do', position: 1, color: '#6366f1' },
    { id: 'tc_progress', org_id: ORG, board_id: 'tb_main', name: 'In Progress', position: 2, color: '#0ea5e9' },
    { id: 'tc_review', org_id: ORG, board_id: 'tb_main', name: 'Review', position: 3, color: '#f59e0b' },
    { id: 'tc_done', org_id: ORG, board_id: 'tb_main', name: 'Completed', position: 4, color: '#10b981' },
  ],
  tasks,
  subtasks: [
    { id: 'st_1', task_id: 'tk_1', title: 'Mobile hero layout', completed: true },
    { id: 'st_2', task_id: 'tk_1', title: 'Dark mode hero', completed: false },
    { id: 'st_3', task_id: 'tk_3', title: 'Keyboard navigation', completed: true },
    { id: 'st_4', task_id: 'tk_3', title: 'Screen reader labels', completed: false },
  ],
  task_comments: [
    { id: 'tc1', org_id: ORG, task_id: 'tk_1', user_id: MANAGER, user_name: 'Aman Sethi', body: 'Please prioritise the mobile hero before the desktop polish.', created_at: at(-2) },
    { id: 'tc2', org_id: ORG, task_id: 'tk_1', user_id: MEMBER, user_name: 'Riya Sharma', body: 'Mobile hero is done, dark mode is in progress.', created_at: at(-1) },
    { id: 'tc3', org_id: ORG, task_id: 'tk_3', user_id: ADMIN, user_name: 'Shweta Kapoor', body: 'Let us include the accessibility checklist in the QA notes.', created_at: at(-1) },
  ],

  documents: documentsSeed.map(([name, category, clientId, projectId, fileUrl, fileSize, mimeType], index) => ({
    id: `doc_${index + 1}`, org_id: ORG, name, category, client_id: clientId, project_id: projectId,
    file_url: fileUrl, file_size: fileSize, mime_type: mimeType, uploaded_by: ADMIN,
    shared_with_client: Boolean(clientId), created_at: at(-(index + 1) * 4), updated_at: at(-(index + 1) * 2), deleted_at: null,
  })),

  team_members: teamSeed.map(([tid, profileId, name, email, phone, designation, department, role, joinedDaysAgo, status]) => ({
    id: tid, org_id: ORG, profile_id: profileId, name, email, phone, designation, department, role,
    joining_date: dateOnly(joinedDaysAgo), status, avatar_url: '', created_at: at(joinedDaysAgo), updated_at: at(-1),
  })),

  billing_records: billingSeed.map(([number, clientId, plan, amount, billingDays, dueDays, status, description], index) => ({
    id: `bill_${index + 1}`, org_id: ORG, client_id: clientId, invoice_number: number, plan,
    amount, billing_date: dateOnly(billingDays), due_date: dateOnly(dueDays), status, description,
    created_at: at(billingDays), updated_at: at(billingDays), deleted_at: null,
  })),

  plans: [
    {
      id: 'plan_free', name: 'Free', price: 0, billing: 'monthly', description: 'For solopreneurs getting started.',
      limits: { clients: 3, projects: 5, teammates: 1, leads: 20, storage_mb: 100, ai_quotes: 3, ai_requests: 25 },
      features: ['Google Calendar & Meet sync', 'Client portal for 1 client', 'Community support', 'Up to 3 clients'],
      highlight: false, position: 1,
    },
    {
      id: 'plan_pro', name: 'Pro', price: 199, billing: 'monthly', description: 'For growing freelancers and small agencies.',
      limits: { clients: 20, projects: 40, teammates: 5, leads: 200, storage_mb: 1024, ai_quotes: 25, ai_requests: 500 },
      features: ['Everything in Free', 'Client portal for every client', 'Auto-invoicing for retainers', 'Automatic lead reminders', 'Email support'],
      highlight: true, position: 2,
    },
    {
      id: 'plan_ultra', name: 'Ultra', price: 799, billing: 'monthly', description: 'For established agencies that need scale.',
      limits: { clients: -1, projects: -1, teammates: -1, leads: -1, storage_mb: 10240, ai_quotes: 100, ai_requests: 5000 },
      features: ['Everything in Pro', 'Team payroll', 'White label branding', 'Client portal on your domain', 'Lead integrations (Meta, Google, IndiaMART)', 'Priority support'],
      highlight: false, position: 3,
    },
  ],

  subscriptions: [{
    id: 'sub_demo', org_id: ORG, plan_id: 'plan_pro', plan_name: 'Pro', status: 'active',
    start_date: monthDay(2, 1).slice(0, 10), renewal_date: dateOnly(18), amount: 199, billing: 'monthly',
    created_at: monthDay(2, 1),
  }],
  subscription_payments: [{
    id: 'sp_1', org_id: ORG, subscription_id: 'sub_demo', amount: 199, status: 'completed',
    gateway_id: 'pay_demo_sub_001', paid_at: monthDay(2, 1), created_at: monthDay(2, 1),
  }],
  subscription_usage: [
    { id: 'su_1', org_id: ORG, feature: 'ai_requests', used: 42, period: currentMonth },
    { id: 'su_2', org_id: ORG, feature: 'ai_quotes', used: 3, period: currentMonth },
  ],
  payment_webhook_events: [],

  public_pages: [{
    id: 'pp_demo', org_id: ORG, slug: 'pixelforge', business_name: 'PixelForge Studio',
    tagline: 'Design that turns attention into growth.',
    description: 'We are a Mumbai-based design studio helping ambitious brands build websites, products and campaigns that feel effortless and perform beautifully.',
    email: 'hello@pixelforge.studio', phone: '+91 98100 11000', website: 'https://pixelforge.studio',
    address: '3rd Floor, Design House, 14 Linking Road, Mumbai 400050', logo_url: '',
    services: [
      { title: 'Brand Identity', description: 'Positioning, visual identity and brand systems that scale.' },
      { title: 'Product Design', description: 'Web and mobile experiences designed around real user needs.' },
      { title: 'Web Development', description: 'Fast, accessible, conversion-focused websites built to last.' },
      { title: 'Growth Campaigns', description: 'Campaign strategy, content and measurement in one team.' },
    ],
    portfolio: [
      { title: 'Acme Studios', description: 'Website redesign · +38% enquiries' },
      { title: 'NovaTech', description: 'SaaS dashboard · 80% faster workflows' },
      { title: 'GreenLeaf', description: 'Store launch · ₹1.2M first-quarter revenue' },
    ],
    socials: { linkedin: 'https://linkedin.com', instagram: 'https://instagram.com', dribbble: 'https://dribbble.com' },
    published: true, created_at: monthDay(4, 1), updated_at: at(-5),
  }],
  public_lead_submissions: [],

  referral_codes: [{
    id: 'rc_1', org_id: ORG, user_id: ADMIN, code: 'PIXEL10', clicks: 48, signups: 12, conversions: 6,
    reward_per_referral: 5000, created_at: monthDay(6, 1),
  }],
  referrals: referralSeed.map(([rid, company, name, email, status, reward, rewardStatus, days], index) => ({
    id: `ref_${index + 1}`, org_id: ORG, referrer_id: ADMIN, referrer_name: 'Shweta Kapoor',
    referred_company: company, referred_name: name, referred_email: email, code: 'PIXEL10',
    status, reward_amount: reward, reward_status: rewardStatus, created_at: at(days),
  })),
  referral_rewards: [
    { id: 'rr_1', org_id: ORG, referral_id: 'ref_1', amount: 5000, status: 'paid', paid_at: at(-30) },
    { id: 'rr_2', org_id: ORG, referral_id: 'ref_2', amount: 5000, status: 'pending', paid_at: null },
  ],

  notifications: [
    ['n1', null, 'lead', 'New lead added', 'Priya Nair from FreshBasket is interested in a mobile app.', '/leads', false, -0.2],
    ['n2', ADMIN, 'payment', 'Payment received', '₹1,50,000 received from Acme Studios.', '/payments', false, -0.5],
    ['n3', MANAGER, 'task', 'Task overdue', 'Invoice follow-up — Brightline is past its due date.', '/tasks', false, -1],
    ['n4', null, 'meeting', 'Meeting in 1 hour', 'Acme milestone review starts at 11:00.', '/meetings', true, -2],
    ['n5', ADMIN, 'subscription', 'Plan renewal approaching', 'Your Pro plan renews in 18 days.', '/plans', true, -2],
    ['n6', null, 'retainer', 'Retainer expiring', 'NovaTech Product Support ends in 14 days.', '/retainers', true, -3],
    ['n7', MEMBER, 'task', 'Task assigned', 'You were assigned: NovaTech dashboard QA pass.', '/tasks', false, -3],
    ['n8', null, 'referral', 'Successful referral', 'Sunrise Digital converted through your referral link.', '/referrals', true, -4],
    ['n9', CLIENT_USER, 'document', 'New document shared', 'Acme Website Proposal.pdf is now available.', '/client-portal/documents', false, -1],
  ].map(([nid, userId, type, title, message, link, isRead, days]) => ({
    id: `nt_${nid}`, org_id: ORG, user_id: userId, type, title, message, link, is_read: isRead,
    created_at: at(days, 10), updated_at: at(days, 10),
  })),

  announcements: announcementsSeed.map(([title, category, description, published, expiry, status], index) => ({
    id: `ann_${index + 1}`, org_id: ORG, client_id: index === 2 ? null : 'cl_acme', title, category,
    description, published_date: dateOnly(published), expiry_date: dateOnly(expiry), status,
    created_at: at(published), updated_at: at(published),
  })),
  client_activities: clientActivitiesSeed.map(([clientId, title, description, type, days, status], index) => ({
    id: `ca_${index + 1}`, org_id: ORG, client_id: clientId, title, description, type,
    activity_date: dateOnly(days), status, created_at: at(days), updated_at: at(days),
  })),

  quotations: quotationsSeed.map(([qid, clientId, projectId, title, subtotal, tax, discount, total, status, days], index) => ({
    id: qid, org_id: ORG, client_id: clientId, project_id: projectId, lead_id: null,
    number: `QT-${new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`, title,
    status, subtotal, tax, discount, total, valid_until: dateOnly(15),
    notes: 'Pricing valid for 30 days.', terms: '50% advance, balance on delivery. Two revision rounds included.',
    content: `We are delighted to propose ${title}. This engagement includes discovery, design, build and launch support.`,
    version: 1, created_at: at(days), updated_at: at(days), deleted_at: null,
  })),
  quotation_items: [
    { id: 'qi_1', quotation_id: 'q_acme', description: 'UX research and wireframes', quantity: 1, rate: 70000, amount: 70000 },
    { id: 'qi_2', quotation_id: 'q_acme', description: 'Visual design and development', quantity: 1, rate: 180000, amount: 180000 },
    { id: 'qi_3', quotation_id: 'q_nova', description: 'Monthly product support', quantity: 1, rate: 90000, amount: 90000 },
  ],
  contracts: contractsSeed.map(([cid, clientId, title, startDate, endDate, value, status]) => ({
    id: cid, org_id: ORG, client_id: clientId, title, start_date: startDate, end_date: endDate,
    value, status, file_url: '', created_at: at(-60), updated_at: at(-2), deleted_at: null,
  })),

  support_tickets: [
    { id: 'tick_1', org_id: ORG, user_id: MANAGER, subject: 'Unable to upload a large brand ZIP', message: 'The upload spinner stops at 80% for a 48 MB file.', priority: 'high', status: 'in_progress', created_at: at(-2), updated_at: at(-1) },
    { id: 'tick_2', org_id: ORG, user_id: MEMBER, subject: 'How do I export a task report?', message: 'I need a CSV of completed tasks for the last 30 days.', priority: 'low', status: 'open', created_at: at(-1), updated_at: at(-1) },
  ],
  support_messages: [
    { id: 'sm_1', org_id: ORG, ticket_id: 'tick_1', user_id: MANAGER, body: 'The upload spinner stops at 80%.', created_at: at(-2) },
    { id: 'sm_2', org_id: ORG, ticket_id: 'tick_1', user_id: ADMIN, body: 'Thanks for reporting — we can reproduce this on large ZIP files. A fix is in progress.', created_at: at(-1) },
  ],

  activity_logs: [
    { id: 'al_1', org_id: ORG, user_id: ADMIN, user_name: 'Shweta Kapoor', action: 'created', module: 'payments', record_id: 'pay_1', description: 'Recorded ₹1,50,000 payment from Acme Studios', created_at: at(-0.5) },
    { id: 'al_2', org_id: ORG, user_id: MANAGER, user_name: 'Aman Sethi', action: 'updated', module: 'leads', record_id: 'lead_11', description: 'Moved Rohit Malhotra to Negotiation', created_at: at(-1) },
    { id: 'al_3', org_id: ORG, user_id: ADMIN, user_name: 'Shweta Kapoor', action: 'created', module: 'tasks', record_id: 'tk_5', description: 'Created task “Peak Fitness onboarding flow”', created_at: at(-1.2) },
    { id: 'al_4', org_id: ORG, user_id: MEMBER, user_name: 'Riya Sharma', action: 'updated', module: 'tasks', record_id: 'tk_1', description: 'Updated progress on “Finalise Acme homepage hero”', created_at: at(-2) },
    { id: 'al_5', org_id: ORG, user_id: ADMIN, user_name: 'Shweta Kapoor', action: 'shared', module: 'documents', record_id: 'doc_1', description: 'Shared proposal with Acme Studios', created_at: at(-2.5) },
    { id: 'al_6', org_id: ORG, user_id: MANAGER, user_name: 'Aman Sethi', action: 'created', module: 'meetings', record_id: 'mt_2', description: 'Scheduled Brightline campaign kickoff', created_at: at(-3) },
  ],
  audit_logs: [
    { id: 'aud_1', org_id: ORG, user_id: ADMIN, user_name: 'Shweta Kapoor', action: 'payment.recorded', entity: 'payments', entity_id: 'pay_1', changes: { status: 'completed', amount: 150000 }, ip: '127.0.0.1', created_at: at(-0.5) },
    { id: 'aud_2', org_id: ORG, user_id: MANAGER, user_name: 'Aman Sethi', action: 'lead.stage_changed', entity: 'leads', entity_id: 'lead_11', changes: { from: 'Proposal Sent', to: 'Negotiation' }, ip: '127.0.0.1', created_at: at(-1) },
    { id: 'aud_3', org_id: ORG, user_id: ADMIN, user_name: 'Shweta Kapoor', action: 'role.updated', entity: 'profiles', entity_id: MEMBER, changes: { role: 'team_member' }, ip: '127.0.0.1', created_at: at(-4) },
    { id: 'aud_4', org_id: ORG, user_id: SUPER, user_name: 'Aarav Malhotra', action: 'subscription.updated', entity: 'subscriptions', entity_id: 'sub_demo', changes: { plan: 'Pro' }, ip: '127.0.0.1', created_at: at(-5) },
  ],

  organization_settings: [
    { id: 'os_1', org_id: ORG, key: 'fiscal_year_start', value: '04-01' },
    { id: 'os_2', org_id: ORG, key: 'invoice_due_days', value: 15 },
    { id: 'os_3', org_id: ORG, key: 'timezone', value: 'Asia/Kolkata' },
  ],
  user_preferences: [
    { id: 'up_1', user_id: ADMIN, theme: 'system', sidebar_collapsed: false, sidebar_enabled: true, ai_enabled: true, ai_tone: 'friendly', created_at: monthDay(10, 1), updated_at: at(-1) },
    { id: 'up_2', user_id: SUPER, theme: 'dark', sidebar_collapsed: false, sidebar_enabled: true, ai_enabled: true, ai_tone: 'formal', created_at: monthDay(10, 1), updated_at: at(-2) },
    { id: 'up_3', user_id: MANAGER, theme: 'light', sidebar_collapsed: false, sidebar_enabled: true, ai_enabled: true, ai_tone: 'concise', created_at: monthDay(8, 1), updated_at: at(-3) },
    { id: 'up_4', user_id: MEMBER, theme: 'system', sidebar_collapsed: false, sidebar_enabled: true, ai_enabled: true, ai_tone: 'friendly', created_at: monthDay(7, 1), updated_at: at(-4) },
    { id: 'up_5', user_id: CLIENT_USER, theme: 'light', sidebar_collapsed: false, sidebar_enabled: true, ai_enabled: true, ai_tone: 'friendly', created_at: monthDay(6, 1), updated_at: at(-5) },
  ],
  user_settings: [
    { id: 'us_1', user_id: ADMIN, key: 'email_notifications', value: true },
    { id: 'us_2', user_id: ADMIN, key: 'weekly_digest', value: true },
  ],

  ai_feature_settings: aiFeatures.map((feature, index) => ({
    id: `aifs_${index + 1}`, org_id: ORG, feature, enabled: true, updated_at: at(-10),
  })),
  ai_usage_logs: [
    { id: 'aiu_1', org_id: ORG, user_id: ADMIN, feature: 'quotation_builder', tokens: 820, created_at: at(-2) },
    { id: 'aiu_2', org_id: ORG, user_id: ADMIN, feature: 'quotation_builder', tokens: 640, created_at: at(-5) },
    { id: 'aiu_3', org_id: ORG, user_id: MANAGER, feature: 'business_assistant', tokens: 410, created_at: at(-1) },
    { id: 'aiu_4', org_id: ORG, user_id: MANAGER, feature: 'lead_scoring', tokens: 260, created_at: at(-1) },
    { id: 'aiu_5', org_id: ORG, user_id: ADMIN, feature: 'report_generator', tokens: 980, created_at: at(-7) },
  ],
  ai_conversations: [
    { id: 'aic_1', org_id: ORG, user_id: ADMIN, title: 'Weekly business summary', feature: 'business_assistant', created_at: at(-1), updated_at: at(-1) },
  ],
  ai_messages: [
    { id: 'aim_1', conversation_id: 'aic_1', role: 'user', content: 'Give me a summary of this week.', created_at: at(-1, 9) },
    { id: 'aim_2', conversation_id: 'aic_1', role: 'assistant', content: 'You have 14 active leads worth ₹22.7L in the pipeline, 6 ongoing projects and 4 tasks due this week. Revenue this month is tracking above last month. I recommend following up with Rohit Malhotra and sending the Brightline payment reminder.', created_at: at(-1, 9, 1) },
  ],
  ai_generated_reports: [],
  ai_suggestions: [],

  integrations: [
    { id: 'int_1', org_id: ORG, provider: 'google_calendar', status: 'not_connected', config: {}, created_at: monthDay(8, 1) },
    { id: 'int_2', org_id: ORG, provider: 'razorpay', status: 'not_connected', config: {}, created_at: monthDay(8, 1) },
    { id: 'int_3', org_id: ORG, provider: 'ai', status: 'local_fallback', config: {}, created_at: monthDay(8, 1) },
    { id: 'int_4', org_id: ORG, provider: 'email', status: 'not_connected', config: {}, created_at: monthDay(8, 1) },
  ],
  reset_tokens: [],
};

// Build payroll from the current month so the payroll dashboard always shows data.
tables.payroll = tables.payroll.map((row) => ({ ...row, month: currentMonth }));

export function seedData() {
  return {
    tables,
    meta: {
      seeded_at: new Date().toISOString(),
      version: 1,
      demo: true,
      note: 'Local demo database. Production uses the Supabase schema in /database.',
    },
  };
}
