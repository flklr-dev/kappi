import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
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
  PhotoFile
} from 'react-native-vision-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useScanStore } from '../viewmodels/ScanViewModel';
import { useAuthStore } from '../stores/authStore';
import { ThemeContext } from '../context/ThemeContext';
import ScanningTipsModal from '../components/ScanningTipsModal';

type ScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

const ScanScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;
  
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [showTipsModal, setShowTipsModal] = useState(false);
  const [showUnknownModal, setShowUnknownModal] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [initialModalShown, setInitialModalShown] = useState(false);
  const [isPostProcessing, setIsPostProcessing] = useState(false);
  const camera = useRef<Camera>(null);
  
  const { isProcessing, classifyImage } = useScanStore();
  const saveScanResult = useScanStore((s) => s.saveScanResult);
  const syncScans = useScanStore((s) => s.syncScans);
  const { user } = useAuthStore();
  
  const { hasPermission: hasCameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
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
  }, [hasCameraPermission, requestCameraPermission]);

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
      // Deactivate camera to avoid session reconfiguration issues during navigation/saving
      setIsCameraActive(false);
      setIsPostProcessing(true);
      try {
        await saveScanResult({
          ...result,
          imageUri: `file://${photo.path}`,
          coordinates: user?.location?.coordinates,
          address: user?.location?.address,
        });
        await syncScans();
      } finally {
        setIsPostProcessing(false);
      }

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
        // Deactivate camera to avoid session reconfiguration issues during navigation/saving
        setIsCameraActive(false);
        setIsPostProcessing(true);
        try {
          await saveScanResult({
            ...result,
            imageUri: pickerResult.assets[0].uri,
            coordinates: user?.location?.coordinates,
            address: user?.location?.address,
          });
          await syncScans();
        } finally {
          setIsPostProcessing(false);
        }

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
      <View style={[styles.centeredContainer, { backgroundColor: themedColors.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: isDarkMode ? themedColors.white : themedColors.gray }]}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "light-content"} 
        backgroundColor={COLORS.primary} 
      />
      
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

          {(isProcessing || isPostProcessing) && (
            <View style={[styles.processingContainer, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)' }]}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={[styles.processingText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                {isProcessing ? 'Analyzing image...' : 'Saving scan and syncing...'}
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={[styles.actionButtonsContainer, { backgroundColor: themedColors.background }]}>
          <TouchableOpacity 
            style={[styles.galleryButton, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}
            onPress={handleGalleryPick}
          >
            <Ionicons name="images-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.captureButton, isProcessing && styles.captureButtonDisabled, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.infoButton, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}
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
      <ScanningTipsModal
        visible={showTipsModal}
        onClose={() => setShowTipsModal(false)}
        isDarkMode={isDarkMode}
      />

      {/* Unknown Result Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showUnknownModal}
        onRequestClose={() => setShowUnknownModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Scan Unsuccessful</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
              We couldn't recognize a valid coffee plant part or disease. Please try again with a clearer image.
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: COLORS.primary }]}
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
    paddingVertical: 20,
    gap: 30,
    backgroundColor: COLORS.background,
  },
  galleryButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 0, // Removed shadow
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    elevation: 0, // Removed shadow
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
  },
  infoButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 0, // Removed shadow
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  // Modal styles for Unknown Result Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ScanScreen;