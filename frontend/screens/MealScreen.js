import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
  SafeAreaView,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { CameraView, useCameraPermissions } from 'expo-camera';
import {
  searchFoods,
  createMeal,
  setAuthToken,
  setUserInfo,
  getFavoriteMeals,
  toggleMealFavorite,
  relogMeal,
  lookupBarcode,
} from '../services/api';

// Unit conversion constants
const CONVERSIONS = {
  g: 1,
  oz: 28.3495,
  lb: 453.592,
};

// Convert grams to other units
const gramsToUnit = (grams, unit) => {
  return grams / CONVERSIONS[unit];
};

// Convert any unit to grams
const unitToGrams = (value, unit) => {
  return value * CONVERSIONS[unit];
};

// Debounce hook for search
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

// Food Search Modal with Favorites Tab and Barcode Scanner
function FoodSearchModal({ visible, onClose, onSelect, favoriteMeals, onRelogFavorite }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // 'search', 'favorites', or 'scan'
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (query) => {
    setSearching(true);
    try {
      const data = await searchFoods(query);
      setResults(data.foods || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (food) => {
    Keyboard.dismiss();
    onSelect(food);
    setSearchQuery('');
    setResults([]);
    setScannedProduct(null);
    setScanned(false);
    onClose();
  };

  const handleRelogFavorite = (meal) => {
    Keyboard.dismiss();
    onRelogFavorite(meal);
    onClose();
  };

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || scanning) return;
    setScanned(true);
    setScanning(true);

    try {
      const product = await lookupBarcode(data);
      setScannedProduct(product);
    } catch (error) {
      if (error.response?.status === 404) {
        Alert.alert('Not Found', 'Product not found in database. Try searching by name instead.');
      } else {
        Alert.alert('Error', 'Failed to look up product');
      }
      setScanned(false);
    } finally {
      setScanning(false);
    }
  };

  const handleSelectScannedProduct = () => {
    if (scannedProduct) {
      handleSelect(scannedProduct);
    }
  };

  const resetScanner = () => {
    setScanned(false);
    setScannedProduct(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={modalStyles.container}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={modalStyles.header}>
            <TouchableOpacity onPress={onClose}>
              <Text style={modalStyles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={modalStyles.title}>Add Food</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Tab Selector */}
          <View style={modalStyles.tabContainer}>
            <TouchableOpacity
              style={[modalStyles.tab, activeTab === 'search' && modalStyles.tabActive]}
              onPress={() => setActiveTab('search')}
            >
              <Text style={[modalStyles.tabText, activeTab === 'search' && modalStyles.tabTextActive]}>
                Search
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.tab, activeTab === 'scan' && modalStyles.tabActive]}
              onPress={() => {
                setActiveTab('scan');
                resetScanner();
              }}
            >
              <Text style={[modalStyles.tabText, activeTab === 'scan' && modalStyles.tabTextActive]}>
                Scan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[modalStyles.tab, activeTab === 'favorites' && modalStyles.tabActive]}
              onPress={() => setActiveTab('favorites')}
            >
              <Text style={[modalStyles.tabText, activeTab === 'favorites' && modalStyles.tabTextActive]}>
                Favorites
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'search' ? (
            <>
              <View style={modalStyles.searchContainer}>
                <TextInput
                  style={modalStyles.searchInput}
                  placeholder="Search for a food (e.g., chicken breast)"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  returnKeyType="search"
                />
              </View>

              {searching ? (
                <View style={modalStyles.loadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={modalStyles.loadingText}>Searching...</Text>
                </View>
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
                        {item.brand && (
                          <Text style={modalStyles.foodBrand}>{item.brand}</Text>
                        )}
                        <Text style={modalStyles.foodNutrients}>
                          {item.nutrients.calories} cal • {item.nutrients.protein}g P • {item.nutrients.carbs}g C • {item.nutrients.fat}g F
                        </Text>
                        <Text style={modalStyles.servingInfo}>
                          per {item.servingSize}{item.servingUnit}
                        </Text>
                      </View>
                      <Text style={modalStyles.sourceTag}>
                        {item.source === 'usda' ? 'USDA' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    searchQuery.length >= 2 && !searching ? (
                      <Text style={modalStyles.emptyText}>No foods found</Text>
                    ) : (
                      <Text style={modalStyles.hintText}>
                        Type at least 2 characters to search
                      </Text>
                    )
                  }
                />
              )}
            </>
          ) : activeTab === 'scan' ? (
            <View style={modalStyles.scannerContainer}>
              {!permission?.granted ? (
                <View style={modalStyles.permissionContainer}>
                  <Text style={modalStyles.permissionIcon}>📷</Text>
                  <Text style={modalStyles.permissionTitle}>Camera Permission Required</Text>
                  <Text style={modalStyles.permissionText}>
                    We need camera access to scan barcodes on food packages
                  </Text>
                  <TouchableOpacity
                    style={modalStyles.permissionButton}
                    onPress={requestPermission}
                  >
                    <Text style={modalStyles.permissionButtonText}>Grant Permission</Text>
                  </TouchableOpacity>
                </View>
              ) : scannedProduct ? (
                <View style={modalStyles.scannedResultContainer}>
                  <Text style={modalStyles.scannedTitle}>Product Found!</Text>
                  <View style={modalStyles.scannedProductCard}>
                    <Text style={modalStyles.scannedProductName}>{scannedProduct.name}</Text>
                    {scannedProduct.brand && (
                      <Text style={modalStyles.scannedProductBrand}>{scannedProduct.brand}</Text>
                    )}
                    <Text style={modalStyles.scannedProductNutrients}>
                      {scannedProduct.nutrients.calories} cal • {scannedProduct.nutrients.protein}g P • {scannedProduct.nutrients.carbs}g C • {scannedProduct.nutrients.fat}g F
                    </Text>
                    <Text style={modalStyles.scannedProductServing}>
                      per {scannedProduct.servingSize}{scannedProduct.servingUnit}
                    </Text>
                  </View>
                  <View style={modalStyles.scannedButtons}>
                    <TouchableOpacity
                      style={modalStyles.scanAgainButton}
                      onPress={resetScanner}
                    >
                      <Text style={modalStyles.scanAgainButtonText}>Scan Again</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={modalStyles.selectProductButton}
                      onPress={handleSelectScannedProduct}
                    >
                      <Text style={modalStyles.selectProductButtonText}>Select This Food</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={modalStyles.cameraContainer}>
                  <CameraView
                    style={modalStyles.camera}
                    facing="back"
                    barcodeScannerSettings={{
                      barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                    }}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                  />
                  <View style={modalStyles.scanOverlay}>
                    <View style={modalStyles.scanFrame} />
                    <Text style={modalStyles.scanInstructions}>
                      {scanning ? 'Looking up product...' : 'Point camera at barcode'}
                    </Text>
                  </View>
                  {scanning && (
                    <View style={modalStyles.scanningIndicator}>
                      <ActivityIndicator size="large" color="#fff" />
                    </View>
                  )}
                </View>
              )}
            </View>
          ) : (
            <FlatList
              data={favoriteMeals}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modalStyles.foodItem}
                  onPress={() => handleRelogFavorite(item)}
                >
                  <View style={modalStyles.foodInfo}>
                    <View style={modalStyles.favoriteHeader}>
                      <Text style={modalStyles.favoriteIcon}>⭐</Text>
                      <Text style={modalStyles.foodName}>{item.food_name}</Text>
                    </View>
                    <Text style={modalStyles.foodNutrients}>
                      {item.calories} cal • {item.protein}g P • {item.carbs}g C • {item.fat}g F
                    </Text>
                    <Text style={modalStyles.servingInfo}>
                      {item.serving_size}{item.serving_unit}
                    </Text>
                  </View>
                  <Text style={modalStyles.relogButton}>Relog</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={modalStyles.emptyFavorites}>
                  <Text style={modalStyles.emptyFavoritesIcon}>⭐</Text>
                  <Text style={modalStyles.emptyFavoritesText}>No favorite meals yet</Text>
                  <Text style={modalStyles.emptyFavoritesHint}>
                    Log a meal and tap the star to save it as a favorite
                  </Text>
                </View>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// Main Meal Screen
export default function MealScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [showFoodSearch, setShowFoodSearch] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);
  const [mealType, setMealType] = useState('lunch');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSavedMealId, setLastSavedMealId] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteMeals, setFavoriteMeals] = useState([]);

  // Serving size state
  const [servingAmount, setServingAmount] = useState('1');
  const [customServingSize, setCustomServingSize] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('g');
  const [useCustomServing, setUseCustomServing] = useState(false);

  const mealTypes = [
    { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
    { value: 'lunch', label: 'Lunch', icon: '☀️' },
    { value: 'dinner', label: 'Dinner', icon: '🌙' },
    { value: 'snack', label: 'Snack', icon: '🍎' },
  ];

  const units = [
    { value: 'g', label: 'g' },
    { value: 'oz', label: 'oz' },
    { value: 'lb', label: 'lb' },
  ];

  useEffect(() => {
    setupAuth();
  }, []);

  // Reset serving inputs when food changes
  useEffect(() => {
    if (selectedFood) {
      setServingAmount('1');
      setCustomServingSize(selectedFood.servingSize?.toString() || '100');
      setSelectedUnit('g');
      setUseCustomServing(false);
    }
  }, [selectedFood]);

  const setupAuth = async () => {
    const token = await getToken();
    setAuthToken(token);
    const email = user?.emailAddresses?.[0]?.emailAddress;
    setUserInfo(user?.id, email);

    // Load favorite meals
    try {
      const favorites = await getFavoriteMeals();
      setFavoriteMeals(favorites || []);
    } catch (error) {
      console.error('Error loading favorite meals:', error);
    }
  };

  const calculateNutrients = () => {
    if (!selectedFood) return null;

    let totalGrams;

    if (useCustomServing) {
      // Custom serving: convert input to grams
      const inputValue = parseFloat(customServingSize) || 0;
      totalGrams = unitToGrams(inputValue, selectedUnit);
    } else {
      // Preset serving: multiply base serving by amount
      const multiplier = parseFloat(servingAmount) || 1;
      const baseServing = selectedFood.servingSize || 100;
      totalGrams = baseServing * multiplier;
    }

    // Nutrition is per 100g (or per servingSize), calculate ratio
    const baseGrams = selectedFood.servingSize || 100;
    const ratio = totalGrams / baseGrams;

    return {
      calories: Math.round(selectedFood.nutrients.calories * ratio),
      protein: Math.round(selectedFood.nutrients.protein * ratio * 10) / 10,
      carbs: Math.round(selectedFood.nutrients.carbs * ratio * 10) / 10,
      fat: Math.round(selectedFood.nutrients.fat * ratio * 10) / 10,
      fiber: Math.round((selectedFood.nutrients.fiber || 0) * ratio * 10) / 10,
      sugar: Math.round((selectedFood.nutrients.sugar || 0) * ratio * 10) / 10,
      servingSizeGrams: Math.round(totalGrams),
    };
  };

  // Get display text for serving size
  const getServingDisplay = () => {
    if (!selectedFood) return '';
    const nutrients = calculateNutrients();
    if (!nutrients) return '';

    const grams = nutrients.servingSizeGrams;
    const oz = Math.round(gramsToUnit(grams, 'oz') * 10) / 10;
    const lb = Math.round(gramsToUnit(grams, 'lb') * 100) / 100;

    return `${grams}g = ${oz}oz = ${lb}lb`;
  };

  const handleSaveMeal = async () => {
    if (!selectedFood) {
      Alert.alert('No Food Selected', 'Please search and select a food first');
      return;
    }

    const nutrients = calculateNutrients();
    if (!nutrients || nutrients.servingSizeGrams <= 0) {
      Alert.alert('Invalid Serving', 'Please enter a valid serving size');
      return;
    }

    setSaving(true);

    try {
      const savedMeal = await createMeal({
        meal_type: mealType,
        food_name: selectedFood.name,
        calories: nutrients.calories,
        protein: nutrients.protein,
        carbs: nutrients.carbs,
        fat: nutrients.fat,
        fiber: nutrients.fiber,
        sugar: nutrients.sugar,
        serving_size: nutrients.servingSizeGrams,
        serving_unit: 'g',
        notes: notes || null,
      });

      setLastSavedMealId(savedMeal.id);
      setIsFavorite(savedMeal.is_favorite || false);

      Alert.alert('Success', 'Meal logged!', [
        { text: 'Log Another', onPress: resetForm },
        { text: 'Done', onPress: () => onNavigate('home') },
      ]);
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('Error', 'Failed to save meal');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!lastSavedMealId) {
      Alert.alert('Save First', 'Please save the meal first before marking as favorite');
      return;
    }

    try {
      const result = await toggleMealFavorite(lastSavedMealId);
      setIsFavorite(result.is_favorite);

      // Refresh favorites list
      const favorites = await getFavoriteMeals();
      setFavoriteMeals(favorites || []);

      if (result.is_favorite) {
        Alert.alert('Added to Favorites', 'This meal has been added to your favorites for quick re-logging!');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleRelogFavorite = async (meal) => {
    try {
      await relogMeal(meal.id, mealType);
      Alert.alert('Success', `${meal.food_name} logged as ${mealType}!`, [
        { text: 'Log Another', style: 'cancel' },
        { text: 'Done', onPress: () => onNavigate('home') },
      ]);
    } catch (error) {
      console.error('Error re-logging meal:', error);
      Alert.alert('Error', 'Failed to re-log meal');
    }
  };

  const resetForm = () => {
    setSelectedFood(null);
    setServingAmount('1');
    setCustomServingSize('');
    setSelectedUnit('g');
    setUseCustomServing(false);
    setNotes('');
    setLastSavedMealId(null);
    setIsFavorite(false);
  };

  const nutrients = calculateNutrients();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Meal</Text>
        <TouchableOpacity onPress={handleSaveMeal} disabled={saving || !selectedFood}>
          <Text style={[styles.saveButton, (!selectedFood || saving) && { opacity: 0.5 }]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {/* Meal Type Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Meal Type</Text>
          <View style={styles.mealTypeContainer}>
            {mealTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.mealTypeButton,
                  mealType === type.value && styles.mealTypeButtonActive,
                ]}
                onPress={() => setMealType(type.value)}
              >
                <Text style={styles.mealTypeIcon}>{type.icon}</Text>
                <Text
                  style={[
                    styles.mealTypeLabel,
                    mealType === type.value && styles.mealTypeLabelActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Food Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Food</Text>
          <TouchableOpacity
            style={styles.foodSelector}
            onPress={() => setShowFoodSearch(true)}
          >
            {selectedFood ? (
              <View style={styles.selectedFoodInfo}>
                <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
                {selectedFood.brand && (
                  <Text style={styles.selectedFoodBrand}>{selectedFood.brand}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.foodSelectorPlaceholder}>
                Tap to search for a food...
              </Text>
            )}
            <Text style={styles.searchIcon}>🔍</Text>
          </TouchableOpacity>
        </View>

        {/* Serving Size */}
        {selectedFood && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Serving Size</Text>

            {/* Toggle between preset and custom */}
            <View style={styles.servingToggle}>
              <TouchableOpacity
                style={[
                  styles.servingToggleButton,
                  !useCustomServing && styles.servingToggleButtonActive,
                ]}
                onPress={() => setUseCustomServing(false)}
              >
                <Text style={[
                  styles.servingToggleText,
                  !useCustomServing && styles.servingToggleTextActive,
                ]}>
                  Preset
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.servingToggleButton,
                  useCustomServing && styles.servingToggleButtonActive,
                ]}
                onPress={() => setUseCustomServing(true)}
              >
                <Text style={[
                  styles.servingToggleText,
                  useCustomServing && styles.servingToggleTextActive,
                ]}>
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            {!useCustomServing ? (
              <>
                {/* Preset serving mode */}
                <View style={styles.servingRow}>
                  <TextInput
                    style={styles.servingInput}
                    value={servingAmount}
                    onChangeText={setServingAmount}
                    keyboardType="decimal-pad"
                    placeholder="1"
                  />
                  <Text style={styles.servingUnit}>
                    × {selectedFood.servingSize}{selectedFood.servingUnit || 'g'}
                  </Text>
                </View>

                {/* Quick serving buttons */}
                <View style={styles.quickServings}>
                  {[0.5, 1, 1.5, 2, 3].map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.quickServingButton,
                        parseFloat(servingAmount) === amount && styles.quickServingButtonActive,
                      ]}
                      onPress={() => setServingAmount(amount.toString())}
                    >
                      <Text
                        style={[
                          styles.quickServingText,
                          parseFloat(servingAmount) === amount && styles.quickServingTextActive,
                        ]}
                      >
                        {amount}×
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                {/* Custom serving mode */}
                <View style={styles.customServingRow}>
                  <TextInput
                    style={styles.customServingInput}
                    value={customServingSize}
                    onChangeText={setCustomServingSize}
                    keyboardType="decimal-pad"
                    placeholder="Enter amount"
                  />
                  <View style={styles.unitSelector}>
                    {units.map((unit) => (
                      <TouchableOpacity
                        key={unit.value}
                        style={[
                          styles.unitButton,
                          selectedUnit === unit.value && styles.unitButtonActive,
                        ]}
                        onPress={() => setSelectedUnit(unit.value)}
                      >
                        <Text
                          style={[
                            styles.unitButtonText,
                            selectedUnit === unit.value && styles.unitButtonTextActive,
                          ]}
                        >
                          {unit.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Quick weight presets */}
                <View style={styles.quickServings}>
                  {selectedUnit === 'g' && [50, 100, 150, 200, 250].map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.quickServingButton,
                        parseFloat(customServingSize) === amount && styles.quickServingButtonActive,
                      ]}
                      onPress={() => setCustomServingSize(amount.toString())}
                    >
                      <Text
                        style={[
                          styles.quickServingText,
                          parseFloat(customServingSize) === amount && styles.quickServingTextActive,
                        ]}
                      >
                        {amount}g
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {selectedUnit === 'oz' && [1, 2, 3, 4, 6, 8].map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.quickServingButton,
                        parseFloat(customServingSize) === amount && styles.quickServingButtonActive,
                      ]}
                      onPress={() => setCustomServingSize(amount.toString())}
                    >
                      <Text
                        style={[
                          styles.quickServingText,
                          parseFloat(customServingSize) === amount && styles.quickServingTextActive,
                        ]}
                      >
                        {amount}oz
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {selectedUnit === 'lb' && [0.25, 0.5, 0.75, 1, 1.5].map((amount) => (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.quickServingButton,
                        parseFloat(customServingSize) === amount && styles.quickServingButtonActive,
                      ]}
                      onPress={() => setCustomServingSize(amount.toString())}
                    >
                      <Text
                        style={[
                          styles.quickServingText,
                          parseFloat(customServingSize) === amount && styles.quickServingTextActive,
                        ]}
                      >
                        {amount}lb
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Conversion display */}
            {nutrients && nutrients.servingSizeGrams > 0 && (
              <Text style={styles.conversionText}>
                {getServingDisplay()}
              </Text>
            )}
          </View>
        )}

        {/* Nutrition Summary */}
        {nutrients && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition</Text>
            <View style={styles.nutritionGrid}>
              <View style={styles.nutritionItem}>
                <Text style={styles.nutritionValue}>{nutrients.calories}</Text>
                <Text style={styles.nutritionLabel}>Calories</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#e74c3c' }]}>
                  {nutrients.protein}g
                </Text>
                <Text style={styles.nutritionLabel}>Protein</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#3498db' }]}>
                  {nutrients.carbs}g
                </Text>
                <Text style={styles.nutritionLabel}>Carbs</Text>
              </View>
              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionValue, { color: '#f39c12' }]}>
                  {nutrients.fat}g
                </Text>
                <Text style={styles.nutritionLabel}>Fat</Text>
              </View>
            </View>

            {/* Additional nutrients */}
            <View style={styles.additionalNutrients}>
              {nutrients.fiber > 0 && (
                <Text style={styles.additionalNutrientText}>
                  Fiber: {nutrients.fiber}g
                </Text>
              )}
              {nutrients.sugar > 0 && (
                <Text style={styles.additionalNutrientText}>
                  Sugar: {nutrients.sugar}g
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes (optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about this meal..."
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Favorite Button - shown after meal is saved */}
        {lastSavedMealId && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
              onPress={handleToggleFavorite}
            >
              <Text style={styles.favoriteButtonIcon}>{isFavorite ? '⭐' : '☆'}</Text>
              <Text style={[styles.favoriteButtonText, isFavorite && styles.favoriteButtonTextActive]}>
                {isFavorite ? 'Saved to Favorites' : 'Save to Favorites'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.favoriteHint}>
              Favorite meals can be quickly re-logged from the Favorites tab
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Food Search Modal */}
      <FoodSearchModal
        visible={showFoodSearch}
        onClose={() => setShowFoodSearch(false)}
        onSelect={setSelectedFood}
        favoriteMeals={favoriteMeals}
        onRelogFavorite={handleRelogFavorite}
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
  cancelButton: {
    fontSize: 16,
    color: '#FF3B30',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontSize: 24,
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
  foodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  foodSelectorPlaceholder: {
    flex: 1,
    color: '#999',
    fontSize: 16,
  },
  selectedFoodInfo: {
    flex: 1,
  },
  selectedFoodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedFoodBrand: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  searchIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  servingToggle: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  servingToggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  servingToggleButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  servingToggleText: {
    fontSize: 14,
    color: '#666',
  },
  servingToggleTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  servingInput: {
    width: 60,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  servingUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
  customServingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customServingInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginRight: 12,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  unitButtonActive: {
    backgroundColor: '#007AFF',
  },
  unitButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  quickServings: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  quickServingButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
  },
  quickServingButtonActive: {
    backgroundColor: '#007AFF',
  },
  quickServingText: {
    fontSize: 14,
    color: '#666',
  },
  quickServingTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  conversionText: {
    marginTop: 12,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  additionalNutrients: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  additionalNutrientText: {
    fontSize: 14,
    color: '#666',
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  favoriteButtonActive: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD700',
  },
  favoriteButtonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  favoriteButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  favoriteButtonTextActive: {
    color: '#B8860B',
  },
  favoriteHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
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
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  foodItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  sourceTag: {
    fontSize: 10,
    color: '#999',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
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
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  favoriteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  favoriteIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  relogButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
  },
  emptyFavorites: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyFavoritesIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyFavoritesText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyFavoritesHint: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  // Barcode Scanner Styles
  scannerContainer: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanInstructions: {
    marginTop: 20,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  scanningIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scannedResultContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 20,
  },
  scannedProductCard: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 24,
  },
  scannedProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  scannedProductBrand: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  scannedProductNutrients: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  scannedProductServing: {
    fontSize: 12,
    color: '#999',
  },
  scannedButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  scanAgainButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  scanAgainButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  selectProductButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  selectProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
