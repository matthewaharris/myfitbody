/**
 * Unit Tests for Stats Calculation Utilities
 */

import {
  calculateTotalCalories,
  calculateTotalMacros,
  calculateCaloriesBurned,
  calculateTotalWorkoutMinutes,
  calculateNetCalories,
  calculateCaloriesRemaining,
  calculateTotalWater,
  calculateAverageMood,
  calculateAverageEnergy,
  generateDailyStats,
  calculateMacroPercentages,
} from '../../src/utils/stats.js';

describe('calculateTotalCalories', () => {
  test('sums calories from meals array', () => {
    const meals = [
      { calories: 300 },
      { calories: 500 },
      { calories: 200 },
    ];
    expect(calculateTotalCalories(meals)).toBe(1000);
  });

  test('returns 0 for empty array', () => {
    expect(calculateTotalCalories([])).toBe(0);
  });

  test('returns 0 for null/undefined', () => {
    expect(calculateTotalCalories(null)).toBe(0);
    expect(calculateTotalCalories(undefined)).toBe(0);
  });

  test('handles missing calorie values', () => {
    const meals = [
      { calories: 300 },
      { name: 'No calories' },
      { calories: null },
    ];
    expect(calculateTotalCalories(meals)).toBe(300);
  });
});

describe('calculateTotalMacros', () => {
  test('sums protein, carbs, and fat', () => {
    const meals = [
      { protein: 20, carbs: 30, fat: 10 },
      { protein: 30, carbs: 40, fat: 15 },
    ];
    expect(calculateTotalMacros(meals)).toEqual({
      protein: 50,
      carbs: 70,
      fat: 25,
    });
  });

  test('returns zeros for empty array', () => {
    expect(calculateTotalMacros([])).toEqual({
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });

  test('handles missing macro values', () => {
    const meals = [
      { protein: 20 },
      { carbs: 30 },
      { fat: 10 },
    ];
    expect(calculateTotalMacros(meals)).toEqual({
      protein: 20,
      carbs: 30,
      fat: 10,
    });
  });
});

describe('calculateCaloriesBurned', () => {
  test('sums estimated calories burned', () => {
    const workouts = [
      { estimated_calories_burned: 300 },
      { estimated_calories_burned: 200 },
    ];
    expect(calculateCaloriesBurned(workouts)).toBe(500);
  });

  test('returns 0 for empty array', () => {
    expect(calculateCaloriesBurned([])).toBe(0);
  });

  test('handles null/undefined', () => {
    expect(calculateCaloriesBurned(null)).toBe(0);
    expect(calculateCaloriesBurned(undefined)).toBe(0);
  });
});

describe('calculateTotalWorkoutMinutes', () => {
  test('sums workout duration', () => {
    const workouts = [
      { duration_minutes: 30 },
      { duration_minutes: 45 },
    ];
    expect(calculateTotalWorkoutMinutes(workouts)).toBe(75);
  });

  test('returns 0 for empty array', () => {
    expect(calculateTotalWorkoutMinutes([])).toBe(0);
  });
});

describe('calculateNetCalories', () => {
  test('subtracts burned from consumed', () => {
    expect(calculateNetCalories(2000, 300)).toBe(1700);
  });

  test('handles negative net', () => {
    expect(calculateNetCalories(500, 800)).toBe(-300);
  });

  test('handles zero burned', () => {
    expect(calculateNetCalories(2000, 0)).toBe(2000);
  });
});

describe('calculateCaloriesRemaining', () => {
  test('calculates remaining calories', () => {
    expect(calculateCaloriesRemaining(2000, 1500, 300)).toBe(800);
  });

  test('returns negative when over goal', () => {
    expect(calculateCaloriesRemaining(2000, 2500, 200)).toBe(-300);
  });

  test('adds burned calories to remaining', () => {
    // Goal: 2000, Consumed: 1800, Burned: 400
    // Net: 1800 - 400 = 1400, Remaining: 2000 - 1400 = 600
    expect(calculateCaloriesRemaining(2000, 1800, 400)).toBe(600);
  });
});

describe('calculateTotalWater', () => {
  test('sums water intake', () => {
    const entries = [
      { amount_oz: 8 },
      { amount_oz: 16 },
      { amount_oz: 8 },
    ];
    expect(calculateTotalWater(entries)).toBe(32);
  });

  test('returns 0 for empty array', () => {
    expect(calculateTotalWater([])).toBe(0);
  });
});

describe('calculateAverageMood', () => {
  test('calculates average mood rating', () => {
    const checkins = [
      { mood_rating: 4 },
      { mood_rating: 3 },
      { mood_rating: 5 },
    ];
    expect(calculateAverageMood(checkins)).toBe(4);
  });

  test('rounds to one decimal place', () => {
    const checkins = [
      { mood_rating: 4 },
      { mood_rating: 3 },
    ];
    expect(calculateAverageMood(checkins)).toBe(3.5);
  });

  test('returns null for empty array', () => {
    expect(calculateAverageMood([])).toBeNull();
  });

  test('returns null for null/undefined', () => {
    expect(calculateAverageMood(null)).toBeNull();
    expect(calculateAverageMood(undefined)).toBeNull();
  });
});

describe('calculateAverageEnergy', () => {
  test('calculates average energy rating', () => {
    const checkins = [
      { energy_rating: 5 },
      { energy_rating: 3 },
    ];
    expect(calculateAverageEnergy(checkins)).toBe(4);
  });

  test('returns null for empty array', () => {
    expect(calculateAverageEnergy([])).toBeNull();
  });
});

describe('generateDailyStats', () => {
  test('generates complete daily stats', () => {
    const data = {
      meals: [
        { calories: 500, protein: 30, carbs: 50, fat: 15 },
        { calories: 700, protein: 40, carbs: 60, fat: 25 },
      ],
      workouts: [
        { estimated_calories_burned: 300, duration_minutes: 45 },
      ],
      water: [
        { amount_oz: 16 },
        { amount_oz: 16 },
      ],
      profile: { macro_targets: { calories: 2000 } },
      date: '2024-03-15',
    };

    const result = generateDailyStats(data);

    expect(result).toEqual({
      date: '2024-03-15',
      consumed: 1200,
      burned: 300,
      net: 900,
      goal: 2000,
      remaining: 1100,
      protein: 70,
      carbs: 110,
      fat: 40,
      mealsLogged: 2,
      workoutsLogged: 1,
      waterOz: 32,
    });
  });

  test('uses default goal when profile missing', () => {
    const result = generateDailyStats({
      meals: [],
      workouts: [],
      water: [],
      profile: null,
      date: '2024-03-15',
    });

    expect(result.goal).toBe(2000);
  });
});

describe('calculateMacroPercentages', () => {
  test('calculates correct percentages', () => {
    // 100g protein = 400 cals, 100g carbs = 400 cals, 50g fat = 450 cals
    // Total = 1250 cals
    const result = calculateMacroPercentages({ protein: 100, carbs: 100, fat: 50 });

    expect(result.protein).toBe(32); // 400/1250 = 32%
    expect(result.carbs).toBe(32);   // 400/1250 = 32%
    expect(result.fat).toBe(36);     // 450/1250 = 36%
  });

  test('returns zeros when total is zero', () => {
    const result = calculateMacroPercentages({ protein: 0, carbs: 0, fat: 0 });

    expect(result).toEqual({ protein: 0, carbs: 0, fat: 0 });
  });

  test('handles protein-only diet', () => {
    const result = calculateMacroPercentages({ protein: 100, carbs: 0, fat: 0 });

    expect(result.protein).toBe(100);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
  });
});
