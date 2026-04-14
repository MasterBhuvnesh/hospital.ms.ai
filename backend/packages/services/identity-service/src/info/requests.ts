export const serviceInfo = {
  service: 'identity-service',
  description: 'Identity & Access Management Service - Authentication and authorization',
  routes: [
    // ── Infrastructure ──
    { method: 'GET', path: '/', description: 'Service information and available routes' },
    { method: 'GET', path: '/health', description: 'Full health check with database ping' },
    { method: 'GET', path: '/health/live', description: 'Liveness probe (k8s)' },
    { method: 'GET', path: '/health/ready', description: 'Readiness probe (k8s)' },
    { method: 'GET', path: '/metrics', description: 'Prometheus metrics' },

    // ── Auth (public) ──
    { method: 'POST', path: '/v1/auth/register', description: 'Register a new user account' },
    { method: 'POST', path: '/v1/auth/login', description: 'Authenticate and receive tokens' },
    { method: 'POST', path: '/v1/auth/refresh', description: 'Refresh access token' },
    { method: 'POST', path: '/v1/auth/logout', description: 'Invalidate refresh token' },
    { method: 'POST', path: '/v1/auth/forgot-password', description: 'Request password reset token' },
    { method: 'POST', path: '/v1/auth/reset-password', description: 'Reset password with token' },
    { method: 'POST', path: '/v1/auth/verify-email', description: 'Verify email with token' },

    // ── Auth (authenticated) ──
    { method: 'GET', path: '/v1/auth/me', description: 'Get user profile' },
    { method: 'PUT', path: '/v1/auth/me', description: 'Update user profile' },
    { method: 'POST', path: '/v1/auth/change-password', description: 'Change password' },
    { method: 'POST', path: '/v1/auth/request-verification', description: 'Request email verification token' },

    // ── Sessions ──
    { method: 'GET', path: '/v1/auth/sessions', description: 'List active sessions' },
    { method: 'DELETE', path: '/v1/auth/sessions/:id', description: 'Revoke a specific session' },
    { method: 'POST', path: '/v1/auth/sessions/revoke-others', description: 'Revoke all other sessions' },

    // ── Devices ──
    { method: 'GET', path: '/v1/auth/devices', description: 'List tracked devices' },
    { method: 'DELETE', path: '/v1/auth/devices/:id', description: 'Remove a tracked device' },

    // ── Admin ──
    { method: 'GET', path: '/v1/admin/users', description: 'List users (paginated, filterable)' },
    { method: 'GET', path: '/v1/admin/users/:id', description: 'Get user details' },
    { method: 'POST', path: '/v1/admin/users', description: 'Create a user (admin-created)' },
    { method: 'PATCH', path: '/v1/admin/users/:id/status', description: 'Activate/deactivate user' },
    { method: 'PATCH', path: '/v1/admin/users/:id/role', description: 'Change user role' },
    { method: 'POST', path: '/v1/admin/users/:id/unlock', description: 'Unlock locked account' },
  ],
};
