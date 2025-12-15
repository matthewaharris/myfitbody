import { extractNutrients } from '../../src/utils/nutrients.js';

describe('extractNutrients', () => {
  test('extracts all nutrients from valid USDA data', () => {
    const usdaNutrients = [
      { nutrientId: 1008, value: 250 },    // calories
      { nutrientId: 1003, value: 25.5 },   // protein
      { nutrientId: 1005, value: 30.33 },  // carbs
      { nutrientId: 1004, value: 10.777 }, // fat
      { nutrientId: 1079, value: 5 },      // fiber
      { nutrientId: 2000, value: 8.123 },  // sugar
    ];

    const result = extractNutrients(usdaNutrients);

    expect(result).toEqual({
      calories: 250,
      protein: 25.5,
      carbs: 30.3,      // rounded to 1 decimal
      fat: 10.8,        // rounded to 1 decimal
      fiber: 5,
      sugar: 8.1,       // rounded to 1 decimal
    });
  });

  test('returns zeros for empty nutrients array', () => {
    const result = extractNutrients([]);

    expect(result).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
    });
  });

  test('ignores unknown nutrient IDs', () => {
    const nutrients = [
      { nutrientId: 9999, value: 100 },  // unknown
      { nutrientId: 1008, value: 200 },  // calories
    ];

    const result = extractNutrients(nutrients);

    expect(result.calories).toBe(200);
    // Other values should remain at default 0
    expect(result.protein).toBe(0);
  });

  test('handles null/undefined values gracefully', () => {
    const nutrients = [
      { nutrientId: 1008, value: null },
      { nutrientId: 1003, value: undefined },
    ];

    const result = extractNutrients(nutrients);

    expect(result.calories).toBe(0);
    expect(result.protein).toBe(0);
  });

  test('handles partial nutrient data', () => {
    // Only some nutrients present (common case)
    const nutrients = [
      { nutrientId: 1008, value: 150 },  // calories
      { nutrientId: 1003, value: 10 },   // protein
    ];

    const result = extractNutrients(nutrients);

    expect(result.calories).toBe(150);
    expect(result.protein).toBe(10);
    expect(result.carbs).toBe(0);
    expect(result.fat).toBe(0);
    expect(result.fiber).toBe(0);
    expect(result.sugar).toBe(0);
  });
});
