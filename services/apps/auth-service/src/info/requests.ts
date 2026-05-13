export const serviceInfo = {
  service: 'auth-service',
  description: 'Authentication Service - User authentication, authorization, and session management',
  routes: [
    {
      method: 'GET',
      path: '/',
      description: 'Service information and available routes',
    },
    {
      method: 'GET',
      path: '/health',
      description: 'Health check — returns service liveness and status',
    },
    {
      method: 'POST',
      path: '/auth/register',
      description: 'Register a new user (patient or doctor) with profile creation',
    },
    {
      method: 'POST',
      path: '/auth/login',
      description: 'Login with email and password, returns authentication token',
    },
    {
      method: 'GET',
      path: '/auth/users',
      description: 'List all registered users',
    },
    {
      method: 'GET',
      path: '/auth/users/:id',
      description: 'Get a specific user by ID with their profile',
    },
  ],
};
