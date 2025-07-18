import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useMicrophonePermission,
  PhotoFile
} from 'react-native-vision-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import Header from '../components/Header';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useScanStore } from '../viewmodels/ScanViewModel';
import { useAuthStore } from '../stores/authStore';

type ScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

const ScanScreen = () => {
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showUnknownModal, setShowUnknownModal] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [initialModalShown, setInitialModalShown] = useState(false);
  const camera = useRef<Camera>(null);
  
  const { isProcessing, classifyImage } = useScanStore();
  const saveScanResult = useScanStore((s) => s.saveScanResult);
  const syncScans = useScanStore((s) => s.syncScans);
  const { user } = useAuthStore();
  
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const { hasPermission: hasMicPermission, requestPermission: requestMicPermission } = useMicrophonePermission();
  const device = useCameraDevice('back');

  // Show tips modal when screen first loads
  useEffect(() => {
    if (!initialModalShown) {
      setShowTipsModal(true);
      setInitialModalShown(true);
    }
    checkPermissions();
  }, []);

  // Handle camera activation based on screen focus
  useFocusEffect(
    useCallback(() => {
      setIsCameraActive(true);
      
      return () => {
        // Disable camera when navigating away
        setIsCameraActive(false);
      };
    }, [])
  );

  const checkPermissions = useCallback(async () => {
    if (!hasCameraPermission) {
      const granted = await requestCameraPermission();
      if (!granted) {
        Alert.alert(
          'Camera Permission Required',
          'Please grant camera permission to use the scanner.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
      }
    }

    if (!hasMicPermission) {
      await requestMicPermission();
    }
  }, [hasCameraPermission, hasMicPermission, requestCameraPermission, requestMicPermission]);

  const handleCapture = async () => {
    if (!camera.current || isProcessing) return;

    try {
      const photo = await camera.current.takePhoto({
        flash: flashEnabled ? 'on' : 'off',
      });

      // Classify the image using the store
      const result = await classifyImage(photo.path);

      if (
        result.disease === 'Unknown' ||
        result.severity === 'Unknown' ||
        result.stage === 'Unknown' ||
        result.confidence === 0
      ) {
        setShowUnknownModal(true);
        return;
      }

      // Automatically save scan result locally and sync to backend
      await saveScanResult({
        ...result,
        imageUri: `file://${photo.path}`,
        coordinates: user?.location?.coordinates,
        address: user?.location?.address,
      });
      await syncScans();

      navigation.navigate('Results', { 
        imageUri: `file://${photo.path}`,
        diagnosis: {
          disease: result.disease,
          confidence: result.confidence,
          severity: result.severity,
          stage: result.stage
        }
      });
    } catch (error) {
      console.error('Error capturing/processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    }
  };

  const handleGalleryPick = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!pickerResult.canceled && pickerResult.assets[0]) {
        const result = await classifyImage(pickerResult.assets[0].uri);
        
        if (
          result.disease === 'Unknown' ||
          result.severity === 'Unknown' ||
          result.stage === 'Unknown' ||
          result.confidence === 0
        ) {
          setShowUnknownModal(true);
          return;
        }

        // Automatically save scan result locally and sync to backend
        await saveScanResult({
          ...result,
          imageUri: pickerResult.assets[0].uri,
          coordinates: user?.location?.coordinates,
          address: user?.location?.address,
        });
        await syncScans();

        navigation.navigate('Results', {
          imageUri: pickerResult.assets[0].uri,
          diagnosis: {
            disease: result.disease,
            confidence: result.confidence,
            severity: result.severity,
            stage: result.stage
          }
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
    }
  };

  if (!device) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <Header
        title="Scan Plant"
      />
      
      <View style={styles.content}>
        {/* Camera Preview */}
        <View style={styles.cameraContainer}>
          {hasCameraPermission && device && isCameraActive && (
            <Camera
              ref={camera}
              style={StyleSheet.absoluteFill}
              device={device}
              isActive={isCameraActive}
              photo={true}
              enableZoomGesture
            />
          )}

          {/* Camera Controls Overlay */}
          <View style={styles.cameraControlsOverlay}>
            <TouchableOpacity 
              style={[styles.cameraControlButton, flashEnabled && styles.cameraControlButtonActive]}
              onPress={() => setFlashEnabled(!flashEnabled)}
            >
              <Ionicons 
                name={flashEnabled ? "flash" : "flash-outline"} 
                size={24} 
                color={flashEnabled ? COLORS.primary : COLORS.white} 
              />
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>Analyzing image...</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={styles.galleryButton}
            onPress={handleGalleryPick}
          >
            <Ionicons name="images-outline" size={28} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.infoButton}
            onPress={() => setShowTipsModal(true)}
          >
            <Ionicons 
              name="information-circle-outline" 
              size={28} 
              color={COLORS.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Scanning Tips Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTipsModal}
        onRequestClose={() => setShowTipsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scanning Tips</Text>
              <TouchableOpacity onPress={() => setShowTipsModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Important Reminder</Text>
                <Text style={styles.sectionText}>
                  Only scan coffee plant parts with these specific diseases:
                </Text>
              </View>

              <View style={styles.diseaseSection}>
                <View style={styles.diseaseCategory}>
                  <View style={styles.diseaseCategoryHeader}>
                    <Ionicons name="leaf-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.diseaseCategoryTitle}>Leaves</Text>
                  </View>
                  <View style={styles.diseaseList}>
                    <Text style={styles.diseaseItem}>• Coffee Leaf Rust</Text>
                    <Text style={styles.diseaseItem}>• Thread Blight</Text>
                    <Text style={styles.diseaseItem}>• Anthracnose</Text>
                  </View>
                </View>

                <View style={styles.diseaseCategory}>
                  <View style={styles.diseaseCategoryHeader}>
                    <Ionicons name="git-branch-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.diseaseCategoryTitle}>Stems</Text>
                  </View>
                  <View style={styles.diseaseList}>
                    <Text style={styles.diseaseItem}>• Coffee Wilt Disease</Text>
                  </View>
                </View>

                <View style={styles.diseaseCategory}>
                  <View style={styles.diseaseCategoryHeader}>
                    <Ionicons name="ellipse-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.diseaseCategoryTitle}>Berries</Text>
                  </View>
                  <View style={styles.diseaseList}>
                    <Text style={styles.diseaseItem}>• Coffee Berry Disease</Text>
                  </View>
                </View>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>For Best Results</Text>
                <View style={styles.bestResultsList}>
                  <View style={styles.modalTipItem}>
                    <View style={styles.tipIcon}>
                      <Ionicons name="sunny-outline" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.modalTipText}>Use good lighting</Text>
                  </View>
                  
                  <View style={styles.modalTipItem}>
                    <View style={styles.tipIcon}>
                      <Ionicons name="scan-outline" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.modalTipText}>Keep subject centered</Text>
                  </View>
                  
                  <View style={styles.modalTipItem}>
                    <View style={styles.tipIcon}>
                      <Ionicons name="hand-left-outline" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.modalTipText}>Hold camera steady</Text>
                  </View>
                  
                  <View style={styles.modalTipItem}>
                    <View style={styles.tipIcon}>
                      <Ionicons name="crop-outline" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.modalTipText}>Capture close-up of affected area</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity 
              style={styles.modalButton} 
              onPress={() => setShowTipsModal(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Unknown Result Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showUnknownModal}
        onRequestClose={() => setShowUnknownModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Scan Unsuccessful</Text>
            <Text style={styles.sectionText}>
              We couldn't recognize a valid coffee plant part or disease. Please try again with a clearer image.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowUnknownModal(false)}
            >
              <Text style={styles.modalButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
  },
  cameraContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: COLORS.black,
  },
  cameraControlsOverlay: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  cameraControlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraControlButtonActive: {
    backgroundColor: COLORS.white,
  },
  processingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
    gap: 30,
    backgroundColor: COLORS.background,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.primary,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
  infoButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tipsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginLeft: 8,
  },
  tipsList: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tipItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}10`,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.black,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.gray}30`,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  modalContent: {
    maxHeight: '70%',
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 10,
  },
  diseaseSection: {
    marginBottom: 20,
  },
  diseaseCategory: {
    marginBottom: 15,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 10,
    padding: 12,
  },
  diseaseCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  diseaseCategoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 8,
  },
  diseaseList: {
    paddingLeft: 10,
  },
  diseaseItem: {
    fontSize: 15,
    color: COLORS.black,
    marginBottom: 4,
  },
  modalTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: `${COLORS.primary}10`,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalTipText: {
    fontSize: 15,
    color: COLORS.black,
    fontWeight: '500',
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  bestResultsList: {
    flexDirection: 'column',
  },
});

export default ScanScreen; 