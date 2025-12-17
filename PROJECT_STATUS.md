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

## How to Run the App

**IMPORTANT**: Only the frontend runs locally. Backend is deployed on Render and runs automatically.

```bash
cd C:\Users\mharr\stait\myfitbody\frontend
npx expo start -c --tunnel
```

- Use `--tunnel` flag (required - normal Expo connection often fails)
- `-c` clears cache (helpful after file changes)
- Backend auto-deploys on git push to main

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
- Recent workouts list with grouped display
- Recent meals grouped by day and meal type (Breakfast, Lunch, Dinner, Snack)
- **Meal Quick Actions**:
  - Delete button (✕) on each meal with confirmation
  - Tap meal to edit (opens MealScreen with pre-filled data)
  - Add button (+) per meal type for quick logging
- Smart AI suggestions based on time of day and user patterns
- Calorie burn suggestions when over goal
- Quick access to engagement features (Mood, Badges, Journal, Reminders)

#### Engagement Features (NEW)
- **Mood/Energy Check-ins**: 1-5 scale with emojis, 30-day trends, notes
- **Achievement Badges**: 20+ badges across categories (milestone, workout, nutrition, streak, special)
- **Daily Journal**: Per-date entries with title, content, mood, tags + auto-generated activity summary
- **Reminder Settings**: Configurable reminders for meals, workouts, water, mood check-ins

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
- Barcode scanner for quick food lookup
- Full macro tracking (calories, protein, carbs, fat, fiber, sugar)
- Food validation using OpenFoodFacts API
- Meal favorites with quick re-log
- **Edit existing meals** (tap to edit from Recent Activity)
- **Delete meals** (with confirmation dialog)

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
- expo-camera (for barcode scanning)

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
- `user_profiles` - Goals, restrictions, macro targets, food preferences, reminder_settings JSONB
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
- `mood_checkins` - Mood/energy ratings with notes
- `badge_definitions` - 20+ achievement badge definitions
- `user_badges` - Junction table for earned badges
- `journal_entries` - Daily journal with auto_summary JSONB
- `user_stats` - Running totals (workouts, meals, streaks)
- `notification_history` - Push notification tracking

## File Structure
```
C:\Users\mharr\stait\myfitbody\
├── backend/
│   ├── src/
│   │   ├── index.js              # Express server (~4000 lines, all API routes)
│   │   ├── middleware/
│   │   │   └── auth.js           # Clerk authentication middleware
│   │   └── utils/
│   │       ├── supabase.js       # Supabase client configuration
│   │       └── pushNotifications.js  # Expo push notification helper
│   ├── migrations/
│   │   ├── 007_admin_features.sql    # is_suspended, is_admin, audit log
│   │   └── 008_engagement_features.sql # mood, badges, journal, stats tables
│   ├── schema.sql                # Database schema with RLS
│   ├── package.json
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── App.js                    # Main app with Clerk Provider and navigation
│   ├── screens/
│   │   ├── ProfileSetupWizard.js # 6-step profile setup flow
│   │   ├── HomeScreen.js         # Dashboard with meal grouping, delete/edit/add
│   │   ├── WorkoutScreen.js      # Workout logging
│   │   ├── MealScreen.js         # Meal logging with edit mode support
│   │   ├── ProfileScreen.js      # Profile editing + account deletion
│   │   ├── AIScreen.js           # AI workout/recipe generator
│   │   ├── MoodCheckinScreen.js  # Mood/energy check-ins with trends
│   │   ├── BadgesScreen.js       # Achievement badges with progress
│   │   ├── JournalScreen.js      # Daily journal with auto-summary
│   │   └── ReminderSettingsScreen.js # Push notification settings
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

## Key API Endpoints

### Meal CRUD (recently added)
- `GET /api/meals` - List meals with optional date filter
- `GET /api/meals/:mealId` - Get single meal by ID
- `POST /api/meals` - Create new meal
- `PATCH /api/meals/:mealId` - Update meal
- `DELETE /api/meals/:mealId` - Delete meal

### Engagement Features
- `POST /api/mood-checkins` - Create mood check-in
- `GET /api/mood-checkins` - List check-ins
- `GET /api/mood-checkins/trends` - Mood trends with chart data
- `GET /api/badges/definitions` - All badge definitions
- `GET /api/badges/earned` - User's earned badges
- `GET /api/badges/progress` - Progress toward all badges
- `POST /api/badges/check` - Check and award new badges
- `POST /api/journal` - Create/update journal entry (upsert by date)
- `GET /api/journal` - List journal entries
- `GET /api/journal/:date` - Get entry with auto-generated summary
- `PATCH /api/journal/:date/favorite` - Toggle favorite
- `GET /api/reminders/settings` - Get reminder settings
- `PUT /api/reminders/settings` - Update reminder settings
- `GET /api/stats/user` - Get user stats (totals, streaks)

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

## Database Migrations to Run

Run these in Supabase SQL Editor if not already done:
1. `007_admin_features.sql` - Adds is_suspended, is_admin, last_active columns
2. `008_engagement_features.sql` - Creates mood_checkins, badge_definitions, user_badges, journal_entries, user_stats, notification_history tables + triggers

## Recent Git Commits

```
9de5fdc - Add meal edit, delete, and quick-add buttons in Recent Activity
3a5bd2d - Fix timezone issue in daily stats - pass client local date
fc7f637 - Add missing frontend files (screens, config, assets)
9308640 - Add engagement features: mood check-ins, badges, journal, reminders
```

## Known Issues & Lessons Learned

1. **Use `--tunnel` flag for Expo**: Regular Expo connection often fails. Use `npx expo start -c --tunnel`

2. **Backend is on Render**: No local backend needed. Changes deploy automatically on git push.

3. **Timezone bugs**: Daily stats endpoints must handle timezone correctly. Frontend passes local date string (YYYY-MM-DD) and tzOffset.

4. **Supabase service_role key doesn't always bypass RLS**: May need explicit policies for service_role.

5. **Static site routing on Render**: Need `_redirects` file with `/* /index.html 200` for SPA routing.

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

**How to Run:**
cd C:\Users\mharr\stait\myfitbody\frontend
npx expo start -c --tunnel
(Backend runs on Render automatically - no local backend needed)

**Completed Features:**
- Full mobile app: auth, profile setup, meal/workout logging, AI features
- Engagement features: mood check-ins, badges, journal, reminders
- Recent Activity: meals grouped by day/type with edit/delete/add buttons
- Admin dashboard: user management, stats, suspend/delete/make admin

**Key Files:**
- backend/src/index.js - All API routes (~4000 lines)
- frontend/screens/HomeScreen.js - Dashboard with meal actions
- frontend/screens/MealScreen.js - Meal logging with edit mode
- frontend/services/api.js - All API functions
- admin-dashboard/src/ - Admin React app

**Recent Work:**
- Added meal edit, delete, quick-add buttons in Recent Activity
- Fixed timezone bug in daily stats
- Added engagement features (mood, badges, journal, reminders)
- Meals now grouped by day and meal type

**Migrations needed in Supabase:**
- 007_admin_features.sql
- 008_engagement_features.sql

Can you help me continue?
```
