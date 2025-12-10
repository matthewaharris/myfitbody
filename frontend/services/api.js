import axios from 'axios';

// Update this URL to your backend URL
// For local development on Android emulator: http://10.0.2.2:3000
// For iOS simulator: http://localhost:3000
// For physical device: http://YOUR_COMPUTER_IP:3000
// For production: https://myfitbody-api.onrender.com/api
const API_URL = 'https://myfitbody-api.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add Clerk user info to requests
// The backend expects x-clerk-user-id and x-user-email headers
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Set user info headers for backend auth middleware
export const setUserInfo = (clerkUserId, email) => {
  if (clerkUserId) {
    api.defaults.headers.common['x-clerk-user-id'] = clerkUserId;
    api.defaults.headers.common['x-user-email'] = email || '';
  } else {
    delete api.defaults.headers.common['x-clerk-user-id'];
    delete api.defaults.headers.common['x-user-email'];
  }
};

// User endpoints
export const createUser = async (clerkUserId, email, firstName = null, lastName = null, phoneNumber = null) => {
  const response = await api.post('/users', {
    clerk_user_id: clerkUserId,
    email,
    first_name: firstName,
    last_name: lastName,
    phone_number: phoneNumber,
  });
  return response.data;
};

export const getUserByClerkId = async (clerkUserId) => {
  const response = await api.get(`/users/clerk/${clerkUserId}`);
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.patch(`/users/${userId}`, {
    first_name: userData.firstName,
    last_name: userData.lastName,
    phone_number: userData.phoneNumber,
  });
  return response.data;
};

export const updatePushToken = async (userId, pushToken) => {
  const response = await api.patch(`/users/${userId}/push-token`, {
    push_token: pushToken,
  });
  return response.data;
};

// User Profile endpoints
export const createUserProfile = async (userId, profileData) => {
  const response = await api.post('/user-profiles', {
    user_id: userId,
    weight_goal: profileData.weightGoal,
    starting_weight: profileData.startingWeight,
    weight_unit: profileData.weightUnit || 'lb',
    dietary_restrictions: profileData.dietaryRestrictions || [],
    food_preferences: profileData.foodPreferences || {},
    macro_targets: profileData.macroTargets || {
      protein: 150,
      carbs: 200,
      fat: 60,
      calories: 2000,
    },
    notification_settings: profileData.notificationSettings || {
      enableMoodCheckins: true,
      enableCaloriePrompts: true,
      quietHoursStart: 22,
      quietHoursEnd: 7,
    },
  });
  return response.data;
};

export const getUserProfile = async (userId) => {
  const response = await api.get(`/user-profiles/${userId}`);
  return response.data;
};

export const getMyProfile = async () => {
  const response = await api.get('/profile');
  return response.data;
};

export const updateUserProfile = async (userId, profileData) => {
  const response = await api.put(`/user-profiles/${userId}`, profileData);
  return response.data;
};

export const updateMyProfile = async (profileData) => {
  const response = await api.put('/profile', profileData);
  return response.data;
};

// Daily stats
export const getDailyStats = async (date) => {
  // Always pass the client's local date to avoid timezone issues
  const today = new Date();
  const localDate = date || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const tzOffset = today.getTimezoneOffset(); // Minutes offset from UTC

  const response = await api.get('/stats/daily', {
    params: { date: localDate, tzOffset }
  });
  return response.data;
};

// Exercises
export const getExercises = async () => {
  const response = await api.get('/exercises');
  return response.data;
};

export const createExercise = async (exerciseData) => {
  const response = await api.post('/exercises', exerciseData);
  return response.data;
};

// Workouts
export const getWorkouts = async (limit = 20, offset = 0) => {
  const response = await api.get('/workouts', { params: { limit, offset } });
  return response.data;
};

export const getWorkoutById = async (workoutId) => {
  const response = await api.get(`/workouts/${workoutId}`);
  return response.data;
};

export const createWorkout = async (workoutData) => {
  const response = await api.post('/workouts', workoutData);
  return response.data;
};

export const updateWorkout = async (workoutId, workoutData) => {
  const response = await api.put(`/workouts/${workoutId}`, workoutData);
  return response.data;
};

// AI Calorie Estimation
export const estimateCalories = async (workoutData) => {
  const response = await api.post('/workouts/estimate-calories', workoutData);
  return response.data;
};

// Workout Templates
export const getWorkoutTemplates = async () => {
  const response = await api.get('/workouts/templates');
  return response.data;
};

export const saveWorkoutAsTemplate = async (workoutId, templateName) => {
  const response = await api.post(`/workouts/${workoutId}/save-as-template`, { template_name: templateName });
  return response.data;
};

export const deleteWorkoutTemplate = async (workoutId) => {
  const response = await api.delete(`/workouts/templates/${workoutId}`);
  return response.data;
};

// Workout Favorites
export const getFavoriteWorkouts = async () => {
  const response = await api.get('/workouts/favorites');
  return response.data;
};

export const toggleWorkoutFavorite = async (workoutId) => {
  const response = await api.post(`/workouts/${workoutId}/favorite`);
  return response.data;
};

// Food Search
export const searchFoods = async (query) => {
  const response = await api.get('/foods/search', { params: { query } });
  return response.data;
};

export const getFoodDetails = async (foodId) => {
  const response = await api.get(`/foods/${foodId}`);
  return response.data;
};

// Meals
export const getMeals = async (date = null) => {
  const params = date ? { date } : {};
  const response = await api.get('/meals', { params });
  return response.data;
};

export const createMeal = async (mealData) => {
  const response = await api.post('/meals', mealData);
  return response.data;
};

// Meal Favorites
export const getFavoriteMeals = async () => {
  const response = await api.get('/meals/favorites');
  return response.data;
};

export const toggleMealFavorite = async (mealId) => {
  const response = await api.post(`/meals/${mealId}/favorite`);
  return response.data;
};

export const relogMeal = async (mealId, mealType = null) => {
  const response = await api.post(`/meals/${mealId}/relog`, { meal_type: mealType });
  return response.data;
};

// Exercise History
export const getExerciseHistory = async (exerciseId) => {
  const response = await api.get(`/exercises/${exerciseId}/history`);
  return response.data;
};

export const getExerciseHistoryBatch = async (exerciseIds) => {
  const response = await api.post('/exercises/history/batch', { exercise_ids: exerciseIds });
  return response.data;
};

// Body Measurements / Progress Tracking
export const getMeasurements = async (limit = 30) => {
  const response = await api.get('/measurements', { params: { limit } });
  return response.data;
};

export const getLatestMeasurement = async () => {
  const response = await api.get('/measurements/latest');
  return response.data;
};

export const saveMeasurement = async (measurementData) => {
  const response = await api.post('/measurements', measurementData);
  return response.data;
};

export const updateMeasurementPhoto = async (measurementId, photoUrl) => {
  const response = await api.patch(`/measurements/${measurementId}/photo`, { photo_url: photoUrl });
  return response.data;
};

export const deleteMeasurement = async (measurementId) => {
  const response = await api.delete(`/measurements/${measurementId}`);
  return response.data;
};

export const getPhotoUploadUrl = async (fileName, contentType) => {
  const response = await api.post('/measurements/upload-url', { file_name: fileName, content_type: contentType });
  return response.data;
};

// Water Intake Tracking
export const getWaterIntake = async (date = null) => {
  const params = date ? { date } : {};
  const response = await api.get('/water', { params });
  return response.data;
};

export const logWater = async (amountOz) => {
  const response = await api.post('/water', { amount_oz: amountOz });
  return response.data;
};

export const deleteWaterEntry = async (entryId) => {
  const response = await api.delete(`/water/${entryId}`);
  return response.data;
};

export const updateWaterGoal = async (goalOz) => {
  const response = await api.patch('/water/goal', { goal_oz: goalOz });
  return response.data;
};

// Streak Tracking
export const getStreaks = async () => {
  const response = await api.get('/streaks');
  return response.data;
};

// Recipe Management
export const getRecipes = async () => {
  const response = await api.get('/recipes');
  return response.data;
};

export const getFavoriteRecipes = async () => {
  const response = await api.get('/recipes/favorites');
  return response.data;
};

export const getRecipeById = async (recipeId) => {
  const response = await api.get(`/recipes/${recipeId}`);
  return response.data;
};

export const createRecipe = async (recipeData) => {
  const response = await api.post('/recipes', recipeData);
  return response.data;
};

export const toggleRecipeFavorite = async (recipeId) => {
  const response = await api.post(`/recipes/${recipeId}/favorite`);
  return response.data;
};

export const deleteRecipe = async (recipeId) => {
  const response = await api.delete(`/recipes/${recipeId}`);
  return response.data;
};

export const logRecipe = async (recipeId, mealType, servingsEaten = 1) => {
  const response = await api.post(`/recipes/${recipeId}/log`, {
    meal_type: mealType,
    servings_eaten: servingsEaten
  });
  return response.data;
};

// Stats Summary
export const getWeeklyStats = async (weeks = 8) => {
  const response = await api.get('/stats/weekly', { params: { weeks } });
  return response.data;
};

export const getDailyStatsDetails = async (date) => {
  const response = await api.get(`/stats/daily/${date}`);
  return response.data;
};

// Barcode Lookup
export const lookupBarcode = async (barcode) => {
  const response = await api.get(`/foods/barcode/${barcode}`);
  return response.data;
};

// =============================================
// AI-POWERED FEATURES
// =============================================

// Generate AI Workout
export const generateAIWorkout = async (options = {}) => {
  const response = await api.post('/ai/generate-workout', {
    duration: options.duration || 45,
    focus: options.focus || 'full body',
    equipment: options.equipment || 'full_gym',
    difficulty: options.difficulty || 'intermediate',
  });
  return response.data;
};

// Generate AI Recipe
export const generateAIRecipe = async (options = {}) => {
  const response = await api.post('/ai/generate-recipe', {
    mealType: options.mealType || 'dinner',
    cuisine: options.cuisine,
    maxCalories: options.maxCalories,
    maxPrepTime: options.maxPrepTime,
    servings: options.servings || 2,
  });
  return response.data;
};

// Get Smart Suggestions
export const getSmartSuggestions = async () => {
  const response = await api.get('/ai/suggestions');
  return response.data;
};

// Get Calorie Burn Suggestions
export const getCalorieBurnSuggestions = async (caloriesOver) => {
  const response = await api.post('/ai/calorie-burn-suggestion', {
    calories_over: caloriesOver,
  });
  return response.data;
};

// =============================================
// ACCOUNT MANAGEMENT
// =============================================

// Delete user account and all associated data
export const deleteMyAccount = async () => {
  const response = await api.delete('/account');
  return response.data;
};

// =============================================
// ENGAGEMENT FEATURES - MOOD CHECK-INS
// =============================================

export const createMoodCheckin = async (moodData) => {
  const response = await api.post('/mood-checkins', moodData);
  return response.data;
};

export const getMoodCheckins = async (params = {}) => {
  const response = await api.get('/mood-checkins', { params });
  return response.data;
};

export const getMoodTrends = async (days = 30) => {
  const response = await api.get('/mood-checkins/trends', { params: { days } });
  return response.data;
};

// =============================================
// ENGAGEMENT FEATURES - BADGES
// =============================================

export const getBadgeDefinitions = async () => {
  const response = await api.get('/badges/definitions');
  return response.data;
};

export const getEarnedBadges = async () => {
  const response = await api.get('/badges/earned');
  return response.data;
};

export const getBadgeProgress = async () => {
  const response = await api.get('/badges/progress');
  return response.data;
};

export const checkForNewBadges = async () => {
  const response = await api.post('/badges/check');
  return response.data;
};

// =============================================
// ENGAGEMENT FEATURES - JOURNAL
// =============================================

export const saveJournalEntry = async (entryData) => {
  const response = await api.post('/journal', entryData);
  return response.data;
};

export const getJournalEntries = async (params = {}) => {
  const response = await api.get('/journal', { params });
  return response.data;
};

export const getJournalEntry = async (date) => {
  const response = await api.get(`/journal/${date}`);
  return response.data;
};

export const toggleJournalFavorite = async (date) => {
  const response = await api.patch(`/journal/${date}/favorite`);
  return response.data;
};

// =============================================
// ENGAGEMENT FEATURES - REMINDERS & STATS
// =============================================

export const getReminderSettings = async () => {
  const response = await api.get('/reminders/settings');
  return response.data;
};

export const updateReminderSettings = async (settings) => {
  const response = await api.put('/reminders/settings', { reminder_settings: settings });
  return response.data;
};

export const getUserStats = async () => {
  const response = await api.get('/stats/user');
  return response.data;
};

export default api;
