# Password Reset UI Guide

## Overview

The password reset feature is now available through the web interface for admins and superadmins.

## Accessing the Password Reset Page

### For Admins and SuperAdmins:

1. Log in to the application
2. Look for **"Reset Password"** (🔑) in the left sidebar navigation
3. Click on it to open the password reset page

## Using the Password Reset Feature

### Step-by-Step Instructions:

1. **Navigate to Reset Password Page**

   - Click on "Reset Password" in the sidebar

2. **Fill in the Form**

   - **User Email**: Enter the email address of the user whose password you want to reset
   - **New Password**: Enter the new password (minimum 6 characters)
   - **Master Password**: Enter the master password (provided by system administrator)

3. **Submit**
   - Click the "Reset Password" button
   - If successful, you'll see a success message
   - The user can now log in with the new password immediately

### Form Features:

- **Email Validation**: Ensures valid email format
- **Password Visibility Toggle**: Click the eye icon to show/hide passwords
- **Password Length Validation**: Minimum 6 characters required
- **Real-time Error Messages**: Shows validation errors as you type

## Security Notes

The page includes important security reminders:

- Only use this feature when a user has genuinely forgotten their password
- The master password should be kept confidential and secure
- Admins cannot reset SuperAdmin passwords (only SuperAdmins can)
- The user will be able to login immediately with the new password
- Consider informing the user about their new password through a secure channel

## Common Use Cases

### Student Forgot Password

1. Student contacts admin saying they forgot their password
2. Admin logs in and navigates to "Reset Password"
3. Admin enters student's email and creates a new password
4. Admin securely communicates the new password to the student
5. Student logs in with the new password

### Teacher Forgot Password

Same process as above, but for teacher accounts.

### Bulk Password Resets

If multiple users need password resets:

1. Reset each password one at a time using the form
2. Keep track of new passwords securely
3. Communicate passwords to users through secure channels

## Error Messages

### "Invalid master password"

- The master password you entered is incorrect
- Contact the system administrator for the correct master password

### "User not found"

- The email address doesn't exist in the system
- Double-check the email for typos
- Verify the user account exists

### "Cannot reset SuperAdmin password"

- You're trying to reset a SuperAdmin password as a regular Admin
- Only SuperAdmins can reset other SuperAdmin passwords
- Log in with a SuperAdmin account to perform this action

### "Failed to reset password"

- Generic error occurred
- Check your internet connection
- Try again or contact technical support

## Tips

1. **Copy the New Password**: Before submitting, consider copying the new password to share with the user
2. **Use Strong Passwords**: Generate strong passwords for better security
3. **Document Resets**: Keep a log of password resets for audit purposes
4. **Secure Communication**: Never send passwords via unsecured channels like plain email
5. **Temporary Passwords**: Consider using temporary passwords and asking users to change them on first login

## Master Password

The master password is configured in the backend environment variables:

- Default: `SuperSecure@MasterPass2024`
- **Important**: This should be changed in production
- Only share with authorized administrators
- Store securely in a password manager

## Screenshots

### Password Reset Form

The form includes:

- User email input field
- New password input field with visibility toggle
- Master password input field with visibility toggle
- Submit button
- Security notes section

### Success Message

After successful reset:

- Green toast notification appears
- Shows the email of the user whose password was reset
- Form is cleared and ready for another reset

## Troubleshooting

### Can't Access the Page

- Ensure you're logged in as Admin or SuperAdmin
- Regular users (Students/Teachers) cannot access this page

### Form Won't Submit

- Check all fields are filled in
- Ensure email format is valid
- Verify password is at least 6 characters
- Make sure master password is correct

### Page Not in Navigation

- Refresh the page
- Clear browser cache
- Ensure you're logged in with admin credentials

## Related Documentation

- [Master Password Guide](../backend/MASTER_PASSWORD_GUIDE.md) - Backend API documentation
- [Master Password Implementation](./MASTER_PASSWORD_IMPLEMENTATION.md) - Technical implementation details
