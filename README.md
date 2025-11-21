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
- OpenAI API

**Frontend** (Coming soon):
- React Native (Expo)
- Cross-platform (Web, iOS, Android)

**Authentication:**
- Clerk

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
SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_key
PORT=3000
NODE_ENV=development
```

3. Run database migrations:
- Go to your Supabase dashboard
- Run the SQL in `backend/schema.sql`

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

All API routes (except `/health`) require authentication headers:
- `x-clerk-user-id`: The Clerk user ID
- `x-user-email`: User's email address

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
