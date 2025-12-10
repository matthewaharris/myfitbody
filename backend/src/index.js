import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { supabase } from './utils/supabase.js';
import { requireAuth } from './middleware/auth.js';
import { sendPushNotification, NotificationTemplates } from './utils/pushNotifications.js';

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

// --- USER ROUTES ---

// Create user (called after Clerk signup)
app.post('/api/users', requireAuth, async (req, res) => {
  try {
    const { clerk_user_id, email, first_name, last_name, phone_number } = req.body;

    const { data, error } = await supabase
      .from('users')
      .insert({
        clerk_user_id,
        email,
        first_name,
        last_name,
        phone_number
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
app.patch('/api/users/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { first_name, last_name, phone_number } = req.body;

    // Verify user owns this record
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this user' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        first_name,
        last_name,
        phone_number
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Update push token
app.patch('/api/users/:userId/push-token', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { push_token } = req.body;

    // Verify user owns this record
    if (req.user.id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this user' });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ push_token })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating push token:', error);
    res.status(500).json({ error: 'Failed to update push token' });
  }
});

// Get user by Clerk ID
app.get('/api/users/clerk/:clerkUserId', requireAuth, async (req, res) => {
  try {
    const { clerkUserId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// --- NOTIFICATION ROUTES ---

// Send a test notification to the current user
app.post('/api/notifications/test', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('push_token, first_name')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    if (!user.push_token) {
      return res.status(400).json({ error: 'No push token registered for this user' });
    }

    const notification = NotificationTemplates.custom(
      'Test Notification 🎉',
      'Push notifications are working! Tap to open the app.',
      { screen: 'home' }
    );

    const result = await sendPushNotification(user.push_token, notification);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Send a workout reminder to the current user
app.post('/api/notifications/workout-reminder', requireAuth, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('push_token, first_name')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    if (!user.push_token) {
      return res.status(400).json({ error: 'No push token registered for this user' });
    }

    const notification = NotificationTemplates.workoutReminder(user.first_name);
    const result = await sendPushNotification(user.push_token, notification);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error sending workout reminder:', error);
    res.status(500).json({ error: 'Failed to send workout reminder' });
  }
});

// Send a meal reminder to the current user
app.post('/api/notifications/meal-reminder', requireAuth, async (req, res) => {
  try {
    const { mealType } = req.body; // breakfast, lunch, dinner, snack

    const { data: user, error } = await supabase
      .from('users')
      .select('push_token')
      .eq('id', req.user.id)
      .single();

    if (error) throw error;

    if (!user.push_token) {
      return res.status(400).json({ error: 'No push token registered for this user' });
    }

    const notification = NotificationTemplates.mealReminder(mealType);
    const result = await sendPushNotification(user.push_token, notification);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error sending meal reminder:', error);
    res.status(500).json({ error: 'Failed to send meal reminder' });
  }
});

// --- USER PROFILE ROUTES ---

// Create user profile
app.post('/api/user-profiles', requireAuth, async (req, res) => {
  try {
    const {
      user_id,
      weight_goal,
      starting_weight,
      weight_unit,
      dietary_restrictions,
      food_preferences,
      macro_targets,
      notification_settings
    } = req.body;

    // Check if profile already exists, if so update it
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user_id)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          weight_goal,
          starting_weight,
          weight_unit,
          dietary_restrictions,
          food_preferences,
          macro_targets,
          notification_settings
        })
        .eq('user_id', user_id)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    }

    // Create new profile
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id,
        weight_goal,
        starting_weight,
        weight_unit,
        dietary_restrictions,
        food_preferences,
        macro_targets,
        notification_settings
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating user profile:', error);
    res.status(500).json({ error: 'Failed to create user profile' });
  }
});

// Get user profile by user ID
app.get('/api/user-profiles/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
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

// Get last performance for an exercise
app.get('/api/exercises/:exerciseId/history', requireAuth, async (req, res) => {
  try {
    const { exerciseId } = req.params;

    // Get the most recent workout_exercise entry for this exercise
    const { data, error } = await supabase
      .from('workout_exercises')
      .select(`
        sets,
        reps,
        weight,
        notes,
        workouts!inner (
          workout_date,
          name,
          is_template
        )
      `)
      .eq('exercise_id', exerciseId)
      .eq('workouts.user_id', req.user.id)
      .eq('workouts.is_template', false)
      .order('workouts(workout_date)', { ascending: false })
      .limit(5);

    if (error) throw error;

    // Format the response
    const history = data?.map(item => ({
      sets: item.sets,
      reps: item.reps,
      weight: item.weight,
      notes: item.notes,
      workout_date: item.workouts?.workout_date,
      workout_name: item.workouts?.name
    })) || [];

    res.json({
      exercise_id: exerciseId,
      last_performed: history[0] || null,
      recent_history: history
    });
  } catch (error) {
    console.error('Error fetching exercise history:', error);
    res.status(500).json({ error: 'Failed to fetch exercise history' });
  }
});

// Get last performance for multiple exercises at once (batch)
app.post('/api/exercises/history/batch', requireAuth, async (req, res) => {
  try {
    const { exercise_ids } = req.body;

    if (!exercise_ids || !Array.isArray(exercise_ids)) {
      return res.status(400).json({ error: 'exercise_ids array is required' });
    }

    // Get the most recent workout_exercise entry for each exercise
    const { data, error } = await supabase
      .from('workout_exercises')
      .select(`
        exercise_id,
        sets,
        reps,
        weight,
        workouts!inner (
          workout_date,
          is_template
        )
      `)
      .in('exercise_id', exercise_ids)
      .eq('workouts.user_id', req.user.id)
      .eq('workouts.is_template', false)
      .order('workouts(workout_date)', { ascending: false });

    if (error) throw error;

    // Group by exercise_id and take the most recent
    const historyMap = {};
    data?.forEach(item => {
      if (!historyMap[item.exercise_id]) {
        historyMap[item.exercise_id] = {
          exercise_id: item.exercise_id,
          sets: item.sets,
          reps: item.reps,
          weight: item.weight,
          workout_date: item.workouts?.workout_date
        };
      }
    });

    res.json(historyMap);
  } catch (error) {
    console.error('Error fetching exercise history batch:', error);
    res.status(500).json({ error: 'Failed to fetch exercise history' });
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
    const { name, notes, duration_minutes, estimated_calories_burned, exercises: workoutExercises } = req.body;

    // Create workout
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .insert({
        user_id: req.user.id,
        name,
        notes,
        duration_minutes,
        estimated_calories_burned,
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

// Get single workout by ID
app.get('/api/workouts/:workoutId', requireAuth, async (req, res) => {
  try {
    const { workoutId } = req.params;

    const { data, error } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      `)
      .eq('id', workoutId)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching workout:', error);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

// Update workout
app.put('/api/workouts/:workoutId', requireAuth, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const { name, notes, duration_minutes, estimated_calories_burned, exercises: workoutExercises } = req.body;

    // Update workout
    const { data: workout, error: workoutError } = await supabase
      .from('workouts')
      .update({
        name,
        notes,
        duration_minutes,
        estimated_calories_burned
      })
      .eq('id', workoutId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (workoutError) throw workoutError;

    // Delete existing exercises and re-add
    if (workoutExercises) {
      await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);

      if (workoutExercises.length > 0) {
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
    }

    res.json(workout);
  } catch (error) {
    console.error('Error updating workout:', error);
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// --- WORKOUT TEMPLATES/FAVORITES ---

// Get workout templates
app.get('/api/workouts/templates', requireAuth, async (req, res) => {
  try {
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
      .eq('is_template', true)
      .order('template_name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching workout templates:', error);
    res.status(500).json({ error: 'Failed to fetch workout templates' });
  }
});

// Get favorite workouts
app.get('/api/workouts/favorites', requireAuth, async (req, res) => {
  try {
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
      .eq('is_favorite', true)
      .order('workout_date', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching favorite workouts:', error);
    res.status(500).json({ error: 'Failed to fetch favorite workouts' });
  }
});

// Save workout as template
app.post('/api/workouts/:workoutId/save-as-template', requireAuth, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const { template_name } = req.body;

    // Get the original workout
    const { data: originalWorkout, error: fetchError } = await supabase
      .from('workouts')
      .select(`
        *,
        workout_exercises (*)
      `)
      .eq('id', workoutId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    // Create a new workout as template
    const { data: template, error: templateError } = await supabase
      .from('workouts')
      .insert({
        user_id: req.user.id,
        name: originalWorkout.name,
        template_name: template_name || originalWorkout.name || 'My Template',
        notes: originalWorkout.notes,
        duration_minutes: originalWorkout.duration_minutes,
        estimated_calories_burned: originalWorkout.estimated_calories_burned,
        is_template: true,
        workout_date: new Date().toISOString()
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Copy exercises to template
    if (originalWorkout.workout_exercises?.length > 0) {
      const exerciseInserts = originalWorkout.workout_exercises.map(ex => ({
        workout_id: template.id,
        exercise_id: ex.exercise_id,
        order_index: ex.order_index,
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight,
        notes: ex.notes
      }));

      await supabase.from('workout_exercises').insert(exerciseInserts);
    }

    res.status(201).json(template);
  } catch (error) {
    console.error('Error saving workout as template:', error);
    res.status(500).json({ error: 'Failed to save workout as template' });
  }
});

// Toggle workout favorite
app.post('/api/workouts/:workoutId/favorite', requireAuth, async (req, res) => {
  try {
    const { workoutId } = req.params;

    // Get current favorite status
    const { data: workout, error: fetchError } = await supabase
      .from('workouts')
      .select('is_favorite')
      .eq('id', workoutId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    // Toggle favorite
    const { data, error } = await supabase
      .from('workouts')
      .update({ is_favorite: !workout.is_favorite })
      .eq('id', workoutId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error toggling workout favorite:', error);
    res.status(500).json({ error: 'Failed to toggle workout favorite' });
  }
});

// Delete workout template
app.delete('/api/workouts/templates/:workoutId', requireAuth, async (req, res) => {
  try {
    const { workoutId } = req.params;

    const { error } = await supabase
      .from('workouts')
      .delete()
      .eq('id', workoutId)
      .eq('user_id', req.user.id)
      .eq('is_template', true);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout template:', error);
    res.status(500).json({ error: 'Failed to delete workout template' });
  }
});

// Estimate calories using OpenAI
app.post('/api/workouts/estimate-calories', requireAuth, async (req, res) => {
  try {
    const { exercises } = req.body;

    // Get user's profile for weight info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('starting_weight, weight_unit')
      .eq('user_id', req.user.id)
      .maybeSingle();

    const userWeight = profile?.starting_weight || 150;
    const weightUnit = profile?.weight_unit || 'lb';

    // Format exercise data for OpenAI
    const exercisesSummary = exercises.map(ex =>
      `${ex.exercise}: ${ex.sets} sets, ${ex.total_reps} total reps` +
      (ex.avg_weight !== 'bodyweight' ? `, ${ex.avg_weight} lbs` : ', bodyweight')
    ).join('\n');

    const prompt = `Estimate the total calories burned for this workout by a person weighing ${userWeight} ${weightUnit}:

${exercisesSummary}

Respond with a JSON object containing:
- estimated_calories: a number representing the estimated total calories burned
- explanation: a brief explanation of the estimate (1-2 sentences)

Only respond with the JSON object, no other text.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a fitness expert that estimates calories burned during workouts. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content;
    const result = JSON.parse(content);

    res.json(result);
  } catch (error) {
    console.error('Error estimating calories:', error);
    res.status(500).json({ error: 'Failed to estimate calories' });
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
      fiber,
      serving_size,
      serving_unit,
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
        fiber,
        serving_size,
        serving_unit,
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

// --- MEAL FAVORITES ---

// Get favorite meals
app.get('/api/meals/favorites', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('is_favorite', true)
      .order('food_name');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching favorite meals:', error);
    res.status(500).json({ error: 'Failed to fetch favorite meals' });
  }
});

// Toggle meal favorite
app.post('/api/meals/:mealId/favorite', requireAuth, async (req, res) => {
  try {
    const { mealId } = req.params;

    // Get current favorite status
    const { data: meal, error: fetchError } = await supabase
      .from('meals')
      .select('is_favorite')
      .eq('id', mealId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    // Toggle favorite
    const { data, error } = await supabase
      .from('meals')
      .update({ is_favorite: !meal.is_favorite })
      .eq('id', mealId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error toggling meal favorite:', error);
    res.status(500).json({ error: 'Failed to toggle meal favorite' });
  }
});

// Quick re-log a favorite meal (creates a new meal entry with same data)
app.post('/api/meals/:mealId/relog', requireAuth, async (req, res) => {
  try {
    const { mealId } = req.params;
    const { meal_type } = req.body; // Optional: override meal type

    // Get the original meal
    const { data: originalMeal, error: fetchError } = await supabase
      .from('meals')
      .select('*')
      .eq('id', mealId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    // Create a new meal with same data
    const { data, error } = await supabase
      .from('meals')
      .insert({
        user_id: req.user.id,
        meal_type: meal_type || originalMeal.meal_type,
        food_name: originalMeal.food_name,
        calories: originalMeal.calories,
        protein: originalMeal.protein,
        carbs: originalMeal.carbs,
        fat: originalMeal.fat,
        sugar: originalMeal.sugar,
        fiber: originalMeal.fiber,
        serving_size: originalMeal.serving_size,
        serving_unit: originalMeal.serving_unit,
        notes: originalMeal.notes,
        meal_date: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error re-logging meal:', error);
    res.status(500).json({ error: 'Failed to re-log meal' });
  }
});

// --- FOOD SEARCH ROUTES ---

// Search foods from USDA FoodData Central
app.get('/api/foods/search', requireAuth, async (req, res) => {
  try {
    const { query, pageSize = 25 } = req.query;

    if (!query || query.length < 2) {
      return res.json({ foods: [] });
    }

    // Try USDA first
    const usdaApiKey = process.env.USDA_API_KEY;
    let foods = [];

    if (usdaApiKey) {
      try {
        const usdaResponse = await fetch(
          `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${usdaApiKey}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR Legacy,Branded`,
          { headers: { 'Content-Type': 'application/json' } }
        );

        const usdaData = await usdaResponse.json();

        if (usdaData.foods) {
          foods = usdaData.foods.map(food => ({
            id: `usda_${food.fdcId}`,
            source: 'usda',
            fdcId: food.fdcId,
            name: food.description,
            brand: food.brandName || food.brandOwner || null,
            category: food.foodCategory || null,
            servingSize: food.servingSize || 100,
            servingUnit: food.servingSizeUnit || 'g',
            nutrients: extractNutrients(food.foodNutrients || []),
          }));
        }
      } catch (usdaError) {
        console.error('USDA API error:', usdaError.message);
      }
    }

    // If USDA returned few results, also try Open Food Facts
    if (foods.length < 10) {
      try {
        const offResponse = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}`,
          { headers: { 'User-Agent': 'MyFitBody App - Contact: dev@example.com' } }
        );

        const offData = await offResponse.json();

        if (offData.products) {
          const offFoods = offData.products
            .filter(p => p.product_name && p.nutriments)
            .map(product => ({
              id: `off_${product.code}`,
              source: 'openfoodfacts',
              barcode: product.code,
              name: product.product_name,
              brand: product.brands || null,
              category: product.categories_tags?.[0]?.replace('en:', '') || null,
              servingSize: product.serving_quantity || 100,
              servingUnit: 'g',
              imageUrl: product.image_small_url || null,
              nutrients: {
                calories: Math.round(product.nutriments['energy-kcal_100g'] || product.nutriments.energy_100g / 4.184 || 0),
                protein: Math.round((product.nutriments.proteins_100g || 0) * 10) / 10,
                carbs: Math.round((product.nutriments.carbohydrates_100g || 0) * 10) / 10,
                fat: Math.round((product.nutriments.fat_100g || 0) * 10) / 10,
                fiber: Math.round((product.nutriments.fiber_100g || 0) * 10) / 10,
                sugar: Math.round((product.nutriments.sugars_100g || 0) * 10) / 10,
              },
            }));

          foods = [...foods, ...offFoods];
        }
      } catch (offError) {
        console.error('Open Food Facts API error:', offError.message);
      }
    }

    res.json({ foods });
  } catch (error) {
    console.error('Error searching foods:', error);
    res.status(500).json({ error: 'Failed to search foods' });
  }
});

// Helper function to extract nutrients from USDA food data
function extractNutrients(nutrients) {
  const nutrientMap = {
    1008: 'calories',    // Energy (kcal)
    1003: 'protein',     // Protein
    1005: 'carbs',       // Carbohydrates
    1004: 'fat',         // Total fat
    1079: 'fiber',       // Fiber
    2000: 'sugar',       // Total sugars
  };

  const result = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
  };

  nutrients.forEach(n => {
    const key = nutrientMap[n.nutrientId];
    if (key) {
      result[key] = Math.round((n.value || 0) * 10) / 10;
    }
  });

  return result;
}

// Get food details by ID
app.get('/api/foods/:foodId', requireAuth, async (req, res) => {
  try {
    const { foodId } = req.params;
    const [source, id] = foodId.split('_');

    if (source === 'usda') {
      const usdaApiKey = process.env.USDA_API_KEY;
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=${usdaApiKey}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      const food = await response.json();

      res.json({
        id: foodId,
        source: 'usda',
        fdcId: food.fdcId,
        name: food.description,
        brand: food.brandName || food.brandOwner || null,
        servingSize: food.servingSize || 100,
        servingUnit: food.servingSizeUnit || 'g',
        nutrients: extractNutrients(food.foodNutrients || []),
        portions: food.foodPortions?.map(p => ({
          amount: p.amount,
          unit: p.modifier || p.measureUnit?.name || 'serving',
          gramWeight: p.gramWeight,
        })) || [],
      });
    } else if (source === 'off') {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${id}.json`,
        { headers: { 'User-Agent': 'MyFitBody App' } }
      );

      const data = await response.json();
      const product = data.product;

      res.json({
        id: foodId,
        source: 'openfoodfacts',
        barcode: id,
        name: product.product_name,
        brand: product.brands || null,
        servingSize: product.serving_quantity || 100,
        servingUnit: 'g',
        imageUrl: product.image_url || null,
        nutrients: {
          calories: Math.round(product.nutriments['energy-kcal_100g'] || 0),
          protein: Math.round((product.nutriments.proteins_100g || 0) * 10) / 10,
          carbs: Math.round((product.nutriments.carbohydrates_100g || 0) * 10) / 10,
          fat: Math.round((product.nutriments.fat_100g || 0) * 10) / 10,
          fiber: Math.round((product.nutriments.fiber_100g || 0) * 10) / 10,
          sugar: Math.round((product.nutriments.sugars_100g || 0) * 10) / 10,
        },
      });
    } else {
      res.status(400).json({ error: 'Invalid food ID' });
    }
  } catch (error) {
    console.error('Error fetching food details:', error);
    res.status(500).json({ error: 'Failed to fetch food details' });
  }
});

// --- STATS / DASHBOARD ROUTES ---

// Get daily calorie summary
app.get('/api/stats/daily', requireAuth, async (req, res) => {
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const dateParam = req.query.date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Create a wide date range to handle timezone differences
    // Start from beginning of the day in UTC-12 to end of day in UTC+14
    const startOfDay = new Date(`${dateParam}T00:00:00.000Z`);
    startOfDay.setHours(startOfDay.getHours() - 12); // Go back 12 hours
    const endOfDay = new Date(`${dateParam}T23:59:59.999Z`);
    endOfDay.setHours(endOfDay.getHours() + 14); // Go forward 14 hours

    console.log(`Fetching stats for date: ${dateParam}, range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    // Get meals for the day
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('calories')
      .eq('user_id', req.user.id)
      .gte('meal_date', startOfDay.toISOString())
      .lte('meal_date', endOfDay.toISOString());

    if (mealsError) console.error('Meals query error:', mealsError);

    // Get workouts for the day
    const { data: workouts, error: workoutsError } = await supabase
      .from('workouts')
      .select('estimated_calories_burned, workout_date')
      .eq('user_id', req.user.id)
      .gte('workout_date', startOfDay.toISOString())
      .lte('workout_date', endOfDay.toISOString());

    if (workoutsError) console.error('Workouts query error:', workoutsError);
    console.log(`Found ${workouts?.length || 0} workouts:`, workouts);

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
      date: dateParam,
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
    const { macro_targets, weight_goal, dietary_restrictions, food_preferences, starting_weight, weight_unit, notification_settings } = req.body;

    const updateData = {};
    if (macro_targets !== undefined) updateData.macro_targets = macro_targets;
    if (weight_goal !== undefined) updateData.weight_goal = weight_goal;
    if (dietary_restrictions !== undefined) updateData.dietary_restrictions = dietary_restrictions;
    if (food_preferences !== undefined) updateData.food_preferences = food_preferences;
    if (starting_weight !== undefined) updateData.starting_weight = starting_weight;
    if (weight_unit !== undefined) updateData.weight_unit = weight_unit;
    if (notification_settings !== undefined) updateData.notification_settings = notification_settings;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updateData)
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

// --- BODY MEASUREMENTS / PROGRESS TRACKING ---

// Get all body measurements for user
app.get('/api/measurements', requireAuth, async (req, res) => {
  try {
    const { limit = 30 } = req.query;

    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', req.user.id)
      .order('measurement_date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching measurements:', error);
    res.status(500).json({ error: 'Failed to fetch measurements' });
  }
});

// Get latest measurement
app.get('/api/measurements/latest', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', req.user.id)
      .order('measurement_date', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(data || null);
  } catch (error) {
    console.error('Error fetching latest measurement:', error);
    res.status(500).json({ error: 'Failed to fetch latest measurement' });
  }
});

// Create or update body measurement for a date
app.post('/api/measurements', requireAuth, async (req, res) => {
  try {
    const {
      measurement_date,
      weight,
      body_fat_percentage,
      muscle_mass_percentage,
      measurements,
      notes,
      photo_url
    } = req.body;

    const dateToUse = measurement_date || new Date().toISOString().split('T')[0];

    // Check if measurement exists for this date
    const { data: existing } = await supabase
      .from('body_measurements')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('measurement_date', dateToUse)
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('body_measurements')
        .update({
          weight,
          body_fat_percentage,
          muscle_mass_percentage,
          measurements,
          notes,
          photo_url
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('body_measurements')
        .insert({
          user_id: req.user.id,
          measurement_date: dateToUse,
          weight,
          body_fat_percentage,
          muscle_mass_percentage,
          measurements,
          notes,
          photo_url
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error saving measurement:', error);
    res.status(500).json({ error: 'Failed to save measurement' });
  }
});

// Update measurement photo
app.patch('/api/measurements/:measurementId/photo', requireAuth, async (req, res) => {
  try {
    const { measurementId } = req.params;
    const { photo_url } = req.body;

    const { data, error } = await supabase
      .from('body_measurements')
      .update({ photo_url })
      .eq('id', measurementId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating measurement photo:', error);
    res.status(500).json({ error: 'Failed to update measurement photo' });
  }
});

// Delete measurement
app.delete('/api/measurements/:measurementId', requireAuth, async (req, res) => {
  try {
    const { measurementId } = req.params;

    const { error } = await supabase
      .from('body_measurements')
      .delete()
      .eq('id', measurementId)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting measurement:', error);
    res.status(500).json({ error: 'Failed to delete measurement' });
  }
});

// Upload progress photo (returns signed URL for upload)
app.post('/api/measurements/upload-url', requireAuth, async (req, res) => {
  try {
    const { file_name, content_type } = req.body;
    const userId = req.user.id;
    const timestamp = Date.now();
    const filePath = `${userId}/${timestamp}_${file_name}`;

    // Generate signed upload URL
    const { data, error } = await supabase.storage
      .from('progress-photos')
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    // Also return the public URL that will be available after upload
    const { data: publicUrlData } = supabase.storage
      .from('progress-photos')
      .getPublicUrl(filePath);

    res.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      publicUrl: publicUrlData.publicUrl,
      filePath
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// =============================================
// WATER INTAKE TRACKING
// =============================================

// Get water intake for a date
app.get('/api/water', requireAuth, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get all water entries for the day
    const { data: entries, error: entriesError } = await supabase
      .from('water_intake')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('logged_at', `${targetDate}T00:00:00`)
      .lt('logged_at', `${targetDate}T23:59:59`)
      .order('logged_at', { ascending: false });

    if (entriesError) throw entriesError;

    // Get user's water goal
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('daily_water_goal_oz')
      .eq('user_id', req.user.id)
      .single();

    const totalOz = entries?.reduce((sum, e) => sum + parseFloat(e.amount_oz), 0) || 0;
    const goal = profile?.daily_water_goal_oz || 64;

    res.json({
      entries: entries || [],
      total_oz: totalOz,
      goal_oz: goal,
      progress_percent: Math.round((totalOz / goal) * 100)
    });
  } catch (error) {
    console.error('Error fetching water intake:', error);
    res.status(500).json({ error: 'Failed to fetch water intake' });
  }
});

// Log water intake
app.post('/api/water', requireAuth, async (req, res) => {
  try {
    const { amount_oz } = req.body;

    const { data, error } = await supabase
      .from('water_intake')
      .insert({
        user_id: req.user.id,
        amount_oz
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error logging water intake:', error);
    res.status(500).json({ error: 'Failed to log water intake' });
  }
});

// Delete water entry
app.delete('/api/water/:entryId', requireAuth, async (req, res) => {
  try {
    const { entryId } = req.params;

    const { error } = await supabase
      .from('water_intake')
      .delete()
      .eq('id', entryId)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting water entry:', error);
    res.status(500).json({ error: 'Failed to delete water entry' });
  }
});

// Update water goal
app.patch('/api/water/goal', requireAuth, async (req, res) => {
  try {
    const { goal_oz } = req.body;

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ daily_water_goal_oz: goal_oz })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error updating water goal:', error);
    res.status(500).json({ error: 'Failed to update water goal' });
  }
});

// =============================================
// STREAK TRACKING
// =============================================

// Get user's current streaks
app.get('/api/streaks', requireAuth, async (req, res) => {
  try {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    // Get workouts this week
    const { data: workoutsThisWeek, error: workoutError } = await supabase
      .from('workouts')
      .select('id, workout_date')
      .eq('user_id', req.user.id)
      .gte('workout_date', startOfWeek.toISOString())
      .or('is_template.is.null,is_template.eq.false');

    if (workoutError) throw workoutError;

    // Count unique workout days this week
    const workoutDays = new Set(
      (workoutsThisWeek || []).map(w => new Date(w.workout_date).toDateString())
    );
    const workoutsThisWeekCount = workoutDays.size;

    // Get meals today
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const { data: mealsToday, error: mealError } = await supabase
      .from('meals')
      .select('id')
      .eq('user_id', req.user.id)
      .gte('meal_date', todayStart.toISOString())
      .lte('meal_date', todayEnd.toISOString());

    if (mealError) throw mealError;

    const mealsTodayCount = mealsToday?.length || 0;

    // Calculate consecutive weeks with 3+ workouts (workout streak)
    const { data: weeklyWorkouts, error: weeklyError } = await supabase
      .from('workouts')
      .select('workout_date')
      .eq('user_id', req.user.id)
      .or('is_template.is.null,is_template.eq.false')
      .order('workout_date', { ascending: false })
      .limit(200);

    if (weeklyError) throw weeklyError;

    // Group by week and count
    const weekCounts = {};
    (weeklyWorkouts || []).forEach(w => {
      const date = new Date(w.workout_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weekCounts[weekKey]) weekCounts[weekKey] = new Set();
      weekCounts[weekKey].add(date.toDateString());
    });

    // Count consecutive weeks with 3+ workout days
    let workoutStreak = 0;
    let checkDate = new Date(startOfWeek);

    while (true) {
      const weekKey = checkDate.toISOString().split('T')[0];
      const daysThisWeek = weekCounts[weekKey]?.size || 0;

      // Current week: count if we have 3+ already OR it's the current week (in progress)
      if (checkDate.getTime() === startOfWeek.getTime()) {
        if (daysThisWeek >= 3) {
          workoutStreak++;
        } else {
          // Current week not yet complete, check if on track
          break;
        }
      } else {
        if (daysThisWeek >= 3) {
          workoutStreak++;
        } else {
          break;
        }
      }

      checkDate.setDate(checkDate.getDate() - 7);
    }

    // Calculate consecutive days with 1+ meal (meal streak)
    const { data: dailyMeals, error: dailyError } = await supabase
      .from('meals')
      .select('meal_date')
      .eq('user_id', req.user.id)
      .order('meal_date', { ascending: false })
      .limit(100);

    if (dailyError) throw dailyError;

    const mealDays = new Set(
      (dailyMeals || []).map(m => new Date(m.meal_date).toDateString())
    );

    let mealStreak = 0;
    let checkDay = new Date(today);
    checkDay.setHours(0, 0, 0, 0);

    while (mealDays.has(checkDay.toDateString())) {
      mealStreak++;
      checkDay.setDate(checkDay.getDate() - 1);
    }

    res.json({
      workout_streak_weeks: workoutStreak,
      workouts_this_week: workoutsThisWeekCount,
      workouts_goal: 3,
      workout_on_track: workoutsThisWeekCount >= 3 || (today.getDay() <= 3 && workoutsThisWeekCount >= Math.ceil((today.getDay() + 1) * 3 / 7)),
      meal_streak_days: mealStreak,
      meals_today: mealsTodayCount,
      meals_goal: 1,
      meal_logged_today: mealsTodayCount >= 1
    });
  } catch (error) {
    console.error('Error fetching streaks:', error);
    res.status(500).json({ error: 'Failed to fetch streaks' });
  }
});

// =============================================
// RECIPE MANAGEMENT
// =============================================

// Get all recipes
app.get('/api/recipes', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (*)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get favorite recipes
app.get('/api/recipes/favorites', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (*)
      `)
      .eq('user_id', req.user.id)
      .eq('is_favorite', true)
      .order('name');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error fetching favorite recipes:', error);
    res.status(500).json({ error: 'Failed to fetch favorite recipes' });
  }
});

// Get single recipe
app.get('/api/recipes/:recipeId', requireAuth, async (req, res) => {
  try {
    const { recipeId } = req.params;

    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (*)
      `)
      .eq('id', recipeId)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Create recipe
app.post('/api/recipes', requireAuth, async (req, res) => {
  try {
    const { name, description, ingredients, servings } = req.body;

    // Calculate totals from ingredients
    const totals = (ingredients || []).reduce((acc, ing) => ({
      calories: acc.calories + (ing.calories || 0),
      protein: acc.protein + (ing.protein || 0),
      carbs: acc.carbs + (ing.carbs || 0),
      fat: acc.fat + (ing.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Create recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        user_id: req.user.id,
        name,
        description,
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
        servings: servings || 1
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // Insert ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientsWithRecipeId = ingredients.map((ing, idx) => ({
        recipe_id: recipe.id,
        food_name: ing.food_name,
        serving_size: ing.serving_size,
        serving_unit: ing.serving_unit || 'g',
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fat: ing.fat,
        fiber: ing.fiber,
        sugar: ing.sugar,
        order_index: idx
      }));

      const { error: ingredientError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientsWithRecipeId);

      if (ingredientError) throw ingredientError;
    }

    // Fetch complete recipe with ingredients
    const { data: fullRecipe, error: fetchError } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (*)
      `)
      .eq('id', recipe.id)
      .single();

    if (fetchError) throw fetchError;

    res.status(201).json(fullRecipe);
  } catch (error) {
    console.error('Error creating recipe:', error);
    res.status(500).json({ error: 'Failed to create recipe' });
  }
});

// Toggle recipe favorite
app.post('/api/recipes/:recipeId/favorite', requireAuth, async (req, res) => {
  try {
    const { recipeId } = req.params;

    // Get current state
    const { data: current, error: fetchError } = await supabase
      .from('recipes')
      .select('is_favorite')
      .eq('id', recipeId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    // Toggle
    const { data, error } = await supabase
      .from('recipes')
      .update({ is_favorite: !current.is_favorite })
      .eq('id', recipeId)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error toggling recipe favorite:', error);
    res.status(500).json({ error: 'Failed to toggle recipe favorite' });
  }
});

// Delete recipe
app.delete('/api/recipes/:recipeId', requireAuth, async (req, res) => {
  try {
    const { recipeId } = req.params;

    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

// Log recipe as meals (creates individual meal entries for each ingredient)
app.post('/api/recipes/:recipeId/log', requireAuth, async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { meal_type, servings_eaten } = req.body;

    // Get recipe with ingredients
    const { data: recipe, error: fetchError } = await supabase
      .from('recipes')
      .select(`
        *,
        recipe_ingredients (*)
      `)
      .eq('id', recipeId)
      .eq('user_id', req.user.id)
      .single();

    if (fetchError) throw fetchError;

    const servingMultiplier = (servings_eaten || 1) / (recipe.servings || 1);

    // Create meal entries for each ingredient
    const mealEntries = recipe.recipe_ingredients.map(ing => ({
      user_id: req.user.id,
      meal_type: meal_type || 'lunch',
      food_name: `${ing.food_name} (from ${recipe.name})`,
      calories: Math.round((ing.calories || 0) * servingMultiplier),
      protein: Math.round((ing.protein || 0) * servingMultiplier * 10) / 10,
      carbs: Math.round((ing.carbs || 0) * servingMultiplier * 10) / 10,
      fat: Math.round((ing.fat || 0) * servingMultiplier * 10) / 10,
      fiber: Math.round((ing.fiber || 0) * servingMultiplier * 10) / 10,
      sugar: Math.round((ing.sugar || 0) * servingMultiplier * 10) / 10,
      serving_size: Math.round((ing.serving_size || 0) * servingMultiplier),
      serving_unit: ing.serving_unit || 'g'
    }));

    const { data: meals, error: mealError } = await supabase
      .from('meals')
      .insert(mealEntries)
      .select();

    if (mealError) throw mealError;

    res.status(201).json({
      meals_created: meals.length,
      total_calories: meals.reduce((sum, m) => sum + m.calories, 0),
      meals
    });
  } catch (error) {
    console.error('Error logging recipe:', error);
    res.status(500).json({ error: 'Failed to log recipe' });
  }
});

// =============================================
// STATS SUMMARY
// =============================================

// Get weekly stats
app.get('/api/stats/weekly', requireAuth, async (req, res) => {
  try {
    const { weeks } = req.query;
    const numWeeks = parseInt(weeks) || 8;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (numWeeks * 7));

    // Get meals data grouped by day
    const { data: meals, error: mealError } = await supabase
      .from('meals')
      .select('meal_date, calories, protein, carbs, fat')
      .eq('user_id', req.user.id)
      .gte('meal_date', startDate.toISOString())
      .order('meal_date');

    if (mealError) throw mealError;

    // Get workouts data grouped by day
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select('workout_date, estimated_calories_burned, duration_minutes')
      .eq('user_id', req.user.id)
      .gte('workout_date', startDate.toISOString())
      .or('is_template.is.null,is_template.eq.false')
      .order('workout_date');

    if (workoutError) throw workoutError;

    // Get weight measurements
    const { data: weights, error: weightError } = await supabase
      .from('body_measurements')
      .select('measurement_date, weight, body_fat_percentage')
      .eq('user_id', req.user.id)
      .gte('measurement_date', startDate.toISOString())
      .order('measurement_date');

    if (weightError) throw weightError;

    // Group meals by day
    const dailyCalories = {};
    const dailyMacros = {};
    (meals || []).forEach(m => {
      const day = m.meal_date.split('T')[0];
      if (!dailyCalories[day]) {
        dailyCalories[day] = 0;
        dailyMacros[day] = { protein: 0, carbs: 0, fat: 0 };
      }
      dailyCalories[day] += m.calories || 0;
      dailyMacros[day].protein += m.protein || 0;
      dailyMacros[day].carbs += m.carbs || 0;
      dailyMacros[day].fat += m.fat || 0;
    });

    // Group workouts by day
    const dailyWorkouts = {};
    (workouts || []).forEach(w => {
      const day = w.workout_date.split('T')[0];
      if (!dailyWorkouts[day]) {
        dailyWorkouts[day] = { count: 0, burned: 0, duration: 0 };
      }
      dailyWorkouts[day].count++;
      dailyWorkouts[day].burned += w.estimated_calories_burned || 0;
      dailyWorkouts[day].duration += w.duration_minutes || 0;
    });

    // Build daily data points
    const dailyData = [];
    const currentDate = new Date(startDate);
    const endDate = new Date();

    while (currentDate <= endDate) {
      const day = currentDate.toISOString().split('T')[0];
      dailyData.push({
        date: day,
        calories_consumed: dailyCalories[day] || 0,
        calories_burned: dailyWorkouts[day]?.burned || 0,
        workouts: dailyWorkouts[day]?.count || 0,
        protein: Math.round((dailyMacros[day]?.protein || 0) * 10) / 10,
        carbs: Math.round((dailyMacros[day]?.carbs || 0) * 10) / 10,
        fat: Math.round((dailyMacros[day]?.fat || 0) * 10) / 10
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Weight data points
    const weightData = (weights || []).map(w => ({
      date: w.measurement_date,
      weight: w.weight,
      body_fat: w.body_fat_percentage
    }));

    // Calculate weekly summaries
    const weeklySummary = [];
    for (let i = 0; i < numWeeks; i++) {
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - (i * 7));
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 6);

      const weekData = dailyData.filter(d => {
        const date = new Date(d.date);
        return date >= weekStart && date <= weekEnd;
      });

      const daysWithCalories = weekData.filter(d => d.calories_consumed > 0).length;

      weeklySummary.push({
        week_start: weekStart.toISOString().split('T')[0],
        week_end: weekEnd.toISOString().split('T')[0],
        total_calories: weekData.reduce((sum, d) => sum + d.calories_consumed, 0),
        avg_daily_calories: daysWithCalories > 0
          ? Math.round(weekData.reduce((sum, d) => sum + d.calories_consumed, 0) / daysWithCalories)
          : 0,
        total_burned: weekData.reduce((sum, d) => sum + d.calories_burned, 0),
        workout_count: weekData.reduce((sum, d) => sum + d.workouts, 0),
        days_logged: daysWithCalories
      });
    }

    res.json({
      daily: dailyData,
      weight: weightData,
      weekly: weeklySummary.reverse()
    });
  } catch (error) {
    console.error('Error fetching weekly stats:', error);
    res.status(500).json({ error: 'Failed to fetch weekly stats' });
  }
});

// Get daily calorie breakdown for a specific date
app.get('/api/stats/daily/:date', requireAuth, async (req, res) => {
  try {
    const { date } = req.params;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get meals for the day
    const { data: meals, error: mealError } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('meal_date', `${targetDate}T00:00:00`)
      .lt('meal_date', `${targetDate}T23:59:59`)
      .order('meal_date');

    if (mealError) throw mealError;

    // Get workouts for the day
    const { data: workouts, error: workoutError } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', req.user.id)
      .gte('workout_date', `${targetDate}T00:00:00`)
      .lt('workout_date', `${targetDate}T23:59:59`)
      .or('is_template.is.null,is_template.eq.false');

    if (workoutError) throw workoutError;

    // Group meals by type
    const mealsByType = {};
    (meals || []).forEach(m => {
      const type = m.meal_type || 'other';
      if (!mealsByType[type]) {
        mealsByType[type] = { meals: [], total: 0 };
      }
      mealsByType[type].meals.push(m);
      mealsByType[type].total += m.calories || 0;
    });

    const totalCalories = (meals || []).reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalBurned = (workouts || []).reduce((sum, w) => sum + (w.estimated_calories_burned || 0), 0);
    const totalProtein = (meals || []).reduce((sum, m) => sum + (m.protein || 0), 0);
    const totalCarbs = (meals || []).reduce((sum, m) => sum + (m.carbs || 0), 0);
    const totalFat = (meals || []).reduce((sum, m) => sum + (m.fat || 0), 0);

    res.json({
      date: targetDate,
      meals_by_type: mealsByType,
      totals: {
        calories: totalCalories,
        burned: totalBurned,
        net: totalCalories - totalBurned,
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10
      },
      workout_count: (workouts || []).length
    });
  } catch (error) {
    console.error('Error fetching daily stats:', error);
    res.status(500).json({ error: 'Failed to fetch daily stats' });
  }
});

// =============================================
// BARCODE LOOKUP
// =============================================

// Lookup food by barcode (Open Food Facts)
app.get('/api/foods/barcode/:barcode', requireAuth, async (req, res) => {
  try {
    const { barcode } = req.params;

    // Query Open Food Facts API
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = data.product;
    const nutriments = product.nutriments || {};

    // Extract serving size info
    let servingSize = 100;
    let servingUnit = 'g';

    if (product.serving_size) {
      const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz)?/i);
      if (match) {
        servingSize = parseFloat(match[1]);
        servingUnit = match[2]?.toLowerCase() || 'g';
      }
    }

    const food = {
      id: `off_${barcode}`,
      name: product.product_name || product.generic_name || 'Unknown Product',
      brand: product.brands || null,
      barcode,
      source: 'openfoodfacts',
      servingSize,
      servingUnit,
      nutrients: {
        calories: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
        protein: Math.round((nutriments.proteins_100g || nutriments.proteins || 0) * 10) / 10,
        carbs: Math.round((nutriments.carbohydrates_100g || nutriments.carbohydrates || 0) * 10) / 10,
        fat: Math.round((nutriments.fat_100g || nutriments.fat || 0) * 10) / 10,
        fiber: Math.round((nutriments.fiber_100g || nutriments.fiber || 0) * 10) / 10,
        sugar: Math.round((nutriments.sugars_100g || nutriments.sugars || 0) * 10) / 10,
        sodium: Math.round((nutriments.sodium_100g || nutriments.sodium || 0) * 1000) // Convert to mg
      },
      image_url: product.image_url || product.image_front_url || null
    };

    res.json(food);
  } catch (error) {
    console.error('Error looking up barcode:', error);
    res.status(500).json({ error: 'Failed to lookup barcode' });
  }
});

// =============================================
// ACCOUNT MANAGEMENT
// =============================================

// Delete user account and all associated data
app.delete('/api/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete in order to respect foreign key constraints
    // Most tables have ON DELETE CASCADE, but let's be explicit

    // Delete AI generated content
    await supabase.from('ai_generated_workouts').delete().eq('user_id', userId);
    await supabase.from('ai_generated_recipes').delete().eq('user_id', userId);

    // Delete water intake
    await supabase.from('water_intake').delete().eq('user_id', userId);

    // Delete recipes (recipe_ingredients cascade)
    await supabase.from('recipes').delete().eq('user_id', userId);

    // Delete workouts (workout_exercises cascade)
    await supabase.from('workouts').delete().eq('user_id', userId);

    // Delete meals
    await supabase.from('meals').delete().eq('user_id', userId);

    // Delete exercises
    await supabase.from('exercises').delete().eq('user_id', userId);

    // Delete body measurements (body_measurement_photos cascade)
    await supabase.from('body_measurements').delete().eq('user_id', userId);

    // Delete user profile
    await supabase.from('user_profiles').delete().eq('user_id', userId);

    // Delete meal favorites
    await supabase.from('meal_favorites').delete().eq('user_id', userId);

    // Delete workout templates
    await supabase.from('workout_templates').delete().eq('user_id', userId);

    // Finally delete the user
    const { error } = await supabase.from('users').delete().eq('id', userId);

    if (error) throw error;

    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// =============================================
// AI-POWERED FEATURES
// =============================================

// AI Workout Generator
app.post('/api/ai/generate-workout', requireAuth, async (req, res) => {
  try {
    const { duration, focus, equipment, difficulty } = req.body;

    // Get user's profile for personalization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('weight_goal, starting_weight, weight_unit')
      .eq('user_id', req.user.id)
      .single();

    // Get user's exercise history for context
    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select(`
        name,
        workout_exercises (
          exercises (name, muscle_groups)
        )
      `)
      .eq('user_id', req.user.id)
      .eq('is_template', false)
      .order('workout_date', { ascending: false })
      .limit(5);

    // Build context for AI
    const goalContext = {
      build_muscle: 'Focus on hypertrophy with moderate to heavy weights, 8-12 rep ranges, and compound movements. Include progressive overload.',
      lose_fat: 'Include high-intensity exercises, supersets, and circuit-style training to maximize calorie burn. Keep rest periods short (30-60s).',
      maintain: 'Balance of strength and conditioning. Moderate weights with varied rep ranges.',
    };

    const equipmentContext = {
      full_gym: 'barbells, dumbbells, machines, cables, bench, squat rack',
      dumbbells_only: 'dumbbells only - no machines or barbells',
      bodyweight: 'bodyweight exercises only - no equipment needed',
      home_gym: 'dumbbells, resistance bands, pull-up bar',
    };

    const prompt = `Generate a ${duration || 45}-minute ${focus || 'full body'} workout for someone whose goal is to ${profile?.weight_goal?.replace('_', ' ') || 'stay fit'}.

Equipment available: ${equipmentContext[equipment] || 'full gym equipment'}
Difficulty level: ${difficulty || 'intermediate'}

${goalContext[profile?.weight_goal] || ''}

Recent workout history (avoid repeating the exact same exercises):
${recentWorkouts?.map(w => w.workout_exercises?.map(we => we.exercises?.name).join(', ')).join('\n') || 'No recent history'}

Respond with a JSON object containing:
{
  "name": "Descriptive workout name",
  "description": "Brief description of the workout",
  "estimated_duration": number (minutes),
  "estimated_calories": number,
  "exercises": [
    {
      "name": "Exercise name",
      "sets": number,
      "reps": "rep range or time (e.g., '10-12' or '30 sec')",
      "rest_seconds": number,
      "notes": "form tips or modifications",
      "muscle_groups": ["primary muscle", "secondary muscle"]
    }
  ],
  "warmup": "Brief warmup instructions",
  "cooldown": "Brief cooldown instructions"
}

Only respond with the JSON object, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert personal trainer and fitness coach. Generate safe, effective workouts tailored to the user\'s goals and equipment. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content;
    // Clean up the response - remove markdown code blocks if present
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const workout = JSON.parse(cleanContent);

    // Store for analytics (optional)
    await supabase.from('ai_generated_workouts').insert({
      user_id: req.user.id,
      prompt: `${duration}min ${focus} workout, ${equipment}, ${difficulty}`,
      generated_workout: workout
    });

    res.json(workout);
  } catch (error) {
    console.error('Error generating workout:', error);
    res.status(500).json({ error: 'Failed to generate workout' });
  }
});

// AI Recipe Generator
app.post('/api/ai/generate-recipe', requireAuth, async (req, res) => {
  try {
    const { mealType, cuisine, maxCalories, maxPrepTime, servings } = req.body;

    // Get user's profile for personalization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('weight_goal, dietary_restrictions, food_preferences, macro_targets')
      .eq('user_id', req.user.id)
      .single();

    const lovedFoods = profile?.food_preferences?.lovedFoods || [];
    const avoidedFoods = profile?.food_preferences?.avoidedFoods || [];
    const dietaryRestrictions = profile?.dietary_restrictions || [];

    // Build macro guidance based on goal
    const goalMacroGuidance = {
      build_muscle: 'High protein (30-40g per serving), moderate carbs, lean protein sources.',
      lose_fat: 'High protein, lower carbs, high fiber, focus on volume eating with vegetables.',
      maintain: 'Balanced macros with good protein content.',
    };

    const prompt = `Generate a healthy ${mealType || 'dinner'} recipe${cuisine ? ` with ${cuisine} cuisine inspiration` : ''}.

User preferences:
- Fitness goal: ${profile?.weight_goal?.replace('_', ' ') || 'general health'}
- Dietary restrictions: ${dietaryRestrictions.length > 0 ? dietaryRestrictions.join(', ') : 'None'}
- Foods they love: ${lovedFoods.length > 0 ? lovedFoods.join(', ') : 'No preferences'}
- Foods to avoid: ${avoidedFoods.length > 0 ? avoidedFoods.join(', ') : 'None'}
- Target daily calories: ${profile?.macro_targets?.calories || 2000}
- Target daily protein: ${profile?.macro_targets?.protein || 150}g

${maxCalories ? `Maximum calories per serving: ${maxCalories}` : ''}
${maxPrepTime ? `Maximum prep time: ${maxPrepTime} minutes` : ''}
Servings: ${servings || 2}

${goalMacroGuidance[profile?.weight_goal] || ''}

IMPORTANT:
- Try to incorporate their loved foods where it makes sense
- NEVER include any of their avoided foods
- Respect all dietary restrictions

Respond with a JSON object containing:
{
  "name": "Recipe name",
  "description": "Brief appetizing description",
  "prep_time_minutes": number,
  "cook_time_minutes": number,
  "servings": number,
  "difficulty": "easy" | "medium" | "hard",
  "ingredients": [
    {
      "name": "Ingredient name",
      "amount": "quantity with unit (e.g., '2 cups', '200g')",
      "calories": number (for this amount),
      "protein": number (grams),
      "carbs": number (grams),
      "fat": number (grams)
    }
  ],
  "instructions": ["Step 1...", "Step 2..."],
  "nutrition_per_serving": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number
  },
  "tips": "Optional cooking tips or variations"
}

Only respond with the JSON object, no other text.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert nutritionist and chef. Generate healthy, delicious recipes that meet the user\'s dietary needs and preferences. Always respond with valid JSON. Provide accurate macro estimates.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    const content = data.choices[0].message.content;
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const recipe = JSON.parse(cleanContent);

    // Store for analytics
    await supabase.from('ai_generated_recipes').insert({
      user_id: req.user.id,
      prompt: `${mealType} recipe, ${cuisine || 'any'} cuisine, max ${maxCalories || 'any'} cal`,
      generated_recipe: recipe
    });

    res.json(recipe);
  } catch (error) {
    console.error('Error generating recipe:', error);
    res.status(500).json({ error: 'Failed to generate recipe' });
  }
});

// Smart Suggestions - Get personalized suggestions based on user patterns
app.get('/api/ai/suggestions', requireAuth, async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const hour = today.getHours();

    // Get user's typical patterns
    const { data: recentMeals } = await supabase
      .from('meals')
      .select('food_name, meal_type, meal_date')
      .eq('user_id', req.user.id)
      .order('meal_date', { ascending: false })
      .limit(50);

    // Get today's logged data
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);

    const { data: todayMeals } = await supabase
      .from('meals')
      .select('meal_type, calories')
      .eq('user_id', req.user.id)
      .gte('meal_date', todayStart.toISOString());

    const { data: todayWorkouts } = await supabase
      .from('workouts')
      .select('id')
      .eq('user_id', req.user.id)
      .gte('workout_date', todayStart.toISOString())
      .or('is_template.is.null,is_template.eq.false');

    // Get user's profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('macro_targets, weight_goal')
      .eq('user_id', req.user.id)
      .single();

    const suggestions = [];

    // Meal suggestions based on time of day
    const mealTypes = {
      breakfast: hour >= 5 && hour < 10,
      lunch: hour >= 11 && hour < 14,
      dinner: hour >= 17 && hour < 21,
      snack: (hour >= 10 && hour < 11) || (hour >= 14 && hour < 17) || (hour >= 21 && hour < 23)
    };

    const loggedMealTypes = (todayMeals || []).map(m => m.meal_type);

    // Find frequent meals for the current meal type
    for (const [mealType, isTime] of Object.entries(mealTypes)) {
      if (isTime && !loggedMealTypes.includes(mealType)) {
        // Find most common foods for this meal type
        const mealsOfType = (recentMeals || []).filter(m => m.meal_type === mealType);
        const foodCounts = {};
        mealsOfType.forEach(m => {
          foodCounts[m.food_name] = (foodCounts[m.food_name] || 0) + 1;
        });

        const topFoods = Object.entries(foodCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([food]) => food);

        if (topFoods.length > 0) {
          suggestions.push({
            type: 'meal_suggestion',
            title: `Time for ${mealType}?`,
            description: `You often have: ${topFoods.join(', ')}`,
            action: 'log_meal',
            data: { meal_type: mealType, suggestions: topFoods }
          });
        } else {
          suggestions.push({
            type: 'meal_reminder',
            title: `Don't forget ${mealType}!`,
            description: `Log your ${mealType} to stay on track`,
            action: 'log_meal',
            data: { meal_type: mealType }
          });
        }
        break; // Only one meal suggestion at a time
      }
    }

    // Workout suggestion if none logged today (suggest on typical workout days)
    if (!todayWorkouts || todayWorkouts.length === 0) {
      // Get workout frequency by day of week
      const { data: weekWorkouts } = await supabase
        .from('workouts')
        .select('workout_date')
        .eq('user_id', req.user.id)
        .or('is_template.is.null,is_template.eq.false')
        .gte('workout_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      const dayFrequency = {};
      (weekWorkouts || []).forEach(w => {
        const day = new Date(w.workout_date).getDay();
        dayFrequency[day] = (dayFrequency[day] || 0) + 1;
      });

      if (dayFrequency[dayOfWeek] > 1) {
        suggestions.push({
          type: 'workout_suggestion',
          title: 'Workout day!',
          description: `You usually work out on ${['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][dayOfWeek]}`,
          action: 'start_workout',
          data: {}
        });
      }
    }

    // Calorie status suggestion
    const caloriesConsumed = (todayMeals || []).reduce((sum, m) => sum + (m.calories || 0), 0);
    const calorieGoal = profile?.macro_targets?.calories || 2000;
    const remaining = calorieGoal - caloriesConsumed;

    if (remaining < 0 && Math.abs(remaining) > 200) {
      suggestions.push({
        type: 'calorie_alert',
        title: `${Math.abs(remaining)} calories over goal`,
        description: 'Consider a light walk or extra activity today',
        action: 'view_stats',
        data: { over_by: Math.abs(remaining) }
      });
    } else if (remaining > calorieGoal * 0.5 && hour >= 14) {
      suggestions.push({
        type: 'calorie_reminder',
        title: `${remaining} calories remaining`,
        description: 'Don\'t forget to log your meals!',
        action: 'log_meal',
        data: { remaining }
      });
    }

    res.json({ suggestions });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Post-meal calorie burn suggestions
app.post('/api/ai/calorie-burn-suggestion', requireAuth, async (req, res) => {
  try {
    const { calories_over } = req.body;

    if (!calories_over || calories_over <= 0) {
      return res.json({ suggestions: [] });
    }

    // Get user's weight for accurate calorie estimates
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('starting_weight, weight_unit')
      .eq('user_id', req.user.id)
      .single();

    const weightLbs = profile?.weight_unit === 'kg'
      ? (profile?.starting_weight || 70) * 2.205
      : (profile?.starting_weight || 150);

    // Calculate activity durations to burn the excess calories
    // Calories per minute estimates based on body weight
    const activities = [
      { name: 'Brisk Walk', calPerMinPerLb: 0.035, icon: '🚶' },
      { name: 'Light Jog', calPerMinPerLb: 0.063, icon: '🏃' },
      { name: 'Cycling', calPerMinPerLb: 0.049, icon: '🚴' },
      { name: 'Swimming', calPerMinPerLb: 0.058, icon: '🏊' },
      { name: 'Jump Rope', calPerMinPerLb: 0.074, icon: '⏭️' },
      { name: 'Dancing', calPerMinPerLb: 0.042, icon: '💃' },
    ];

    const suggestions = activities.map(activity => {
      const calPerMin = activity.calPerMinPerLb * weightLbs;
      const minutes = Math.ceil(calories_over / calPerMin);
      return {
        activity: activity.name,
        icon: activity.icon,
        duration_minutes: minutes,
        calories_burned: calories_over,
        description: `${minutes} minutes of ${activity.name.toLowerCase()}`
      };
    }).filter(s => s.duration_minutes <= 60) // Only suggest activities under an hour
      .sort((a, b) => a.duration_minutes - b.duration_minutes);

    res.json({
      calories_over,
      message: `You're ${calories_over} calories over your goal. Here are some ways to balance it out:`,
      suggestions: suggestions.slice(0, 4) // Top 4 suggestions
    });
  } catch (error) {
    console.error('Error getting calorie burn suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// =============================================
// ADMIN API ENDPOINTS
// =============================================

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'your-admin-secret-change-this';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@myfitbody.app';
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || crypto.createHash('sha256').update('admin123').digest('hex');

// Admin auth middleware
const requireAdmin = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    if (email !== ADMIN_EMAIL || passwordHash !== ADMIN_PASSWORD_HASH) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email, isAdmin: true },
      ADMIN_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, admin: { email } });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify admin token
app.get('/api/admin/verify', requireAdmin, (req, res) => {
  res.json({ admin: { email: req.admin.email } });
});

// Dashboard stats
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    // Get total users
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('Error fetching total users:', usersError);
    }

    // Get new users this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: newUsersThisWeek } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // Get active users today (users who logged workouts or meals today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: activeWorkouts } = await supabase
      .from('workouts')
      .select('user_id')
      .gte('created_at', todayStart.toISOString());
    const { data: activeMeals } = await supabase
      .from('meals')
      .select('user_id')
      .gte('created_at', todayStart.toISOString());
    const activeUserIds = new Set([
      ...(activeWorkouts || []).map(w => w.user_id),
      ...(activeMeals || []).map(m => m.user_id)
    ]);
    const activeUsersToday = activeUserIds.size;

    // Get total workouts and meals
    const { count: totalWorkouts } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .or('is_template.is.null,is_template.eq.false');

    const { count: totalMeals } = await supabase
      .from('meals')
      .select('*', { count: 'exact', head: true });

    // Get workouts and meals this week
    const { count: workoutsThisWeek } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
      .or('is_template.is.null,is_template.eq.false');

    const { count: mealsThisWeek } = await supabase
      .from('meals')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // Get signups by day (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { data: signupData } = await supabase
      .from('users')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    const signupsByDay = {};
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      signupsByDay[date.toISOString().split('T')[0]] = 0;
    }
    (signupData || []).forEach(u => {
      const date = new Date(u.created_at).toISOString().split('T')[0];
      if (signupsByDay[date] !== undefined) {
        signupsByDay[date]++;
      }
    });

    // Get activity by day (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const { data: workoutsByDayData } = await supabase
      .from('workouts')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .or('is_template.is.null,is_template.eq.false');
    const { data: mealsByDayData } = await supabase
      .from('meals')
      .select('created_at')
      .gte('created_at', sevenDaysAgo.toISOString());

    const activityByDay = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      activityByDay[date] = { workouts: 0, meals: 0 };
    }
    (workoutsByDayData || []).forEach(w => {
      const date = new Date(w.created_at).toISOString().split('T')[0];
      if (activityByDay[date]) activityByDay[date].workouts++;
    });
    (mealsByDayData || []).forEach(m => {
      const date = new Date(m.created_at).toISOString().split('T')[0];
      if (activityByDay[date]) activityByDay[date].meals++;
    });

    // Get recent users
    const { data: recentUsers } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    res.json({
      totalUsers,
      newUsersThisWeek,
      activeUsersToday,
      totalWorkouts,
      totalMeals,
      workoutsThisWeek,
      mealsThisWeek,
      signupsByDay: Object.entries(signupsByDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      activityByDay: Object.entries(activityByDay)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      recentUsers,
    });
  } catch (error) {
    console.error('Error getting admin stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Debug endpoint to test Supabase connection
app.get('/api/admin/debug', requireAdmin, async (req, res) => {
  try {
    console.log('Debug: Testing Supabase connection...');
    console.log('Debug: SUPABASE_URL =', process.env.SUPABASE_URL);
    console.log('Debug: SERVICE_ROLE_KEY exists =', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('Debug: SERVICE_ROLE_KEY length =', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

    // Check first few chars of key to verify it's service role
    const keyStart = process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 50);
    console.log('Debug: Key starts with:', keyStart);

    // Simple query with no filters - users
    const { data: users, error: usersError, count: usersCount } = await supabase
      .from('users')
      .select('id, email', { count: 'exact' });

    // Simple query - meals
    const { data: meals, error: mealsError, count: mealsCount } = await supabase
      .from('meals')
      .select('id, name', { count: 'exact' });

    // Simple query - user_profiles
    const { data: profiles, error: profilesError, count: profilesCount } = await supabase
      .from('user_profiles')
      .select('id, user_id', { count: 'exact' });

    console.log('Debug: Users:', JSON.stringify(users), 'error:', usersError);
    console.log('Debug: Meals:', JSON.stringify(meals), 'error:', mealsError);
    console.log('Debug: Profiles:', JSON.stringify(profiles), 'error:', profilesError);

    res.json({
      supabaseUrl: process.env.SUPABASE_URL,
      serviceKeyExists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
      users: { data: users, error: usersError, count: usersCount },
      meals: { data: meals, error: mealsError, count: mealsCount },
      profiles: { data: profiles, error: profilesError, count: profilesCount }
    });
  } catch (err) {
    console.error('Debug error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get users list with pagination and search
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    const offset = (page - 1) * limit;

    console.log('Admin users request - page:', page, 'limit:', limit, 'search:', search, 'status:', status);

    // Select all columns to handle case where is_suspended doesn't exist yet
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }

    // Only filter by status if explicitly requested (in case column doesn't exist)
    if (status === 'suspended') {
      query = query.eq('is_suspended', true);
    } else if (status === 'active') {
      query = query.or('is_suspended.is.null,is_suspended.eq.false');
    }

    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    console.log('Admin users result - count:', count, 'users length:', users?.length, 'error:', error);

    if (error) {
      console.error('Error fetching users:', error);
      throw error;
    }

    // Get workout and meal counts for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const { count: workoutCount } = await supabase
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .or('is_template.is.null,is_template.eq.false');

      const { count: mealCount } = await supabase
        .from('meals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      return {
        ...user,
        workout_count: workoutCount,
        meal_count: mealCount,
      };
    }));

    res.json({
      users: usersWithStats,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Get single user details
app.get('/api/admin/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    // Get profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get stats
    const { count: workouts } = await supabase
      .from('workouts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .or('is_template.is.null,is_template.eq.false');

    const { count: meals } = await supabase
      .from('meals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const { count: measurements } = await supabase
      .from('body_measurements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      ...user,
      profile,
      stats: { workouts, meals, measurements },
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Get user activity
app.get('/api/admin/users/:userId/activity', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const activities = [];

    // Get recent workouts
    const { data: workouts } = await supabase
      .from('workouts')
      .select('id, name, created_at')
      .eq('user_id', userId)
      .or('is_template.is.null,is_template.eq.false')
      .order('created_at', { ascending: false })
      .limit(10);

    (workouts || []).forEach(w => {
      activities.push({
        type: 'workout',
        description: `Logged workout: ${w.name || 'Untitled'}`,
        created_at: w.created_at,
      });
    });

    // Get recent meals
    const { data: meals } = await supabase
      .from('meals')
      .select('id, food_name, meal_type, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    (meals || []).forEach(m => {
      activities.push({
        type: 'meal',
        description: `Logged ${m.meal_type}: ${m.food_name}`,
        created_at: m.created_at,
      });
    });

    // Get recent measurements
    const { data: measurements } = await supabase
      .from('body_measurements')
      .select('id, weight, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    (measurements || []).forEach(m => {
      activities.push({
        type: 'measurement',
        description: `Logged weight: ${m.weight} lb`,
        created_at: m.created_at,
      });
    });

    // Sort by date
    activities.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ activities: activities.slice(0, 20) });
  } catch (error) {
    console.error('Error getting user activity:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

// Suspend user
app.post('/api/admin/users/:userId/suspend', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({
        is_suspended: true,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error suspending user:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Unsuspend user
app.post('/api/admin/users/:userId/unsuspend', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const { data, error } = await supabase
      .from('users')
      .update({
        is_suspended: false,
        suspension_reason: null,
        suspended_at: null,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error unsuspending user:', error);
    res.status(500).json({ error: 'Failed to unsuspend user' });
  }
});

// Delete user (admin)
app.delete('/api/admin/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Delete all user data (same as account deletion)
    await supabase.from('ai_generated_workouts').delete().eq('user_id', userId);
    await supabase.from('ai_generated_recipes').delete().eq('user_id', userId);
    await supabase.from('water_intake').delete().eq('user_id', userId);
    await supabase.from('recipes').delete().eq('user_id', userId);
    await supabase.from('workouts').delete().eq('user_id', userId);
    await supabase.from('meals').delete().eq('user_id', userId);
    await supabase.from('exercises').delete().eq('user_id', userId);
    await supabase.from('body_measurements').delete().eq('user_id', userId);
    await supabase.from('user_profiles').delete().eq('user_id', userId);
    await supabase.from('meal_favorites').delete().eq('user_id', userId);
    await supabase.from('workout_templates').delete().eq('user_id', userId);

    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Reset user password (sends email via Clerk - placeholder)
app.post('/api/admin/users/:userId/reset-password', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user's clerk_user_id
    const { data: user } = await supabase
      .from('users')
      .select('clerk_user_id, email')
      .eq('id', userId)
      .single();

    // Note: Clerk password reset would need to be done via Clerk's API
    // For now, just return success - in production you'd integrate with Clerk
    res.json({
      success: true,
      message: 'Password reset request sent',
      note: 'User should use "Forgot Password" on login screen',
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Toggle admin status for a user
app.post('/api/admin/users/:userId/toggle-admin', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isAdmin } = req.body;

    const { data, error } = await supabase
      .from('users')
      .update({ is_admin: isAdmin })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, user: data });
  } catch (error) {
    console.error('Error toggling admin status:', error);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

// Start server - bind to 0.0.0.0 to accept connections from other devices
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MyFitBody API running on http://0.0.0.0:${PORT}`);
  console.log(`For mobile devices, use: http://<YOUR_IP>:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
