# Google OAuth Setup Guide for Student Login

## Overview
Students can now sign in using their Google accounts. If a Google ID is linked to their account, they can skip entering enrollment number and password.

## Database Changes
- Added `google_id` column to `students` table (UNIQUE, indexed)
- Added `auth_provider` column to track authentication method (local or google)

## Setup Steps

### 1. Create Google OAuth Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Select "Web application"
6. Add Authorized JavaScript origins:
   - `http://localhost:3000`
   - `http://localhost:3001`
   - `https://yourdomain.com`
7. Add Authorized redirect URIs:
   - `http://localhost:3000/student/login`
   - `https://yourdomain.com/student/login`
8. Copy the Client ID

### 2. Set Environment Variables
Add to your `.env.local` or Vercel Environment Variables:

```bash
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

The `NEXT_PUBLIC_` prefix makes it accessible in the browser (required for Google Sign-In).

### 3. Database Migration
The migration script `scripts/40-add-google-oauth.sql` has already added:
- `google_id` column to students table
- `auth_provider` column to track auth method
- Indexes for faster lookups

### How It Works

1. **First Time Google Sign-In:**
   - Student clicks "Sign in with Google"
   - Google authentication happens
   - System checks if Google ID exists in database
   - If not found by Google ID, checks by email
   - If student record exists by email, Google ID is linked to that account
   - If no record found, shows error message

2. **Subsequent Google Sign-Ins:**
   - Student clicks "Sign in with Google"
   - Google authentication happens
   - System finds student by Google ID
   - Student is logged in without entering enrollment number/password

3. **Linking to Existing Accounts:**
   - If a student already has a traditional login (enrollment number + password)
   - First Google login with same email automatically links the account
   - Student can use either method to login going forward

## API Endpoints

### Google Login Endpoint
**POST** `/api/student/google-login`

Request body:
```json
{
  "googleId": "user_google_id",
  "email": "student@example.com",
  "name": "Student Name",
  "picture": "profile_picture_url"
}
```

Response (Success):
```json
{
  "success": true,
  "message": "Login successful",
  "student": {
    "id": 7,
    "full_name": "John Doe",
    "enrollment_number": "2021008",
    "course_id": 1,
    "email": "john@example.com"
  },
  "credentials": {
    "enrollment": "2021008",
    "googleId": "user_google_id"
  }
}
```

Response (No Student Found):
```json
{
  "success": false,
  "message": "No student account found. Please use your enrollment number and password, or contact your administrator.",
  "studentFound": false
}
```

## Security Considerations

1. **HTTPS Only:** Google Sign-In requires HTTPS in production
2. **Client ID Protection:** Keep CLIENT_SECRET secure (never expose in browser)
3. **Token Verification:** Backend verifies Google JWT tokens
4. **Database Constraints:** 
   - `google_id` is UNIQUE to prevent multiple accounts linking to same Google ID
   - Indexes optimize lookups
5. **Session Management:** Same secure cookie setup as traditional login

## Troubleshooting

### Google Sign-In Button Not Appearing
- Check if `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is set
- Verify Google Sign-In script loads: Check browser console for `Google Sign-In script loaded` message
- Ensure domain is in authorized JavaScript origins in Google Cloud Console

### "No student account found" Error
- Student record must exist in database first
- Student email must match Google account email, or
- Google ID must already be linked to account
- Contact administrator to create student record

### Session Not Persisting
- Check browser cookies are enabled
- Verify secure cookies settings match environment (HTTP for dev, HTTPS for prod)
- Check `session`, `token`, and `student_token` cookies are set

## Admin Panel Integration

Admins can:
1. View which students have Google IDs linked
2. See login method in security audit logs (`auth_provider` field)
3. Manually link Google IDs if needed (future feature)

## Future Enhancements

- [ ] Unlink Google account option in student profile
- [ ] Link multiple Google accounts to one student
- [ ] Two-factor authentication with Google
- [ ] Admin ability to manage OAuth connections
- [ ] Support for other OAuth providers (Microsoft, GitHub, etc.)
