# MyFitBody App - Project Status

**Last Updated**: December 10, 2024

## Project Overview
A fitness tracking mobile app with admin dashboard built with:
- **Mobile App**: React Native/Expo 54
- **Admin Dashboard**: React + Vite (deployed on Render)
- **Backend**: Node.js/Express (deployed on Render)
- **Authentication**: Clerk (mobile), Custom JWT (admin)
- **Database**: PostgreSQL (Supabase)
- **External APIs**: USDA FoodData Central, Open Food Facts, OpenAI

## Deployment URLs

| Service | URL |
|---------|-----|
| Backend API | https://myfitbody-api.onrender.com |
| Admin Dashboard | https://myfitbody-admin.onrender.com |
| Supabase | https://jbmcwxkvoipbismtdzrj.supabase.co |

## Current Working Features

### Mobile App Features

#### Authentication
- Sign up with email/password
- Email verification flow
- Sign in/out functionality
- Session persistence with expo-secure-store
- Clerk user data integration

#### Profile Setup Wizard (6-step flow)
1. **Personal Info**: First name, last name, phone number
2. **Weight Goals**: Goal selection (build muscle, lose fat, maintain), starting weight
3. **Dietary Restrictions**: Multi-select (Vegetarian, Vegan, Gluten-Free, etc.)
4. **Food Preferences**: Loved foods and avoided foods with validation
5. **Macro Targets**: Daily calories, protein, carbs, fat goals
6. **Notifications**: Toggle mood check-ins and calorie prompts

#### Home Dashboard
- Time-based greeting
- Daily calorie summary (consumed, burned, net, remaining)
- Recent workouts list
- Recent meals list
- Smart AI suggestions based on time of day and user patterns
- Calorie burn suggestions when over goal
- Quick access to AI features

#### AI-Powered Features
- **AI Workout Generator**: Custom workouts based on duration, focus, equipment, difficulty
- **AI Recipe Generator**: Recipes based on meal type, cuisine, calories, dietary restrictions
- **Smart Suggestions**: Context-aware tips throughout the day
- **Calorie Burn Suggestions**: Exercise recommendations when over calorie goal

#### Exercise & Workout Management
- Browse system exercises
- Create custom exercises
- Log sets, reps, weight per exercise
- AI-powered calorie burn estimation
- Save workouts as templates

#### Meal Logging
- Food search with USDA + Open Food Facts APIs
- Full macro tracking (calories, protein, carbs, fat, fiber, sugar)
- Food validation using OpenFoodFacts API
- Meal favorites

#### Additional Features
- Water intake tracking
- Progress photos
- Body measurements
- Recipe saving
- Workout streaks
- Account deletion (GDPR/CCPA compliant)

### Admin Dashboard Features

#### Authentication
- JWT-based admin login
- Default credentials: admin@myfitbody.app / admin123

#### Dashboard
- Total users count
- New users this week
- Active users today
- Total workouts/meals logged
- Signup trend chart (30 days)
- Activity trend chart (7 days)
- Recent users list

#### User Management
- User list with search and pagination
- Filter by status (all, active, suspended)
- User detail view with:
  - Profile information
  - Activity stats
  - Recent activity feed
- Admin actions:
  - Reset password
  - Make/Remove admin
  - Suspend/Unsuspend user
  - Delete user

## Tech Stack Details

### Mobile App (Frontend)
- React Native 0.81.5
- Expo SDK 54.0.25
- @clerk/clerk-expo 2.19.4
- Axios 1.13.2
- expo-secure-store 15.0.7

### Admin Dashboard
- React 18
- Vite 5
- Axios
- Recharts (for charts)
- React Router DOM

### Backend
- Node.js (>=18.0.0)
- Express.js 4.18.2
- @supabase/supabase-js 2.39.0
- OpenAI API 4.20.1
- jsonwebtoken 9.0.2

### Database Tables
- `users` - Core user data with Clerk ID, suspension status, admin flag
- `user_profiles` - Goals, restrictions, macro targets, food preferences
- `exercises` - System and custom exercises
- `workouts` - Workout sessions
- `workout_exercises` - Junction table for workout details
- `meals` - Meal entries with nutrition data
- `body_measurements` - Weight and body composition tracking
- `water_intake` - Daily water tracking
- `recipes` - Saved recipes
- `recipe_ingredients` - Recipe ingredients
- `ai_generated_workouts` - AI workout history
- `ai_generated_recipes` - AI recipe history
- `admin_audit_log` - Admin action tracking

## File Structure
```
C:\Users\mharr\stait\myfitbody\
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server with all API routes
│   │   ├── middleware/
│   │   │   └── auth.js           # Clerk authentication middleware
│   │   └── utils/
│   │       ├── supabase.js       # Supabase client configuration
│   │       └── pushNotifications.js  # Expo push notification helper
│   ├── migrations/               # Database migrations (002-007)
│   ├── schema.sql                # Database schema with RLS
│   ├── package.json
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── App.js                    # Main app with Clerk Provider and navigation
│   ├── screens/
│   │   ├── ProfileSetupWizard.js # 6-step profile setup flow
│   │   ├── HomeScreen.js         # Dashboard with AI suggestions
│   │   ├── WorkoutScreen.js      # Workout logging
│   │   ├── MealScreen.js         # Meal logging with food search
│   │   ├── ProfileScreen.js      # Profile editing + account deletion
│   │   └── AIScreen.js           # AI workout/recipe generator
│   ├── services/
│   │   ├── api.js                # Axios API client with all endpoints
│   │   └── notifications.js      # Push notification registration
│   ├── app.json                  # Expo configuration
│   └── package.json
│
├── admin-dashboard/
│   ├── src/
│   │   ├── App.jsx               # Main app with auth context
│   │   ├── components/
│   │   │   └── Layout.jsx        # Sidebar navigation
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx     # Admin login
│   │   │   ├── DashboardPage.jsx # Stats and charts
│   │   │   ├── UsersPage.jsx     # User list
│   │   │   └── UserDetailPage.jsx # User details + actions
│   │   └── services/
│   │       └── api.js            # Admin API client
│   ├── public/
│   │   └── _redirects            # SPA routing for Render
│   ├── vite.config.js
│   └── package.json
│
├── docs/
│   ├── system_architecture.md    # Architecture diagram
│   ├── ios_app_store_compliance.md
│   ├── future_features.md
│   └── myfitbody_prd.md
│
└── PROJECT_STATUS.md             # This file
```

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=https://jbmcwxkvoipbismtdzrj.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
OPENAI_API_KEY=<openai_key>
USDA_API_KEY=<usda_key>
PORT=3000
NODE_ENV=development
ADMIN_SECRET=<jwt_secret>
ADMIN_EMAIL=admin@myfitbody.app
ADMIN_PASSWORD_HASH=<sha256_hash>
```

### Render Environment Variables (Backend)
Same as above, set in Render dashboard under Environment.

### Admin Dashboard (.env.production)
```
VITE_API_URL=https://myfitbody-api.onrender.com
```

## Database RLS Policies

The `users` table has RLS enabled with these policies:
- `users_insert_own` - Users can insert their own record
- `users_select_own` - Users can only select their own record
- `users_update_own` - Users can only update their own record
- `service_role_select_all` - Service role can select all (for admin)

**Important**: The backend uses the service_role key to bypass RLS for admin operations.

## How to Resume Development

### 1. Start Local Development

```bash
# Terminal 1 - Backend
cd C:\Users\mharr\stait\myfitbody\backend
npm run dev

# Terminal 2 - Frontend (Mobile)
cd C:\Users\mharr\stait\myfitbody\frontend
npm start

# Terminal 3 - Admin Dashboard (optional)
cd C:\Users\mharr\stait\myfitbody\admin-dashboard
npm run dev
```

### 2. Check IP Address (for mobile testing)
```bash
ipconfig
# Look for IPv4 Address under Wi-Fi adapter
```

### 3. Update API URL if IP Changed
Edit `frontend/services/api.js`:
```javascript
const API_URL = 'http://YOUR_IP:3000/api';
```

### 4. Connect with Expo Go
- Open Expo Go on your phone
- Scan the QR code from terminal
- App should load

## Pending Tasks / Known Issues

### Database Migrations to Run
If not already done, run these in Supabase SQL Editor:
- `007_admin_features.sql` - Adds is_suspended, is_admin, last_active columns

### iOS App Store Submission
- Review `docs/ios_app_store_compliance.md` for checklist
- Account deletion feature is implemented
- Need to create App Store Connect listing
- Need privacy policy URL
- Need app screenshots

### Future Enhancements
- Integrate Clerk API for actual password reset emails
- Add push notifications for admin actions
- Implement offline mode
- Add data export feature
- Social features (sharing, challenges)

---

# Claude Context Prompt

Copy and paste this to quickly get Claude up to speed:

```
I'm working on MyFitBody, a fitness tracking app with admin dashboard:

**Stack:**
- Mobile: React Native/Expo 54 with Clerk auth
- Admin: React + Vite deployed on Render (https://myfitbody-admin.onrender.com)
- Backend: Node.js/Express on Render (https://myfitbody-api.onrender.com)
- Database: Supabase PostgreSQL
- APIs: OpenAI (gpt-4o-mini), USDA, OpenFoodFacts
- Files: C:\Users\mharr\stait\myfitbody\

**Completed Features:**
- Full mobile app with: auth, profile setup, meal/workout logging, AI features
- Admin dashboard with: user management, stats, suspend/delete/make admin

**Key Files:**
- backend/src/index.js - All API routes including admin endpoints
- frontend/screens/ - All mobile app screens
- admin-dashboard/src/ - Admin React app

**Recent Work:**
- Fixed admin dashboard RLS issue (added service_role_select_all policy)
- Added toggle admin, suspend, delete user features
- Created system architecture diagram

Can you help me continue?
```
