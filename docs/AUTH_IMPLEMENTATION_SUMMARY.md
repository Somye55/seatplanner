# Authentication & Session Management Implementation

## Overview
Enhanced the authentication system to handle session expiry gracefully and provide a better user experience.

## Changes Made

### Backend (`backend/src/routes/auth.ts`)
- **Improved JWT Error Handling**: Distinguished between expired tokens and invalid tokens
  - Returns `401` with "Token expired" message for expired tokens
  - Returns `403` with "Invalid token" message for malformed tokens
  - JWT tokens expire after 24 hours

### Frontend (`frontend/services/authService.ts`)
- **Token Expiry Tracking**: Added `tokenExpiry` field to track when tokens expire
  - Stores expiry time in localStorage (24h - 5min buffer)
  - Validates token expiry on every `isAuthenticated()` check
  - Automatically logs out users when token expires

- **Enhanced Authentication Check**: `isAuthenticated()` now:
  - Checks if token exists
  - Validates token hasn't expired
  - Auto-logs out if expired

- **Session Expiry Utilities**:
  - `getTimeUntilExpiry()`: Returns milliseconds until token expires
  - `isExpiringSoon()`: Returns true if token expires within 30 minutes
  - `handleAuthError()`: Logs out user and redirects to login

### Frontend (`frontend/services/apiService.ts`)
- **Proactive Session Validation**: Checks authentication before making API calls
- **Graceful Error Handling**: 
  - Intercepts 401/403 responses
  - Automatically logs out user
  - Redirects to login page
  - Shows clear error message: "Your session has expired. Please login again."

### Frontend (`frontend/components/Layout.tsx`)
- **Session Expiry Warning Banner**: 
  - Shows yellow warning banner 30 minutes before session expires
  - Prompts user to save work and refresh
  - Checks expiry status every minute

## Security Features

1. **Token Expiration**: JWT tokens expire after 24 hours
2. **Client-Side Validation**: Frontend validates token expiry before API calls
3. **Server-Side Validation**: Backend verifies JWT signature and expiry
4. **Automatic Cleanup**: Expired tokens are automatically removed from localStorage
5. **Secure Storage**: Tokens stored in localStorage (consider httpOnly cookies for production)

## User Experience Improvements

1. **Proactive Warning**: Users see warning 30 minutes before session expires
2. **Graceful Logout**: Automatic logout on token expiry with clear messaging
3. **No Broken States**: API calls fail gracefully with proper error handling
4. **Seamless Redirect**: Users redirected to login page when session expires

## Testing Checklist

### Manual Testing
- [ ] Login with valid credentials
- [ ] Verify token stored in localStorage
- [ ] Make API calls and verify auth headers sent
- [ ] Wait for token to expire (or manually delete tokenExpiry from localStorage)
- [ ] Verify automatic logout and redirect to login
- [ ] Verify 401/403 errors trigger logout
- [ ] Check session expiry warning appears 30 minutes before expiry
- [ ] Logout manually and verify all auth data cleared

### Edge Cases
- [ ] Refresh page with valid token - should stay logged in
- [ ] Refresh page with expired token - should redirect to login
- [ ] Multiple tabs - logout in one tab should affect others (on next API call)
- [ ] Invalid token in localStorage - should clear and redirect
- [ ] Network errors vs auth errors - handled differently

## Production Recommendations

1. **HttpOnly Cookies**: Consider using httpOnly cookies instead of localStorage for better XSS protection
2. **Refresh Tokens**: Implement refresh token mechanism for longer sessions
3. **Token Refresh**: Add endpoint to refresh tokens before expiry
4. **CSRF Protection**: Add CSRF tokens for state-changing operations
5. **Rate Limiting**: Add rate limiting on auth endpoints
6. **Audit Logging**: Log authentication events for security monitoring
7. **Multi-Factor Auth**: Consider adding MFA for admin accounts

## API Endpoints

### POST /api/auth/login
- **Request**: `{ email: string, password: string }`
- **Response**: `{ user: User, token: string }`
- **Errors**: 
  - `401`: Invalid credentials
  - `400`: Validation errors

### POST /api/auth/signup
- **Request**: `{ email: string, password: string, role?: 'Admin' | 'Student', branch?: Branch, accessibilityNeeds?: string[] }`
- **Response**: `{ user: User, token: string }`
- **Errors**: 
  - `400`: User exists or validation errors

### Protected Endpoints
- **Header**: `Authorization: Bearer <token>`
- **Errors**:
  - `401`: Token missing or expired
  - `403`: Invalid token or insufficient permissions

## Environment Variables

```env
JWT_SECRET=your-secret-key-here  # Change in production!
```

## Files Modified

1. `backend/src/routes/auth.ts` - Enhanced JWT error handling
2. `frontend/services/authService.ts` - Token expiry tracking and validation
3. `frontend/services/apiService.ts` - Auth error interception
4. `frontend/components/Layout.tsx` - Session expiry warning banner
