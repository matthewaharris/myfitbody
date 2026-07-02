# MyFitBody Project Setup Guide

This document contains everything needed to set up the MyFitBody project from scratch. Use this guide when spinning up the project on new infrastructure.

## Project Overview

**MyFitBody** is a fitness and nutrition tracking mobile app with:
- **Frontend**: React Native / Expo mobile app
- **Backend**: Node.js / Express API server
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth for user authentication (email + password)
- **Hosting**: Render.com for backend + admin dashboard
- **Admin Dashboard**: React + Vite web app

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Expo Mobile    │────▶│  Express API    │────▶│   Supabase      │
│  (React Native) │     │  (Render.com)   │     │   (PostgreSQL)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │
         │                      │
         ▼                      ▼
┌─────────────────┐     ┌─────────────────┐
│  Supabase Auth  │     │  Admin Dashboard│
│  (Auth Provider)│     │  (Render Static)│
└─────────────────┘     └─────────────────┘
```

---

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `myfitbody` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### 1.2 Run Database Schema

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy contents of `database/001_complete_schema.sql`
3. Paste and click "Run"
4. Verify tables were created by checking **Table Editor**

### 1.3 Create Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Click "New Bucket"
3. Name: `progress-photos`
4. Set to **Public** (for image access)

### 1.4 Get API Keys

1. Go to **Settings > API Keys**
2. Copy these values (you'll need them later):
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (used by the mobile app for auth only)
   - **service_role key**: `eyJhbG...` (keep this secret!)

---

## Step 2: Set Up Supabase Auth

### 2.1 Configure Auth Provider

1. In the Supabase Dashboard, go to **Authentication > Sign In / Providers**
2. Enable the **Email** provider (email + password)
3. Disable **"Confirm email"** (the app does not use email confirmation)

### 2.2 Auth Keys

Supabase Auth uses the same keys from Step 1.4:
- The **anon key** is used by the mobile app to sign up / sign in
- The **service_role key** is used by the backend to verify access tokens

### 2.3 Configure Supabase Auth for Expo

Set the Supabase values in `frontend/.env.local` (see `frontend/.env.example`):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 3: Get External API Keys

### 3.1 Anthropic API Key

1. Go to [platform.claude.com](https://platform.claude.com)
2. Click **API Keys**
3. Create new API key
4. Copy: `sk-ant-...`

### 3.2 USDA FoodData Central API Key

1. Go to [fdc.nal.usda.gov/api-key-signup.html](https://fdc.nal.usda.gov/api-key-signup.html)
2. Fill out the form
3. Check email for API key

---

## Step 4: Deploy Backend to Render

### 4.1 Connect GitHub Repository

1. Go to [render.com](https://render.com) and sign in
2. Click "New +" → "Web Service"
3. Connect your GitHub repo: `myfitbody`
4. Select the repository

### 4.2 Configure Web Service

- **Name**: `myfitbody-api`
- **Region**: Choose closest to your database
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 4.3 Add Environment Variables

In Render Dashboard, add these environment variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` | From Step 1.4 |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbG...` | From Step 1.4 |
| `ANTHROPIC_API_KEY` | `sk-ant-...` | From Step 3.1 |
| `USDA_API_KEY` | `your-key` | From Step 3.2 |
| `PORT` | `3000` | Default |
| `NODE_ENV` | `production` | For production |
| `ADMIN_SECRET` | `random-string` | Generate a random string |
| `ADMIN_EMAIL` | `admin@myfitbody.app` | Your admin email |
| `ADMIN_PASSWORD_HASH` | `sha256-hash` | See below |

**To generate admin password hash:**
```bash
node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
```

### 4.4 Deploy

1. Click "Create Web Service"
2. Wait for build to complete (~2-3 minutes)
3. Note the URL: `https://myfitbody-api.onrender.com`
4. Test: `https://myfitbody-api.onrender.com/health`

---

## Step 5: Deploy Admin Dashboard to Render

### 5.1 Create Static Site

1. In Render, click "New +" → "Static Site"
2. Select the same GitHub repo
3. Configure:
   - **Name**: `myfitbody-admin`
   - **Branch**: `main`
   - **Root Directory**: `admin-dashboard`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### 5.2 Add Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://myfitbody-api.onrender.com` |

### 5.3 Add Redirect Rule

In Render Static Site settings, add redirect:
- **Source**: `/*`
- **Destination**: `/index.html`
- **Status**: `200`

This enables SPA routing.

---

## Step 6: Configure Mobile App

### 6.1 Update API URL

In `frontend/src/services/api.js` (or config file):
```javascript
const API_URL = 'https://myfitbody-api.onrender.com';
```

### 6.2 Update Supabase Env Vars

In `frontend/.env.local` (see `frontend/.env.example`):
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

These are also set in the EAS project environment (development/preview/production) for EAS builds.

### 6.3 Run Locally

```bash
cd frontend
npm install
npx expo start
```

### 6.4 Build for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

---

## Environment Variables Reference

### Backend (`backend/.env`)

```env
# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# External APIs
ANTHROPIC_API_KEY=sk-ant-...
USDA_API_KEY=your-usda-key

# Server
PORT=3000
NODE_ENV=production

# Admin
ADMIN_SECRET=random-secret-key
ADMIN_EMAIL=admin@myfitbody.app
ADMIN_PASSWORD_HASH=sha256-hash-of-password
```

### Admin Dashboard (`admin-dashboard/.env.production`)

```env
VITE_API_URL=https://myfitbody-api.onrender.com
```

### Frontend (`frontend/.env.local`)

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
```

Also set these in the EAS project environment (development/preview/production). The backend API URL is configured in code.

---

## Database Management

### Reset Database

To completely reset the database:

1. Go to Supabase SQL Editor
2. Run `database/000_drop_all.sql`
3. Run `database/001_complete_schema.sql`

### Apply Migrations

Schema scripts live in `database/`:
- `001_complete_schema.sql` - Full schema (RLS enabled on all 19 tables with no policies; the backend uses the service role key, and the anon key is used for auth only)
- `002_supabase_auth.sql` - Adds `auth_user_id` (links users to Supabase Auth)
- `003_drop_clerk.sql` - Drops the legacy `clerk_user_id` column

Older individual migrations are in `backend/migrations/`. Run them in order if updating an existing database.

---

## Testing

### Run Backend Tests

```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### Test Endpoints

```bash
# Health check
curl https://myfitbody-api.onrender.com/health

# Should return: {"status":"ok","timestamp":"..."}
```

---

## Troubleshooting

### Backend Not Starting

1. Check Render logs for errors
2. Verify all environment variables are set
3. Ensure Supabase project is running

### Database Connection Issues

1. Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
2. Check Supabase project status
3. Ensure the backend is using the service role key (RLS is enabled on all tables with no policies, so the anon key cannot read data)

### Admin Dashboard 404s

1. Add redirect rule: `/* → /index.html` (status 200)
2. Verify VITE_API_URL is correct

### Push Notifications Not Working

1. Ensure push_token is stored for user
2. Check Expo push notification service status
3. Verify app has notification permissions

---

## Project Structure

```
myfitbody/
├── frontend/           # React Native / Expo mobile app
│   ├── src/
│   │   ├── screens/   # App screens
│   │   ├── components/# Reusable components
│   │   └── services/  # API client
│   └── app.json       # Expo config
│
├── backend/            # Node.js / Express API
│   ├── src/
│   │   ├── index.js   # Main API routes
│   │   ├── middleware/# Auth middleware
│   │   └── utils/     # Helper functions
│   ├── __tests__/     # Jest tests
│   └── package.json
│
├── admin-dashboard/    # React + Vite admin panel
│   ├── src/
│   │   ├── pages/     # Admin pages
│   │   └── services/  # API client
│   └── vite.config.js
│
├── database/           # SQL scripts
│   ├── 000_drop_all.sql
│   ├── 001_complete_schema.sql
│   ├── 002_supabase_auth.sql
│   └── 003_drop_clerk.sql
│
└── PROJECT_SETUP.md    # This file
```

---

## Useful Links

- **Supabase Dashboard**: https://supabase.com/dashboard
- **Render Dashboard**: https://dashboard.render.com
- **Claude Platform**: https://platform.claude.com
- **Expo**: https://expo.dev

---

## Contact / Notes

- GitHub Repo: https://github.com/matthewaharris/myfitbody
- Last Updated: December 2024
