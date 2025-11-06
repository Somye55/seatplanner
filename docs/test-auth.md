# Authentication Testing Guide

## Quick Test Steps

### 1. Test Login Flow
```bash
# Start the backend
cd backend
npm run dev

# In another terminal, start the frontend
cd frontend
npm run dev
```

### 2. Test Valid Login
1. Navigate to `http://localhost:5173/login`
2. Login with valid credentials
3. Open DevTools > Application > Local Storage
4. Verify these keys exist:
   - `authToken` - JWT token
   - `user` - User object
   - `tokenExpiry` - Timestamp (should be ~24 hours from now)

### 3. Test Protected Routes
1. After login, navigate to `/buildings`
2. Open DevTools > Network tab
3. Click on any API request
4. Verify `Authorization: Bearer <token>` header is present

### 4. Test Session Expiry Warning
**Option A: Wait 23.5 hours** (not practical)

**Option B: Simulate expiry**
1. Login successfully
2. Open DevTools > Console
3. Run this code to set expiry to 25 minutes from now:
```javascript
const expiry = Date.now() + (25 * 60 * 1000);
localStorage.setItem('tokenExpiry', expiry.toString());
location.reload();
```
4. You should see the yellow warning banner at the top

### 5. Test Automatic Logout on Expiry
1. Login successfully
2. Open DevTools > Console
3. Run this code to expire the token immediately:
```javascript
localStorage.setItem('tokenExpiry', '0');
location.reload();
```
4. You should be redirected to `/login`

### 6. Test API Error Handling
1. Login successfully
2. Open DevTools > Console
3. Manually corrupt the token:
```javascript
localStorage.setItem('authToken', 'invalid-token');
location.reload();
```
4. Try to navigate to any page
5. You should be redirected to `/login` with error message

### 7. Test Manual Logout
1. Login successfully
2. Click "Logout" button
3. Verify:
   - Redirected to `/login`
   - All localStorage items cleared
   - Cannot access protected routes

## Backend Testing

### Test Token Expiry Detection
```bash
# In backend directory
curl -X GET http://localhost:3001/api/students/me \
  -H "Authorization: Bearer expired-or-invalid-token"

# Expected response:
# Status: 401 or 403
# Body: { "error": "Token expired. Please login again." } or { "error": "Invalid token" }
```

### Test Valid Token
```bash
# First, login to get a token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Use the token from response
curl -X GET http://localhost:3001/api/students/me \
  -H "Authorization: Bearer <your-token-here>"

# Expected: 200 OK with student profile
```

## Automated Test Script

Create a file `test-auth.js` in the frontend directory:

```javascript
// Run this in browser console after logging in
async function testAuth() {
  console.log('🧪 Testing Authentication...\n');

  // Test 1: Check localStorage
  console.log('1️⃣ Checking localStorage...');
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  const expiry = localStorage.getItem('tokenExpiry');
  console.log('✅ Token exists:', !!token);
  console.log('✅ User exists:', !!user);
  console.log('✅ Expiry exists:', !!expiry);
  
  if (expiry) {
    const timeLeft = parseInt(expiry) - Date.now();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    console.log(`⏰ Time until expiry: ${hoursLeft}h ${minutesLeft}m\n`);
  }

  // Test 2: Check authService
  console.log('2️⃣ Checking authService...');
  const { authService } = await import('./services/authService');
  console.log('✅ isAuthenticated:', authService.isAuthenticated());
  console.log('✅ isAdmin:', authService.isAdmin());
  console.log('✅ User:', authService.getUser());
  console.log('✅ Token exists:', !!authService.getToken());
  console.log('✅ Expiring soon:', authService.isExpiringSoon(), '\n');

  // Test 3: Test API call
  console.log('3️⃣ Testing API call...');
  try {
    const { api } = await import('./services/apiService');
    const profile = await api.getStudentProfile();
    console.log('✅ API call successful:', profile);
  } catch (error) {
    console.log('❌ API call failed:', error.message);
  }

  console.log('\n✅ All tests completed!');
}

// Run the test
testAuth();
```

## Expected Behaviors

### ✅ Correct Behaviors
- Login stores token, user, and expiry in localStorage
- Protected routes require authentication
- API calls include Authorization header
- 401/403 errors trigger automatic logout
- Session expiry warning shows 30 minutes before expiry
- Expired tokens are automatically cleared
- Manual logout clears all auth data

### ❌ Incorrect Behaviors (Should NOT happen)
- Accessing protected routes without login
- API calls without Authorization header
- Staying logged in after token expires
- No warning before session expires
- Broken state after logout
- Multiple login prompts

## Troubleshooting

### Issue: Not redirected to login after token expires
**Solution**: Check browser console for errors. Verify `tokenExpiry` in localStorage.

### Issue: Warning banner doesn't show
**Solution**: Check that token expiry is within 30 minutes. Verify Layout component is mounted.

### Issue: API calls fail with CORS errors
**Solution**: Ensure backend is running and CORS is configured correctly.

### Issue: Token validation fails
**Solution**: Verify JWT_SECRET matches between frontend expectation and backend configuration.
