import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  StatusBar, 
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import Header from '../components/Header';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList } from '../navigation/types';

type ScanScreenNavigationProp = NativeStackNavigationProp<MainTabParamList, 'Results'>;

const ScanScreen = () => {
  const navigation = useNavigation<ScanScreenNavigationProp>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);

  const handleCapture = () => {
    setIsProcessing(true);
    // Simulate processing time
    setTimeout(() => {
      setIsProcessing(false);
      // Navigate to ResultsScreen with mock data
      navigation.navigate('Results', {
        imageUri: 'https://example.com/scan.jpg' // Replace with actual captured image URI
      });
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <Header
        title="Scan Plant"
        subtitle="Take a photo to detect diseases"
      />
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Camera View */}
        <View style={styles.cameraSection}>
          <View style={styles.cameraContainer}>
            <View style={styles.cameraView}>
              <View style={styles.cameraPlaceholder}>
                <Ionicons name="camera-outline" size={60} color={COLORS.gray} />
                <Text style={styles.cameraPlaceholderText}>Camera Preview</Text>
              </View>
              
              <View style={styles.cameraControls}>
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
            </View>
          </View>

          {/* Processing Indicator */}
          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.processingText}>Analyzing image...</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="images-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionButtonText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.captureButton}
            onPress={handleCapture}
            disabled={isProcessing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionButtonIcon}>
              <Ionicons name="camera-outline" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionButtonText}>Switch</Text>
          </TouchableOpacity>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.primary} />
            <Text style={styles.tipsTitle}>Tips for best results</Text>
          </View>
          
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Ionicons name="sunny-outline" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.tipText}>Ensure good lighting</Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Ionicons name="scan-outline" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.tipText}>Keep the plant centered</Text>
            </View>
            
            <View style={styles.tipItem}>
              <View style={styles.tipIcon}>
                <Ionicons name="hand-left-outline" size={16} color={COLORS.primary} />
              </View>
              <Text style={styles.tipText}>Hold steady</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  cameraSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  cameraContainer: {
    width: width * 0.9,
    aspectRatio: 3/4,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cameraView: {
    flex: 1,
    position: 'relative',
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraPlaceholderText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
  },
  cameraControls: {
    position: 'absolute',
    top: 15,
    right: 15,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  processingText: {
    marginTop: 15,
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    alignItems: 'center',
    width: 80,
  },
  actionButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionButtonText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.black,
    fontWeight: '500',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  captureButtonInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.primary,
  },
  tipsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.black,
    fontWeight: '500',
  },
});

export default ScanScreen; 