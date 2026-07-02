# MyFitBody

AI-powered fitness and nutrition tracking app with cross-platform support (Web, iOS, Android).

## Features

- Exercise and workout tracking
- Meal logging with calorie tracking
- Daily calorie budget monitoring
- Body measurements tracking
- AI-powered recipe and workout generation (coming soon)
- Real-time progress dashboards

## Tech Stack

**Backend:**
- Node.js + Express
- Supabase (PostgreSQL)
- Anthropic Claude API

**Frontend** (Coming soon):
- React Native (Expo)
- Cross-platform (Web, iOS, Android)

**Authentication:**
- Supabase Auth (email + password)

**Hosting:**
- Render

## Project Structure

```
myfitbody/
├── backend/          # Express API server
│   ├── src/
│   │   ├── index.js          # Main server file
│   │   ├── middleware/       # Auth middleware
│   │   └── utils/            # Supabase client
│   ├── schema.sql            # Database schema
│   ├── package.json
│   └── .env
├── frontend/         # React Native app (to be added)
└── docs/             # Product specifications
```

## Setup

### Backend

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
Create `.env` file with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
ANTHROPIC_API_KEY=your_anthropic_key
PORT=3000
NODE_ENV=development
```

3. Run database migrations:
- Go to your Supabase dashboard
- Run the SQL in `database/001_complete_schema.sql`

4. Start the server:
```bash
npm run dev  # Development
npm start    # Production
```

## API Endpoints

### Exercises
- `GET /api/exercises` - Get all exercises (user's + system)
- `POST /api/exercises` - Create new exercise

### Workouts
- `GET /api/workouts` - Get user's workouts
- `POST /api/workouts` - Create new workout

### Meals
- `GET /api/meals` - Get user's meals
- `POST /api/meals` - Log a meal

### Stats
- `GET /api/stats/daily` - Get daily calorie summary

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

## Authentication

All API routes (except `/health`) require a Supabase Auth access token:
- `Authorization: Bearer <supabase access token>`

The token is verified server-side via `supabase.auth.getUser()`, and middleware resolves (or auto-creates) the app user row via `users.auth_user_id`.

## Development

The backend runs on port 3000 by default.

Health check: `GET http://localhost:3000/health`

## Deployment

### Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Build command: `cd backend && npm install`
4. Start command: `cd backend && npm start`
5. Add environment variables from `.env`

## Documentation

See `docs/` folder for detailed specifications:
- Product Requirements Document (PRD)
- Implementation Plan
- Calorie Tracking & Widget Spec
- Journal & Re-log Spec

## License

MIT
