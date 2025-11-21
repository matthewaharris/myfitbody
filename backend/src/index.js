import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { supabase } from './utils/supabase.js';
import { requireAuth } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- EXERCISES ROUTES ---

// Get all exercises (user's + system)
app.get('/api/exercises', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .or(`user_id.eq.${req.user.id},is_system_exercise.eq.true`)
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching exercises:', error);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

// Create exercise
app.post('/api/exercises', requireAuth, async (req, res) => {
  try {
    const { name, description, muscle_groups, equipment_type, difficulty } = req.body;

    const { data, error } = await supabase
      .from('exercises')
      .insert({
        user_id: req.user.id,
        name,
        description,
        muscle_groups,
        equipment_type,
        difficulty,
        is_system_exercise: false
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating exercise:', error);
    res.status(500).json({ error: 'Failed to create exercise' });
  }
});

// --- WORKOUTS ROUTES ---

// Get user's workouts
app.get('/api/workouts', requireAuth, async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      `)
      .eq('user_id', req.user.id)
      .order('workout_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

// Create workout
app.post('/api/workouts', requireAuth, async (req, res) => {
  try {
    const { name, notes, duration_minutes, exercises: workoutExercises } = req.body;

    // Create workout
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: req.user.id,
        name,
        notes,
        duration_minutes,
        workout_date: new Date().toISOString()
      })
      .select()
      .single();

    if (workoutError) throw workoutError;

    // Add exercises to workout
    if (workoutExercises && workoutExercises.length > 0) {
      const exerciseInserts = workoutExercises.map((ex, index) => ({
        workout_id: workout.id,
        exercise_id: ex.exercise_id,
        order_index: index,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight || null,
        notes: ex.notes || null
      }));

      const { error: exercisesError } = await supabase
        .from('workout_exercises')
        .insert(exerciseInserts);

      if (exercisesError) throw exercisesError;
    }

    res.status(201).json(workout);
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// --- MEALS ROUTES ---

// Get user's meals
app.get('/api/meals', requireAuth, async (req, res) => {
  try {
    const { date, limit = 20 } = req.query;
    let query = supabase
      .from('meals')
      .select('*')
      .eq('user_id', req.user.id)
      .order('meal_date', { ascending: false });

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      query = query
        .gte('meal_date', startOfDay.toISOString())
        .lte('meal_date', endOfDay.toISOString());
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Create meal
app.post('/api/meals', requireAuth, async (req, res) => {
  try {
    const {
      meal_type,
      food_name,
      calories,
      protein,
      carbs,
      fat,
      sugar,
      serving_size,
      notes
    } = req.body;

    const { data, error } = await supabase
      .from('meals')
      .insert({
        user_id: req.user.id,
        meal_type,
        food_name,
        calories,
        protein,
        carbs,
        fat,
        sugar,
        serving_size,
        notes,
        meal_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating meal:', error);
    res.status(500).json({ error: 'Failed to create meal' });
  }
});

// --- STATS / DASHBOARD ROUTES ---

// Get daily calorie summary
app.get('/api/stats/daily', requireAuth, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get meals for the day
    const { data: meals } = await supabase
      .from('meals')
      .select('calories')
      .eq('user_id', req.user.id)
      .gte('meal_date', startOfDay.toISOString())
      .lte('meal_date', endOfDay.toISOString());

    // Get workouts for the day
    const { data: workouts } = await supabase
      .from('workouts')
      .select('estimated_calories_burned')
      .eq('user_id', req.user.id)
      .gte('workout_date', startOfDay.toISOString())
      .lte('workout_date', endOfDay.toISOString());

    // Get user's calorie goal
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('macro_targets')
      .eq('user_id', req.user.id)
      .single();

    const caloriesConsumed = meals?.reduce((sum, m) => sum + (m.calories || 0), 0) || 0;
    const caloriesBurned = workouts?.reduce((sum, w) => sum + (w.estimated_calories_burned || 0), 0) || 0;
    const calorieGoal = profile?.macro_targets?.calories || 2000;
    const netCalories = caloriesConsumed - caloriesBurned;
    const caloriesRemaining = calorieGoal - netCalories;

    res.json({
      date,
      consumed: caloriesConsumed,
      burned: caloriesBurned,
      net: netCalories,
      goal: calorieGoal,
      remaining: caloriesRemaining,
      mealsLogged: meals?.length || 0,
      workoutsLogged: workouts?.length || 0
    });
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ error: 'Failed to fetch daily stats' });
  }
});

// Get user profile
app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const { macro_targets, weight_goal, dietary_restrictions } = req.body;

    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        macro_targets,
        weight_goal,
        dietary_restrictions
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`MyFitBody API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
