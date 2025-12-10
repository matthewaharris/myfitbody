import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useAuth } from '@clerk/clerk-expo';
import {
  getBadgeProgress,
  getEarnedBadges,
  getUserStats,
  checkForNewBadges,
  setAuthToken,
} from '../services/api';

const { width } = Dimensions.get('window');

const CATEGORY_INFO = {
  milestone: { title: 'Milestones', icon: '🎯', color: '#9C27B0' },
  workout: { title: 'Workout', icon: '💪', color: '#F44336' },
  nutrition: { title: 'Nutrition', icon: '🥗', color: '#4CAF50' },
  streak: { title: 'Streaks', icon: '🔥', color: '#FF9800' },
  special: { title: 'Special', icon: '⭐', color: '#2196F3' },
};

export default function BadgesScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const [badges, setBadges] = useState([]);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newBadges, setNewBadges] = useState([]);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();
      setAuthToken(token);

      // Check for new badges first
      const badgeCheck = await checkForNewBadges().catch(() => ({ newBadges: [] }));
      if (badgeCheck.newBadges?.length > 0) {
        setNewBadges(badgeCheck.newBadges);
      }

      const [progressData, statsData] = await Promise.all([
        getBadgeProgress(),
        getUserStats(),
      ]);

      setBadges(progressData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading badges:', error);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const earnedBadges = badges.filter(b => b.earned);
  const totalPoints = earnedBadges.reduce((sum, b) => sum + (b.points || 0), 0);

  const filteredBadges = selectedCategory === 'all'
    ? badges
    : badges.filter(b => b.category === selectedCategory);

  const categories = ['all', ...Object.keys(CATEGORY_INFO)];

  const renderBadge = (badge) => {
    const categoryColor = CATEGORY_INFO[badge.category]?.color || '#666';

    return (
      <View
        key={badge.id}
        style={[
          styles.badgeCard,
          badge.earned && styles.badgeCardEarned,
        ]}
      >
        <View style={[
          styles.badgeIcon,
          badge.earned ? { backgroundColor: categoryColor + '20' } : styles.badgeIconLocked,
        ]}>
          <Text style={[styles.badgeEmoji, !badge.earned && styles.badgeEmojiLocked]}>
            {badge.earned ? badge.icon : '🔒'}
          </Text>
        </View>

        <View style={styles.badgeInfo}>
          <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>
            {badge.name}
          </Text>
          <Text style={styles.badgeDescription}>{badge.description}</Text>

          {!badge.earned && (
            <View style={styles.progressSection}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${badge.progress}%`, backgroundColor: categoryColor },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {badge.currentValue}/{badge.requirement_value}
              </Text>
            </View>
          )}

          {badge.earned && (
            <Text style={[styles.badgePoints, { color: categoryColor }]}>
              +{badge.points} points
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Achievements</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Summary */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{earnedBadges.length}</Text>
            <Text style={styles.statLabel}>Badges Earned</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalPoints}</Text>
            <Text style={styles.statLabel}>Total Points</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{badges.length}</Text>
            <Text style={styles.statLabel}>Total Badges</Text>
          </View>
        </View>

        {/* Current Streaks */}
        {stats && (
          <View style={styles.streaksCard}>
            <Text style={styles.streaksTitle}>Current Streaks</Text>
            <View style={styles.streaksRow}>
              <View style={styles.streakItem}>
                <Text style={styles.streakIcon}>🏋️</Text>
                <Text style={styles.streakValue}>{stats.current_workout_streak || 0}</Text>
                <Text style={styles.streakLabel}>Workout Days</Text>
              </View>
              <View style={styles.streakItem}>
                <Text style={styles.streakIcon}>🍽️</Text>
                <Text style={styles.streakValue}>{stats.current_meal_streak || 0}</Text>
                <Text style={styles.streakLabel}>Meal Days</Text>
              </View>
              <View style={styles.streakItem}>
                <Text style={styles.streakIcon}>📊</Text>
                <Text style={styles.streakValue}>{stats.total_workouts || 0}</Text>
                <Text style={styles.streakLabel}>Total Workouts</Text>
              </View>
            </View>
          </View>
        )}

        {/* New Badges Alert */}
        {newBadges.length > 0 && (
          <View style={styles.newBadgesAlert}>
            <Text style={styles.newBadgesTitle}>🎉 New Badge{newBadges.length > 1 ? 's' : ''} Unlocked!</Text>
            {newBadges.map(nb => (
              <View key={nb.id} style={styles.newBadgeItem}>
                <Text style={styles.newBadgeEmoji}>{nb.badge?.icon}</Text>
                <Text style={styles.newBadgeName}>{nb.badge?.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                selectedCategory === cat && styles.categoryButtonSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={styles.categoryIcon}>
                {cat === 'all' ? '🏆' : CATEGORY_INFO[cat]?.icon}
              </Text>
              <Text style={[
                styles.categoryLabel,
                selectedCategory === cat && styles.categoryLabelSelected,
              ]}>
                {cat === 'all' ? 'All' : CATEGORY_INFO[cat]?.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Badges List */}
        <View style={styles.badgesList}>
          {filteredBadges.map(renderBadge)}
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#4CAF50',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#eee',
  },
  streaksCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  streaksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  streaksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakItem: {
    alignItems: 'center',
  },
  streakIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF9800',
  },
  streakLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  newBadgesAlert: {
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  newBadgesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 8,
  },
  newBadgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  newBadgeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  newBadgeName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  categoryScroll: {
    marginBottom: 16,
  },
  categoryContainer: {
    paddingRight: 16,
  },
  categoryButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryButtonSelected: {
    backgroundColor: '#4CAF50',
  },
  categoryIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryLabel: {
    fontSize: 14,
    color: '#666',
  },
  categoryLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  badgesList: {
    paddingBottom: 20,
  },
  badgeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    opacity: 0.7,
  },
  badgeCardEarned: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  badgeIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  badgeIconLocked: {
    backgroundColor: '#f5f5f5',
  },
  badgeEmoji: {
    fontSize: 32,
  },
  badgeEmojiLocked: {
    opacity: 0.5,
  },
  badgeInfo: {
    flex: 1,
  },
  badgeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  badgeNameLocked: {
    color: '#999',
  },
  badgeDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    marginRight: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    minWidth: 40,
    textAlign: 'right',
  },
  badgePoints: {
    fontSize: 12,
    fontWeight: '600',
  },
});
