export interface ServiceRoute {
  target: string;
  pathPrefix: string;
  changeOrigin: boolean;
  requiresAuth: boolean;
}

export const GATEWAY_ROUTES: Record<string, ServiceRoute> = {
  auth: {
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/v1/auth',
    changeOrigin: true,
    requiresAuth: false,
  },
  users: {
    target: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    pathPrefix: '/api/v1/users',
    changeOrigin: true,
    requiresAuth: true,
  },
  students: {
    target: process.env.STUDENT_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/api/v1/students',
    changeOrigin: true,
    requiresAuth: true,
  },
  companies: {
    target: process.env.COMPANY_SERVICE_URL || 'http://localhost:3004',
    pathPrefix: '/api/v1/companies',
    changeOrigin: true,
    requiresAuth: true,
  },
  projects: {
    target: process.env.PROJECT_SERVICE_URL || 'http://localhost:3005',
    pathPrefix: '/api/v1/projects',
    changeOrigin: true,
    requiresAuth: false,
  },
  applications: {
    target: process.env.APPLICATION_SERVICE_URL || 'http://localhost:3006',
    pathPrefix: '/api/v1/applications',
    changeOrigin: true,
    requiresAuth: true,
  },
  matching: {
    target: process.env.MATCHING_SERVICE_URL || 'http://localhost:3007',
    pathPrefix: '/api/v1/matching',
    changeOrigin: true,
    requiresAuth: true,
  },
  evaluations: {
    target: process.env.EVALUATION_SERVICE_URL || 'http://localhost:3008',
    pathPrefix: '/api/v1/evaluations',
    changeOrigin: true,
    requiresAuth: false,
  },
  notifications: {
    target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009',
    pathPrefix: '/api/v1/notifications',
    changeOrigin: true,
    requiresAuth: true,
  },
  chat: {
    target: process.env.CHAT_SERVICE_URL || 'http://localhost:3010',
    pathPrefix: '/api/v1/chat',
    changeOrigin: true,
    requiresAuth: true,
  },
  admin: {
    target: process.env.ADMIN_SERVICE_URL || 'http://localhost:3011',
    pathPrefix: '/api/v1/admin',
    changeOrigin: true,
    requiresAuth: true,
  },
  analytics: {
    target: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3012',
    pathPrefix: '/api/v1/analytics',
    changeOrigin: true,
    requiresAuth: true,
  },
  storage: {
    target: process.env.STORAGE_SERVICE_URL || 'http://localhost:3013',
    pathPrefix: '/api/v1/storage',
    changeOrigin: true,
    requiresAuth: true,
  },
};
