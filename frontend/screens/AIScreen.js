import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { generateAIWorkout, generateAIRecipe, createWorkout, addExerciseToWorkout, createRecipe } from '../services/api';

export default function AIScreen({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('workout'); // 'workout' or 'recipe'
  const [loading, setLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);

  // Workout options
  const [duration, setDuration] = useState('45');
  const [focus, setFocus] = useState('full body');
  const [equipment, setEquipment] = useState('full_gym');
  const [difficulty, setDifficulty] = useState('intermediate');

  // Recipe options
  const [mealType, setMealType] = useState('dinner');
  const [cuisine, setCuisine] = useState('');
  const [maxCalories, setMaxCalories] = useState('');
  const [servings, setServings] = useState('2');

  const focusOptions = ['full body', 'upper body', 'lower body', 'push', 'pull', 'legs', 'core', 'cardio'];
  const equipmentOptions = [
    { value: 'full_gym', label: 'Full Gym' },
    { value: 'dumbbells_only', label: 'Dumbbells Only' },
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'home_gym', label: 'Home Gym' },
  ];
  const difficultyOptions = ['beginner', 'intermediate', 'advanced'];
  const mealOptions = ['breakfast', 'lunch', 'dinner', 'snack'];
  const cuisineOptions = ['', 'Italian', 'Mexican', 'Asian', 'Mediterranean', 'American', 'Indian'];

  const handleGenerateWorkout = async () => {
    setLoading(true);
    try {
      const workout = await generateAIWorkout({
        duration: parseInt(duration),
        focus,
        equipment,
        difficulty,
      });
      setGeneratedContent({ type: 'workout', data: workout });
    } catch (error) {
      console.error('Error generating workout:', error);
      Alert.alert('Error', 'Failed to generate workout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRecipe = async () => {
    setLoading(true);
    try {
      const recipe = await generateAIRecipe({
        mealType,
        cuisine: cuisine || undefined,
        maxCalories: maxCalories ? parseInt(maxCalories) : undefined,
        servings: parseInt(servings),
      });
      setGeneratedContent({ type: 'recipe', data: recipe });
    } catch (error) {
      console.error('Error generating recipe:', error);
      Alert.alert('Error', 'Failed to generate recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorkout = async () => {
    if (!generatedContent || generatedContent.type !== 'workout') return;

    try {
      const workout = generatedContent.data;

      // Create the workout
      const newWorkout = await createWorkout({
        name: workout.name,
        notes: workout.description,
        workout_date: new Date().toISOString(),
        is_template: true, // Save as template for reuse
      });

      // Add exercises to the workout
      for (let i = 0; i < workout.exercises.length; i++) {
        const ex = workout.exercises[i];
        await addExerciseToWorkout(newWorkout.id, {
          exercise_name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          notes: ex.notes,
          order_index: i,
        });
      }

      Alert.alert('Saved!', 'Workout saved as a template. You can find it in your workout templates.');
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  const handleSaveRecipe = async () => {
    if (!generatedContent || generatedContent.type !== 'recipe') return;

    try {
      const recipe = generatedContent.data;

      const ingredients = recipe.ingredients.map((ing, idx) => ({
        food_name: ing.name,
        serving_size: 1,
        serving_unit: ing.amount,
        calories: ing.calories,
        protein: ing.protein,
        carbs: ing.carbs,
        fat: ing.fat,
        order_index: idx,
      }));

      await createRecipe({
        name: recipe.name,
        description: recipe.description + (recipe.tips ? `\n\n${recipe.tips}` : ''),
        servings: recipe.servings,
        total_calories: recipe.nutrition_per_serving.calories * recipe.servings,
        total_protein: recipe.nutrition_per_serving.protein * recipe.servings,
        total_carbs: recipe.nutrition_per_serving.carbs * recipe.servings,
        total_fat: recipe.nutrition_per_serving.fat * recipe.servings,
        ingredients,
      });

      Alert.alert('Saved!', 'Recipe saved. You can find it in your recipes.');
    } catch (error) {
      console.error('Error saving recipe:', error);
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  const renderWorkoutOptions = () => (
    <View style={styles.optionsContainer}>
      <Text style={styles.optionLabel}>Duration (minutes)</Text>
      <View style={styles.durationRow}>
        {['30', '45', '60', '90'].map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.optionChip, duration === d && styles.optionChipSelected]}
            onPress={() => setDuration(d)}
          >
            <Text style={[styles.optionChipText, duration === d && styles.optionChipTextSelected]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.optionLabel}>Focus</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {focusOptions.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.optionChip, focus === f && styles.optionChipSelected]}
            onPress={() => setFocus(f)}
          >
            <Text style={[styles.optionChipText, focus === f && styles.optionChipTextSelected]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.optionLabel}>Equipment</Text>
      <View style={styles.chipRow}>
        {equipmentOptions.map(e => (
          <TouchableOpacity
            key={e.value}
            style={[styles.optionChip, equipment === e.value && styles.optionChipSelected]}
            onPress={() => setEquipment(e.value)}
          >
            <Text style={[styles.optionChipText, equipment === e.value && styles.optionChipTextSelected]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.optionLabel}>Difficulty</Text>
      <View style={styles.chipRow}>
        {difficultyOptions.map(d => (
          <TouchableOpacity
            key={d}
            style={[styles.optionChip, difficulty === d && styles.optionChipSelected]}
            onPress={() => setDifficulty(d)}
          >
            <Text style={[styles.optionChipText, difficulty === d && styles.optionChipTextSelected]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGenerateWorkout}
        disabled={loading}
      >
        <Text style={styles.generateButtonText}>
          {loading ? 'Generating...' : 'Generate Workout'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecipeOptions = () => (
    <View style={styles.optionsContainer}>
      <Text style={styles.optionLabel}>Meal Type</Text>
      <View style={styles.chipRow}>
        {mealOptions.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.optionChip, mealType === m && styles.optionChipSelected]}
            onPress={() => setMealType(m)}
          >
            <Text style={[styles.optionChipText, mealType === m && styles.optionChipTextSelected]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.optionLabel}>Cuisine (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {cuisineOptions.map(c => (
          <TouchableOpacity
            key={c || 'any'}
            style={[styles.optionChip, cuisine === c && styles.optionChipSelected]}
            onPress={() => setCuisine(c)}
          >
            <Text style={[styles.optionChipText, cuisine === c && styles.optionChipTextSelected]}>
              {c || 'Any'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.optionLabel}>Max Calories (optional)</Text>
      <TextInput
        style={styles.input}
        value={maxCalories}
        onChangeText={setMaxCalories}
        placeholder="e.g., 500"
        keyboardType="number-pad"
      />

      <Text style={styles.optionLabel}>Servings</Text>
      <View style={styles.chipRow}>
        {['1', '2', '4', '6'].map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.optionChip, servings === s && styles.optionChipSelected]}
            onPress={() => setServings(s)}
          >
            <Text style={[styles.optionChipText, servings === s && styles.optionChipTextSelected]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={handleGenerateRecipe}
        disabled={loading}
      >
        <Text style={styles.generateButtonText}>
          {loading ? 'Generating...' : 'Generate Recipe'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderWorkoutResult = () => {
    const workout = generatedContent.data;
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>{workout.name}</Text>
        <Text style={styles.resultDescription}>{workout.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{workout.estimated_duration}</Text>
            <Text style={styles.statLabel}>min</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{workout.estimated_calories}</Text>
            <Text style={styles.statLabel}>cal</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{workout.exercises.length}</Text>
            <Text style={styles.statLabel}>exercises</Text>
          </View>
        </View>

        {workout.warmup && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warmup</Text>
            <Text style={styles.sectionText}>{workout.warmup}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exercises</Text>
          {workout.exercises.map((ex, idx) => (
            <View key={idx} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              <Text style={styles.exerciseDetails}>
                {ex.sets} sets x {ex.reps} | Rest: {ex.rest_seconds}s
              </Text>
              {ex.notes && <Text style={styles.exerciseNotes}>{ex.notes}</Text>}
            </View>
          ))}
        </View>

        {workout.cooldown && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cooldown</Text>
            <Text style={styles.sectionText}>{workout.cooldown}</Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveWorkout}>
            <Text style={styles.saveButtonText}>Save as Template</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newButton} onPress={() => setGeneratedContent(null)}>
            <Text style={styles.newButtonText}>Generate New</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRecipeResult = () => {
    const recipe = generatedContent.data;
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>{recipe.name}</Text>
        <Text style={styles.resultDescription}>{recipe.description}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{recipe.prep_time_minutes + recipe.cook_time_minutes}</Text>
            <Text style={styles.statLabel}>min total</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{recipe.nutrition_per_serving.calories}</Text>
            <Text style={styles.statLabel}>cal/serving</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{recipe.nutrition_per_serving.protein}g</Text>
            <Text style={styles.statLabel}>protein</Text>
          </View>
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.macroText}>Carbs: {recipe.nutrition_per_serving.carbs}g</Text>
          <Text style={styles.macroText}>Fat: {recipe.nutrition_per_serving.fat}g</Text>
          <Text style={styles.macroText}>Fiber: {recipe.nutrition_per_serving.fiber}g</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients ({recipe.servings} servings)</Text>
          {recipe.ingredients.map((ing, idx) => (
            <View key={idx} style={styles.ingredientRow}>
              <Text style={styles.ingredientAmount}>{ing.amount}</Text>
              <Text style={styles.ingredientName}>{ing.name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          {recipe.instructions.map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <Text style={styles.stepNumber}>{idx + 1}</Text>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {recipe.tips && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tips</Text>
            <Text style={styles.sectionText}>{recipe.tips}</Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveRecipe}>
            <Text style={styles.saveButtonText}>Save Recipe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newButton} onPress={() => setGeneratedContent(null)}>
            <Text style={styles.newButtonText}>Generate New</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'workout' && styles.tabActive]}
          onPress={() => { setActiveTab('workout'); setGeneratedContent(null); }}
        >
          <Text style={[styles.tabText, activeTab === 'workout' && styles.tabTextActive]}>
            Workout
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'recipe' && styles.tabActive]}
          onPress={() => { setActiveTab('recipe'); setGeneratedContent(null); }}
        >
          <Text style={[styles.tabText, activeTab === 'recipe' && styles.tabTextActive]}>
            Recipe
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>
              {activeTab === 'workout' ? 'Creating your personalized workout...' : 'Cooking up a recipe for you...'}
            </Text>
          </View>
        ) : generatedContent ? (
          generatedContent.type === 'workout' ? renderWorkoutResult() : renderRecipeResult()
        ) : (
          <>
            <Text style={styles.introText}>
              {activeTab === 'workout'
                ? 'Get a personalized workout based on your fitness goals and available equipment.'
                : 'Generate a healthy recipe tailored to your dietary preferences and macro goals.'}
            </Text>
            {activeTab === 'workout' ? renderWorkoutOptions() : renderRecipeOptions()}
          </>
        )}
      </ScrollView>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  introText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
    lineHeight: 22,
  },
  optionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  horizontalScroll: {
    flexGrow: 0,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  optionChipSelected: {
    backgroundColor: '#007AFF',
  },
  optionChipText: {
    fontSize: 14,
    color: '#333',
  },
  optionChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  resultContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  resultTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  resultDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  macroText: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  exerciseCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 4,
  },
  exerciseNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  ingredientRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ingredientAmount: {
    width: 100,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  ingredientName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  newButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  newButtonText: {
    color: '#333',
    fontSize: 15,
    fontWeight: '600',
  },
});
