# MyFitBody - Calorie Tracking & iOS Widget Specification

## Overview

This document details the calorie tracking system, calorie-aware notifications, and iOS widget implementation for MyFitBody.

## Core Calorie Tracking System

### Calorie Budget Calculation

**Daily Calorie Goal Formula:**
```typescript
interface UserMetrics {
  weight: number; // in lbs or kg
  heightCm: number;
  age: number;
  gender: 'male' | 'female' | 'other';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'build_muscle' | 'lose_fat' | 'maintain' | 'recomp';
}

function calculateBMR(metrics: UserMetrics): number {
  // Mifflin-St Jeor Equation
  const weightKg = metrics.weight; // assuming already in kg
  const heightCm = metrics.heightCm;
  const age = metrics.age;

  let bmr: number;
  if (metrics.gender === 'male') {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
  } else {
    bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
  }

  return bmr;
}

function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'very_active': 1.9
  };

  return bmr * multipliers[activityLevel];
}

function calculateDailyCalorieGoal(tdee: number, goal: string): number {
  const adjustments = {
    'lose_fat': -500,      // 1 lb per week fat loss
    'build_muscle': +300,  // Slight surplus for muscle gain
    'maintain': 0,
    'recomp': -200        // Slight deficit for body recomposition
  };

  return Math.round(tdee + adjustments[goal]);
}
```

### Real-Time Calorie Balance

**Components:**
1. **Calories Consumed**: Sum of all logged meals for the day
2. **Calories Burned**: Sum of estimated calorie burn from workouts
3. **Net Calories**: Consumed - Burned
4. **Remaining Calories**: Daily Goal - Net Calories

**Display Logic:**
```typescript
interface DailyCalorieStatus {
  consumed: number;
  burned: number;
  net: number;
  goal: number;
  remaining: number;
  percentageOfGoal: number;
  status: 'under' | 'on_track' | 'near_limit' | 'over';
  statusColor: 'green' | 'yellow' | 'orange' | 'red';
}

function calculateDailyStatus(
  consumed: number,
  burned: number,
  goal: number
): DailyCalorieStatus {
  const net = consumed - burned;
  const remaining = goal - net;
  const percentage = (net / goal) * 100;

  let status: DailyCalorieStatus['status'];
  let statusColor: DailyCalorieStatus['statusColor'];

  if (percentage < 70) {
    status = 'under';
    statusColor = 'green';
  } else if (percentage >= 70 && percentage < 90) {
    status = 'on_track';
    statusColor = 'green';
  } else if (percentage >= 90 && percentage < 105) {
    status = 'near_limit';
    statusColor = 'yellow';
  } else {
    status = 'over';
    statusColor = 'red';
  }

  return {
    consumed,
    burned,
    net,
    goal,
    remaining,
    percentageOfGoal: percentage,
    status,
    statusColor
  };
}
```

## Calorie Estimation for Exercises

### MET (Metabolic Equivalent of Task) System

**Formula:**
```
Calories Burned = (MET × Weight in kg × Duration in hours)
```

**MET Values for Common Bodyweight Exercises:**
```typescript
const MET_VALUES = {
  // Cardio
  'jumping_jacks': 8.0,
  'high_knees': 10.0,
  'burpees': 12.5,
  'mountain_climbers': 8.0,
  'running_in_place': 8.0,

  // Strength
  'push_ups': 8.0,
  'squats': 8.0,
  'lunges': 7.0,
  'plank': 5.0,
  'wall_sits': 6.0,
  'crunches': 5.0,
  'leg_raises': 6.0,

  // Low intensity
  'standing_calf_raises': 4.0,
  'arm_circles': 3.0,
  'stretching': 2.5,

  // High intensity
  'box_jumps': 10.0,
  'jump_squats': 10.0,
  'tuck_jumps': 10.0,
  'sprint_intervals': 13.5
};

function estimateCaloriesBurned(
  exercise: string,
  durationMinutes: number,
  weightKg: number
): number {
  const met = MET_VALUES[exercise] || 5.0; // Default to moderate
  const durationHours = durationMinutes / 60;
  const calories = met * weightKg * durationHours;

  return Math.round(calories);
}
```

### Workout Calorie Tracking

**Auto-calculation when logging workouts:**
```typescript
interface WorkoutExercise {
  exerciseName: string;
  sets: number;
  reps: number;
  durationMinutes?: number;
}

function calculateWorkoutCalories(
  exercises: WorkoutExercise[],
  userWeightKg: number
): number {
  let totalCalories = 0;

  for (const exercise of exercises) {
    // Estimate duration if not provided
    const duration = exercise.durationMinutes ||
      estimateDurationFromSetsReps(exercise.sets, exercise.reps);

    const calories = estimateCaloriesBurned(
      exercise.exerciseName.toLowerCase().replace(' ', '_'),
      duration,
      userWeightKg
    );

    totalCalories += calories;
  }

  return totalCalories;
}

function estimateDurationFromSetsReps(sets: number, reps: number): number {
  // Rough estimate: 3 seconds per rep + 90 seconds rest between sets
  const workTimeSeconds = sets * reps * 3;
  const restTimeSeconds = (sets - 1) * 90;
  return (workTimeSeconds + restTimeSeconds) / 60;
}
```

## Calorie-Aware Smart Notifications

### Notification Trigger Logic

**Decision Tree:**
```typescript
interface NotificationContext {
  calorieStatus: DailyCalorieStatus;
  lastMeal: Meal | null;
  lastWorkout: Workout | null;
  currentTime: Date;
  userPreferences: {
    notificationFrequency: 'low' | 'medium' | 'high';
    quietHoursStart: number; // 0-23
    quietHoursEnd: number;
    enableCaloriePrompts: boolean;
  };
}

async function shouldSendNotification(context: NotificationContext): Promise<boolean> {
  const { calorieStatus, lastMeal, currentTime, userPreferences } = context;

  // Check quiet hours
  const hour = currentTime.getHours();
  if (hour >= userPreferences.quietHoursStart || hour < userPreferences.quietHoursEnd) {
    return false;
  }

  // Don't send within 1 hour of last meal (digestion)
  if (lastMeal && (Date.now() - lastMeal.meal_date.getTime()) < 3600000) {
    return false;
  }

  // Priority scenarios for calorie-aware prompts
  if (userPreferences.enableCaloriePrompts) {
    // Over budget by 150+ calories
    if (calorieStatus.remaining < -150) {
      return true;
    }

    // Ate a high-calorie meal (500+) in last 2 hours
    if (lastMeal &&
        lastMeal.calories > 500 &&
        (Date.now() - lastMeal.meal_date.getTime()) < 7200000) {
      return true;
    }
  }

  // Random motivational prompts based on frequency
  const randomChance = {
    'low': 0.1,
    'medium': 0.3,
    'high': 0.5
  }[userPreferences.notificationFrequency];

  return Math.random() < randomChance;
}
```

### Notification Message Generation

**Templates:**
```typescript
const NOTIFICATION_TEMPLATES = {
  calorie_surplus: [
    "You're {calories} calories over! Let's burn it off with {exercise} ({duration} min)",
    "That {food} was delicious! 😋 Burn {calories} calories with a quick {exercise}?",
    "You've earned a workout! {calories} calories to burn with {exercise}",
  ],

  calorie_deficit: [
    "Great job! You have {calories} calories left for the day. Keep it up! 💪",
    "You're {calories} under your goal. Room for a healthy snack!",
    "On track! {calories} calories remaining. You're crushing it! 🎯",
  ],

  motivation: [
    "Quick energy boost? {duration} min of {exercise} will wake you up!",
    "Let's stay active! Try {exercise} for {duration} minutes.",
    "Your body will thank you! Quick {exercise} session?",
  ],

  achievement: [
    "🔥 {days}-day streak! Keep the momentum going with {exercise}!",
    "You logged {workouts} workouts this week! One more to hit your goal?",
    "Halfway through your weekly goal! Feeling strong? 💪",
  ]
};

function generateNotificationMessage(context: NotificationContext): string {
  const { calorieStatus, lastMeal } = context;

  if (calorieStatus.remaining < -100) {
    const template = randomChoice(NOTIFICATION_TEMPLATES.calorie_surplus);
    const exercise = selectAppropriateExercise(Math.abs(calorieStatus.remaining));

    return template
      .replace('{calories}', Math.abs(calorieStatus.remaining).toString())
      .replace('{food}', lastMeal?.food_name || 'meal')
      .replace('{exercise}', exercise.name)
      .replace('{duration}', exercise.durationMinutes.toString());
  }

  if (calorieStatus.remaining > 200) {
    const template = randomChoice(NOTIFICATION_TEMPLATES.calorie_deficit);
    return template.replace('{calories}', calorieStatus.remaining.toString());
  }

  const template = randomChoice(NOTIFICATION_TEMPLATES.motivation);
  const exercise = selectRandomBodyweightExercise();

  return template
    .replace('{exercise}', exercise.name)
    .replace('{duration}', exercise.durationMinutes.toString());
}

function selectAppropriateExercise(targetCalories: number): Exercise {
  // Select exercise that can burn target calories in reasonable time (5-20 min)
  const userWeight = 70; // Get from user profile

  for (const [exercise, met] of Object.entries(MET_VALUES)) {
    for (let duration = 5; duration <= 20; duration++) {
      const calories = estimateCaloriesBurned(exercise, duration, userWeight);
      if (Math.abs(calories - targetCalories) < 30) {
        return {
          name: exercise.replace('_', ' '),
          durationMinutes: duration,
          estimatedCalories: calories
        };
      }
    }
  }

  // Default to burpees (high calorie burn)
  return {
    name: 'burpees',
    durationMinutes: Math.ceil(targetCalories / 15),
    estimatedCalories: targetCalories
  };
}
```

## iOS Widget Implementation

### Widget Architecture

**Tech Stack:**
- React Native Widgets (via `react-native-widgets` or Expo WidgetKit Module)
- WidgetKit for iOS
- Shared data via App Groups or AsyncStorage bridge

**Widget Sizes:**
- **Small (2x2)**: Calorie balance only
- **Medium (4x2)**: Calories + today's stats
- **Large (4x4)**: Full dashboard

### Widget Data Structure

```typescript
interface WidgetData {
  userId: string;
  lastUpdated: Date;
  calorieStatus: {
    consumed: number;
    burned: number;
    net: number;
    goal: number;
    remaining: number;
    percentage: number;
    statusColor: 'green' | 'yellow' | 'orange' | 'red';
  };
  todayStats: {
    workoutsLogged: number;
    mealsLogged: number;
    currentStreak: number;
  };
  motivationalMessage: string;
}
```

### Widget Update Strategy

**Update Triggers:**
1. After logging a meal
2. After completing a workout
3. After completing an exercise prompt
4. Periodic background refresh (iOS limits)

**Implementation:**
```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import WidgetModule from 'react-native-widget-module';

const WIDGET_UPDATE_TASK = 'widget-update-task';

// Register background task
TaskManager.defineTask(WIDGET_UPDATE_TASK, async () => {
  try {
    const widgetData = await fetchWidgetData();
    await WidgetModule.setWidgetData(widgetData);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Fetch latest data for widget
async function fetchWidgetData(): Promise<WidgetData> {
  const userId = await getCurrentUserId();
  const today = new Date().toISOString().split('T')[0];

  const [meals, workouts, profile] = await Promise.all([
    supabase.from('meals').select('*').eq('user_id', userId).gte('meal_date', today),
    supabase.from('workouts').select('*').eq('user_id', userId).gte('workout_date', today),
    supabase.from('user_profiles').select('*').eq('user_id', userId).single()
  ]);

  const consumed = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const burned = workouts.reduce((sum, workout) => sum + (workout.estimated_calories_burned || 0), 0);
  const net = consumed - burned;
  const goal = profile.macro_targets.calories || 2000;
  const remaining = goal - net;
  const percentage = (net / goal) * 100;

  let statusColor: 'green' | 'yellow' | 'orange' | 'red';
  if (percentage < 90) statusColor = 'green';
  else if (percentage < 105) statusColor = 'yellow';
  else if (percentage < 120) statusColor = 'orange';
  else statusColor = 'red';

  return {
    userId,
    lastUpdated: new Date(),
    calorieStatus: {
      consumed,
      burned,
      net,
      goal,
      remaining,
      percentage,
      statusColor
    },
    todayStats: {
      workoutsLogged: workouts.length,
      mealsLogged: meals.length,
      currentStreak: await calculateStreak(userId)
    },
    motivationalMessage: generateMotivationalMessage(remaining, percentage)
  };
}

// Manual widget update (called after user actions)
export async function updateWidget() {
  const widgetData = await fetchWidgetData();
  await WidgetModule.setWidgetData(widgetData);
}
```

### Widget UI Design

**Small Widget:**
```
┌─────────────┐
│ MyFitBody   │
│             │
│   ●●●●○     │ ← Progress ring
│   1,200     │ ← Remaining calories
│  remaining  │
│             │
│  🟢 On Track │
└─────────────┘
```

**Medium Widget:**
```
┌────────────────────────────┐
│ MyFitBody          🟢      │
│                            │
│ Calories     ●●●●○         │
│ 1,200 / 2,000             │
│                            │
│ 🍽️ 3 meals  💪 1 workout  │
└────────────────────────────┘
```

**Large Widget:**
```
┌────────────────────────────┐
│ MyFitBody      📊  Settings│
│                            │
│      ●●●●●●○               │
│   1,200 / 2,000 calories   │
│                            │
│ Consumed: 1,800 cal        │
│ Burned:   600 cal          │
│ Net:      1,200 cal        │
│                            │
│ 🍽️ 3 meals  💪 1 workout   │
│ 🔥 7 day streak            │
│                            │
│ "Great job staying on track!"│
│                            │
│ [Log Meal] [Log Workout]   │
└────────────────────────────┘
```

### Widget Deep Linking

**Tap Actions:**
```swift
// iOS WidgetKit URL scheme
let widgetURL = URL(string: "myfitbody://widget-action?action=log-meal")

// React Native deep link handling
Linking.addEventListener('url', (event) => {
  const { url } = event;
  const route = url.replace('myfitbody://', '');

  if (route.includes('widget-action')) {
    const params = new URLSearchParams(route.split('?')[1]);
    const action = params.get('action');

    if (action === 'log-meal') {
      navigation.navigate('LogMeal');
    } else if (action === 'log-workout') {
      navigation.navigate('LogWorkout');
    } else if (action === 'dashboard') {
      navigation.navigate('Dashboard');
    }
  }
});
```

## Database Optimization for Real-Time Calorie Tracking

### Materialized View for Daily Summary

```sql
-- Create materialized view for faster daily calorie queries
CREATE MATERIALIZED VIEW daily_calorie_summary AS
SELECT
  user_id,
  DATE(meal_date) as summary_date,
  SUM(calories) as total_calories_consumed,
  COUNT(*) as meals_logged
FROM meals
GROUP BY user_id, DATE(meal_date)
UNION ALL
SELECT
  user_id,
  DATE(workout_date) as summary_date,
  -SUM(estimated_calories_burned) as total_calories_burned,
  COUNT(*) as workouts_logged
FROM workouts
GROUP BY user_id, DATE(workout_date);

-- Refresh materialized view (can be scheduled)
REFRESH MATERIALIZED VIEW CONCURRENTLY daily_calorie_summary;

-- Create index for fast lookups
CREATE INDEX idx_daily_calorie_user_date
ON daily_calorie_summary(user_id, summary_date DESC);
```

### Real-Time Function for Current Balance

```sql
-- Function to get real-time calorie balance
CREATE OR REPLACE FUNCTION get_daily_calorie_balance(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  calories_consumed INTEGER,
  calories_burned INTEGER,
  net_calories INTEGER,
  calorie_goal INTEGER,
  calories_remaining INTEGER
) AS $$
DECLARE
  v_consumed INTEGER;
  v_burned INTEGER;
  v_goal INTEGER;
BEGIN
  -- Get total consumed
  SELECT COALESCE(SUM(calories), 0)
  INTO v_consumed
  FROM meals
  WHERE user_id = p_user_id
    AND DATE(meal_date) = p_date;

  -- Get total burned
  SELECT COALESCE(SUM(estimated_calories_burned), 0)
  INTO v_burned
  FROM workouts
  WHERE user_id = p_user_id
    AND DATE(workout_date) = p_date;

  -- Get user's calorie goal
  SELECT (macro_targets->>'calories')::INTEGER
  INTO v_goal
  FROM user_profiles
  WHERE user_id = p_user_id;

  -- Return results
  RETURN QUERY SELECT
    v_consumed,
    v_burned,
    v_consumed - v_burned as net,
    COALESCE(v_goal, 2000) as goal,
    COALESCE(v_goal, 2000) - (v_consumed - v_burned) as remaining;
END;
$$ LANGUAGE plpgsql;

-- Usage
SELECT * FROM get_daily_calorie_balance('user-uuid-here');
```

## API Endpoints

### Calorie Tracking Endpoints

```typescript
// GET /api/calories/daily/:date
// Returns daily calorie summary
interface DailyCalorieResponse {
  date: string;
  consumed: number;
  burned: number;
  net: number;
  goal: number;
  remaining: number;
  status: 'under' | 'on_track' | 'near_limit' | 'over';
  meals: Meal[];
  workouts: Workout[];
}

// POST /api/meals
// Log a meal
interface LogMealRequest {
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  sugar?: number;
  serving_size?: string;
  notes?: string;
}

// POST /api/meals/quick-log
// AI-assisted quick meal logging
interface QuickLogMealRequest {
  description: string; // e.g., "large cheese pizza, 2 slices"
}
// Returns estimated nutritional info using OpenAI

// GET /api/calories/widget
// Optimized endpoint for widget updates
interface WidgetDataResponse {
  calorieStatus: DailyCalorieStatus;
  todayStats: {
    workouts: number;
    meals: number;
    streak: number;
  };
  message: string;
}
```

## Performance Considerations

1. **Caching**: Cache daily calorie balance in Redis with 5-minute TTL
2. **Widget Updates**: Limit to 5 updates per hour (iOS quota)
3. **Background Fetch**: iOS allows ~15 minutes between background updates
4. **Database Queries**: Use indexed queries and materialized views
5. **Notification Rate Limiting**: Max 3 calorie-aware prompts per day

## Privacy & Data Handling

- All calorie data is user-specific and protected by RLS
- Widget data stored in secure App Group container
- No calorie data transmitted to third parties
- Users can disable calorie-aware notifications anytime
- Option to hide calorie counts for users with eating disorders

## Future Enhancements

1. **Android Widgets**: Similar implementation using Android App Widgets
2. **Apple Watch Complications**: Show calorie balance on watch face
3. **Siri Shortcuts**: "Hey Siri, what's my calorie balance?"
4. **Photo Food Logging**: AI-powered calorie estimation from photos
5. **Nutrition Database Integration**: Connect to USDA FoodData Central
6. **Meal Planning AI**: Generate daily meal plans to hit exact calorie goals
7. **Social Challenges**: Compete with friends on calorie goals
