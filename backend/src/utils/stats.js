/**
 * Stats Calculation Utilities
 *
 * Helper functions for calculating nutrition and fitness statistics
 */

/**
 * Calculate total calories from an array of meals
 * @param {Array} meals - Array of meal objects with calories property
 * @returns {number} Total calories
 */
export function calculateTotalCalories(meals) {
  if (!meals || !Array.isArray(meals)) return 0;
  return meals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
}

/**
 * Calculate total macros from an array of meals
 * @param {Array} meals - Array of meal objects with macro properties
 * @returns {Object} Object with protein, carbs, fat totals
 */
export function calculateTotalMacros(meals) {
  if (!meals || !Array.isArray(meals)) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  return meals.reduce(
    (totals, meal) => ({
      protein: totals.protein + (meal.protein || 0),
      carbs: totals.carbs + (meal.carbs || 0),
      fat: totals.fat + (meal.fat || 0),
    }),
    { protein: 0, carbs: 0, fat: 0 }
  );
}

/**
 * Calculate total calories burned from workouts
 * @param {Array} workouts - Array of workout objects
 * @returns {number} Total calories burned
 */
export function calculateCaloriesBurned(workouts) {
  if (!workouts || !Array.isArray(workouts)) return 0;
  return workouts.reduce((sum, workout) => sum + (workout.estimated_calories_burned || 0), 0);
}

/**
 * Calculate total workout minutes
 * @param {Array} workouts - Array of workout objects
 * @returns {number} Total minutes
 */
export function calculateTotalWorkoutMinutes(workouts) {
  if (!workouts || !Array.isArray(workouts)) return 0;
  return workouts.reduce((sum, workout) => sum + (workout.duration_minutes || 0), 0);
}

/**
 * Calculate net calories (consumed - burned)
 * @param {number} consumed - Calories consumed
 * @param {number} burned - Calories burned
 * @returns {number} Net calories
 */
export function calculateNetCalories(consumed, burned) {
  return consumed - burned;
}

/**
 * Calculate calories remaining for the day
 * @param {number} goal - Daily calorie goal
 * @param {number} consumed - Calories consumed
 * @param {number} burned - Calories burned
 * @returns {number} Remaining calories
 */
export function calculateCaloriesRemaining(goal, consumed, burned) {
  return goal - (consumed - burned);
}

/**
 * Calculate total water intake in oz
 * @param {Array} waterEntries - Array of water intake entries
 * @returns {number} Total oz
 */
export function calculateTotalWater(waterEntries) {
  if (!waterEntries || !Array.isArray(waterEntries)) return 0;
  return waterEntries.reduce((sum, entry) => sum + (entry.amount_oz || 0), 0);
}

/**
 * Calculate average mood rating
 * @param {Array} moodCheckins - Array of mood check-in objects
 * @returns {number|null} Average mood (1-5) or null if no data
 */
export function calculateAverageMood(moodCheckins) {
  if (!moodCheckins || !Array.isArray(moodCheckins) || moodCheckins.length === 0) {
    return null;
  }
  const sum = moodCheckins.reduce((acc, checkin) => acc + (checkin.mood_rating || 0), 0);
  return Math.round((sum / moodCheckins.length) * 10) / 10;
}

/**
 * Calculate average energy rating
 * @param {Array} moodCheckins - Array of mood check-in objects
 * @returns {number|null} Average energy (1-5) or null if no data
 */
export function calculateAverageEnergy(moodCheckins) {
  if (!moodCheckins || !Array.isArray(moodCheckins) || moodCheckins.length === 0) {
    return null;
  }
  const sum = moodCheckins.reduce((acc, checkin) => acc + (checkin.energy_rating || 0), 0);
  return Math.round((sum / moodCheckins.length) * 10) / 10;
}

/**
 * Generate daily stats summary
 * @param {Object} data - Object containing meals, workouts, water, profile
 * @returns {Object} Stats summary
 */
export function generateDailyStats({ meals, workouts, water, profile, date }) {
  const caloriesConsumed = calculateTotalCalories(meals);
  const caloriesBurned = calculateCaloriesBurned(workouts);
  const calorieGoal = profile?.macro_targets?.calories || 2000;
  const netCalories = calculateNetCalories(caloriesConsumed, caloriesBurned);
  const caloriesRemaining = calculateCaloriesRemaining(calorieGoal, caloriesConsumed, caloriesBurned);
  const macros = calculateTotalMacros(meals);

  return {
    date,
    consumed: caloriesConsumed,
    burned: caloriesBurned,
    net: netCalories,
    goal: calorieGoal,
    remaining: caloriesRemaining,
    protein: Math.round(macros.protein),
    carbs: Math.round(macros.carbs),
    fat: Math.round(macros.fat),
    mealsLogged: meals?.length || 0,
    workoutsLogged: workouts?.length || 0,
    waterOz: calculateTotalWater(water),
  };
}

/**
 * Calculate macro percentages
 * @param {Object} macros - Object with protein, carbs, fat in grams
 * @returns {Object} Percentages of each macro
 */
export function calculateMacroPercentages(macros) {
  const { protein, carbs, fat } = macros;
  const proteinCals = protein * 4;
  const carbsCals = carbs * 4;
  const fatCals = fat * 9;
  const totalCals = proteinCals + carbsCals + fatCals;

  if (totalCals === 0) {
    return { protein: 0, carbs: 0, fat: 0 };
  }

  return {
    protein: Math.round((proteinCals / totalCals) * 100),
    carbs: Math.round((carbsCals / totalCals) * 100),
    fat: Math.round((fatCals / totalCals) * 100),
  };
}
