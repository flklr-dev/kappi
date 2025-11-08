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
import { useLanguage } from '../context/LanguageContext';

type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

const ResultsScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { t } = useLanguage();
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;
  
  const route = useRoute<ResultsScreenRouteProp>();
  const navigation = useNavigation<NativeStackScreenProps<RootStackParamList>['navigation']>();
  const { imageUri, diagnosis } = route.params as { imageUri: string; diagnosis: ScanResult };
  const saveScanResult = useScanStore((s) => s.saveScanResult);
  const { user } = useAuthStore();
  const [selectedVariety, setSelectedVariety] = React.useState<CoffeeVariety>('arabica');

  if (!diagnosis) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
        <Header title={t('scan_results')} showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.centeredContainer}>
          <Text style={[styles.errorText, { color: themedColors.error }]}>{t('no_diagnosis_data_available')}</Text>
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
      Alert.alert(t('saved'), t('scan_result_saved_locally'));
    } catch (e) {
      Alert.alert(t('error'), t('failed_to_save_scan_result'));
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

  const isHealthyStage = (stage: string) => stage === 'Healthy';

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
      case 'early': return t('early_signs_good_chance_to_control');
      case 'progressive': return t('spreading_needs_immediate_action');
      case 'severe': return t('advanced_stage_urgent_care_needed');
      case 'healthy': return t('plant_is_in_good_health_continue_monitoring');
      default: return t('status_unknown');
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
        title={t('scan_results')}
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
            <Text style={styles.retakeButtonText}>{t('retake')}</Text>
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
                <Text style={styles.retakeButtonTextLarge}>{t('take_new_photo')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
        <>
          {/* Plant Health Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('diagnosis')}</Text>
            </View>

            <View style={[styles.diagnosisCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.diagnosisCardDiseaseName, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{diagnosis.disease}</Text>

              <View style={styles.stageAndConfidenceRow}>
                <View style={styles.stageBadgeContainer}>
                  <Text style={[styles.diagnosisDetailLabel, { color: themedColors.gray }]}>{t('stage')}</Text>
                  <View style={[styles.stageBadge, { backgroundColor: getStageColor(diagnosis.stage) }]}>
                    <Text style={styles.stageBadgeText}>{isHealthyStage(diagnosis.stage) ? t('healthy') : diagnosis.stage}</Text>
                  </View>
                </View>

                <View style={styles.confidenceScoreContainer}>
                  <Text style={[styles.diagnosisDetailLabel, { color: themedColors.gray }]}>{t('confidence_score')}</Text>
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
                <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('disease_management')}</Text>
              </View>
              <Text style={[styles.treatmentInfo, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>{t('choose_your_coffee_variety')}</Text>
              <View style={styles.varietySelectorContainer}>
                <VarietySelector value={selectedVariety} onChange={setSelectedVariety} />
              </View>
              {treatment ? (
                <View style={[styles.treatmentContainer, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
                  <View style={styles.treatmentHeader}>
                    <Text style={[styles.treatmentHeaderTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                      {diagnosis.disease} - {diagnosis.stage} {t('stage')}
                    </Text>
                    <View style={[styles.stageBadge, { backgroundColor: getStageColor(diagnosis.stage) }]}>
                      <Text style={styles.stageBadgeText}>{isHealthyStage(diagnosis.stage) ? t('healthy') : diagnosis.stage}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.treatmentCardsContainer}>
                    {/* Chemical Control Card */}
                    <View style={[styles.treatmentCard, { backgroundColor: isDarkMode ? themedColors.background : '#F8F9FA' }]}>
                      <View style={styles.treatmentCardHeader}>
                        <Ionicons name="flask" size={20} color={COLORS.primary} />
                        <Text style={[styles.treatmentCardTitle, { color: isDarkMode ? themedColors.white : themedColors.primary }]}>{t('chemical_control')}</Text>
                      </View>
                      <View style={styles.treatmentCardContent}>
                        {treatment.chemical.map((item, idx) => (
                          <View key={idx} style={styles.treatmentItem}>
                            <View style={[styles.bulletPoint, { backgroundColor: COLORS.primary }]} />
                            <Text style={[styles.treatmentItemText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    
                    {/* Cultural Control Card */}
                    <View style={[styles.treatmentCard, { backgroundColor: isDarkMode ? themedColors.background : '#F8F9FA' }]}>
                      <View style={styles.treatmentCardHeader}>
                        <Ionicons name="leaf" size={20} color={COLORS.primary} />
                        <Text style={[styles.treatmentCardTitle, { color: isDarkMode ? themedColors.white : themedColors.primary }]}>{t('cultural_control')}</Text>
                      </View>
                      <View style={styles.treatmentCardContent}>
                        {treatment.cultural.map((item, idx) => (
                          <View key={idx} style={styles.treatmentItem}>
                            <View style={[styles.bulletPoint, { backgroundColor: COLORS.primary }]} />
                            <Text style={[styles.treatmentItemText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                  
                  {treatment.sources && treatment.sources.length > 0 && (
                    <View style={styles.sourcesContainer}>
                      <Text style={[styles.sourcesTitle, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>{t('sources')}:</Text>
                      <View style={styles.sourcesList}>
                        {treatment.sources.map((source, idx) => (
                          <Text key={idx} style={[styles.sourceItem, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>
                            {source}{idx < treatment.sources.length - 1 ? ', ' : ''}
                          </Text>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <View style={[styles.noTreatmentContainer, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
                  <Ionicons name="information-circle-outline" size={24} color={isDarkMode ? themedColors.gray : COLORS.gray} />
                  <Text style={[styles.noTreatmentText, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>{t('no_recommendations_available')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Preventive Tips for Healthy Plant */}
          {(diagnosis.disease === 'Healthy Plant' || isHealthyStage(diagnosis.stage)) && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('preventive_tips')}</Text>
              </View>
              <Text style={[styles.treatmentInfo, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>{t('choose_your_coffee_variety')}</Text>
              <View style={styles.varietySelectorContainer}>
                <VarietySelector value={selectedVariety} onChange={setSelectedVariety} />
              </View>
              {treatmentRecommendations['Coffee Leaf Rust']?.Healthy?.[selectedVariety]?.cultural?.length ? (
                <View style={[styles.treatmentContainer, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
                  <View style={styles.treatmentHeader}>
                    <Text style={[styles.treatmentHeaderTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                      {t('preventive_care_for_healthy_plants')}
                    </Text>
                    <View style={[styles.stageBadge, { backgroundColor: getStageColor('Healthy') }]}>
                      <Text style={styles.stageBadgeText}>{t('healthy')}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.treatmentCard}>
                    <View style={styles.treatmentCardHeader}>
                      <Ionicons name="leaf" size={20} color={COLORS.primary} />
                      <Text style={[styles.treatmentCardTitle, { color: isDarkMode ? themedColors.white : themedColors.primary }]}>{t('cultural_tips')}</Text>
                    </View>
                    <View style={styles.treatmentCardContent}>
                      {treatmentRecommendations['Coffee Leaf Rust'].Healthy[selectedVariety].cultural.map((item, idx) => (
                        <View key={idx} style={styles.treatmentItem}>
                          <View style={[styles.bulletPoint, { backgroundColor: COLORS.primary }]} />
                          <Text style={[styles.treatmentItemText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={[styles.noTreatmentContainer, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
                  <Ionicons name="information-circle-outline" size={24} color={isDarkMode ? themedColors.gray : COLORS.gray} />
                  <Text style={[styles.noTreatmentText, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>{t('no_preventive_tips_available')}</Text>
                </View>
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
              <Text style={styles.actionButtonText}>{t('scan_another_image')}</Text>
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
  varietySelectorContainer: {
    marginBottom: 16,
  },
  treatmentContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    marginBottom: 20,
  },
  treatmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  treatmentHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    flex: 1,
    marginRight: 10,
  },
  treatmentCardsContainer: {
    gap: 16,
  },
  treatmentCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
  },
  treatmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  treatmentCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  treatmentCardContent: {
    gap: 8,
  },
  treatmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.primary,
    marginTop: 8,
    marginRight: 12,
  },
  treatmentItemText: {
    fontSize: 15,
    color: COLORS.black,
    flex: 1,
    lineHeight: 22,
  },
  sourcesContainer: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  sourcesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 4,
  },
  sourcesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sourceItem: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  noTreatmentContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  noTreatmentText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  stageAndConfidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
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