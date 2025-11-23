import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
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
import { useLanguage } from '../context/LanguageContext';

type ScanScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width, height } = Dimensions.get('window');

const ScanScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { t } = useLanguage();
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
          t('camera_permission_required'),
          t('please_grant_camera_permission'),
          [
            { text: t('cancel'), style: 'cancel' },
            { text: t('open_settings'), onPress: () => Linking.openSettings() }
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
      } finally {
        setIsPostProcessing(false);
      }

      navigation.navigate('Results', { 
        imageUri: `file://${photo.path}`,
        diagnosis: result  // Pass the entire result object to preserve secondaryPrediction
      });
    } catch (error) {
      console.error('Error capturing/processing image:', error);
      Alert.alert(t('error'), t('failed_to_process_image'));
    }
  };

  const handleGalleryPick = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
        // Removed aspect ratio to allow both portrait and landscape images
        exif: false,
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
        } finally {
          setIsPostProcessing(false);
        }

        navigation.navigate('Results', {
          imageUri: pickerResult.assets[0].uri,
          diagnosis: result  // Pass the entire result object to preserve secondaryPrediction
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert(t('error'), t('failed_to_pick_image_from_gallery'));
    }
  };

  if (!device) {
    return (
      <View style={[styles.centeredContainer, { backgroundColor: themedColors.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { color: isDarkMode ? themedColors.white : themedColors.gray }]}>{t('loading_camera')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent"
        translucent
      />
      
      {/* Full-screen camera container */}
      <View style={styles.fullScreenCameraContainer}>
        {/* Camera Preview */}
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

        {!hasCameraPermission && (
          <View style={[styles.centeredContainer, { backgroundColor: themedColors.background }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.loadingText, { color: isDarkMode ? themedColors.white : themedColors.gray }]}>{t('loading_camera')}</Text>
          </View>
        )}

        {/* Header Overlay */}
        <View style={styles.headerOverlay}>
          <Header
            title={t('scan_plant_title')}
          />
        </View>

        {/* Camera Controls Overlay (Flash) */}
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

        {/* Processing Overlay */}
        {(isProcessing || isPostProcessing) && (
          <View style={[styles.processingContainer, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)' }]}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={[styles.processingText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
              {isProcessing ? t('analyzing_image') : t('saving_scan_and_syncing')}
            </Text>
          </View>
        )}

        {/* Floating Action Buttons */}
        <View style={styles.floatingActionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.galleryButton, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}
            onPress={handleGalleryPick}
          >
            <Ionicons name="images-outline" size={24} color={COLORS.primary} />
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

      {/* Scanning Tips Modal - Complete Redesign */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showTipsModal}
        statusBarTranslucent={true}
        onRequestClose={() => setShowTipsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
            {/* Modal Header */}
            <View style={styles.modalHandleBar}>
              <View style={[styles.handleIndicator, { backgroundColor: isDarkMode ? '#404040' : '#D1D5DB' }]} />
            </View>
            
            <View style={styles.modalHeaderSection}>
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalIconBadge, { backgroundColor: COLORS.primary + '15' }]}>
                  <Ionicons name="bulb" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.modalTitleTextContainer}>
                  <Text style={[styles.modalMainTitle, { color: isDarkMode ? '#FFFFFF' : '#1F2937' }]}>
                    {t('scanning_tips')}
                  </Text>
                  <Text style={[styles.modalSubtitleText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                    {t('follow_these_steps')}
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowTipsModal(false)}
                  style={[styles.modalCloseBtn, { backgroundColor: isDarkMode ? '#2D2D2D' : '#F3F4F6' }]}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={22} color={isDarkMode ? '#FFFFFF' : '#1F2937'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Scrollable Content */}
            <ScrollView 
              style={styles.modalScrollArea}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Scanning Tips - Clean 3-Step Layout */}
              <View style={styles.tipsCompactContainer}>
                {/* Tip 1 - Natural Light */}
                <View style={[styles.tipCompactItem, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.06)' }]}>
                  <View style={[styles.tipCompactIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Ionicons name="sunny" size={24} color="#F59E0B" />
                  </View>
                  <View style={styles.tipCompactText}>
                    <Text style={[styles.tipCompactTitle, { color: isDarkMode ? '#FFFFFF' : '#111827' }]}>
                      {t('use_natural_light')}
                    </Text>
                    <Text style={[styles.tipCompactDesc, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                      {t('best_results_in_daylight')}
                    </Text>
                  </View>
                </View>

                {/* Tip 2 - Get Close */}
                <View style={[styles.tipCompactItem, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.06)' }]}>
                  <View style={[styles.tipCompactIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Ionicons name="camera" size={24} color="#3B82F6" />
                  </View>
                  <View style={styles.tipCompactText}>
                    <Text style={[styles.tipCompactTitle, { color: isDarkMode ? '#FFFFFF' : '#111827' }]}>
                      {t('get_close_to_plant')}
                    </Text>
                    <Text style={[styles.tipCompactDesc, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                      {t('fill_frame_with_affected_area')}
                    </Text>
                  </View>
                </View>

                {/* Tip 3 - Hold Steady */}
                <View style={[styles.tipCompactItem, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)' }]}>
                  <View style={[styles.tipCompactIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <Ionicons name="hand-left" size={24} color="#10B981" />
                  </View>
                  <View style={styles.tipCompactText}>
                    <Text style={[styles.tipCompactTitle, { color: isDarkMode ? '#FFFFFF' : '#111827' }]}>
                      {t('hold_steady')}
                    </Text>
                    <Text style={[styles.tipCompactDesc, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>
                      {t('avoid_blurry_images')}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Footer Action Button */}
            <View style={[styles.modalFooterSection, { 
              borderTopColor: isDarkMode ? '#2D2D2D' : '#E5E7EB',
              backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF'
            }]}>
              <TouchableOpacity 
                style={[styles.primaryActionButton, { backgroundColor: COLORS.primary }]}
                onPress={() => setShowTipsModal(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                <Text style={styles.primaryActionButtonText}>{t('got_it')}</Text>
              </TouchableOpacity>
            </View>
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
          <View style={[styles.modalContainer, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('scan_unsuccessful')}</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
              {t('could_not_recognize_coffee_plant')}
            </Text>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: COLORS.primary }]}
              onPress={() => setShowUnknownModal(false)}
            >
              <Text style={styles.modalButtonText}>{t('try_again')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  fullScreenCameraContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    backgroundColor: COLORS.black,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
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
  cameraControlsOverlay: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 80 : 100,
    right: 16,
    zIndex: 11,
  },
  cameraControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  cameraControlButtonActive: {
    backgroundColor: COLORS.white,
  },
  processingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  processingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.white,
    fontWeight: '500',
  },
  floatingActionButtonsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
    zIndex: 11,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
  },
  infoButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  // Redesigned Scanning Tips Modal - Complete New Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  modalHandleBar: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  modalHeaderSection: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 14,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitleTextContainer: {
    flex: 1,
  },
  modalMainTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  modalSubtitleText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  modalScrollArea: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  tipsCompactContainer: {
    gap: 10,
  },
  tipCompactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    gap: 12,
  },
  tipCompactIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipCompactText: {
    flex: 1,
  },
  tipCompactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
    lineHeight: 19,
  },
  tipCompactDesc: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  modalFooterSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryActionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default ScanScreen;