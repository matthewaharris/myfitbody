import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Alert } from 'react-native';
import { ClerkProvider, useAuth, useSignIn, useSignUp, useUser } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import ProfileSetupWizard from './screens/ProfileSetupWizard';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import WorkoutScreen from './screens/WorkoutScreen';
import MealScreen from './screens/MealScreen';
import ProgressScreen from './screens/ProgressScreen';
import WaterScreen from './screens/WaterScreen';
import StatsScreen from './screens/StatsScreen';
import RecipeScreen from './screens/RecipeScreen';
import AIScreen from './screens/AIScreen';
import MoodCheckinScreen from './screens/MoodCheckinScreen';
import BadgesScreen from './screens/BadgesScreen';
import JournalScreen from './screens/JournalScreen';
import ReminderSettingsScreen from './screens/ReminderSettingsScreen';
import { getUserByClerkId, updatePushToken, setAuthToken, setUserInfo } from './services/api';
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from './services/notifications';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Missing Publishable Key');
}

// Token cache for Clerk
const tokenCache = {
  async getToken(key) {
    try {
      const item = await SecureStore.getItemAsync(key);
      return item;
    } catch (err) {
      return null;
    }
  },
  async saveToken(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};

// Sign In Screen
function SignInScreen({ onNavigate }) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { isSignedIn } = useAuth();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');

  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      // Check if already signed in
      if (isSignedIn) {
        // Already have a session, just return
        return;
      }

      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });

      await setActive({ session: completeSignIn.createdSessionId });
    } catch (err) {
      // Handle "session already exists" error
      if (err.errors?.[0]?.code === 'session_exists') {
        // Session exists, try to use it
        try {
          if (signIn.createdSessionId) {
            await setActive({ session: signIn.createdSessionId });
          }
        } catch (e) {
          console.log('Could not activate existing session');
        }
        return;
      }
      Alert.alert('Error', err.errors ? err.errors[0].message : 'Sign in failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In to MyFitBody</Text>

      <TextInput
        autoCapitalize="none"
        value={emailAddress}
        placeholder="Email"
        onChangeText={setEmailAddress}
        style={styles.input}
      />

      <TextInput
        value={password}
        placeholder="Password"
        secureTextEntry
        onChangeText={setPassword}
        style={styles.input}
      />

      <Button title="Sign In" onPress={onSignInPress} />

      <View style={styles.footer}>
        <Text>Don't have an account? </Text>
        <Button title="Sign Up" onPress={() => onNavigate('signup')} />
      </View>
    </View>
  );
}

// Sign Up Screen
function SignUpScreen({ onNavigate }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err) {
      Alert.alert('Error', err.errors ? err.errors[0].message : 'Sign up failed');
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      await setActive({ session: completeSignUp.createdSessionId });
    } catch (err) {
      Alert.alert('Error', err.errors ? err.errors[0].message : 'Verification failed');
    }
  };

  return (
    <View style={styles.container}>
      {!pendingVerification ? (
        <>
          <Text style={styles.title}>Sign Up for MyFitBody</Text>

          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Email"
            onChangeText={setEmailAddress}
            style={styles.input}
          />

          <TextInput
            value={password}
            placeholder="Password"
            secureTextEntry
            onChangeText={setPassword}
            style={styles.input}
          />

          <Button title="Sign Up" onPress={onSignUpPress} />

          <View style={styles.footer}>
            <Text>Already have an account? </Text>
            <Button title="Sign In" onPress={() => onNavigate('signin')} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to {emailAddress}
          </Text>

          <TextInput
            value={code}
            placeholder="Enter verification code"
            onChangeText={setCode}
            style={styles.input}
            keyboardType="number-pad"
          />

          <Button title="Verify Email" onPress={onVerifyPress} />
        </>
      )}
    </View>
  );
}

// Note: HomeScreen is now imported from ./screens/HomeScreen

// Main App with custom navigation
function MainApp() {
  const { isSignedIn, isLoaded, user, getToken } = useAuth();
  const [currentScreen, setCurrentScreen] = useState('signin');
  const [appScreen, setAppScreen] = useState('home'); // 'home', 'profile', 'workout', 'setup'
  const [navParams, setNavParams] = useState({}); // Store navigation params
  const [hasProfile, setHasProfile] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [backendUserId, setBackendUserId] = useState(null);

  // Notification listeners
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    const checkUserProfile = async () => {
      if (isSignedIn && user) {
        try {
          console.log('Checking profile for user:', user.id);
          const token = await getToken();
          setAuthToken(token);

          // Set user info headers for backend auth
          const email = user.emailAddresses?.[0]?.emailAddress;
          setUserInfo(user.id, email);

          const backendUser = await getUserByClerkId(user.id);
          console.log('Backend user found:', backendUser);
          setHasProfile(!!backendUser);
          if (backendUser) {
            setBackendUserId(backendUser.id);
          }
        } catch (error) {
          console.log('Error checking profile:', error.message);
          console.log('API Error details:', error.response?.data || error);
          // User doesn't exist in backend yet
          setHasProfile(false);
        } finally {
          setCheckingProfile(false);
        }
      } else {
        setCheckingProfile(false);
      }
    };

    checkUserProfile();
  }, [isSignedIn, user]);

  // Register for push notifications when user is signed in and has a backend user ID
  useEffect(() => {
    const setupPushNotifications = async () => {
      if (isSignedIn && backendUserId) {
        try {
          const pushToken = await registerForPushNotifications();
          if (pushToken) {
            console.log('Registering push token with backend:', pushToken);
            await updatePushToken(backendUserId, pushToken);
          }
        } catch (error) {
          console.log('Error setting up push notifications:', error);
        }
      }
    };

    setupPushNotifications();

    // Listen for incoming notifications (when app is foregrounded)
    notificationListener.current = addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification taps
    responseListener.current = addNotificationResponseListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;

      // Handle navigation based on notification data
      if (data?.screen) {
        setNavParams(data.params || {});
        setAppScreen(data.screen);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isSignedIn, backendUserId]);

  // Navigation function to pass to screens
  const navigate = (screen, params = {}) => {
    setNavParams(params);
    setAppScreen(screen);
  };

  if (!isLoaded || checkingProfile) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (isSignedIn) {
    console.log('User is signed in, hasProfile:', hasProfile, 'appScreen:', appScreen);

    // Show setup wizard for new users OR when navigating to setup
    if (hasProfile === false || appScreen === 'setup') {
      return (
        <ProfileSetupWizard
          onComplete={() => {
            setHasProfile(true);
            setAppScreen('home');
          }}
          onSkip={() => {
            setHasProfile(true);
            setAppScreen('home');
          }}
        />
      );
    }

    // Profile editing screen
    if (appScreen === 'profile') {
      return <ProfileScreen onNavigate={navigate} />;
    }

    // Workout logging screen
    if (appScreen === 'workout') {
      return <WorkoutScreen
        onNavigate={navigate}
        workoutId={navParams.workoutId}
        cloneFromId={navParams.cloneFromId}
      />;
    }

    // Meal logging screen
    if (appScreen === 'meal') {
      return <MealScreen
        onNavigate={navigate}
        editMealId={navParams.editMealId}
        mealType={navParams.mealType}
        date={navParams.date}
      />;
    }

    // Progress/Measurements screen
    if (appScreen === 'progress') {
      return <ProgressScreen onNavigate={navigate} />;
    }

    // Water intake screen
    if (appScreen === 'water') {
      return <WaterScreen onNavigate={navigate} />;
    }

    // Stats/charts screen
    if (appScreen === 'stats') {
      return <StatsScreen onNavigate={navigate} />;
    }

    // Recipe management screen
    if (appScreen === 'recipes') {
      return <RecipeScreen onNavigate={navigate} />;
    }

    // AI Assistant screen
    if (appScreen === 'ai') {
      return <AIScreen onNavigate={navigate} />;
    }

    // Mood Check-in screen
    if (appScreen === 'mood') {
      return <MoodCheckinScreen onNavigate={navigate} />;
    }

    // Badges/Achievements screen
    if (appScreen === 'badges') {
      return <BadgesScreen onNavigate={navigate} />;
    }

    // Journal screen
    if (appScreen === 'journal') {
      return <JournalScreen onNavigate={navigate} />;
    }

    // Reminder settings screen
    if (appScreen === 'reminders') {
      return <ReminderSettingsScreen onNavigate={navigate} />;
    }

    // Default: Home screen
    return <HomeScreen onNavigate={navigate} />;
  }

  if (currentScreen === 'signup') {
    return <SignUpScreen onNavigate={setCurrentScreen} />;
  }

  return <SignInScreen onNavigate={setCurrentScreen} />;
}

export default function App() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <MainApp />
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
});