import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import {
  getWeeklyStats,
  getStreaks,
  setAuthToken,
  setUserInfo,
} from '../services/api';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 64;

// Simple Bar Chart Component
function BarChart({ data, maxValue, barColor = '#007AFF', label }) {
  const barWidth = Math.max((chartWidth - (data.length * 4)) / data.length, 8);

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.label}>{label}</Text>
      <View style={chartStyles.chartArea}>
        <View style={chartStyles.barsContainer}>
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <View key={index} style={chartStyles.barWrapper}>
                <View style={[chartStyles.bar, { height: `${height}%`, backgroundColor: barColor, width: barWidth }]} />
                <Text style={chartStyles.barLabel}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

// Simple Line Chart Component
function LineChart({ data, minValue, maxValue, lineColor = '#4CAF50', label, unit = '' }) {
  if (data.length < 2) {
    return (
      <View style={chartStyles.container}>
        <Text style={chartStyles.label}>{label}</Text>
        <View style={chartStyles.emptyChart}>
          <Text style={chartStyles.emptyText}>Not enough data points</Text>
        </View>
      </View>
    );
  }

  const range = maxValue - minValue || 1;
  const points = data.map((item, index) => ({
    x: (index / (data.length - 1)) * chartWidth,
    y: 100 - ((item.value - minValue) / range) * 100,
    value: item.value,
    label: item.label,
  }));

  return (
    <View style={chartStyles.container}>
      <Text style={chartStyles.label}>{label}</Text>
      <View style={chartStyles.lineChartArea}>
        {/* Y-axis labels */}
        <View style={chartStyles.yAxis}>
          <Text style={chartStyles.yAxisLabel}>{maxValue}{unit}</Text>
          <Text style={chartStyles.yAxisLabel}>{Math.round((maxValue + minValue) / 2)}{unit}</Text>
          <Text style={chartStyles.yAxisLabel}>{minValue}{unit}</Text>
        </View>

        {/* Chart content */}
        <View style={chartStyles.lineChartContent}>
          {/* Grid lines */}
          <View style={[chartStyles.gridLine, { top: '0%' }]} />
          <View style={[chartStyles.gridLine, { top: '50%' }]} />
          <View style={[chartStyles.gridLine, { top: '100%' }]} />

          {/* Data points */}
          {points.map((point, index) => (
            <View
              key={index}
              style={[
                chartStyles.dataPoint,
                {
                  left: point.x - 6,
                  top: `${point.y}%`,
                  backgroundColor: lineColor,
                },
              ]}
            />
          ))}

          {/* X-axis labels */}
          <View style={chartStyles.xAxisLabels}>
            {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0).map((item, index) => (
              <Text key={index} style={chartStyles.xAxisLabel}>{item.label}</Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function StatsScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [stats, setStats] = useState(null);
  const [streaks, setStreaks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'calories', 'weight'

  useEffect(() => {
    setupAuth();
  }, []);

  const setupAuth = async () => {
    const token = await getToken();
    setAuthToken(token);
    const email = user?.emailAddresses?.[0]?.emailAddress;
    setUserInfo(user?.id, email);
    loadData();
  };

  const loadData = async () => {
    try {
      const [statsData, streaksData] = await Promise.all([
        getWeeklyStats(8),
        getStreaks(),
      ]);
      setStats(statsData);
      setStreaks(streaksData);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const getCalorieChartData = () => {
    if (!stats?.weekly) return [];
    return stats.weekly.slice(-7).map((week) => ({
      label: new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: week.avg_daily_calories,
    }));
  };

  const getWorkoutChartData = () => {
    if (!stats?.weekly) return [];
    return stats.weekly.slice(-7).map((week) => ({
      label: new Date(week.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: week.workout_count,
    }));
  };

  const getWeightChartData = () => {
    if (!stats?.weight || stats.weight.length === 0) return [];
    return stats.weight.slice(-14).map((w) => ({
      label: new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: w.weight,
    }));
  };

  const getDailyCaloriesData = () => {
    if (!stats?.daily) return [];
    return stats.daily.slice(-14).map((d) => ({
      label: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
      value: d.calories_consumed,
    }));
  };

  const getMaxCalories = () => {
    const data = getCalorieChartData();
    return Math.max(...data.map(d => d.value), 2000);
  };

  const getMaxWorkouts = () => {
    const data = getWorkoutChartData();
    return Math.max(...data.map(d => d.value), 5);
  };

  const getWeightRange = () => {
    const data = getWeightChartData();
    if (data.length === 0) return { min: 0, max: 200 };
    const values = data.map(d => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 5;
    return { min: Math.floor(min - padding), max: Math.ceil(max + padding) };
  };

  const getTotalStats = () => {
    if (!stats?.weekly) return { calories: 0, workouts: 0, burned: 0 };
    const recent = stats.weekly.slice(-4); // Last 4 weeks
    return {
      calories: recent.reduce((sum, w) => sum + w.total_calories, 0),
      workouts: recent.reduce((sum, w) => sum + w.workout_count, 0),
      burned: recent.reduce((sum, w) => sum + w.total_burned, 0),
    };
  };

  const totals = getTotalStats();
  const weightRange = getWeightRange();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Statistics</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Streak Cards */}
        {streaks && (
          <View style={styles.streakContainer}>
            <View style={styles.streakCard}>
              <Text style={styles.streakEmoji}>🏋️</Text>
              <Text style={styles.streakValue}>
                {streaks.workouts_this_week}/{streaks.workouts_goal}
              </Text>
              <Text style={styles.streakLabel}>Workouts this week</Text>
              {streaks.workout_streak_weeks > 0 && (
                <Text style={styles.streakBadge}>
                  🔥 {streaks.workout_streak_weeks} week streak
                </Text>
              )}
            </View>

            <View style={styles.streakCard}>
              <Text style={styles.streakEmoji}>🍽️</Text>
              <Text style={styles.streakValue}>
                {streaks.meal_streak_days}
              </Text>
              <Text style={styles.streakLabel}>Day meal streak</Text>
              {streaks.meal_logged_today && (
                <Text style={styles.streakBadge}>✅ Logged today</Text>
              )}
            </View>
          </View>
        )}

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          {['overview', 'calories', 'weight'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {totals.calories.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>Calories (4 wks)</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{totals.workouts}</Text>
                <Text style={styles.summaryLabel}>Workouts (4 wks)</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {totals.burned.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>Burned (4 wks)</Text>
              </View>
            </View>

            {/* Workout Frequency Chart */}
            <View style={styles.chartSection}>
              <BarChart
                data={getWorkoutChartData()}
                maxValue={getMaxWorkouts()}
                barColor="#4CAF50"
                label="Weekly Workouts"
              />
            </View>

            {/* Weekly Average Calories */}
            <View style={styles.chartSection}>
              <BarChart
                data={getCalorieChartData()}
                maxValue={getMaxCalories()}
                barColor="#FF9800"
                label="Avg Daily Calories by Week"
              />
            </View>
          </>
        )}

        {/* Calories Tab */}
        {activeTab === 'calories' && (
          <>
            <View style={styles.chartSection}>
              <BarChart
                data={getDailyCaloriesData()}
                maxValue={Math.max(...getDailyCaloriesData().map(d => d.value), 2000)}
                barColor="#007AFF"
                label="Daily Calories (Last 2 Weeks)"
              />
            </View>

            {/* Weekly breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
              {stats?.weekly?.slice(-4).reverse().map((week, index) => (
                <View key={index} style={styles.weekRow}>
                  <View>
                    <Text style={styles.weekDate}>
                      {new Date(week.week_start).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })} - {new Date(week.week_end).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </Text>
                    <Text style={styles.weekDays}>
                      {week.days_logged} days logged
                    </Text>
                  </View>
                  <View style={styles.weekStats}>
                    <Text style={styles.weekCalories}>
                      {week.avg_daily_calories.toLocaleString()} cal/day
                    </Text>
                    <Text style={styles.weekTotal}>
                      {week.total_calories.toLocaleString()} total
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Weight Tab */}
        {activeTab === 'weight' && (
          <>
            {stats?.weight?.length > 0 ? (
              <>
                <View style={styles.chartSection}>
                  <LineChart
                    data={getWeightChartData()}
                    minValue={weightRange.min}
                    maxValue={weightRange.max}
                    lineColor="#9C27B0"
                    label="Weight Trend"
                    unit=" lb"
                  />
                </View>

                {/* Weight stats */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Weight Progress</Text>
                  {(() => {
                    const weights = stats.weight;
                    const latest = weights[weights.length - 1];
                    const first = weights[0];
                    const change = latest.weight - first.weight;
                    return (
                      <View style={styles.weightStatsContainer}>
                        <View style={styles.weightStat}>
                          <Text style={styles.weightStatValue}>
                            {latest.weight} lb
                          </Text>
                          <Text style={styles.weightStatLabel}>Current</Text>
                        </View>
                        <View style={styles.weightStat}>
                          <Text style={styles.weightStatValue}>
                            {first.weight} lb
                          </Text>
                          <Text style={styles.weightStatLabel}>Starting</Text>
                        </View>
                        <View style={styles.weightStat}>
                          <Text
                            style={[
                              styles.weightStatValue,
                              { color: change < 0 ? '#4CAF50' : change > 0 ? '#FF5722' : '#666' },
                            ]}
                          >
                            {change > 0 ? '+' : ''}{change.toFixed(1)} lb
                          </Text>
                          <Text style={styles.weightStatLabel}>Change</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyText}>No weight data yet</Text>
                <Text style={styles.emptySubtext}>
                  Log your weight in Progress Tracking to see trends
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => onNavigate('progress')}
                >
                  <Text style={styles.emptyButtonText}>Go to Progress</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
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
  scrollView: {
    flex: 1,
  },
  streakContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  streakCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  streakValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  streakLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  streakBadge: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  chartSection: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  weekDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  weekDays: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  weekStats: {
    alignItems: 'flex-end',
  },
  weekCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  weekTotal: {
    fontSize: 12,
    color: '#666',
  },
  weightStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weightStat: {
    alignItems: 'center',
  },
  weightStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  weightStatLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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

const chartStyles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  chartArea: {
    height: 150,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 6,
  },
  lineChartArea: {
    flexDirection: 'row',
    height: 150,
  },
  yAxis: {
    width: 50,
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
  lineChartContent: {
    flex: 1,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  dataPoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: -6,
  },
  xAxisLabels: {
    position: 'absolute',
    bottom: -20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  xAxisLabel: {
    fontSize: 10,
    color: '#666',
  },
  emptyChart: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
});
