import type { Plugin } from 'vite';

export function mockBackendPlugin(): Plugin {
  return {
    name: 'mock-backend',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/v1/')) {
          return next();
        }

        // Parse URL to handle query params
        const urlObj = new URL(req.url, `http://${req.headers.host}`);
        const pathname = urlObj.pathname;

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        // Auth endpoints
        if (pathname === '/api/v1/auth/sso' || pathname === '/api/v1/auth/login') {
          return res.end(JSON.stringify({ 
            authenticated: true, 
            user: { login: 'mock_admin', full_name: 'Mock Admin', role: 'admin' },
            access_token: 'mock-jwt-token'
          }));
        }
        if (pathname === '/api/v1/auth/me') {
          return res.end(JSON.stringify({
            id: 'guid-1', 
            login: 'mock_admin', 
            full_name: 'Mock Admin', 
            role: 'admin',
            department: 'IT',
            is_active: true
          }));
        }
        if (pathname === '/api/v1/auth/ws-token') {
          return res.end(JSON.stringify({ ws_token: 'mock-ws-token-123' }));
        }

        // Users endpoints
        if (pathname === '/api/v1/users/org-colors') {
          return res.end(JSON.stringify({ "Mock Org": "#3b82f6" }));
        }
        if (pathname === '/api/v1/users/departments') {
          return res.end(JSON.stringify(['IT', 'HR', 'Sales', 'Marketing']));
        }
        if (pathname === '/api/v1/users/organizations') {
          return res.end(JSON.stringify(['Mock Org', 'Acme Corp']));
        }
        if (pathname === '/api/v1/users/job-titles') {
          return res.end(JSON.stringify(['Developer', 'Manager', 'Designer', 'Director']));
        }
        
        // Users list
        if (pathname === '/api/v1/users') {
          return res.end(JSON.stringify({
            items: [
              { id: 1, object_guid: 'guid-1', full_name: 'John Doe', department: 'IT', organization: 'Mock Org', job_title: 'Developer', email: 'john@example.com', phone: '+1234567890', is_active: true },
              { id: 2, object_guid: 'guid-2', full_name: 'Jane Smith', department: 'HR', organization: 'Mock Org', job_title: 'Manager', email: 'jane@example.com', is_active: true },
              { id: 3, object_guid: 'guid-3', full_name: 'Bob Ross', department: 'Design', organization: 'Acme Corp', job_title: 'Designer', email: 'bob@example.com', phone: '+1987654321', is_active: true }
            ],
            total: 3,
            page: 1,
            size: 100
          }));
        }
        
        // Single user by ID or GUID
        if (pathname.match(/^\/api\/v1\/users\/[\w-]+$/)) {
           return res.end(JSON.stringify({
             id: 'guid-1', object_guid: 'guid-1', full_name: 'Mock Admin', department: 'IT', organization: 'Mock Org', job_title: 'Developer', email: 'mock_admin@example.com', phone: '+1234567890', is_active: true
           }));
        }

        // Change requests
        if (pathname === '/api/v1/profile/me/change-requests') {
           return res.end(JSON.stringify([]));
        }
        if (pathname === '/api/v1/admin/change-requests') {
           return res.end(JSON.stringify([]));
        }

        // Admin reports
        if (pathname === '/api/v1/admin/reports') {
           return res.end(JSON.stringify([]));
        }

        // Reports
        if (pathname === '/api/v1/reports/stats') {
           return res.end(JSON.stringify({
             total_users: 3,
             active_users: 3,
             departments_count: 4,
             organizations_count: 2
           }));
        }
        if (pathname === '/api/v1/reports/departments') {
           return res.end(JSON.stringify([
             { department: 'IT', count: 1 },
             { department: 'HR', count: 1 },
             { department: 'Design', count: 1 }
           ]));
        }

        // Settings
        if (pathname === '/api/v1/settings') {
           return res.end(JSON.stringify({
             sync_interval: 3600,
             maintenance_mode: false,
             allowed_domains: ['example.com']
           }));
        }

        // Safe fallbacks for lists to prevent forEach crashes
        if (pathname.includes('change-requests') || pathname.includes('reports') || pathname.includes('users')) {
           return res.end(JSON.stringify([]));
        }

        // Fallback for any other API routes
        return res.end(JSON.stringify({ message: "Mocked fallback", url: req.url }));
      });
    }
  };
}
