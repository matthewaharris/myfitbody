import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  SafeAreaView,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import {
  getMeasurements,
  getLatestMeasurement,
  saveMeasurement,
  getPhotoUploadUrl,
  setAuthToken,
  setUserInfo,
} from '../services/api';

export default function ProgressScreen({ onNavigate }) {
  const { getToken } = useAuth();
  const { user } = useUser();

  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Form state
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await getToken();
      setAuthToken(token);
      const email = user?.emailAddresses?.[0]?.emailAddress;
      setUserInfo(user?.id, email);

      const data = await getMeasurements(30);
      setMeasurements(data || []);
    } catch (error) {
      console.error('Error loading measurements:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload progress photos.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions to take progress photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri) => {
    setUploading(true);
    try {
      // Get the file name from URI
      const fileName = uri.split('/').pop();
      const fileExtension = fileName.split('.').pop();
      const contentType = `image/${fileExtension}`;

      // Get signed upload URL from backend
      const { uploadUrl, publicUrl, token } = await getPhotoUploadUrl(fileName, contentType);

      // Read the file and upload
      const response = await fetch(uri);
      const blob = await response.blob();

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: blob,
      });

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!weight) {
      Alert.alert('Weight Required', 'Please enter your weight');
      return;
    }

    setSaving(true);
    try {
      let photoUrl = null;

      // Upload photo if selected
      if (photoUri) {
        try {
          photoUrl = await uploadPhoto(photoUri);
        } catch (error) {
          Alert.alert('Photo Upload Failed', 'The measurement will be saved without the photo.');
        }
      }

      await saveMeasurement({
        weight: parseFloat(weight),
        body_fat_percentage: bodyFat ? parseFloat(bodyFat) : null,
        muscle_mass_percentage: muscleMass ? parseFloat(muscleMass) : null,
        notes: notes || null,
        photo_url: photoUrl,
      });

      // Refresh data
      await loadData();

      // Reset form
      setWeight('');
      setBodyFat('');
      setMuscleMass('');
      setNotes('');
      setPhotoUri(null);
      setShowLogModal(false);

      Alert.alert('Success', 'Progress logged!');
    } catch (error) {
      console.error('Error saving measurement:', error);
      Alert.alert('Error', 'Failed to save measurement');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getWeightChange = (index) => {
    if (index >= measurements.length - 1) return null;
    const current = measurements[index].weight;
    const previous = measurements[index + 1].weight;
    if (!current || !previous) return null;
    const change = current - previous;
    return change;
  };

  const renderMeasurementItem = ({ item, index }) => {
    const weightChange = getWeightChange(index);

    return (
      <TouchableOpacity
        style={styles.measurementCard}
        onPress={() => {
          if (item.photo_url) {
            setSelectedPhoto(item.photo_url);
            setShowPhotoModal(true);
          }
        }}
      >
        <View style={styles.measurementHeader}>
          <Text style={styles.measurementDate}>{formatDate(item.measurement_date)}</Text>
          {item.photo_url && <Text style={styles.photoIndicator}>📷</Text>}
        </View>

        <View style={styles.measurementContent}>
          {item.photo_url && (
            <Image
              source={{ uri: item.photo_url }}
              style={styles.thumbnailImage}
            />
          )}

          <View style={styles.measurementDetails}>
            <View style={styles.measurementRow}>
              <Text style={styles.measurementLabel}>Weight</Text>
              <View style={styles.measurementValueRow}>
                <Text style={styles.measurementValue}>
                  {item.weight ? `${item.weight} lbs` : '-'}
                </Text>
                {weightChange !== null && (
                  <Text style={[
                    styles.changeIndicator,
                    weightChange > 0 ? styles.changeUp : styles.changeDown
                  ]}>
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)}
                  </Text>
                )}
              </View>
            </View>

            {item.body_fat_percentage && (
              <View style={styles.measurementRow}>
                <Text style={styles.measurementLabel}>Body Fat</Text>
                <Text style={styles.measurementValue}>{item.body_fat_percentage}%</Text>
              </View>
            )}

            {item.muscle_mass_percentage && (
              <View style={styles.measurementRow}>
                <Text style={styles.measurementLabel}>Muscle Mass</Text>
                <Text style={styles.measurementValue}>{item.muscle_mass_percentage}%</Text>
              </View>
            )}

            {item.notes && (
              <Text style={styles.measurementNotes}>{item.notes}</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('home')}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress</Text>
        <TouchableOpacity onPress={() => setShowLogModal(true)}>
          <Text style={styles.addButton}>+ Log</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : measurements.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>Track Your Progress</Text>
          <Text style={styles.emptySubtitle}>
            Log your weight and progress photos to see your transformation over time
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => setShowLogModal(true)}
          >
            <Text style={styles.startButtonText}>Log First Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={measurements}
          keyExtractor={(item) => item.id}
          renderItem={renderMeasurementItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Log Measurement Modal */}
      <Modal visible={showLogModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLogModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Log Progress</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveButton, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Photo Section */}
            <View style={styles.photoSection}>
              {photoUri ? (
                <View style={styles.photoPreviewContainer}>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => setPhotoUri(null)}
                  >
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.photoButtons}>
                  <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                    <Text style={styles.photoButtonIcon}>📷</Text>
                    <Text style={styles.photoButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                    <Text style={styles.photoButtonIcon}>🖼️</Text>
                    <Text style={styles.photoButtonText}>Choose Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Weight */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (lbs) *</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="e.g., 175"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Body Fat % */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Body Fat % (optional)</Text>
              <TextInput
                style={styles.input}
                value={bodyFat}
                onChangeText={setBodyFat}
                placeholder="e.g., 15"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Muscle Mass % */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Muscle Mass % (optional)</Text>
              <TextInput
                style={styles.input}
                value={muscleMass}
                onChangeText={setMuscleMass}
                placeholder="e.g., 40"
                keyboardType="decimal-pad"
              />
            </View>

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="How are you feeling? Any observations?"
                multiline
                numberOfLines={3}
              />
            </View>

            {uploading && (
              <View style={styles.uploadingIndicator}>
                <ActivityIndicator color="#007AFF" />
                <Text style={styles.uploadingText}>Uploading photo...</Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal visible={showPhotoModal} animationType="fade" transparent>
        <View style={styles.photoViewerContainer}>
          <TouchableOpacity
            style={styles.photoViewerClose}
            onPress={() => {
              setShowPhotoModal(false);
              setSelectedPhoto(null);
            }}
          >
            <Text style={styles.photoViewerCloseText}>✕ Close</Text>
          </TouchableOpacity>
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.fullPhoto}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  measurementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  measurementDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  photoIndicator: {
    fontSize: 16,
  },
  measurementContent: {
    flexDirection: 'row',
  },
  thumbnailImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  measurementDetails: {
    flex: 1,
  },
  measurementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  measurementLabel: {
    fontSize: 14,
    color: '#666',
  },
  measurementValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  measurementValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  changeIndicator: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  changeUp: {
    backgroundColor: '#fee2e2',
    color: '#dc2626',
  },
  changeDown: {
    backgroundColor: '#dcfce7',
    color: '#16a34a',
  },
  measurementNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  photoSection: {
    marginBottom: 24,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  photoButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  photoButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  photoButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  photoPreviewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  photoPreview: {
    width: 200,
    height: 260,
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: 60,
    backgroundColor: '#FF3B30',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  uploadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginTop: 16,
  },
  uploadingText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
  },
  // Photo viewer modal
  photoViewerContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
  },
  photoViewerCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  fullPhoto: {
    width: '100%',
    height: '80%',
  },
});
