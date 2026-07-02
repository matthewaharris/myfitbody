# MyFitBody - Deployment Guide

## ✅ What's Ready

- ✅ Database schema created in Supabase
- ✅ Backend API complete with all core endpoints
- ✅ Environment variables configured
- ✅ Git repository initialized with initial commit
- ✅ Code ready to push to GitHub

## 📝 Next Steps

### 1. Create GitHub Repository

Since `gh` CLI isn't installed, create the repository manually:

1. Go to https://github.com/new
2. Repository name: `myfitbody`
3. Description: "AI-powered fitness and nutrition tracking app"
4. Choose: **Public**
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

### 2. Push Code to GitHub

After creating the repository, run these commands in the `myfitbody` folder:

```bash
cd C:\Users\mharr\stait\myfitbody
git remote add origin https://github.com/YOUR_USERNAME/myfitbody.git
git branch -M main
git push -u origin main
```

### 3. Deploy to Render

#### Option A: Deploy via Render Dashboard (Recommended)

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `myfitbody`
4. Configure:
   - **Name**: `myfitbody-api`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave blank
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: Node
   - **Plan**: Free (or Starter for $7/mo)

5. Add Environment Variables (use your actual values from backend/.env):
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service_role key
   - `ANTHROPIC_API_KEY` = your Anthropic API key
   - `NODE_ENV` = `production`
   - `PORT` = `3000`

6. Click "Create Web Service"

Render will automatically deploy your backend! It will be available at:
`https://myfitbody-api.onrender.com`

#### Option B: Deploy via render.yaml (Alternative)

Create `render.yaml` in the root directory and deploy via Render's Blueprint feature.

### 4. Test the Deployment

Once deployed, test the API:

```bash
# Health check
curl https://myfitbody-api.onrender.com/health

# Should return: {"status":"ok","timestamp":"..."}
```

### 5. Test the API Endpoints

You can test the backend locally first:

```bash
cd backend
npm install
npm run dev
```

Then test with curl or Postman:

```bash
# Health check
curl http://localhost:3000/health

# Get exercises (requires a Supabase Auth access token)
curl http://localhost:3000/api/exercises \
  -H "Authorization: Bearer <supabase-access-token>"

# Log a meal
curl -X POST http://localhost:3000/api/meals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <supabase-access-token>" \
  -d '{
    "meal_type": "breakfast",
    "food_name": "Oatmeal with banana",
    "calories": 350,
    "protein": 12,
    "carbs": 60,
    "fat": 8
  }'

# Get daily stats
curl "http://localhost:3000/api/stats/daily?date=2024-11-21" \
  -H "Authorization: Bearer <supabase-access-token>"
```

## 🎯 Current Status

### ✅ Completed
- [x] Database schema (Supabase)
- [x] Backend API with core endpoints
- [x] Exercise management (CRUD)
- [x] Workout logging with exercises
- [x] Meal logging with macros
- [x] Daily calorie tracking
- [x] User profile management
- [x] Supabase Auth integration (email + password)
- [x] Documentation (PRD, specs, implementation plan)
- [x] Git repository with initial commit

### 🚧 Pending
- [ ] Push to GitHub (manual step required)
- [ ] Deploy to Render
- [ ] Frontend React Native app
- [ ] AI features (recipe/workout generation)
- [ ] iOS widget
- [ ] Journal & mood tracking
- [ ] Re-log functionality

## 📊 API Endpoints Available

### Core Endpoints
- `GET /health` - Health check
- `GET /api/exercises` - List exercises
- `POST /api/exercises` - Create exercise
- `GET /api/workouts` - List workouts
- `POST /api/workouts` - Log workout
- `GET /api/meals` - List meals
- `POST /api/meals` - Log meal
- `GET /api/stats/daily` - Daily calorie summary
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile

## 🔐 Authentication

All API routes (except `/health`) require a Supabase Auth access token:
- `Authorization: Bearer <supabase access token>`

The backend verifies the token server-side via `supabase.auth.getUser()`, and middleware resolves (or auto-creates) the app user row via `users.auth_user_id`.

## 📦 Project Structure

```
myfitbody/
├── backend/
│   ├── src/
│   │   ├── index.js (Express server with all routes)
│   │   ├── middleware/auth.js
│   │   └── utils/supabase.js
│   ├── schema.sql (Database schema)
│   ├── package.json
│   └── .env (Environment variables - NOT in git)
├── docs/ (All specification documents)
├── README.md
└── .gitignore
```

## 🚀 Next Phase: Frontend

After deployment, the next step is to build the React Native frontend using Expo, which will consume this API.

## 💡 Tips

1. **Free Tier Limitations**: Render's free tier spins down after inactivity. First request may be slow.
2. **Logs**: Check Render logs if deployment fails
3. **Database**: Supabase free tier has limits on rows and bandwidth
4. **Costs**: With current setup, monthly cost should be $0-20 for MVP testing

## 📞 Support

If you encounter issues:
1. Check Render logs
2. Verify environment variables are set correctly
3. Test locally first with `npm run dev`
4. Check Supabase connection

---

**Ready to deploy!** Follow steps 1-3 above to get your backend live on Render.
