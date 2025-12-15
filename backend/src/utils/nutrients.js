/**
 * Extracts and normalizes nutrients from USDA food data format
 * @param {Array} nutrients - Array of {nutrientId, value} objects from USDA API
 * @returns {Object} Normalized nutrients with calories, protein, carbs, fat, fiber, sugar
 */
export function extractNutrients(nutrients) {
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
