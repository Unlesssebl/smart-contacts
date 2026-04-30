import type { User, ChangeRequest, Report } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    full_name: 'Jonathan Ive',
    job_title: 'Chief Design Officer',
    department: 'Design',
    internal_phone: '1001',
    mobile_phone: '+1 555 0101',
    email: 'jive@company.com',
    role: 'admin',
    is_online: true,
    sam_account: 'jive'
  },
  {
    id: '2',
    full_name: 'Craig Federighi',
    job_title: 'SVP Software Engineering',
    department: 'Engineering',
    internal_phone: '1002',
    mobile_phone: '+1 555 0102',
    email: 'cfederighi@company.com',
    role: 'it_operator',
    is_online: true,
    sam_account: 'cfederighi'
  }
];

export const mockChangeRequests: ChangeRequest[] = [
  {
    id: 'cr1',
    user_id: '1',
    user_name: 'Jonathan Ive',
    attribute_name: 'internal_phone',
    old_value: '1000',
    new_value: '1001',
    status: 'pending',
    requested_at: new Date().toISOString()
  }
];

export const mockReports: Report[] = [
  {
    id: 'r1',
    user_id: '2',
    user_name: 'Craig Federighi',
    category: 'Hardware',
    description: 'Monitor flickering',
    status: 'open',
    created_at: new Date().toISOString()
  }
];
