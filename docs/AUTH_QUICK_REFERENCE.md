# Authentication Quick Reference 🚀

## For Developers

### How Authentication Works

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │         │   Frontend  │         │   Backend   │
│             │         │  (React)    │         │  (Express)  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Login Form        │                       │
       ├──────────────────────>│                       │
       │                       │  2. POST /auth/login  │
       │                       ├──────────────────────>│
       │                       │                       │
       │                       │  3. Verify Password   │
       │                       │     Generate JWT      │
       │                       │<──────────────────────┤
       │  4. Store Token       │                       │
       │     in localStorage   │                       │
       │<──────────────────────┤                       │
       │                       │                       │
       │  5. API Request       │                       │
       │     with Auth Header  │                       │
       ├──────────────────────>│  6. GET /api/...      │
       │                       │     + Bearer Token    │
       │                       ├──────────────────────>│
       │                       │                       │
       │                       │  7. Verify JWT        │
       │                       │     Check Expiry      │
       │                       │<──────────────────────┤
       │  8. Response          │                       │
       │<──────────────────────┤                       │
       │                       │                       │
```

### Key Files

| File | Purpose |
|------|---------|
| `backend/src/routes/auth.ts` | Auth endpoints, JWT generation, middleware |
| `frontend/services/authService.ts` | Auth state management, token handling |
| `frontend/services/apiService.ts` | API calls with auth headers, error handling |
| `frontend/components/PrivateRoute.tsx` | Route protection |
| `frontend/components/Layout.tsx` | Session expiry warning |

### Common Tasks

#### Check if User is Authenticated
```typescript
import { authService } from './services/authService';

if (authService.isAuthenticated()) {
  // User is logged in
}
```

#### Check if User is Admin
```typescript
if (authService.isAdmin()) {
  // User has admin role
}
```

#### Get Current User
```typescript
const user = authService.getUser();
console.log(user?.email, user?.role);
```

#### Make Authenticated API Call
```typescript
import { api } from './services/apiService';

// Auth headers are added automatically
const students = await api.getStudents();
```

#### Handle Logout
```typescript
authService.logout();
navigate('/login');
```

#### Check Session Expiry
```typescript
const timeLeft = authService.getTimeUntilExpiry();
const expiringSoon = authService.isExpiringSoon();
```

### Environment Setup

#### Backend (.env)
```env
JWT_SECRET=your-secret-key-here
PORT=3001
DATABASE_URL=postgresql://...
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3001/api
```

### API Endpoints

#### POST /api/auth/signup
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123",
    "role": "Student",
    "branch": "CSE",
    "accessibilityNeeds": ["front_seat"]
  }'
```

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "student@example.com",
    "role": "Student"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /api/auth/login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123"
  }'
```

**Response:** Same as signup

#### Protected Endpoints
```bash
curl -X GET http://localhost:3001/api/students/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Unauthorized - Token missing or expired | Redirect to login |
| 403 | Forbidden - Invalid token or insufficient permissions | Redirect to login |
| 400 | Bad Request - Validation errors | Show error message |
| 409 | Conflict - Resource modified by another user | Show conflict resolution |

### LocalStorage Keys

| Key | Value | Purpose |
|-----|-------|---------|
| `authToken` | JWT string | Authentication token |
| `user` | JSON string | User object (id, email, role) |
| `tokenExpiry` | Timestamp | When token expires (ms since epoch) |

### Debug Commands

#### Check Auth State (Browser Console)
```javascript
// Check localStorage
console.log('Token:', localStorage.getItem('authToken'));
console.log('User:', JSON.parse(localStorage.getItem('user')));
console.log('Expiry:', new Date(parseInt(localStorage.getItem('tokenExpiry'))));

// Check authService
const { authService } = await import('./services/authService');
console.log('Authenticated:', authService.isAuthenticated());
console.log('Admin:', authService.isAdmin());
console.log('Time left:', authService.getTimeUntilExpiry() / 1000 / 60, 'minutes');
```

#### Simulate Token Expiry
```javascript
// Expire immediately
localStorage.setItem('tokenExpiry', '0');
location.reload();

// Expire in 25 minutes (to trigger warning)
const expiry = Date.now() + (25 * 60 * 1000);
localStorage.setItem('tokenExpiry', expiry.toString());
location.reload();
```

#### Test API Call
```javascript
const { api } = await import('./services/apiService');
try {
  const profile = await api.getStudentProfile();
  console.log('✅ API call successful:', profile);
} catch (error) {
  console.log('❌ API call failed:', error.message);
}
```

### Troubleshooting

#### "Access token required" error
- Token not in localStorage
- Token not being sent in Authorization header
- Check: `authService.getToken()`

#### "Token expired" error
- Token has expired (24 hours passed)
- Solution: Login again

#### "Invalid token" error
- Token is malformed or tampered with
- JWT_SECRET mismatch between frontend/backend
- Solution: Clear localStorage and login again

#### Not redirected to login after expiry
- Check `tokenExpiry` in localStorage
- Verify `isAuthenticated()` is being called
- Check browser console for errors

#### Session warning not showing
- Token not expiring within 30 minutes
- Layout component not mounted
- Check useEffect in Layout.tsx

### Best Practices

#### ✅ Do
- Always use `authService` for auth operations
- Check `isAuthenticated()` before protected operations
- Handle auth errors gracefully
- Clear sensitive data on logout
- Use HTTPS in production
- Rotate JWT_SECRET regularly

#### ❌ Don't
- Store passwords in state or localStorage
- Send tokens in URL parameters
- Ignore 401/403 errors
- Use default JWT_SECRET in production
- Store sensitive data in JWT payload
- Trust client-side auth checks alone

### Testing

#### Unit Tests
```typescript
describe('authService', () => {
  it('should store token on login', async () => {
    await authService.login('test@example.com', 'password');
    expect(authService.isAuthenticated()).toBe(true);
  });

  it('should clear token on logout', () => {
    authService.logout();
    expect(authService.isAuthenticated()).toBe(false);
  });

  it('should detect expired tokens', () => {
    localStorage.setItem('tokenExpiry', '0');
    expect(authService.isAuthenticated()).toBe(false);
  });
});
```

#### Integration Tests
```typescript
describe('Protected Routes', () => {
  it('should redirect to login when not authenticated', () => {
    authService.logout();
    render(<PrivateRoute><div>Protected</div></PrivateRoute>);
    expect(window.location.pathname).toBe('/login');
  });

  it('should allow access when authenticated', () => {
    // Mock authenticated state
    authService.login('test@example.com', 'password');
    render(<PrivateRoute><div>Protected</div></PrivateRoute>);
    expect(screen.getByText('Protected')).toBeInTheDocument();
  });
});
```

### Performance Tips

1. **Token Validation**: Happens on every `isAuthenticated()` call - very fast (< 1ms)
2. **API Calls**: Auth headers added automatically - no overhead
3. **Session Check**: Runs every minute in Layout - minimal impact
4. **LocalStorage**: Synchronous but fast for small data

### Security Reminders

- 🔒 Never commit JWT_SECRET to git
- 🔒 Use environment variables for secrets
- 🔒 Enable HTTPS in production
- 🔒 Implement rate limiting on auth endpoints
- 🔒 Consider httpOnly cookies for tokens
- 🔒 Add CSRF protection
- 🔒 Implement refresh tokens for better UX
- 🔒 Log authentication events
- 🔒 Monitor for suspicious activity

## Quick Start

### 1. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Start Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Create Test User
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "role": "Admin"
  }'
```

### 4. Login
Navigate to `http://localhost:5173/login` and use the credentials above.

## Support

- 📖 Full docs: `AUTH_IMPLEMENTATION_SUMMARY.md`
- 🧪 Testing guide: `test-auth.md`
- ✅ Security checklist: `AUTH_SECURITY_CHECKLIST.md`
- 🚀 This quick reference: `AUTH_QUICK_REFERENCE.md`
