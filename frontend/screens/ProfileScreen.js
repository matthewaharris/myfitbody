import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { getMyProfile, updateMyProfile, updateUser, getUserByClerkId, setAuthToken, setUserInfo, deleteMyAccount } from '../services/api';

export default function ProfileScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backendUserId, setBackendUserId] = useState(null);

  // Personal info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Profile data
  const [weightGoal, setWeightGoal] = useState('');
  const [startingWeight, setStartingWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('lb');
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [lovedFoods, setLovedFoods] = useState([]);
  const [avoidedFoods, setAvoidedFoods] = useState([]);
  const [foodInput, setFoodInput] = useState('');
  const [foodInputType, setFoodInputType] = useState('loved');
  const [validatingFood, setValidatingFood] = useState(false);
  const [calories, setCalories] = useState('2000');
  const [protein, setProtein] = useState('150');
  const [carbs, setCarbs] = useState('200');
  const [fat, setFat] = useState('60');
  const [enableMoodCheckins, setEnableMoodCheckins] = useState(true);
  const [enableCaloriePrompts, setEnableCaloriePrompts] = useState(true);

  const weightGoalOptions = [
    { value: 'build_muscle', label: 'Build Muscle', icon: '💪', description: 'Higher protein, strength-focused workouts' },
    { value: 'lose_fat', label: 'Lose Fat', icon: '🔥', description: 'Calorie deficit, cardio + resistance training' },
    { value: 'maintain', label: 'Maintain Weight', icon: '⚖️', description: 'Balanced nutrition, consistent activity' },
  ];

  const dietaryOptions = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
    'Keto', 'Paleo', 'Halal', 'Kosher',
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
  };

  const loadProfile = async () => {
    try {
      const token = await getToken();
      setAuthToken(token);
      const email = user?.emailAddresses?.[0]?.emailAddress;
      setUserInfo(user?.id, email);

      // Load user data (for name and phone)
      const userData = await getUserByClerkId(user?.id);
      if (userData) {
        setBackendUserId(userData.id);
        setFirstName(userData.first_name || '');
        setLastName(userData.last_name || '');
        setPhoneNumber(userData.phone_number ? formatPhoneNumber(userData.phone_number) : '');
      }

      const profile = await getMyProfile();

      if (profile) {
        setWeightGoal(profile.weight_goal || '');
        setStartingWeight(profile.starting_weight?.toString() || '');
        setWeightUnit(profile.weight_unit || 'lb');
        setDietaryRestrictions(profile.dietary_restrictions || []);

        if (profile.food_preferences) {
          setLovedFoods(profile.food_preferences.lovedFoods || []);
          setAvoidedFoods(profile.food_preferences.avoidedFoods || []);
        }

        if (profile.macro_targets) {
          setCalories(profile.macro_targets.calories?.toString() || '2000');
          setProtein(profile.macro_targets.protein?.toString() || '150');
          setCarbs(profile.macro_targets.carbs?.toString() || '200');
          setFat(profile.macro_targets.fat?.toString() || '60');
        }

        if (profile.notification_settings) {
          setEnableMoodCheckins(profile.notification_settings.enableMoodCheckins ?? true);
          setEnableCaloriePrompts(profile.notification_settings.enableCaloriePrompts ?? true);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update user personal info
      if (backendUserId) {
        // Convert formatted phone to raw digits for storage
        const rawPhone = phoneNumber.replace(/\D/g, '');
        await updateUser(backendUserId, {
          firstName: firstName || null,
          lastName: lastName || null,
          phoneNumber: rawPhone || null,
        });
      }

      // Update profile settings
      await updateMyProfile({
        weight_goal: weightGoal || null,
        starting_weight: startingWeight ? parseFloat(startingWeight) : null,
        weight_unit: weightUnit,
        dietary_restrictions: dietaryRestrictions,
        food_preferences: {
          lovedFoods,
          avoidedFoods,
        },
        macro_targets: {
          calories: parseInt(calories) || 2000,
          protein: parseInt(protein) || 150,
          carbs: parseInt(carbs) || 200,
          fat: parseInt(fat) || 60,
        },
        notification_settings: {
          enableMoodCheckins,
          enableCaloriePrompts,
          quietHoursStart: 22,
          quietHoursEnd: 7,
        },
      });

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleDietaryRestriction = (restriction) => {
    if (dietaryRestrictions.includes(restriction)) {
      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
    } else {
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    }
  };

  const validateAndAddFood = async () => {
    if (!foodInput.trim()) return;

    const foodName = foodInput.trim().toLowerCase();

    if (lovedFoods.includes(foodName) || avoidedFoods.includes(foodName)) {
      Alert.alert('Already Added', 'This food is already in your preferences.');
      return;
    }

    setValidatingFood(true);
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&action=process&json=1&page_size=5`
      );
      const data = await response.json();

      const hasResults = data.products && data.products.length > 0;
      const matchesSearch = hasResults && data.products.some(p =>
        p.product_name?.toLowerCase().includes(foodName) ||
        p.generic_name?.toLowerCase().includes(foodName) ||
        p.categories?.toLowerCase().includes(foodName)
      );

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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveButton, saving && styles.saveButtonDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Personal Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Info</Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>First Name</Text>
            <TextInput
              style={styles.nameInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter first name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Last Name</Text>
            <TextInput
              style={styles.nameInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Enter last name"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.nameInput}
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(formatPhoneNumber(text))}
              placeholder="(555) 123-4567"
              keyboardType="phone-pad"
              maxLength={14}
            />
          </View>

          <Text style={styles.inputHint}>
            Email: {user?.emailAddresses?.[0]?.emailAddress}
          </Text>
        </View>

        {/* Goals Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fitness Goal</Text>
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
        </View>

        {/* Weight Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Starting Weight</Text>
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

        {/* Dietary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Restrictions</Text>
          <View style={styles.chipContainer}>
            {dietaryOptions.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.chip,
                  dietaryRestrictions.includes(option) && styles.chipSelected,
                ]}
                onPress={() => toggleDietaryRestriction(option)}
              >
                <Text style={[
                  styles.chipText,
                  dietaryRestrictions.includes(option) && styles.chipTextSelected,
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Food Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food Preferences</Text>
          <Text style={styles.sectionSubtitle}>Help our AI suggest recipes you'll love</Text>

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
              placeholder={foodInputType === 'loved' ? "e.g., pizza, salmon" : "e.g., seafood, mushrooms"}
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
        </View>

        {/* Macros Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Nutrition Goals</Text>

          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Calories</Text>
            <View style={styles.macroInputContainer}>
              <TextInput
                style={styles.macroInput}
                value={calories}
                onChangeText={setCalories}
                keyboardType="number-pad"
              />
              <Text style={styles.macroUnit}>kcal</Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Protein</Text>
            <View style={styles.macroInputContainer}>
              <TextInput
                style={styles.macroInput}
                value={protein}
                onChangeText={setProtein}
                keyboardType="number-pad"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Carbs</Text>
            <View style={styles.macroInputContainer}>
              <TextInput
                style={styles.macroInput}
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="number-pad"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            <Text style={styles.macroLabel}>Fat</Text>
            <View style={styles.macroInputContainer}>
              <TextInput
                style={styles.macroInput}
                value={fat}
                onChangeText={setFat}
                keyboardType="number-pad"
              />
              <Text style={styles.macroUnit}>g</Text>
            </View>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

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

          <TouchableOpacity
            style={styles.reminderSettingsButton}
            onPress={() => onNavigate('reminders')}
          >
            <Text style={styles.reminderSettingsIcon}>🔔</Text>
            <View style={styles.reminderSettingsInfo}>
              <Text style={styles.reminderSettingsLabel}>Reminder Settings</Text>
              <Text style={styles.reminderSettingsDescription}>Configure meal, workout, and water reminders</Text>
            </View>
            <Text style={styles.reminderSettingsArrow}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently deleted.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert(
                        'Confirm Deletion',
                        'Please type DELETE to confirm account deletion.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Confirm',
                            style: 'destructive',
                            onPress: async () => {
                              try {
                                // Call backend to delete user data
                                const token = await getToken();
                                setAuthToken(token);
                                await deleteMyAccount();
                                Alert.alert('Account Deleted', 'Your account has been deleted.');
                                // Sign out will happen automatically
                              } catch (error) {
                                console.error('Error deleting account:', error);
                                Alert.alert('Error', 'Failed to delete account. Please try again.');
                              }
                            }
                          }
                        ]
                      );
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
          <Text style={styles.dangerHint}>
            This will permanently delete all your data including workouts, meals, and progress.
          </Text>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  nameInput: {
    flex: 2,
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  inputHint: {
    fontSize: 14,
    color: '#888',
    marginTop: 12,
    fontStyle: 'italic',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    marginBottom: 8,
  },
  optionCardSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f7ff',
  },
  optionIcon: {
    fontSize: 20,
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
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
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
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  macroLabel: {
    fontSize: 16,
    color: '#333',
  },
  macroInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroInput: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    minWidth: 60,
    padding: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  macroUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    width: 30,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 14,
    color: '#666',
  },
  bottomPadding: {
    height: 40,
  },
  // Food preferences styles
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    marginTop: -8,
  },
  foodTypeToggle: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  foodTypeButton: {
    flex: 1,
    paddingVertical: 10,
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
    marginBottom: 16,
  },
  foodInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    marginRight: 8,
  },
  addFoodButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFoodButtonDisabled: {
    opacity: 0.6,
  },
  addFoodButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  foodListSection: {
    marginBottom: 12,
  },
  foodListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  foodChipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  foodChipLoved: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  foodChipAvoided: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  foodChipText: {
    fontSize: 13,
    color: '#333',
    marginRight: 5,
  },
  foodChipRemove: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
  },
  // Account deletion styles
  dangerButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  // Reminder settings button
  reminderSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginTop: 12,
  },
  reminderSettingsIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  reminderSettingsInfo: {
    flex: 1,
  },
  reminderSettingsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reminderSettingsDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reminderSettingsArrow: {
    fontSize: 18,
    color: '#999',
  },
});
