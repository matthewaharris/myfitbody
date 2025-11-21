# MyFitBody - Journal & Quick Re-log Specification

## Overview

This document details the daily journal system with mood/energy tracking and the quick re-log functionality for meals and workouts.

---

## Daily Journal System

### Automatic Journal Creation

**Daily Journal Structure:**
```typescript
interface DailyJournal {
  id: string;
  userId: string;
  journalDate: Date;
  autoSummary: {
    calories: {
      consumed: number;
      burned: number;
      net: number;
      goal: number;
    };
    meals: {
      count: number;
      breakdown: { mealType: string; calories: number; items: string[] }[];
    };
    workouts: {
      count: number;
      totalDuration: number;
      exercises: { name: string; sets: number; reps: number }[];
    };
    achievements: string[];
    goalsHit: string[];
    goalsMissed: string[];
  };
  userEntries: JournalEntry[];
  tags: string[];
  photoUrls: string[];
  aiInsights?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface JournalEntry {
  id: string;
  timestamp: Date;
  content: string;
  tags: string[];
  isVoiceToText: boolean;
}
```

**Journal Generation Logic:**
```typescript
// Runs at end of day (11:59 PM) or when user views journal
async function generateDailyJournal(userId: string, date: Date): Promise<DailyJournal> {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  // Fetch day's data
  const [meals, workouts, checkins, goals] = await Promise.all([
    supabase
      .from('meals')
      .select('*')
      .eq('user_id', userId)
      .gte('meal_date', startOfDay.toISOString())
      .lte('meal_date', endOfDay.toISOString()),

    supabase
      .from('workouts')
      .select('*, workout_exercises(*, exercises(*))')
      .eq('user_id', userId)
      .gte('workout_date', startOfDay.toISOString())
      .lte('workout_date', endOfDay.toISOString()),

    supabase
      .from('mood_checkins')
      .select('*')
      .eq('user_id', userId)
      .gte('checkin_time', startOfDay.toISOString())
      .lte('checkin_time', endOfDay.toISOString()),

    getUserGoals(userId)
  ]);

  // Calculate auto summary
  const autoSummary = {
    calories: calculateDailyCalories(meals.data, workouts.data),
    meals: summarizeMeals(meals.data),
    workouts: summarizeWorkouts(workouts.data),
    achievements: identifyAchievements(meals.data, workouts.data, checkins.data),
    goalsHit: checkGoalsHit(meals.data, workouts.data, goals),
    goalsMissed: checkGoalsMissed(meals.data, workouts.data, goals)
  };

  // Check if journal already exists
  const { data: existingJournal } = await supabase
    .from('daily_journals')
    .select('*')
    .eq('user_id', userId)
    .eq('journal_date', date.toISOString().split('T')[0])
    .single();

  if (existingJournal) {
    // Update existing journal
    return await supabase
      .from('daily_journals')
      .update({ auto_summary: autoSummary })
      .eq('id', existingJournal.id)
      .select()
      .single();
  } else {
    // Create new journal
    return await supabase
      .from('daily_journals')
      .insert({
        user_id: userId,
        journal_date: date.toISOString().split('T')[0],
        auto_summary: autoSummary,
        user_entries: [],
        tags: [],
        photo_urls: []
      })
      .select()
      .single();
  }
}

function summarizeMeals(meals: Meal[]) {
  const breakdown = ['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
    const typeMeals = meals.filter(m => m.meal_type === mealType);
    return {
      mealType,
      calories: typeMeals.reduce((sum, m) => sum + m.calories, 0),
      items: typeMeals.map(m => m.food_name)
    };
  });

  return {
    count: meals.length,
    breakdown: breakdown.filter(b => b.items.length > 0)
  };
}

function summarizeWorkouts(workouts: any[]) {
  const totalDuration = workouts.reduce((sum, w) => sum + (w.duration_minutes || 0), 0);
  const exercises = workouts.flatMap(w =>
    w.workout_exercises.map(we => ({
      name: we.exercises.name,
      sets: we.sets,
      reps: we.reps
    }))
  );

  return {
    count: workouts.length,
    totalDuration,
    exercises
  };
}

function identifyAchievements(meals: Meal[], workouts: any[], checkins: any[]) {
  const achievements = [];

  // Check various achievements
  if (workouts.length >= 2) achievements.push('Multiple workouts in one day! 💪');
  if (meals.length >= 4) achievements.push('Logged all meals today! 🍽️');
  if (checkins.length >= 3) achievements.push('Consistent mood tracking! 📊');

  const avgMood = checkins
    .filter(c => c.mood)
    .reduce((sum, c) => sum + moodToScore(c.mood), 0) / checkins.length;

  if (avgMood >= 4) achievements.push('Great mood all day! 😊');

  return achievements;
}
```

---

## Mood & Energy Check-ins

### Check-in UI Components

**Quick Check-in Modal:**
```typescript
interface CheckinPrompt {
  type: 'morning' | 'midday' | 'pre_meal' | 'post_meal' | 'pre_workout' | 'post_workout' | 'evening';
  prompt: string;
  showMood: boolean;
  showEnergy: boolean;
  showThumbs: boolean;
  relatedItemId?: string;
}

const CHECKIN_PROMPTS = {
  morning: {
    prompt: "Good morning! How are you feeling today?",
    showMood: true,
    showEnergy: true,
    showThumbs: false
  },
  pre_meal: {
    prompt: "How are you feeling before this meal?",
    showMood: false,
    showEnergy: true,
    showThumbs: false
  },
  post_meal: {
    prompt: "How do you feel after eating?",
    showMood: true,
    showEnergy: true,
    showThumbs: true
  },
  pre_workout: {
    prompt: "Ready to workout? How's your energy?",
    showMood: false,
    showEnergy: true,
    showThumbs: false
  },
  post_workout: {
    prompt: "Great job! How do you feel after your workout?",
    showMood: true,
    showEnergy: true,
    showThumbs: true
  },
  midday: {
    prompt: "Midday check-in: How's your day going?",
    showMood: true,
    showEnergy: true,
    showThumbs: false
  },
  evening: {
    prompt: "End of day: How are you feeling?",
    showMood: true,
    showEnergy: true,
    showThumbs: false
  }
};
```

**Check-in Component:**
```tsx
function MoodCheckinModal({ type, relatedItemId, onSubmit, onSkip }: CheckinModalProps) {
  const [mood, setMood] = useState<string | null>(null);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [thumbs, setThumbs] = useState<'up' | 'down' | null>(null);
  const [quickNote, setQuickNote] = useState('');

  const prompt = CHECKIN_PROMPTS[type];

  return (
    <Modal>
      <Text>{prompt.prompt}</Text>

      {prompt.showMood && (
        <View style={styles.moodSelector}>
          <TouchableOpacity onPress={() => setMood('great')}>
            <Text style={styles.emoji}>😊</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMood('good')}>
            <Text style={styles.emoji}>🙂</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMood('neutral')}>
            <Text style={styles.emoji}>😐</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMood('bad')}>
            <Text style={styles.emoji}>😔</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMood('tired')}>
            <Text style={styles.emoji}>😴</Text>
          </TouchableOpacity>
        </View>
      )}

      {prompt.showEnergy && (
        <View style={styles.energySelector}>
          <TouchableOpacity onPress={() => setEnergyLevel(1)}>
            <Text>⚡ Low</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEnergyLevel(2)}>
            <Text>⚡⚡ Medium</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEnergyLevel(3)}>
            <Text>⚡⚡⚡ High</Text>
          </TouchableOpacity>
        </View>
      )}

      {prompt.showThumbs && (
        <View style={styles.thumbsSelector}>
          <TouchableOpacity onPress={() => setThumbs('up')}>
            <Text style={styles.thumb}>👍</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setThumbs('down')}>
            <Text style={styles.thumb}>👎</Text>
          </TouchableOpacity>
        </View>
      )}

      <TextInput
        placeholder="Quick note (optional)"
        value={quickNote}
        onChangeText={setQuickNote}
        maxLength={100}
      />

      <View style={styles.buttons}>
        <Button title="Skip" onPress={onSkip} color="gray" />
        <Button
          title="Submit"
          onPress={() => onSubmit({ mood, energyLevel, thumbs, quickNote, relatedItemId })}
          disabled={!mood && !energyLevel && !thumbs}
        />
      </View>
    </Modal>
  );
}
```

### Check-in Trigger Logic

**When to Show Check-ins:**
```typescript
async function shouldShowCheckin(
  userId: string,
  type: CheckinType,
  context?: { mealId?: string; workoutId?: string }
): Promise<boolean> {
  const user = await getUserPreferences(userId);

  // Check if user has disabled check-ins
  if (!user.notification_settings?.enableMoodCheckins) {
    return false;
  }

  // Check if already checked in for this context today
  const today = new Date().toISOString().split('T')[0];
  const { data: existingCheckin } = await supabase
    .from('mood_checkins')
    .select('id')
    .eq('user_id', userId)
    .eq('checkin_type', type)
    .gte('checkin_time', today)
    .limit(1)
    .single();

  if (existingCheckin) {
    return false; // Already checked in for this type today
  }

  // For meal/workout related check-ins, only show if related to specific item
  if (type === 'post_meal' && !context?.mealId) return false;
  if (type === 'post_workout' && !context?.workoutId) return false;

  return true;
}

// Trigger check-in after logging meal
async function handleMealLogged(mealId: string, userId: string) {
  // Wait 20 minutes, then prompt post-meal check-in
  setTimeout(async () => {
    const shouldShow = await shouldShowCheckin(userId, 'post_meal', { mealId });
    if (shouldShow) {
      showCheckinNotification(userId, 'post_meal', mealId);
    }
  }, 20 * 60 * 1000); // 20 minutes
}

// Trigger check-in after workout
async function handleWorkoutCompleted(workoutId: string, userId: string) {
  const shouldShow = await shouldShowCheckin(userId, 'post_workout', { workoutId });
  if (shouldShow) {
    // Show immediately after workout
    showCheckinModal('post_workout', workoutId);
  }
}
```

### Mood & Energy Analytics

**Correlation Analysis:**
```typescript
async function analyzeMoodPatterns(userId: string, days: number = 30): Promise<MoodInsights> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [checkins, meals, workouts] = await Promise.all([
    supabase.from('mood_checkins').select('*').eq('user_id', userId).gte('checkin_time', startDate.toISOString()),
    supabase.from('meals').select('*').eq('user_id', userId).gte('meal_date', startDate.toISOString()),
    supabase.from('workouts').select('*').eq('user_id', userId).gte('workout_date', startDate.toISOString())
  ]);

  const insights = [];

  // Analyze workout impact on mood
  const postWorkoutMoods = checkins.data.filter(c => c.checkin_type === 'post_workout' && c.mood);
  const avgPostWorkoutMood = calculateAvgMood(postWorkoutMoods);
  const allMoodAvg = calculateAvgMood(checkins.data);

  if (avgPostWorkoutMood > allMoodAvg + 0.5) {
    insights.push({
      type: 'workout_mood',
      message: `Your mood tends to be ${Math.round((avgPostWorkoutMood - allMoodAvg) * 20)}% better after workouts! 💪`,
      confidence: 'high'
    });
  }

  // Analyze meal impact on energy
  const postMealCheckins = checkins.data.filter(c => c.checkin_type === 'post_meal' && c.energy_level);
  const mealsWithEnergy = postMealCheckins.map(c => {
    const meal = meals.data.find(m => m.id === c.related_meal_id);
    return { energy: c.energy_level, protein: meal?.protein, carbs: meal?.carbs };
  });

  const highProteinMeals = mealsWithEnergy.filter(m => (m.protein || 0) > 30);
  const avgEnergyHighProtein = highProteinMeals.reduce((sum, m) => sum + m.energy, 0) / highProteinMeals.length;
  const avgEnergyOverall = postMealCheckins.reduce((sum, c) => sum + (c.energy_level || 0), 0) / postMealCheckins.length;

  if (avgEnergyHighProtein > avgEnergyOverall + 0.3) {
    insights.push({
      type: 'protein_energy',
      message: `You have higher energy after meals with 30g+ protein. Consider increasing protein intake! 🥩`,
      confidence: 'medium'
    });
  }

  // Analyze time of day patterns
  const morningMoods = checkins.data.filter(c => c.checkin_type === 'morning');
  const morningWorkouts = workouts.data.filter(w => new Date(w.workout_date).getHours() < 10);

  if (morningWorkouts.length >= 5 && morningMoods.length >= 10) {
    const daysWithMorningWorkout = new Set(morningWorkouts.map(w => new Date(w.workout_date).toDateString()));
    const morningMoodsOnWorkoutDays = morningMoods.filter(m =>
      daysWithMorningWorkout.has(new Date(m.checkin_time).toDateString())
    );

    const avgMoodWithMorningWorkout = calculateAvgMood(morningMoodsOnWorkoutDays);
    const avgMoodWithoutMorningWorkout = calculateAvgMood(
      morningMoods.filter(m => !daysWithMorningWorkout.has(new Date(m.checkin_time).toDateString()))
    );

    if (avgMoodWithMorningWorkout > avgMoodWithoutMorningWorkout + 0.5) {
      insights.push({
        type: 'morning_workout',
        message: `You feel better on days with morning workouts. Try to schedule workouts before ${morningWorkouts[0] ? new Date(morningWorkouts[0].workout_date).getHours() : 9}AM! 🌅`,
        confidence: 'high'
      });
    }
  }

  return {
    insights,
    avgMood: allMoodAvg,
    avgEnergy: avgEnergyOverall,
    bestTimeOfDay: findBestTimeOfDay(checkins.data),
    worstTimeOfDay: findWorstTimeOfDay(checkins.data)
  };
}

function calculateAvgMood(checkins: any[]): number {
  const moodScores = { great: 5, good: 4, neutral: 3, bad: 2, tired: 2 };
  const validMoods = checkins.filter(c => c.mood);
  if (validMoods.length === 0) return 3;

  return validMoods.reduce((sum, c) => sum + moodScores[c.mood], 0) / validMoods.length;
}
```

---

## Quick Re-log System

### Re-log Workflow

**Meal Re-logging:**
```typescript
interface RelogMealOptions {
  originalMealId: string;
  adjustments?: {
    servingMultiplier?: number; // e.g., 1.5 for 1.5x serving
    mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    notes?: string;
  };
  saveAsTemplate?: boolean;
  templateName?: string;
}

async function relogMeal(userId: string, options: RelogMealOptions): Promise<Meal> {
  // Fetch original meal
  const { data: originalMeal } = await supabase
    .from('meals')
    .select('*')
    .eq('id', options.originalMealId)
    .single();

  if (!originalMeal) throw new Error('Original meal not found');

  // Calculate adjusted values
  const multiplier = options.adjustments?.servingMultiplier || 1;
  const newMeal = {
    user_id: userId,
    meal_date: new Date().toISOString(),
    meal_type: options.adjustments?.mealType || originalMeal.meal_type,
    food_name: originalMeal.food_name,
    calories: Math.round(originalMeal.calories * multiplier),
    protein: originalMeal.protein ? originalMeal.protein * multiplier : null,
    carbs: originalMeal.carbs ? originalMeal.carbs * multiplier : null,
    fat: originalMeal.fat ? originalMeal.fat * multiplier : null,
    sugar: originalMeal.sugar ? originalMeal.sugar * multiplier : null,
    serving_size: options.adjustments?.servingMultiplier
      ? `${multiplier}x ${originalMeal.serving_size}`
      : originalMeal.serving_size,
    notes: options.adjustments?.notes || `Repeat of meal from ${new Date(originalMeal.meal_date).toLocaleDateString()}`,
    recipe_id: originalMeal.recipe_id
  };

  // Insert new meal
  const { data: createdMeal } = await supabase
    .from('meals')
    .insert(newMeal)
    .select()
    .single();

  // Track usage
  await supabase.from('usage_history').insert({
    user_id: userId,
    item_type: 'meal',
    original_item_id: options.originalMealId,
    new_item_id: createdMeal.id,
    modifications: options.adjustments || {},
    used_at: new Date().toISOString()
  });

  // Save as template if requested
  if (options.saveAsTemplate) {
    await createMealTemplate(userId, createdMeal, options.templateName);
  }

  // Update widget
  await updateWidget();

  return createdMeal;
}

async function createMealTemplate(userId: string, meal: Meal, name?: string): Promise<MealTemplate> {
  const { data: template } = await supabase
    .from('meal_templates')
    .insert({
      user_id: userId,
      name: name || meal.food_name,
      is_favorite: false,
      template_data: {
        food_name: meal.food_name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        sugar: meal.sugar,
        serving_size: meal.serving_size
      },
      source_meal_id: meal.id,
      typical_meal_type: meal.meal_type,
      times_used: 0
    })
    .select()
    .single();

  return template;
}
```

**Workout Re-logging:**
```typescript
interface RelogWorkoutOptions {
  originalWorkoutId: string;
  adjustments?: {
    progressiveOverload?: boolean;
    weightAdjustment?: number; // +5 lbs, -10 lbs, etc.
    repAdjustment?: number;
    notes?: string;
  };
  saveAsTemplate?: boolean;
  templateName?: string;
}

async function relogWorkout(userId: string, options: RelogWorkoutOptions): Promise<Workout> {
  // Fetch original workout with exercises
  const { data: originalWorkout } = await supabase
    .from('workouts')
    .select('*, workout_exercises(*, exercises(*))')
    .eq('id', options.originalWorkoutId)
    .single();

  if (!originalWorkout) throw new Error('Original workout not found');

  // Create new workout
  const { data: newWorkout } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      workout_date: new Date().toISOString(),
      name: originalWorkout.name,
      notes: options.adjustments?.notes || `Repeat of workout from ${new Date(originalWorkout.workout_date).toLocaleDateString()}`,
      duration_minutes: originalWorkout.duration_minutes,
      estimated_calories_burned: originalWorkout.estimated_calories_burned
    })
    .select()
    .single();

  // Copy exercises with adjustments
  for (const oldExercise of originalWorkout.workout_exercises) {
    let newWeight = oldExercise.weight;
    let newReps = oldExercise.reps;

    if (options.adjustments?.progressiveOverload) {
      // AI-suggested progressive overload
      const suggestion = suggestProgressiveOverload(oldExercise);
      newWeight = suggestion.weight;
      newReps = suggestion.reps;
    } else {
      // Manual adjustments
      if (options.adjustments?.weightAdjustment && oldExercise.weight) {
        newWeight = oldExercise.weight + options.adjustments.weightAdjustment;
      }
      if (options.adjustments?.repAdjustment) {
        newReps = oldExercise.reps + options.adjustments.repAdjustment;
      }
    }

    await supabase.from('workout_exercises').insert({
      workout_id: newWorkout.id,
      exercise_id: oldExercise.exercise_id,
      order_index: oldExercise.order_index,
      sets: oldExercise.sets,
      reps: newReps,
      weight: newWeight,
      notes: oldExercise.notes
    });
  }

  // Track usage
  await supabase.from('usage_history').insert({
    user_id: userId,
    item_type: 'workout',
    original_item_id: options.originalWorkoutId,
    new_item_id: newWorkout.id,
    modifications: options.adjustments || {},
    used_at: new Date().toISOString()
  });

  // Save as template if requested
  if (options.saveAsTemplate) {
    await createWorkoutTemplate(userId, newWorkout, options.templateName);
  }

  // Update widget
  await updateWidget();

  return newWorkout;
}

function suggestProgressiveOverload(exercise: WorkoutExercise): { weight: number; reps: number } {
  // Simple progressive overload logic
  // If weight exercise: increase weight by 2.5-5 lbs
  // If bodyweight: increase reps by 1-2

  if (exercise.weight) {
    // Weight-based exercise
    return {
      weight: exercise.weight + 5,
      reps: exercise.reps
    };
  } else {
    // Bodyweight exercise
    return {
      weight: null,
      reps: exercise.reps + 2
    };
  }
}
```

### Smart Suggestions UI

**Recent Items Component:**
```tsx
function QuickRelogSuggestions({ type }: { type: 'meal' | 'workout' }) {
  const [recentItems, setRecentItems] = useState([]);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    loadRecentItems();
    loadFavorites();
  }, [type]);

  return (
    <View>
      {favorites.length > 0 && (
        <Section title="Favorites">
          {favorites.map(item => (
            <QuickRelogCard
              key={item.id}
              item={item}
              onReLog={() => handleRelog(item.id)}
              isFavorite={true}
            />
          ))}
        </Section>
      )}

      <Section title="Recent">
        {recentItems.map(item => (
          <QuickRelogCard
            key={item.id}
            item={item}
            onReLog={() => handleRelog(item.id)}
            lastUsed={item.created_at}
          />
        ))}
      </Section>

      <Section title="Frequently Used">
        <FrequentItems type={type} onSelect={handleRelog} />
      </Section>
    </View>
  );
}

function QuickRelogCard({ item, onReLog, isFavorite, lastUsed }: QuickRelogCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onReLog}>
      <View style={styles.cardContent}>
        <Text style={styles.title}>{item.name || item.food_name}</Text>
        {item.calories && <Text style={styles.subtitle}>{item.calories} cal</Text>}
        {lastUsed && (
          <Text style={styles.lastUsed}>
            Last used: {formatRelativeTime(lastUsed)}
          </Text>
        )}
      </View>
      <View style={styles.actions}>
        {isFavorite && <Text>⭐</Text>}
        <Button title="Log Again" onPress={onReLog} />
      </View>
    </TouchableOpacity>
  );
}
```

### Batch Re-logging

**Copy Entire Day:**
```typescript
async function copyDayMeals(userId: string, sourceDate: Date, targetDate: Date): Promise<Meal[]> {
  const startOfDay = new Date(sourceDate.setHours(0, 0, 0, 0));
  const endOfDay = new Date(sourceDate.setHours(23, 59, 59, 999));

  // Get all meals from source date
  const { data: sourceMeals } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .gte('meal_date', startOfDay.toISOString())
    .lte('meal_date', endOfDay.toISOString());

  if (!sourceMeals || sourceMeals.length === 0) {
    throw new Error('No meals found for this date');
  }

  // Create new meals for target date
  const newMeals = sourceMeals.map(meal => ({
    ...meal,
    id: undefined,
    meal_date: new Date(targetDate).toISOString(),
    notes: `Copied from ${sourceDate.toLocaleDateString()}`,
    created_at: undefined,
    updated_at: undefined
  }));

  const { data: createdMeals } = await supabase
    .from('meals')
    .insert(newMeals)
    .select();

  // Track each usage
  for (let i = 0; i < sourceMeals.length; i++) {
    await supabase.from('usage_history').insert({
      user_id: userId,
      item_type: 'meal',
      original_item_id: sourceMeals[i].id,
      new_item_id: createdMeals[i].id,
      modifications: { batch_copy: true, source_date: sourceDate },
      used_at: new Date().toISOString()
    });
  }

  await updateWidget();
  return createdMeals;
}
```

---

## API Endpoints

### Journal Endpoints

```typescript
// GET /api/journal/:date
// Get journal for specific date
interface GetJournalResponse {
  journal: DailyJournal;
  checkins: MoodCheckin[];
}

// POST /api/journal/:date/entry
// Add user entry to journal
interface AddJournalEntryRequest {
  content: string;
  tags: string[];
  isVoiceToText?: boolean;
  photoUrl?: string;
}

// GET /api/journal/insights
// Get AI-powered insights from journal history
interface GetInsightsResponse {
  insights: MoodInsight[];
  patterns: Pattern[];
  suggestions: string[];
}

// POST /api/checkin
// Log mood/energy check-in
interface LogCheckinRequest {
  checkinType: CheckinType;
  mood?: string;
  energyLevel?: number;
  thumbs?: 'up' | 'down';
  quickNote?: string;
  relatedMealId?: string;
  relatedWorkoutId?: string;
}
```

### Re-log Endpoints

```typescript
// POST /api/meals/:id/relog
// Re-log a meal
interface RelogMealRequest {
  adjustments?: {
    servingMultiplier?: number;
    mealType?: string;
    notes?: string;
  };
  saveAsTemplate?: boolean;
  templateName?: string;
}

// POST /api/workouts/:id/relog
// Re-log a workout
interface RelogWorkoutRequest {
  adjustments?: {
    progressiveOverload?: boolean;
    weightAdjustment?: number;
    repAdjustment?: number;
    notes?: string;
  };
  saveAsTemplate?: boolean;
  templateName?: string;
}

// POST /api/meals/batch-copy
// Copy multiple meals from one day to another
interface BatchCopyMealsRequest {
  sourceDate: string;
  targetDate: string;
  mealIds?: string[]; // Optional: specific meals, or all if omitted
}

// GET /api/templates/meals
// Get meal templates
interface GetMealTemplatesResponse {
  favorites: MealTemplate[];
  recent: MealTemplate[];
  frequent: MealTemplate[];
}

// GET /api/templates/workouts
// Get workout templates
interface GetWorkoutTemplatesResponse {
  favorites: WorkoutTemplate[];
  recent: WorkoutTemplate[];
  frequent: WorkoutTemplate[];
}

// POST /api/templates/meals/:id/favorite
// Toggle favorite status
interface ToggleFavoriteResponse {
  isFavorite: boolean;
}
```

---

## UI/UX Patterns

### Journal Calendar View

**Month View with Color-coded Days:**
```
┌─────────────────────────────────┐
│  January 2025          [<] [>]  │
├─────────────────────────────────┤
│ Mon Tue Wed Thu Fri Sat Sun     │
│           1🟢  2🟡  3🟢  4🟢     │
│  5🟢  6🔴  7🟡  8🟢  9🟢 10🟢 11🟡│
│ 12🟢 13🟢 14🟢 15🟡 16🔴 17🟢 18🟢│
│ 19🟢 20🟡 21🟢 22🟢 23🟢 24🔴 25🟢│
│ 26🟢 27🟡 28🟢 29🟢 30🟢 31🟡    │
└─────────────────────────────────┘

Legend:
🟢 Great day (avg mood: great/good)
🟡 Okay day (avg mood: neutral)
🔴 Tough day (avg mood: bad/tired)
⚪ No data
```

**Journal Entry View:**
```
┌─────────────────────────────────┐
│ January 15, 2025                │
├─────────────────────────────────┤
│ 📊 Auto Summary                 │
│                                 │
│ Calories: 1,850 / 2,000         │
│ 🍽️ 4 meals logged               │
│ 💪 1 workout (45 min)           │
│                                 │
│ Achievements:                   │
│ ✓ Hit calorie goal              │
│ ✓ High protein day (150g)       │
│                                 │
│ 😊 Mood Check-ins (5)           │
│ Morning: 😊 ⚡⚡⚡                 │
│ Post-workout: 💪 ⚡⚡⚡           │
│ Post-dinner: 😊 ⚡⚡             │
│                                 │
│ ✍️ Your Notes:                  │
│ "Felt great after morning       │
│  workout. Should do this more!" │
│  #wins #insights                │
│                                 │
│ 🤖 AI Insight:                  │
│ "You've had high energy on      │
│  workout days this week!"       │
│                                 │
│ [Add Entry] [Add Photo]         │
└─────────────────────────────────┘
```

---

## Performance Optimizations

1. **Lazy Load Journals**: Only fetch journals when user views them
2. **Cache Recent Items**: Keep last 10 meals/workouts in local storage
3. **Background Sync**: Sync journal data in background
4. **Optimistic Updates**: Show changes immediately, sync later
5. **Batch Operations**: Combine multiple check-ins into single API call

---

## Privacy & Security

1. **Encrypted Journals**: Optional end-to-end encryption for journal entries
2. **Private by Default**: Journals never shared unless explicitly enabled
3. **Data Export**: Allow users to export all journal data
4. **Selective Sharing**: Share specific entries with coach/trainer
5. **Auto-delete Option**: Option to auto-delete journals after X days

---

## Future Enhancements

1. **Photo Journal**: Upload progress photos to journals
2. **Voice Journaling**: Record voice memos attached to journal
3. **Mood Predictions**: AI predicts mood based on planned activities
4. **Social Journaling**: Share journal entries with friends (opt-in)
5. **Journal Prompts**: Daily reflection prompts powered by AI
6. **Habit Tracking**: Track non-fitness habits (sleep, water, meditation)
7. **Dream Tracking**: Log dreams in evening journal entries
8. **Gratitude Journal**: Dedicated section for gratitude
