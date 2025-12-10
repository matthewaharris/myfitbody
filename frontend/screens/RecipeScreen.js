import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Modal,
  Alert,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import {
  getRecipes,
  createRecipe,
  deleteRecipe,
  toggleRecipeFavorite,
  logRecipe,
  searchFoods,
  setAuthToken,
  setUserInfo,
} from '../services/api';

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Food Search Modal for adding ingredients
function FoodSearchModal({ visible, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery) => {
    setSearching(true);
    try {
      const data = await searchFoods(searchQuery);
      setResults(data.foods || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (food) => {
    onSelect(food);
    setQuery('');
    setResults([]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modalStyles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={modalStyles.title}>Add Ingredient</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={modalStyles.searchContainer}>
          <TextInput
            style={modalStyles.searchInput}
            placeholder="Search for a food..."
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
        </View>

        {searching ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={modalStyles.foodItem}
                onPress={() => handleSelect(item)}
              >
                <View style={modalStyles.foodInfo}>
                  <Text style={modalStyles.foodName}>{item.name}</Text>
                  {item.brand && <Text style={modalStyles.foodBrand}>{item.brand}</Text>}
                  <Text style={modalStyles.foodNutrients}>
                    {item.nutrients.calories} cal • {item.nutrients.protein}g P • {item.nutrients.carbs}g C • {item.nutrients.fat}g F
                  </Text>
                  <Text style={modalStyles.servingInfo}>
                    per {item.servingSize}{item.servingUnit}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              query.length >= 2 && !searching ? (
                <Text style={modalStyles.emptyText}>No foods found</Text>
              ) : (
                <Text style={modalStyles.hintText}>Type at least 2 characters to search</Text>
              )
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

// Create Recipe Modal
function CreateRecipeModal({ visible, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState('1');
  const [ingredients, setIngredients] = useState([]);
  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddIngredient = (food) => {
    const newIngredient = {
      id: Date.now().toString(),
      food_name: food.name,
      serving_size: food.servingSize || 100,
      serving_unit: food.servingUnit || 'g',
      calories: food.nutrients.calories,
      protein: food.nutrients.protein,
      carbs: food.nutrients.carbs,
      fat: food.nutrients.fat,
      fiber: food.nutrients.fiber || 0,
      sugar: food.nutrients.sugar || 0,
      multiplier: 1,
    };
    setIngredients([...ingredients, newIngredient]);
  };

  const handleRemoveIngredient = (id) => {
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const handleUpdateMultiplier = (id, multiplier) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.id === id ? { ...ing, multiplier: parseFloat(multiplier) || 1 } : ing
      )
    );
  };

  const getTotals = () => {
    return ingredients.reduce(
      (acc, ing) => ({
        calories: acc.calories + ing.calories * ing.multiplier,
        protein: acc.protein + ing.protein * ing.multiplier,
        carbs: acc.carbs + ing.carbs * ing.multiplier,
        fat: acc.fat + ing.fat * ing.multiplier,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a recipe name');
      return;
    }
    if (ingredients.length === 0) {
      Alert.alert('No Ingredients', 'Please add at least one ingredient');
      return;
    }

    setSaving(true);
    try {
      const recipeData = {
        name: name.trim(),
        description: description.trim() || null,
        servings: parseInt(servings) || 1,
        ingredients: ingredients.map((ing) => ({
          food_name: ing.food_name,
          serving_size: ing.serving_size * ing.multiplier,
          serving_unit: ing.serving_unit,
          calories: Math.round(ing.calories * ing.multiplier),
          protein: Math.round(ing.protein * ing.multiplier * 10) / 10,
          carbs: Math.round(ing.carbs * ing.multiplier * 10) / 10,
          fat: Math.round(ing.fat * ing.multiplier * 10) / 10,
          fiber: Math.round(ing.fiber * ing.multiplier * 10) / 10,
          sugar: Math.round(ing.sugar * ing.multiplier * 10) / 10,
        })),
      };

      await onCreate(recipeData);
      handleClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setServings('1');
    setIngredients([]);
    onClose();
  };

  const totals = getTotals();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modalStyles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={modalStyles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={modalStyles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={modalStyles.title}>New Recipe</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[modalStyles.saveButton, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={modalStyles.content} keyboardShouldPersistTaps="handled">
            {/* Recipe Details */}
            <View style={modalStyles.section}>
              <Text style={modalStyles.label}>Recipe Name *</Text>
              <TextInput
                style={modalStyles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Chicken Salad"
              />

              <Text style={modalStyles.label}>Description (optional)</Text>
              <TextInput
                style={[modalStyles.input, { height: 80 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="Brief description..."
                multiline
              />

              <Text style={modalStyles.label}>Servings</Text>
              <TextInput
                style={[modalStyles.input, { width: 80 }]}
                value={servings}
                onChangeText={setServings}
                placeholder="1"
                keyboardType="number-pad"
              />
            </View>

            {/* Ingredients */}
            <View style={modalStyles.section}>
              <View style={modalStyles.sectionHeader}>
                <Text style={modalStyles.sectionTitle}>Ingredients</Text>
                <TouchableOpacity
                  style={modalStyles.addButton}
                  onPress={() => setShowFoodSearch(true)}
                >
                  <Text style={modalStyles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {ingredients.length === 0 ? (
                <Text style={modalStyles.emptyIngredients}>
                  No ingredients added yet
                </Text>
              ) : (
                ingredients.map((ing) => (
                  <View key={ing.id} style={modalStyles.ingredientItem}>
                    <View style={modalStyles.ingredientInfo}>
                      <Text style={modalStyles.ingredientName}>{ing.food_name}</Text>
                      <Text style={modalStyles.ingredientNutrients}>
                        {Math.round(ing.calories * ing.multiplier)} cal •{' '}
                        {Math.round(ing.protein * ing.multiplier)}g P
                      </Text>
                    </View>
                    <View style={modalStyles.ingredientControls}>
                      <TextInput
                        style={modalStyles.multiplierInput}
                        value={ing.multiplier.toString()}
                        onChangeText={(val) => handleUpdateMultiplier(ing.id, val)}
                        keyboardType="decimal-pad"
                      />
                      <Text style={modalStyles.multiplierUnit}>×</Text>
                      <TouchableOpacity
                        style={modalStyles.removeButton}
                        onPress={() => handleRemoveIngredient(ing.id)}
                      >
                        <Text style={modalStyles.removeButtonText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Totals */}
            {ingredients.length > 0 && (
              <View style={modalStyles.totalsSection}>
                <Text style={modalStyles.totalsTitle}>Recipe Totals</Text>
                <View style={modalStyles.totalsGrid}>
                  <View style={modalStyles.totalItem}>
                    <Text style={modalStyles.totalValue}>
                      {Math.round(totals.calories)}
                    </Text>
                    <Text style={modalStyles.totalLabel}>Calories</Text>
                  </View>
                  <View style={modalStyles.totalItem}>
                    <Text style={modalStyles.totalValue}>
                      {Math.round(totals.protein)}g
                    </Text>
                    <Text style={modalStyles.totalLabel}>Protein</Text>
                  </View>
                  <View style={modalStyles.totalItem}>
                    <Text style={modalStyles.totalValue}>
                      {Math.round(totals.carbs)}g
                    </Text>
                    <Text style={modalStyles.totalLabel}>Carbs</Text>
                  </View>
                  <View style={modalStyles.totalItem}>
                    <Text style={modalStyles.totalValue}>
                      {Math.round(totals.fat)}g
                    </Text>
                    <Text style={modalStyles.totalLabel}>Fat</Text>
                  </View>
                </View>
                <Text style={modalStyles.perServing}>
                  Per serving ({servings}): {Math.round(totals.calories / (parseInt(servings) || 1))} cal
                </Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <FoodSearchModal
          visible={showFoodSearch}
          onClose={() => setShowFoodSearch(false)}
          onSelect={handleAddIngredient}
        />
      </SafeAreaView>
    </Modal>
  );
}

// Log Recipe Modal
function LogRecipeModal({ visible, recipe, onClose, onLog }) {
  const [mealType, setMealType] = useState('lunch');
  const [servingsEaten, setServingsEaten] = useState('1');
  const [logging, setLogging] = useState(false);

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { value: 'lunch', label: 'Lunch', icon: '☀️' },
    { value: 'dinner', label: 'Dinner', icon: '🌙' },
    { value: 'snack', label: 'Snack', icon: '🍎' },
  ];

  const handleLog = async () => {
    setLogging(true);
    try {
      await onLog(recipe.id, mealType, parseFloat(servingsEaten) || 1);
      onClose();
    } catch (error) {
      console.error('Error logging recipe:', error);
      Alert.alert('Error', 'Failed to log recipe');
    } finally {
      setLogging(false);
    }
  };

  if (!recipe) return null;

  const multiplier = (parseFloat(servingsEaten) || 1) / (recipe.servings || 1);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={logModalStyles.overlay}>
        <View style={logModalStyles.container}>
          <Text style={logModalStyles.title}>Log {recipe.name}</Text>

          <Text style={logModalStyles.label}>Meal Type</Text>
          <View style={logModalStyles.mealTypes}>
            {mealTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  logModalStyles.mealTypeButton,
                  mealType === type.value && logModalStyles.mealTypeButtonActive,
                ]}
                onPress={() => setMealType(type.value)}
              >
                <Text style={logModalStyles.mealTypeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    logModalStyles.mealTypeLabel,
                    mealType === type.value && logModalStyles.mealTypeLabelActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={logModalStyles.label}>Servings Eaten</Text>
          <View style={logModalStyles.servingsRow}>
            <TextInput
              style={logModalStyles.servingsInput}
              value={servingsEaten}
              onChangeText={setServingsEaten}
              keyboardType="decimal-pad"
            />
            <Text style={logModalStyles.servingsTotal}>
              of {recipe.servings} ({Math.round(recipe.total_calories * multiplier)} cal)
            </Text>
          </View>

          <View style={logModalStyles.buttons}>
            <TouchableOpacity style={logModalStyles.cancelButton} onPress={onClose}>
              <Text style={logModalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[logModalStyles.logButton, logging && { opacity: 0.5 }]}
              onPress={handleLog}
              disabled={logging}
            >
              <Text style={logModalStyles.logText}>
                {logging ? 'Logging...' : 'Log Recipe'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Main Recipe Screen
export default function RecipeScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => {
    setupAuth();
  }, []);

  const setupAuth = async () => {
    const token = await getToken();
    setAuthToken(token);
    const email = user?.emailAddresses?.[0]?.emailAddress;
    setUserInfo(user?.id, email);
    loadRecipes();
  };

  const loadRecipes = async () => {
    try {
      const data = await getRecipes();
      setRecipes(data || []);
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
  }, []);

  const handleCreateRecipe = async (recipeData) => {
    await createRecipe(recipeData);
    await loadRecipes();
  };

  const handleDeleteRecipe = (recipeId, recipeName) => {
    Alert.alert(
      'Delete Recipe',
      `Are you sure you want to delete "${recipeName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRecipe(recipeId);
              await loadRecipes();
            } catch (error) {
              console.error('Error deleting recipe:', error);
              Alert.alert('Error', 'Failed to delete recipe');
            }
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async (recipeId) => {
    try {
      await toggleRecipeFavorite(recipeId);
      await loadRecipes();
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleLogRecipe = async (recipeId, mealType, servingsEaten) => {
    const result = await logRecipe(recipeId, mealType, servingsEaten);
    Alert.alert(
      'Recipe Logged!',
      `${result.meals_created} ingredients logged (${result.total_calories} cal total)`,
      [
        { text: 'Log Another', style: 'cancel' },
        { text: 'Go Home', onPress: () => onNavigate('home') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Recipes</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Text style={styles.addButton}>+ New</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.recipeCard}>
              <TouchableOpacity
                style={styles.recipeMain}
                onPress={() => {
                  setSelectedRecipe(item);
                  setShowLogModal(true);
                }}
              >
                <View style={styles.recipeInfo}>
                  <View style={styles.recipeTitleRow}>
                    <Text style={styles.recipeName}>{item.name}</Text>
                    {item.is_favorite && (
                      <Text style={styles.favoriteIcon}>⭐</Text>
                    )}
                  </View>
                  {item.description && (
                    <Text style={styles.recipeDescription} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={styles.recipeStats}>
                    {item.total_calories} cal • {Math.round(item.total_protein)}g P •{' '}
                    {item.recipe_ingredients?.length || 0} ingredients
                  </Text>
                  <Text style={styles.recipeServings}>
                    {item.servings} serving{item.servings !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={styles.logArrow}>›</Text>
              </TouchableOpacity>

              <View style={styles.recipeActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleToggleFavorite(item.id)}
                >
                  <Text style={styles.actionButtonText}>
                    {item.is_favorite ? '★ Unfavorite' : '☆ Favorite'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDeleteRecipe(item.id, item.name)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📖</Text>
              <Text style={styles.emptyText}>No recipes yet</Text>
              <Text style={styles.emptySubtext}>
                Create a recipe to quickly log multiple ingredients at once
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.emptyButtonText}>Create Recipe</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <CreateRecipeModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateRecipe}
      />

      <LogRecipeModal
        visible={showLogModal}
        recipe={selectedRecipe}
        onClose={() => {
          setShowLogModal(false);
          setSelectedRecipe(null);
        }}
        onLog={handleLogRecipe}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  recipeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  recipeMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  favoriteIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  recipeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  recipeStats: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 6,
    fontWeight: '500',
  },
  recipeServings: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  logArrow: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  recipeActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  deleteButton: {
    borderRightWidth: 0,
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#FF3B30',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyIngredients: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  ingredientNutrients: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  ingredientControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  multiplierInput: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 8,
    width: 50,
    textAlign: 'center',
    fontSize: 16,
  },
  multiplierUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
    marginRight: 12,
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 18,
    color: '#FF3B30',
  },
  totalsSection: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    margin: 16,
    borderRadius: 12,
  },
  totalsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  totalsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: {
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  perServing: {
    fontSize: 13,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 12,
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  foodItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  foodBrand: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  foodNutrients: {
    fontSize: 13,
    color: '#007AFF',
    marginTop: 4,
  },
  servingInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    padding: 40,
    color: '#666',
  },
  hintText: {
    textAlign: 'center',
    padding: 40,
    color: '#999',
  },
});

const logModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  mealTypes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mealTypeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  mealTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  mealTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  mealTypeLabel: {
    fontSize: 12,
    color: '#666',
  },
  mealTypeLabelActive: {
    color: '#fff',
    fontWeight: '600',
  },
  servingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  servingsInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    width: 60,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  servingsTotal: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  logButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  logText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
