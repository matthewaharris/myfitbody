# MyFitBody System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    CLIENTS                                           │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ┌──────────────────────┐              ┌──────────────────────┐                    │
│   │   Mobile App (iOS)   │              │   Admin Dashboard    │                    │
│   │   React Native/Expo  │              │   React + Vite       │                    │
│   │                      │              │                      │                    │
│   │   Local Development: │              │   Local Development: │                    │
│   │   Expo Go App        │              │   localhost:5173     │                    │
│   │                      │              │                      │                    │
│   │   Production:        │              │   Production:        │                    │
│   │   iOS App Store      │              │   Render Static Site │                    │
│   │   (pending)          │              │   myfitbody-admin.   │                    │
│   │                      │              │   onrender.com       │                    │
│   └──────────┬───────────┘              └──────────┬───────────┘                    │
│              │                                     │                                 │
│              │ HTTPS                               │ HTTPS                           │
│              │                                     │                                 │
└──────────────┼─────────────────────────────────────┼─────────────────────────────────┘
               │                                     │
               ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  BACKEND API                                         │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│                      ┌─────────────────────────────────┐                            │
│                      │      Express.js Backend         │                            │
│                      │         (Node.js)               │                            │
│                      │                                 │                            │
│                      │   Local Development:            │                            │
│                      │   localhost:3000                │                            │
│                      │                                 │                            │
│                      │   Production:                   │                            │
│                      │   Render Web Service            │                            │
│                      │   myfitbody-api.onrender.com    │                            │
│                      │                                 │                            │
│                      │   Endpoints:                    │                            │
│                      │   ├── /api/users/*              │                            │
│                      │   ├── /api/meals/*              │                            │
│                      │   ├── /api/workouts/*           │                            │
│                      │   ├── /api/ai/*                 │                            │
│                      │   ├── /api/admin/*              │                            │
│                      │   └── /health                   │                            │
│                      │                                 │                            │
│                      └────────┬───────────┬───────────┘                            │
│                               │           │                                         │
└───────────────────────────────┼───────────┼─────────────────────────────────────────┘
                                │           │
           ┌────────────────────┘           └────────────────────┐
           │                                                     │
           ▼                                                     ▼
┌─────────────────────────────────┐             ┌─────────────────────────────────┐
│        EXTERNAL SERVICES        │             │           DATABASE              │
├─────────────────────────────────┤             ├─────────────────────────────────┤
│                                 │             │                                 │
│  ┌───────────────────────────┐  │             │  ┌───────────────────────────┐  │
│  │      Supabase Auth        │  │             │  │       Supabase            │  │
│  │   (Authentication)        │  │             │  │    (PostgreSQL + API)     │  │
│  │                           │  │             │  │                           │  │
│  │   - User signup/login     │  │             │  │   Tables:                 │  │
│  │   - JWT access tokens     │  │             │  │   ├── users               │  │
│  │   - Password management   │  │             │  │   ├── user_profiles       │  │
│  │   - Email confirm off     │  │             │  │   ├── meals               │  │
│  │                           │  │             │  │   ├── workouts            │  │
│  │   supabase.co             │  │             │  │   ├── exercises           │  │
│  └───────────────────────────┘  │             │  │   ├── body_measurements   │  │
│                                 │             │  │   ├── water_intake        │  │
│  ┌───────────────────────────┐  │             │  │   ├── recipes             │  │
│  │       OpenAI API          │  │             │  │   ├── ai_generated_*      │  │
│  │   (AI Features)           │  │             │  │   └── admin_audit_log     │  │
│  │                           │  │             │  │                           │  │
│  │   - Workout generation    │  │             │  │   URL:                    │  │
│  │   - Recipe generation     │  │             │  │   xzbojmczlmkcqvetiqfh.   │  │
│  │   - Smart suggestions     │  │             │  │   supabase.co             │  │
│  │   - Calorie burn tips     │  │             │  │                           │  │
│  │                           │  │             │  │   Auth: Service Role Key  │  │
│  │   Model: gpt-4o-mini      │  │             │  │   (bypasses RLS)          │  │
│  │   api.openai.com          │  │             │  │                           │  │
│  └───────────────────────────┘  │             │  └───────────────────────────┘  │
│                                 │             │                                 │
│  ┌───────────────────────────┐  │             └─────────────────────────────────┘
│  │    OpenFoodFacts API      │  │
│  │   (Food Validation)       │  │
│  │                           │  │
│  │   - Validate food names   │  │
│  │   - Search food database  │  │
│  │                           │  │
│  │   world.openfoodfacts.org │  │
│  └───────────────────────────┘  │
│                                 │
│  ┌───────────────────────────┐  │
│  │       USDA API            │  │
│  │   (Nutrition Data)        │  │
│  │                           │  │
│  │   - Food nutrition info   │  │
│  │   - Calorie/macro lookup  │  │
│  │                           │  │
│  │   fdc.nal.usda.gov        │  │
│  └───────────────────────────┘  │
│                                 │
└─────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DEPLOYMENT SUMMARY                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   Service              │ Platform        │ URL / Location                           │
│   ─────────────────────┼─────────────────┼────────────────────────────────────────  │
│   Mobile App           │ Local (Expo)    │ Expo Go on device                        │
│   Mobile App           │ iOS App Store   │ (pending submission)                     │
│   Admin Dashboard      │ Render Static   │ https://myfitbody-admin.onrender.com     │
│   Backend API          │ Render Web Svc  │ https://myfitbody-api.onrender.com       │
│   Database             │ Supabase        │ PostgreSQL (hosted)                      │
│   Authentication       │ Supabase Auth   │ supabase.co (hosted)                     │
│   AI Services          │ OpenAI          │ api.openai.com                           │
│   Food Data            │ USDA/OpenFood   │ External APIs                            │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW DIAGRAM                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   1. USER AUTHENTICATION FLOW                                                        │
│   ┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐        │
│   │  Mobile    │ ───► │  Supabase  │ ───► │  Backend   │ ───► │  Supabase  │        │
│   │   App      │      │    Auth    │      │  (create   │      │  (store    │        │
│   │            │ ◄─── │  (verify)  │ ◄─── │   user)    │ ◄─── │   user)    │        │
│   └────────────┘ JWT  └────────────┘      └────────────┘      └────────────┘        │
│                                                                                      │
│   2. MEAL LOGGING FLOW                                                               │
│   ┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐        │
│   │  Mobile    │ ───► │  Backend   │ ───► │   USDA     │      │  Supabase  │        │
│   │   App      │      │            │ ───► │   API      │      │  (store    │        │
│   │  (log meal)│ ◄─── │  (enrich   │ ◄─── │ (nutrition)│ ───► │   meal)    │        │
│   └────────────┘      │   data)    │      └────────────┘      └────────────┘        │
│                       └────────────┘                                                 │
│                                                                                      │
│   3. AI WORKOUT GENERATION FLOW                                                      │
│   ┌────────────┐      ┌────────────┐      ┌────────────┐      ┌────────────┐        │
│   │  Mobile    │ ───► │  Backend   │ ───► │  OpenAI    │      │  Supabase  │        │
│   │   App      │      │  (build    │      │  (generate │      │  (save     │        │
│   │  (request) │ ◄─── │   prompt)  │ ◄─── │  workout)  │ ───► │  workout)  │        │
│   └────────────┘      └────────────┘      └────────────┘      └────────────┘        │
│                                                                                      │
│   4. ADMIN DASHBOARD FLOW                                                            │
│   ┌────────────┐      ┌────────────┐      ┌────────────┐                            │
│   │  Admin     │ ───► │  Backend   │ ───► │  Supabase  │                            │
│   │ Dashboard  │      │  (JWT auth │      │  (service  │                            │
│   │            │ ◄─── │   admin)   │ ◄─── │   role)    │                            │
│   └────────────┘      └────────────┘      └────────────┘                            │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           ENVIRONMENT VARIABLES                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   Backend (.env):                                                                    │
│   ├── SUPABASE_URL              - Supabase project URL                              │
│   ├── SUPABASE_SERVICE_ROLE_KEY - Service role key (bypasses RLS)                   │
│   ├── OPENAI_API_KEY            - OpenAI API key for AI features                    │
│   ├── USDA_API_KEY              - USDA FoodData Central API key                     │
│   ├── PORT                      - Server port (default: 3000)                       │
│   ├── NODE_ENV                  - Environment (development/production)              │
│   ├── ADMIN_SECRET              - JWT secret for admin tokens                       │
│   ├── ADMIN_EMAIL               - Admin login email                                 │
│   └── ADMIN_PASSWORD_HASH       - SHA256 hash of admin password                     │
│                                                                                      │
│   Admin Dashboard (.env.production):                                                 │
│   └── VITE_API_URL              - Backend API URL for production                    │
│                                                                                      │
│   Mobile App (frontend/.env.local, also set in EAS project env):                    │
│   ├── EXPO_PUBLIC_SUPABASE_URL      - Supabase project URL                          │
│   └── EXPO_PUBLIC_SUPABASE_ANON_KEY - Supabase anon key (auth only)                 │
│                                                                                      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### Mobile App (React Native / Expo)
- **Framework**: React Native with Expo
- **State Management**: React hooks + AsyncStorage
- **Authentication**: Supabase Auth (email + password) via @supabase/supabase-js
- **Navigation**: React Navigation
- **Key Features**: Meal tracking, workout logging, AI recommendations, progress photos

### Admin Dashboard (React + Vite)
- **Framework**: React 18 with Vite
- **Styling**: Inline styles (no CSS framework)
- **Charts**: Recharts
- **HTTP Client**: Axios
- **Features**: User management, analytics, suspend/delete users, admin controls

### Backend API (Express.js)
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database Client**: @supabase/supabase-js
- **AI Client**: OpenAI SDK
- **Auth**: Custom JWT for admin, Supabase Auth access tokens verified via supabase.auth.getUser() for users

### Database (Supabase/PostgreSQL)
- **Platform**: Supabase (managed PostgreSQL)
- **Auth**: Row Level Security (RLS) enabled on all 19 tables with no policies; backend uses service role
- **Real-time**: Available but not currently used
- **Storage**: Supabase Storage for progress photos

### External APIs
- **Supabase Auth**: User authentication, email + password, JWT access tokens
- **OpenAI**: GPT-4o-mini for workout/recipe generation
- **USDA**: Nutrition data lookup
- **OpenFoodFacts**: Food name validation
