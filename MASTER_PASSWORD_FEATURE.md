# Master Password Feature - Quick Start

## What is it?

A secure way for admins and superadmins to reset user passwords when users forget their credentials.

## How to Use (Web Interface)

### For Admins:

1. **Login** to the application as Admin or SuperAdmin
2. **Click** "Reset Password" (🔑) in the left sidebar
3. **Enter**:
   - User's email address
   - New password for the user
   - Master password (ask your system administrator)
4. **Click** "Reset Password" button
5. **Done!** The user can now login with the new password

## Master Password

- Default: `SuperSecure@MasterPass2024`
- **Change this in production!**
- Keep it secure and confidential
- Only share with authorized administrators

## Important Notes

- ✅ Admins can reset Student and Teacher passwords
- ❌ Admins CANNOT reset SuperAdmin passwords
- ✅ SuperAdmins can reset any password
- 🔒 Always use secure channels to communicate new passwords to users

## Documentation

- **UI Guide**: [docs/PASSWORD_RESET_UI_GUIDE.md](docs/PASSWORD_RESET_UI_GUIDE.md)
- **API Guide**: [backend/MASTER_PASSWORD_GUIDE.md](backend/MASTER_PASSWORD_GUIDE.md)
- **Implementation Details**: [docs/MASTER_PASSWORD_IMPLEMENTATION.md](docs/MASTER_PASSWORD_IMPLEMENTATION.md)

## Quick Example

```
User Email: student@example.com
New Password: SecurePass123
Master Password: SuperSecure@MasterPass2024
```

After reset, the student can login with:

- Email: student@example.com
- Password: SecurePass123

## Need Help?

- Can't find the page? Make sure you're logged in as Admin
- Invalid master password? Contact your system administrator
- User not found? Check the email address for typos
