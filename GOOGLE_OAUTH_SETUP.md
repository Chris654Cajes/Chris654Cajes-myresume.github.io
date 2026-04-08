# Google OAuth Setup Instructions

To enable the edit functionality for your resume and cover letter, you need to set up Google OAuth 2.0 authentication. Follow these steps:

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name your project (e.g., "Resume Editor")
4. Click "Create"

## Step 2: Enable Google Sign-In API

1. In your project, go to "APIs & Services" → "Library"
2. Search for "Google Sign-In API"
3. Click on it and press "Enable"

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the "OAuth consent screen":
   - Choose "External" user type
   - Fill in the required fields:
     - App name: "Resume Editor"
     - User support email: your email
     - Developer contact: your email
   - Click "Save and Continue"
   - Skip "Scopes" section (click Save and Continue)
   - Skip "Test users" section (click Save and Continue)

4. Create OAuth Client ID:
   - Application type: **Web application**
   - Name: "Resume Website"
   - Under "Authorized JavaScript origins", add:
     - `https://chris654cajes.github.io`
     - `http://localhost:3000` (for testing)
     - `http://127.0.0.1:5500` (for VS Code Live Server)
   - Under "Authorized redirect URIs", add:
     - `https://chris654cajes.github.io`
     - `http://localhost:3000`
     - `http://127.0.0.1:5500`
   - Click "Create"

5. Copy your **Client ID** (it looks like: `xxxxxxxxx-xxxxx.apps.googleusercontent.com`)

## Step 4: Update index.html

1. Open `index.html`
2. Find this line (around line 1095):
```javascript
client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com', // Replace with actual Client ID
```
3. Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID from Step 3

## Step 5: Test the Authentication

1. Open your website in a browser
2. Click the "Sign In to Edit" button (red button on the right)
3. Sign in with `christopherleecajes@gmail.com`
4. If successful, you'll see:
   - The "Sign In to Edit" button disappears
   - "Edit Resume" and "Edit Cover Letter" buttons appear
   - Your profile picture and name appear in the sidebar

## Important Notes

- **Only `christopherleecajes@gmail.com` can edit** - Any other email will be denied access
- **Anyone can view** - No authentication required to view the resume
- **PDF updates** - After editing, the new PDF will be generated and downloaded. You'll need to manually upload it to your GitHub repository to update the downloadable file.

## Troubleshooting

### "Access blocked" error
- Make sure your email is added as a test user in the OAuth consent screen (during development)
- Or publish the app (go to OAuth consent screen → Publishing status → Publish)

### "redirect_uri_mismatch" error
- Ensure your redirect URIs in Google Cloud Console exactly match your website URL
- Include both `http` and `https` versions if needed

### Google Sign-In not appearing
- Check browser console for errors
- Ensure the Google Sign-In script is loading: `https://accounts.google.com/gsi/client`

## Security Considerations

- The Client ID is safe to expose in client-side code (it's not a secret)
- The authentication happens entirely in the browser
- Only the specified email (`christopherleecajes@gmail.com`) can edit
- PDF files are generated client-side and downloaded locally

## Alternative: Using Environment Variables (for production)

For better security in production, consider:
1. Setting up a simple backend to handle authentication
2. Using GitHub Actions to auto-commit PDF changes
3. Using a serverless function to generate and upload PDFs

This would require additional setup but provides a more seamless experience.