import React, { useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Image,
  StatusBar,
  Share,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import { NavigationProp, RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, MainTabParamList } from '../navigation/types';
import { ScanResult, useScanStore } from '../viewmodels/ScanViewModel';
import { useAuthStore } from '../stores/authStore';
import VarietySelector, { CoffeeVariety } from '../components/VarietySelector';
import { treatmentRecommendations } from '../constants/treatmentRecommendations';
import { ThemeContext } from '../context/ThemeContext';

type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

const ResultsScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;
  
  const route = useRoute<ResultsScreenRouteProp>();
  const navigation = useNavigation<NativeStackScreenProps<RootStackParamList>['navigation']>();
  const { imageUri, diagnosis } = route.params;
  const saveScanResult = useScanStore((s) => s.saveScanResult);
  const { user } = useAuthStore();
  const [selectedVariety, setSelectedVariety] = React.useState<CoffeeVariety>('arabica');

  if (!diagnosis) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
        <Header title="Scan Results" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.centeredContainer}>
          <Text style={[styles.errorText, { color: themedColors.error }]}>No diagnosis data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Scan Results - ${diagnosis.disease} detected with ${diagnosis.confidence}% confidence.`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleSave = async () => {
    try {
      await saveScanResult({
        ...diagnosis,
        imageUri,
        coordinates: user?.location?.coordinates,
        address: user?.location?.address,
      });
      Alert.alert('Saved', 'Scan result saved locally.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save scan result.');
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'early': return '#4CAF50';
      case 'progressive': return '#FFA000';
      case 'severe': return '#F44336';
      case 'healthy': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'early': return 'leaf';
      case 'progressive': return 'warning';
      case 'severe': return 'alert-circle';
      case 'healthy': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const getStageDescription = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'early': return 'Early signs - Good chance to control';
      case 'progressive': return 'Spreading - Needs immediate action';
      case 'severe': return 'Advanced stage - Urgent care needed';
      case 'healthy': return 'Plant is in good health - Continue regular monitoring';
      default: return 'Status unknown';
    }
  };

  // Check if there's an error message
  const hasError = diagnosis.error !== undefined;
  const errorMessage = diagnosis.error;

  // Helper to get treatment recommendations
  const getTreatment = () => {
    if (
      diagnosis.disease === 'Coffee Leaf Rust' &&
      treatmentRecommendations['Coffee Leaf Rust'] &&
      treatmentRecommendations['Coffee Leaf Rust'][diagnosis.stage]
    ) {
      return treatmentRecommendations['Coffee Leaf Rust'][diagnosis.stage][selectedVariety];
    }
    return null;
  };
  const treatment = getTreatment();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "light-content"} 
        backgroundColor={COLORS.primary} 
      />
      
      <Header
        title="Scan Results"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        {/* Image Preview (Full Width at Top) */}
        <View style={styles.fullWidthImageContainer}>
          <Image 
            source={{ uri: imageUri }} 
            style={styles.fullWidthScanImage}
            resizeMode="cover"
          />
          <TouchableOpacity 
            style={styles.retakeButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="camera-outline" size={20} color={COLORS.white} />
            <Text style={styles.retakeButtonText}>Retake</Text>
          </TouchableOpacity>
        </View>

        {/* Error Message or Diagnosis Card */}
        {hasError ? (
          <View style={[styles.section, { paddingHorizontal: 20 }]}>
            <View style={[styles.errorCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Ionicons name="alert-circle-outline" size={32} color={COLORS.error} />
              <Text style={[styles.errorMessage, { color: isDarkMode ? themedColors.white : themedColors.error }]}>{errorMessage}</Text>
              <TouchableOpacity 
                style={styles.retakeButtonLarge}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="camera-outline" size={24} color={COLORS.white} />
                <Text style={styles.retakeButtonTextLarge}>Take New Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
        <>
          {/* Plant Health Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Diagnosis</Text>
            </View>

            <View style={[styles.diagnosisCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.diagnosisCardDiseaseName, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{diagnosis.disease}</Text>

              <View style={styles.stageAndConfidenceRow}>
                <View style={styles.stageBadgeContainer}>
                  <Text style={[styles.diagnosisDetailLabel, { color: themedColors.gray }]}>Stage</Text>
                  <View style={[styles.stageBadge, { backgroundColor: getStageColor(diagnosis.stage) }]}>
                    <Text style={[styles.stageBadgeText, { color: COLORS.white }]}>{diagnosis.stage === 'Healthy' ? 'Healthy' : diagnosis.stage}</Text>
                  </View>
                </View>

                <View style={styles.confidenceScoreContainer}>
                  <Text style={[styles.diagnosisDetailLabel, { color: themedColors.gray }]}>Confidence Score</Text>
                  <Text style={[styles.confidenceValueText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{diagnosis.confidence}%</Text>
                </View>
              </View>

              <View style={[styles.confidenceProgressBar, { backgroundColor: isDarkMode ? themedColors.lightGray : COLORS.lightGray, marginTop: 10 }]}>
                <View
                  style={[
                    styles.confidenceProgressBarFill,
                    {
                      width: `${diagnosis.confidence}%`,
                      backgroundColor: getStageColor(diagnosis.stage)
                    }
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Treatment Recommendations or Preventive Tips Section */}
          {(diagnosis.disease === 'Coffee Leaf Rust' && diagnosis.stage !== 'Healthy') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Disease Management</Text>
              </View>
              <Text style={[styles.treatmentInfo, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>Choose your coffee variety:</Text>
              <VarietySelector value={selectedVariety} onChange={setSelectedVariety} />
              {treatment ? (
                <View style={[styles.treatmentCardSingle, { backgroundColor: isDarkMode ? themedColors.secondary : '#F7F7F7' }]}>
                  {/* Chemical Control */}
                  <View style={styles.treatmentBlock}>
                    <View style={styles.treatmentBlockHeader}>
                      <Text style={[styles.treatmentBlockTitle, { color: isDarkMode ? themedColors.white : themedColors.primary }]}>Chemical Control</Text>
                    </View>
                    {treatment.chemical.map((item, idx) => (
                      <Text key={idx} style={[styles.treatmentBlockText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{item}</Text>
                    ))}
                  </View>
                  {/* Divider */}
                  <View style={[styles.treatmentDivider, { backgroundColor: isDarkMode ? themedColors.lightGray : '#E0E0E0' }]} />
                  {/* Cultural Control */}
                  <View style={styles.treatmentBlock}>
                    <View style={styles.treatmentBlockHeader}>
                      <Text style={[styles.treatmentBlockTitle, { color: isDarkMode ? themedColors.white : themedColors.primary }]}>Cultural Control</Text>
                    </View>
                    {treatment.cultural.map((item, idx) => (
                      <Text key={idx} style={[styles.treatmentBlockText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{item}</Text>
                    ))}
                  </View>
                  <Text style={[styles.treatmentSources, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>Sources: {treatment.sources.join(', ')}</Text>
                </View>
              ) : (
                <Text style={[styles.treatmentBlockText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>No recommendations available for this stage/variety.</Text>
              )}
            </View>
          )}

          {/* Preventive Tips for Healthy Plant */}
          {(diagnosis.disease === 'Healthy Plant' || diagnosis.stage === 'Healthy') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Preventive Tips</Text>
              </View>
              <Text style={[styles.treatmentInfo, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>Choose your coffee variety:</Text>
              <VarietySelector value={selectedVariety} onChange={setSelectedVariety} />
              {treatmentRecommendations['Coffee Leaf Rust']?.Healthy?.[selectedVariety]?.cultural?.length ? (
                <View style={[styles.treatmentCardSingle, { backgroundColor: isDarkMode ? themedColors.secondary : '#F7F7F7' }]}>
                  <View style={styles.treatmentBlock}>
                    <View style={styles.treatmentBlockHeader}>
                      <Text style={[styles.treatmentBlockTitle, { color: isDarkMode ? themedColors.white : themedColors.primary }]}>Cultural Tips</Text>
                    </View>
                    {treatmentRecommendations['Coffee Leaf Rust'].Healthy[selectedVariety].cultural.map((item, idx) => (
                      <Text key={idx} style={[styles.treatmentBlockText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{item}</Text>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={[styles.treatmentBlockText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>No preventive tips available for this variety.</Text>
              )}
            </View>
          )}

          {/* Action Buttons */}
          {!hasError && (
          <TouchableOpacity
              style={[styles.fullWidthActionButton, { backgroundColor: COLORS.primary }]} // Use new style
              onPress={() => navigation.navigate('MainTabs', { screen: 'ScanTab' })}
            >
              <Ionicons name="camera-outline" size={24} color={COLORS.white} />
              <Text style={styles.actionButtonText}>Scan Another Image</Text>
            </TouchableOpacity>
          )}
        </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  fullWidthImageContainer: {
    width: '100%',
    height: 250, // Fixed height for full-width image
    overflow: 'hidden',
    marginBottom: 20,
  },
  fullWidthScanImage: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    position: 'absolute',
    bottom: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15, // Cohesive with other buttons/cards
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  retakeButtonText: {
    color: COLORS.white,
    marginLeft: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20, // Re-enabled padding to align with HomeScreen
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    // paddingHorizontal: 20, // Removed since card now has padding
  },
  sectionTitle: {
    fontSize: 22, // Adjusted for cohesion with ReportsScreen section titles
    fontWeight: '700',
    color: COLORS.black,
  },
  diagnosisCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    marginHorizontal: 0, // Removed to align with section padding
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    marginBottom: 20,
  },
  diagnosisCardLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  diagnosisCardDiseaseName: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.black,
    marginBottom: 15,
  },
  diagnosisDetailsRow: {
    // Replaced by diseaseAndStageContainer and stageAndConfidenceRow
  },
  diagnosisDetailItem: {
    alignItems: 'flex-start', // Revert to align-start for individual labels
    marginRight: 0,
  },
  diagnosisDetailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stageBadgeText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 0, // Removed marginLeft as icon is removed
  },
  confidenceValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
  },
  confidenceProgressBarContainer: {
    // Removed
  },
  confidenceProgressBar: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
  },
  confidenceProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceSection: {
    // Replaced by diseaseAndStageContainer and stageAndConfidenceRow
  },
  confidenceLabel: {
    // Removed
  },
  stageContainer: {
    // Removed as it's now part of diagnosisSummaryRow
  },
  stageCard: {
    // Removed as its content is now integrated into diagnosisSummaryRow
  },
  stageIconContainer: {
    // Removed as its content is now integrated into diagnosisSummaryRow
  },
  stageInfo: {
    // Removed as its content is now integrated into diagnosisSummaryRow
  },
  stageTitle: {
    // Removed as its content is now integrated into diagnosisSummaryRow
  },
  stageDescription: {
    // Removed as its content is now integrated into diagnosisSummaryRow
  },
  imageSection: {
    // Removed as the image is now full width at top
  },
  imageContainer: {
    // Removed as the image is now full width at top
  },
  scanImage: {
    // Removed as the image is now full width at top
  },
  diseaseHeader: {
    marginBottom: 20,
  },
  diseaseName: {
    // Renamed to diseaseNameText
  },
  actionButtons: {
    // Removed, now using fullWidthActionButton directly
  },
  actionButton: {
    // Removed
  },
  secondaryButton: {
    // Removed
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    // Removed
  },
  fullWidthActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 15,
    marginHorizontal: 20, // Match section padding
    marginBottom: 20, // Add bottom margin for spacing
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.error,
    textAlign: 'center',
    marginVertical: 15,
    lineHeight: 22,
  },
  retakeButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15, // Cohesive with other buttons/cards
    marginTop: 10,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  retakeButtonTextLarge: {
    color: COLORS.white,
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  treatmentInfo: {
    fontSize: 15,
    color: COLORS.gray,
    marginBottom: 8,
    textAlign: 'left',
  },
  treatmentCardSingle: {
    backgroundColor: '#F7F7F7',
    borderRadius: 15, // Cohesive with other cards
    padding: 16,
    marginTop: 0, // Removed
    marginBottom: 0, // Removed
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  treatmentBlock: {
    marginBottom: 12,
  },
  treatmentBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  treatmentBlockTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginLeft: 0, // Adjusted margin after icon removal
  },
  treatmentBlockText: {
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 2,
    marginLeft: 0, // Adjusted margin
    lineHeight: 22,
  },
  treatmentDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
    borderRadius: 1, // Adjusted for consistency
  },
  treatmentSources: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  stageAndConfidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    // marginHorizontal: 20, // Removed since card now has padding
  },
  stageBadgeContainer: {
    alignItems: 'flex-start',
  },
  confidenceScoreContainer: {
    alignItems: 'flex-end',
  },
  diseaseNameText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.black,
    marginBottom: 15,
  },
});

export default ResultsScreen;