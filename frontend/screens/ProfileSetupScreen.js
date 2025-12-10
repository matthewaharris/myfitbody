import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { createUser, createUserProfile, setAuthToken, setUserInfo } from '../services/api';

export default function ProfileSetupScreen({ onComplete }) {
  const { getToken } = useAuth();
  const { user } = useUser();
  const [weightGoal, setWeightGoal] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState([]);
  const [loading, setLoading] = useState(false);

  const weightGoalOptions = [
    { value: 'build_muscle', label: 'Build Muscle' },
    { value: 'lose_fat', label: 'Lose Fat' },
    { value: 'maintain', label: 'Maintain Weight' },
    { value: 'recomp', label: 'Body Recomposition' },
  ];

  const dietaryOptions = [
    'Vegetarian',
    'Vegan',
    'Gluten-Free',
    'Dairy-Free',
    'Keto',
    'Paleo',
    'Halal',
    'Kosher',
  ];

  const toggleDietaryRestriction = (restriction) => {
    if (dietaryRestrictions.includes(restriction)) {
      setDietaryRestrictions(dietaryRestrictions.filter(r => r !== restriction));
    } else {
      setDietaryRestrictions([...dietaryRestrictions, restriction]);
    }
  };

  const handleSubmit = async () => {
    if (!weightGoal) {
      Alert.alert('Required', 'Please select a weight goal');
      return;
    }

    setLoading(true);

    try {
      // Debug: Check user object
      console.log('User object:', user);
      console.log('User ID:', user?.id);
      console.log('User email:', user?.emailAddresses?.[0]?.emailAddress);

      if (!user || !user.id) {
        throw new Error('User information not available');
      }

      // Get Clerk token and set auth headers
      const token = await getToken();
      setAuthToken(token);

      // Set user info headers (required by backend auth middleware)
      const email = user.emailAddresses[0].emailAddress;
      setUserInfo(user.id, email);

      // Create user in backend
      const newUser = await createUser(
        user.id,
        user.emailAddresses[0].emailAddress
      );

      // Create user profile
      await createUserProfile(newUser.id, {
        weightGoal,
        dietaryRestrictions,
        macroTargets: {
          protein: 150,
          carbs: 200,
          fat: 60,
          calories: 2000,
        },
      });

      Alert.alert('Success', 'Profile created successfully!');
      onComplete();
    } catch (error) {
      console.error('Profile creation error:', error);
      console.error('Full error:', error.response || error);
      Alert.alert(
        'Error',
        error.response?.data?.error || error.message || 'Failed to create profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete Your Profile</Text>
        <Text style={styles.subtitle}>Help us personalize your experience</Text>

        {/* Weight Goal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's your primary goal?</Text>
          {weightGoalOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                weightGoal === option.value && styles.optionButtonSelected,
              ]}
              onPress={() => setWeightGoal(option.value)}
            >
              <Text
                style={[
                  styles.optionText,
                  weightGoal === option.value && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dietary Restrictions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Dietary Restrictions (Optional)
          </Text>
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
                <Text
                  style={[
                    styles.chipText,
                    dietaryRestrictions.includes(option) && styles.chipTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={loading ? 'Creating Profile...' : 'Complete Setup'}
            onPress={handleSubmit}
            disabled={loading}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  optionButton: {
    padding: 15,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 10,
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF10',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 15,
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
  buttonContainer: {
    marginTop: 20,
    marginBottom: 40,
  },
});
