import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { createUser, createUserProfile, setAuthToken, setUserInfo } from '../services/api';

const STEPS = ['Personal', 'Goals', 'Diet', 'Foods', 'Macros', 'Notifications'];

export default function ProfileSetupWizard({ onComplete, onSkip }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 0: Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Step 1: Goals
  const [weightGoal, setWeightGoal] = useState('');
  const [startingWeight, setStartingWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('lb');

  // Step 2: Diet
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);

  // Step 3: Food Preferences
  const [lovedFoods, setLovedFoods] = useState([]);
  const [avoidedFoods, setAvoidedFoods] = useState([]);
  const [foodInput, setFoodInput] = useState('');
  const [foodInputType, setFoodInputType] = useState('loved'); // 'loved' or 'avoided'
  const [validatingFood, setValidatingFood] = useState(false);

  // Step 4: Macros
  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('150');
  const [carbs, setCarbs] = useState('200');
  const [fat, setFat] = useState('60');

  // Step 4: Notifications
  const [enableMoodCheckins, setEnableMoodCheckins] = useState(true);
  const [enableCaloriePrompts, setEnableCaloriePrompts] = useState(true);

  const weightGoalOptions = [
    { value: 'build_muscle', label: 'Build Muscle', icon: '💪', description: 'Higher protein, strength-focused workouts' },
    { value: 'lose_fat', label: 'Lose Fat', icon: '🔥', description: 'Calorie deficit, cardio + resistance training' },
    { value: 'maintain', label: 'Maintain Weight', icon: '⚖️', description: 'Balanced nutrition, consistent activity' },
  ];

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
    'Keto', 'Paleo', 'Halal', 'Kosher', 'None',
  ];

  const toggleDietaryRestriction = (restriction) => {
    if (restriction === 'None') {
      setDietaryRestrictions([]);
      return;
    }
    if (dietaryRestrictions.includes(restriction)) {
      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
    } else {
      setDietaryRestrictions([...dietaryRestrictions.filter(r => r !== 'None'), restriction]);
    }
  };

  const validateAndAddFood = async () => {
    if (!foodInput.trim()) return;

    const foodName = foodInput.trim().toLowerCase();

    // Check if already added
    if (lovedFoods.includes(foodName) || avoidedFoods.includes(foodName)) {
      Alert.alert('Already Added', 'This food is already in your preferences.');
      return;
    }

    setValidatingFood(true);
    try {
      // Validate by searching for the food in the food database
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=5`
      );
      const data = await response.json();

      // Check if we got reasonable results
      const hasResults = data.products && data.products.length > 0;
      const matchesSearch = hasResults && data.products.some(p =>
        p.product_name?.toLowerCase().includes(foodName) ||
        p.generic_name?.toLowerCase().includes(foodName) ||
        p.categories?.toLowerCase().includes(foodName)
      );

      // Common food categories that might not be in OpenFoodFacts but are valid
      const commonFoods = [
        'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'seafood',
        'rice', 'pasta', 'bread', 'pizza', 'burger', 'steak', 'eggs', 'bacon',
        'broccoli', 'spinach', 'kale', 'lettuce', 'tomato', 'potato', 'carrots',
        'apple', 'banana', 'orange', 'berries', 'strawberry', 'avocado',
        'cheese', 'milk', 'yogurt', 'butter', 'cream',
        'chocolate', 'ice cream', 'cookies', 'cake', 'candy',
        'coffee', 'tea', 'soda', 'juice', 'beer', 'wine',
        'nuts', 'peanuts', 'almonds', 'cashews',
        'tofu', 'beans', 'lentils', 'chickpeas',
        'sushi', 'tacos', 'burritos', 'curry', 'soup', 'salad'
      ];

      const isCommonFood = commonFoods.some(f => foodName.includes(f) || f.includes(foodName));

      if (hasResults || matchesSearch || isCommonFood) {
        // Valid food - add to appropriate list
        if (foodInputType === 'loved') {
          setLovedFoods([...lovedFoods, foodName]);
        } else {
          setAvoidedFoods([...avoidedFoods, foodName]);
        }
        setFoodInput('');
      } else {
        Alert.alert(
          'Food Not Found',
          `"${foodInput}" doesn't appear to be a recognized food. Please try a more common name or spelling.`
        );
      }
    } catch (error) {
      console.error('Food validation error:', error);
      // On network error, just add it (give user benefit of the doubt)
      if (foodInputType === 'loved') {
        setLovedFoods([...lovedFoods, foodName]);
      } else {
        setAvoidedFoods([...avoidedFoods, foodName]);
      }
      setFoodInput('');
    } finally {
      setValidatingFood(false);
    }
  };

  const removeFood = (food, type) => {
    if (type === 'loved') {
      setLovedFoods(lovedFoods.filter(f => f !== food));
    } else {
      setAvoidedFoods(avoidedFoods.filter(f => f !== food));
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      setAuthToken(token);

      const email = user.emailAddresses[0].emailAddress;
      setUserInfo(user.id, email);

      // Create user in backend (or get existing) with personal info
      const newUser = await createUser(
        user.id,
        email,
        firstName || null,
        lastName || null,
        phoneNumber || null
      );

      // Create user profile with all collected data
      await createUserProfile(newUser.id, {
        weightGoal: weightGoal || null,
        startingWeight: startingWeight ? parseFloat(startingWeight) : null,
        weightUnit,
        dietaryRestrictions,
        foodPreferences: {
          lovedFoods,
          avoidedFoods,
        },
        macroTargets: {
          calories: parseInt(calories) || 2000,
          protein: parseInt(protein) || 150,
          carbs: parseInt(carbs) || 200,
          fat: parseInt(fat) || 60,
        },
        notificationSettings: {
          enableMoodCheckins,
          enableCaloriePrompts,
          quietHoursStart: 22,
          quietHoursEnd: 7,
        },
      });

      Alert.alert('Success', 'Profile created successfully!');
      onComplete();
    } catch (error) {
      console.error('Profile creation error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || error.message || 'Failed to create profile'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {STEPS.map((step, index) => (
        <View key={step} style={styles.progressStep}>
          <View
            style={[
              styles.progressDot,
              index <= currentStep && styles.progressDotActive,
            ]}
          >
            <Text style={[
              styles.progressNumber,
              index <= currentStep && styles.progressNumberActive,
            ]}>
              {index + 1}
            </Text>
          </View>
          <Text style={[
            styles.progressLabel,
            index === currentStep && styles.progressLabelActive,
          ]}>
            {step}
          </Text>
        </View>
      ))}
    </View>
  );

  const formatPhoneNumber = (text) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const renderStep0Personal = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Let's get to know you</Text>
      <Text style={styles.stepSubtitle}>This helps personalize your experience</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>First Name</Text>
        <TextInput
          style={styles.textInput}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Last Name</Text>
        <TextInput
          style={styles.textInput}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number (optional)</Text>
        <TextInput
          style={styles.textInput}
          value={phoneNumber}
          onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
          placeholder="(555) 123-4567"
          keyboardType="phone-pad"
          maxLength={14}
        />
        <Text style={styles.inputHint}>For workout reminders and motivation texts</Text>
      </View>
    </View>
  );

  const renderStep1Goals = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>What's your fitness goal?</Text>
      <Text style={styles.stepSubtitle}>This helps us personalize your experience</Text>

      {weightGoalOptions.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.optionCard,
            weightGoal === option.value && styles.optionCardSelected,
          ]}
          onPress={() => setWeightGoal(option.value)}
        >
          <Text style={styles.optionIcon}>{option.icon}</Text>
          <Text style={[
            styles.optionLabel,
            weightGoal === option.value && styles.optionLabelSelected,
          ]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}

      <View style={styles.weightSection}>
        <Text style={styles.inputLabel}>Starting Weight (optional)</Text>
        <View style={styles.weightInputRow}>
          <TextInput
            style={styles.weightInput}
            value={startingWeight}
            onChangeText={setStartingWeight}
            keyboardType="decimal-pad"
            placeholder="Enter weight"
          />
          <View style={styles.unitToggle}>
            <TouchableOpacity
              style={[styles.unitButton, weightUnit === 'lb' && styles.unitButtonActive]}
              onPress={() => setWeightUnit('lb')}
            >
              <Text style={[styles.unitText, weightUnit === 'lb' && styles.unitTextActive]}>lb</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.unitButton, weightUnit === 'kg' && styles.unitButtonActive]}
              onPress={() => setWeightUnit('kg')}
            >
              <Text style={[styles.unitText, weightUnit === 'kg' && styles.unitTextActive]}>kg</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep2Diet = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Dietary Preferences</Text>
      <Text style={styles.stepSubtitle}>Select any that apply (optional)</Text>

      <View style={styles.chipContainer}>
        {dietaryOptions.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.chip,
              dietaryRestrictions.includes(option) && styles.chipSelected,
              option === 'None' && dietaryRestrictions.length === 0 && styles.chipSelected,
            ]}
            onPress={() => toggleDietaryRestriction(option)}
          >
            <Text style={[
              styles.chipText,
              (dietaryRestrictions.includes(option) ||
               (option === 'None' && dietaryRestrictions.length === 0)) &&
              styles.chipTextSelected,
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderStep3Foods = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Food Preferences</Text>
      <Text style={styles.stepSubtitle}>Help us personalize recipe suggestions</Text>

      {/* Toggle between loved and avoided */}
      <View style={styles.foodTypeToggle}>
        <TouchableOpacity
          style={[styles.foodTypeButton, foodInputType === 'loved' && styles.foodTypeButtonActive]}
          onPress={() => setFoodInputType('loved')}
        >
          <Text style={[styles.foodTypeText, foodInputType === 'loved' && styles.foodTypeTextActive]}>
            Foods I Love
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.foodTypeButton, foodInputType === 'avoided' && styles.foodTypeButtonActive]}
          onPress={() => setFoodInputType('avoided')}
        >
          <Text style={[styles.foodTypeText, foodInputType === 'avoided' && styles.foodTypeTextActive]}>
            Foods I Avoid
          </Text>
        </TouchableOpacity>
      </View>

      {/* Food input */}
      <View style={styles.foodInputContainer}>
        <TextInput
          style={styles.foodInput}
          value={foodInput}
          onChangeText={setFoodInput}
          placeholder={foodInputType === 'loved' ? "e.g., pizza, salmon, avocado" : "e.g., seafood, mushrooms, cilantro"}
          autoCapitalize="none"
          onSubmitEditing={validateAndAddFood}
        />
        <TouchableOpacity
          style={[styles.addFoodButton, validatingFood && styles.addFoodButtonDisabled]}
          onPress={validateAndAddFood}
          disabled={validatingFood}
        >
          <Text style={styles.addFoodButtonText}>{validatingFood ? '...' : '+'}</Text>
        </TouchableOpacity>
      </View>

      {/* Loved Foods List */}
      {lovedFoods.length > 0 && (
        <View style={styles.foodListSection}>
          <Text style={styles.foodListTitle}>Foods I Love:</Text>
          <View style={styles.foodChipContainer}>
            {lovedFoods.map((food) => (
              <View key={food} style={styles.foodChipLoved}>
                <Text style={styles.foodChipText}>{food}</Text>
                <TouchableOpacity onPress={() => removeFood(food, 'loved')}>
                  <Text style={styles.foodChipRemove}>x</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Avoided Foods List */}
      {avoidedFoods.length > 0 && (
        <View style={styles.foodListSection}>
          <Text style={styles.foodListTitle}>Foods I Avoid:</Text>
          <View style={styles.foodChipContainer}>
            {avoidedFoods.map((food) => (
              <View key={food} style={styles.foodChipAvoided}>
                <Text style={styles.foodChipText}>{food}</Text>
                <TouchableOpacity onPress={() => removeFood(food, 'avoided')}>
                  <Text style={styles.foodChipRemove}>x</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.foodHint}>
        These preferences help our AI suggest recipes you'll enjoy and avoid ingredients you don't like.
      </Text>
    </View>
  );

  const renderStep4Macros = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Daily Nutrition Goals</Text>
      <Text style={styles.stepSubtitle}>Set your daily targets (you can adjust later)</Text>

      <View style={styles.macroCard}>
        <Text style={styles.macroLabel}>Daily Calories</Text>
        <TextInput
          style={styles.macroInput}
          value={calories}
          onChangeText={setCalories}
          keyboardType="number-pad"
          placeholder="2000"
        />
        <Text style={styles.macroUnit}>kcal</Text>
      </View>

      <View style={styles.macroRow}>
        <View style={styles.macroCardSmall}>
          <Text style={styles.macroLabel}>Protein</Text>
          <TextInput
            style={styles.macroInputSmall}
            value={protein}
            onChangeText={setProtein}
            keyboardType="number-pad"
            placeholder="150"
          />
          <Text style={styles.macroUnit}>g</Text>
        </View>

        <View style={styles.macroCardSmall}>
          <Text style={styles.macroLabel}>Carbs</Text>
          <TextInput
            style={styles.macroInputSmall}
            value={carbs}
            onChangeText={setCarbs}
            keyboardType="number-pad"
            placeholder="200"
          />
          <Text style={styles.macroUnit}>g</Text>
        </View>

        <View style={styles.macroCardSmall}>
          <Text style={styles.macroLabel}>Fat</Text>
          <TextInput
            style={styles.macroInputSmall}
            value={fat}
            onChangeText={setFat}
            keyboardType="number-pad"
            placeholder="60"
          />
          <Text style={styles.macroUnit}>g</Text>
        </View>
      </View>
    </View>
  );

  const renderStep5Notifications = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Notifications</Text>
      <Text style={styles.stepSubtitle}>Stay on track with helpful reminders</Text>

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Mood Check-ins</Text>
          <Text style={styles.toggleDescription}>Daily prompts to log how you're feeling</Text>
        </View>
        <Switch
          value={enableMoodCheckins}
          onValueChange={setEnableMoodCheckins}
          trackColor={{ false: '#ddd', true: '#007AFF' }}
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleLabel}>Calorie Reminders</Text>
          <Text style={styles.toggleDescription}>Reminders to log your meals</Text>
        </View>
        <Switch
          value={enableCaloriePrompts}
          onValueChange={setEnableCaloriePrompts}
          trackColor={{ false: '#ddd', true: '#007AFF' }}
        />
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0: return renderStep0Personal();
      case 1: return renderStep1Goals();
      case 2: return renderStep2Diet();
      case 3: return renderStep3Foods();
      case 4: return renderStep4Macros();
      case 5: return renderStep5Notifications();
      default: return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {renderProgressBar()}
        {renderCurrentStep()}
      </ScrollView>

      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          {currentStep > 0 ? (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.nextButton, loading && styles.nextButtonDisabled]}
            onPress={handleNext}
            disabled={loading}
          >
            <Text style={styles.nextButtonText}>
              {loading ? 'Saving...' : currentStep === STEPS.length - 1 ? 'Complete' : 'Next'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingTop: 40,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  progressNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
  },
  progressNumberActive: {
    color: '#fff',
  },
  progressLabel: {
    fontSize: 12,
    color: '#999',
  },
  progressLabelActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  inputHint: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    fontStyle: 'italic',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#eee',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
  },
  optionLabelSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  weightSection: {
    marginTop: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 12,
  },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f5f5f5',
  },
  unitButtonActive: {
    backgroundColor: '#007AFF',
  },
  unitText: {
    fontSize: 16,
    color: '#666',
  },
  unitTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  macroCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  macroCardSmall: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  macroInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    minWidth: 100,
  },
  macroInputSmall: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  macroUnit: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  backButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#999',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Food preferences styles
  foodTypeToggle: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  foodTypeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  foodTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  foodTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  foodTypeTextActive: {
    color: '#fff',
  },
  foodInputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  foodInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  addFoodButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFoodButtonDisabled: {
    opacity: 0.6,
  },
  addFoodButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  foodListSection: {
    marginBottom: 16,
  },
  foodListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  foodChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foodChipLoved: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  foodChipAvoided: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  foodChipText: {
    fontSize: 14,
    color: '#333',
    marginRight: 6,
  },
  foodChipRemove: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
  },
  foodHint: {
    fontSize: 13,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 16,
  },
});
