import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuth, useUser } from '../hooks/useAuth';
import { getDailyStats, getWorkouts, getMeals, getMe, setAuthToken, setUserInfo, getSmartSuggestions, getCalorieBurnSuggestions, deleteMeal } from '../services/api';
import { colors } from '../theme';

export default function HomeScreen({ onNavigate }) {
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const [dailyStats, setDailyStats] = useState(null);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [recentMeals, setRecentMeals] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityTab, setActivityTab] = useState('workouts'); // 'workouts' or 'meals'
  const [userFirstName, setUserFirstName] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [calorieBurnSuggestions, setCalorieBurnSuggestions] = useState(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getFirstName = () => {
    // First check our backend user data
    if (userFirstName) return userFirstName;
    // Then check auth user data
    if (user?.firstName) return user.firstName;
    // Fallback to email username
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (email) return email.split('@')[0];
    return 'there';
  };

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      setAuthToken(token);
      const email = user?.emailAddresses?.[0]?.emailAddress;
      setUserInfo(user?.id, email);

      const [stats, workouts, meals, userData, suggestionsData] = await Promise.all([
        getDailyStats().catch(() => null),
        getWorkouts(5).catch(() => []),
        getMeals().catch(() => []),
        getMe().catch(() => null),
        getSmartSuggestions().catch(() => ({ suggestions: [] })),
      ]);

      setDailyStats(stats);
      setRecentWorkouts(workouts || []);
      setRecentMeals(meals || []);
      setSuggestions(suggestionsData?.suggestions || []);
      if (userData?.first_name) {
        setUserFirstName(userData.first_name);
      }

      // Check if user is over calories and get burn suggestions
      if (stats?.caloriesRemaining < 0 && Math.abs(stats.caloriesRemaining) > 100) {
        const burnSuggestions = await getCalorieBurnSuggestions(Math.abs(stats.caloriesRemaining)).catch(() => null);
        setCalorieBurnSuggestions(burnSuggestions);
      } else {
        setCalorieBurnSuggestions(null);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken, user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleDeleteMeal = (meal) => {
    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${meal.food_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMeal(meal.id);
              await loadData(); // Refresh the list
            } catch (error) {
              console.error('Error deleting meal:', error);
              Alert.alert('Error', 'Failed to delete meal');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getWorkoutTotals = (workout) => {
    if (!workout.workout_exercises || workout.workout_exercises.length === 0) {
      return { exercises: 0, sets: 0, reps: 0 };
    }

    let totalSets = 0;
    let totalReps = 0;

    workout.workout_exercises.forEach((exercise) => {
      // Sets is stored as a number (count of sets)
      const sets = parseInt(exercise.sets) || 0;
      const reps = parseInt(exercise.reps) || 0;
      totalSets += sets;
      // Total reps = sets * reps per set
      totalReps += sets * reps;
    });

    return {
      exercises: workout.workout_exercises.length,
      sets: totalSets,
      reps: totalReps,
    };
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getMealTypeIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      case 'snack': return '🍎';
      default: return '🍽️';
    }
  };

  const formatMealType = (mealType) => {
    if (!mealType) return 'Meal';
    return mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  // Group meals by day and then by meal type
  const groupMealsByDayAndType = (meals) => {
    const grouped = {};
    const mealTypeOrder = ['breakfast', 'lunch', 'dinner', 'snack'];

    meals.forEach(meal => {
      const dateKey = meal.meal_date ? meal.meal_date.split('T')[0] : 'unknown';
      const mealType = meal.meal_type || 'other';

      if (!grouped[dateKey]) {
        grouped[dateKey] = {};
      }
      if (!grouped[dateKey][mealType]) {
        grouped[dateKey][mealType] = [];
      }
      grouped[dateKey][mealType].push(meal);
    });

    // Convert to array sorted by date (newest first), with meal types in order
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, mealTypes]) => ({
        date,
        mealTypes: mealTypeOrder
          .filter(type => mealTypes[type])
          .map(type => ({
            type,
            meals: mealTypes[type],
            totalCalories: mealTypes[type].reduce((sum, m) => sum + (m.calories || 0), 0)
          }))
      }));
  };

  const groupedMeals = groupMealsByDayAndType(recentMeals);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{getFirstName()}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => onNavigate('profile')}
          >
            <Text style={styles.profileButtonText}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Today's Summary</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : dailyStats ? (
            <>
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{dailyStats.consumed || 0}</Text>
                  <Text style={styles.statLabel}>Eaten</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{dailyStats.burned || 0}</Text>
                  <Text style={styles.statLabel}>Burned</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{dailyStats.remaining}</Text>
                  <Text style={styles.statLabel}>Remaining</Text>
                </View>
              </View>
              {dailyStats.workoutsLogged > 0 && (
                <Text style={styles.workoutCount}>
                  {dailyStats.workoutsLogged} workout{dailyStats.workoutsLogged !== 1 ? 's' : ''} today
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.noDataText}>Start tracking to see your stats!</Text>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => onNavigate('workout')}
          >
            <Text style={styles.actionIcon}>🏋️</Text>
            <Text style={styles.primaryActionText}>Log Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryAction}
            onPress={() => onNavigate('meal')}
          >
            <Text style={styles.actionIcon}>🍽️</Text>
            <Text style={styles.secondaryActionText}>Log Meal</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Access - grouped by what you want to do */}
        {[
          {
            title: 'Track',
            tiles: [
              { icon: '💧', label: 'Water', screen: 'water' },
              { icon: '🧖', label: 'Sauna', screen: 'sauna' },
              { icon: '😊', label: 'Mood', screen: 'mood' },
              { icon: '📝', label: 'Journal', screen: 'journal' },
            ],
          },
          {
            title: 'Review',
            tiles: [
              { icon: '📊', label: 'Progress', screen: 'progress' },
              { icon: '📈', label: 'Stats', screen: 'stats' },
              { icon: '🏆', label: 'Badges', screen: 'badges' },
            ],
          },
          {
            title: 'Plan',
            tiles: [
              { icon: '📖', label: 'Recipes', screen: 'recipes' },
              { icon: '🤖', label: 'AI', screen: 'ai' },
            ],
          },
        ].map((group) => (
          <View key={group.title} style={styles.quickAccessSection}>
            <Text style={styles.quickAccessSectionTitle}>{group.title}</Text>
            <View style={styles.quickAccessGrid}>
              {group.tiles.map((tile) => (
                <TouchableOpacity
                  key={tile.screen}
                  style={styles.quickAccessButton}
                  onPress={() => onNavigate(tile.screen)}
                >
                  <Text style={styles.quickAccessIcon}>{tile.icon}</Text>
                  <Text style={styles.quickAccessLabel}>{tile.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Smart Suggestions */}
        {(suggestions.length > 0 || calorieBurnSuggestions) && (
          <View style={styles.suggestionsSection}>
            <Text style={styles.sectionTitle}>Suggestions for You</Text>

            {suggestions.map((suggestion, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.suggestionCard}
                onPress={() => {
                  if (suggestion.action === 'log_meal') onNavigate('meal');
                  else if (suggestion.action === 'start_workout') onNavigate('workout');
                  else if (suggestion.action === 'view_stats') onNavigate('stats');
                }}
              >
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                  <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
                </View>
                <Text style={styles.suggestionArrow}>→</Text>
              </TouchableOpacity>
            ))}

            {calorieBurnSuggestions && calorieBurnSuggestions.suggestions?.length > 0 && (
              <View style={styles.calorieBurnCard}>
                <Text style={styles.calorieBurnTitle}>{calorieBurnSuggestions.message}</Text>
                <View style={styles.calorieBurnOptions}>
                  {calorieBurnSuggestions.suggestions.slice(0, 3).map((s, idx) => (
                    <View key={idx} style={styles.calorieBurnOption}>
                      <Text style={styles.calorieBurnIcon}>{s.icon}</Text>
                      <Text style={styles.calorieBurnText}>{s.description}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>

          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activityTab === 'workouts' && styles.activeTab]}
              onPress={() => setActivityTab('workouts')}
            >
              <Text style={[styles.tabText, activityTab === 'workouts' && styles.activeTabText]}>
                Workouts
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activityTab === 'meals' && styles.activeTab]}
              onPress={() => setActivityTab('meals')}
            >
              <Text style={[styles.tabText, activityTab === 'meals' && styles.activeTabText]}>
                Meals
              </Text>
            </TouchableOpacity>
          </View>

          {/* Workouts Tab Content */}
          {activityTab === 'workouts' && (
            recentWorkouts.length > 0 ? (
              recentWorkouts.map((workout) => {
                const totals = getWorkoutTotals(workout);
                return (
                  <View key={workout.id} style={styles.activityItemContainer}>
                    <TouchableOpacity
                      style={styles.activityItem}
                      onPress={() => onNavigate('workout', { workoutId: workout.id })}
                    >
                      <View style={styles.activityIcon}>
                        <Text>💪</Text>
                      </View>
                      <View style={styles.activityInfo}>
                        <Text style={styles.activityTitle}>
                          {workout.name || 'Workout'}
                        </Text>
                        <Text style={styles.activityMeta}>
                          {formatDate(workout.workout_date)}
                          {workout.duration_minutes && ` • ${workout.duration_minutes} min`}
                          {workout.estimated_calories_burned && ` • ${workout.estimated_calories_burned} kcal`}
                        </Text>
                        {totals.exercises > 0 && (
                          <Text style={styles.activityStats}>
                            {totals.exercises} exercise{totals.exercises !== 1 ? 's' : ''} • {totals.sets} set{totals.sets !== 1 ? 's' : ''} • {totals.reps} rep{totals.reps !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.editIcon}>›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cloneButton}
                      onPress={() => onNavigate('workout', { cloneFromId: workout.id })}
                    >
                      <Text style={styles.cloneButtonText}>Clone</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyIcon}>🎯</Text>
                <Text style={styles.emptyText}>No workouts yet</Text>
                <Text style={styles.emptySubtext}>
                  Start your fitness journey by logging your first workout!
                </Text>
              </View>
            )
          )}

          {/* Meals Tab Content */}
          {activityTab === 'meals' && (
            groupedMeals.length > 0 ? (
              groupedMeals.map((dayGroup) => (
                <View key={dayGroup.date} style={styles.dayGroup}>
                  <Text style={styles.dayGroupHeader}>{formatDate(dayGroup.date)}</Text>
                  {dayGroup.mealTypes.map((mealTypeGroup) => (
                    <View key={`${dayGroup.date}-${mealTypeGroup.type}`} style={styles.mealTypeGroup}>
                      <View style={styles.mealTypeHeader}>
                        <Text style={styles.mealTypeIcon}>{getMealTypeIcon(mealTypeGroup.type)}</Text>
                        <Text style={styles.mealTypeTitle}>{formatMealType(mealTypeGroup.type)}</Text>
                        <Text style={styles.mealTypeCalories}>{mealTypeGroup.totalCalories} kcal</Text>
                        <TouchableOpacity
                          style={styles.addToMealButton}
                          onPress={() => onNavigate('meal', { mealType: mealTypeGroup.type, date: dayGroup.date })}
                        >
                          <Text style={styles.addToMealButtonText}>+</Text>
                        </TouchableOpacity>
                      </View>
                      {mealTypeGroup.meals.map((meal) => (
                        <View key={meal.id} style={styles.mealItem}>
                          <TouchableOpacity
                            style={styles.mealItemContent}
                            onPress={() => onNavigate('meal', { editMealId: meal.id })}
                          >
                            <Text style={styles.mealItemName}>{meal.food_name}</Text>
                            <Text style={styles.mealItemCalories}>{meal.calories} kcal</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteMealButton}
                            onPress={() => handleDeleteMeal(meal)}
                          >
                            <Text style={styles.deleteMealButtonText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyIcon}>🍽️</Text>
                <Text style={styles.emptyText}>No meals logged yet</Text>
                <Text style={styles.emptySubtext}>
                  Track your nutrition by logging what you eat!
                </Text>
              </View>
            )
          )}
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 20,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 20,
  },
  summaryCard: {
    backgroundColor: colors.primary,
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  noDataText: {
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  workoutCount: {
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  primaryAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  primaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  secondaryActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  quickAccessSection: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  quickAccessSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 2,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickAccessButton: {
    width: '22%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickAccessIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  quickAccessLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
  },
  activityItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  cloneButton: {
    alignSelf: 'flex-start',
    marginLeft: 52,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 14,
  },
  cloneButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  activityMeta: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  activityStats: {
    fontSize: 13,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  editIcon: {
    fontSize: 24,
    color: '#ccc',
    marginLeft: 8,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  signOutButton: {
    margin: 16,
    padding: 16,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 16,
    color: colors.danger,
  },
  // Suggestions styles
  suggestionsSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  suggestionDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  suggestionArrow: {
    fontSize: 18,
    color: colors.primary,
    marginLeft: 8,
  },
  calorieBurnCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ffb74d',
  },
  calorieBurnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 10,
  },
  calorieBurnOptions: {
    gap: 8,
  },
  calorieBurnOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calorieBurnIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  calorieBurnText: {
    fontSize: 14,
    color: colors.text,
  },
  // Grouped meals styles
  dayGroup: {
    marginBottom: 16,
  },
  dayGroupHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4CAF50',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mealTypeGroup: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  mealTypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  mealTypeIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  mealTypeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  mealTypeCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  mealItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
    paddingRight: 8,
  },
  mealItemName: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  mealItemCalories: {
    fontSize: 13,
    color: '#888',
  },
  deleteMealButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteMealButtonText: {
    fontSize: 12,
    color: '#f44336',
    fontWeight: '600',
  },
  addToMealButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addToMealButtonText: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '600',
    lineHeight: 22,
  },
});
