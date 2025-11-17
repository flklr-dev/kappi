import React, { useContext, useState } from 'react';
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
import { RootStackParamList } from '../navigation/types';
import { ScanResult } from '../viewmodels/ScanViewModel';
import { useAuthStore } from '../stores/authStore';
import VarietySelector, { CoffeeVariety } from '../components/VarietySelector';
import { treatmentRecommendations } from '../constants/treatmentRecommendations';
import { ThemeContext } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { resolveImageUri } from '../services/api';

type ViewScanScreenRouteProp = RouteProp<RootStackParamList, 'ViewScan'>;

interface ViewScanScreenProps {
  route: ViewScanScreenRouteProp;
}

const ViewScanScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { t } = useLanguage();
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;
  
  const route = useRoute<ViewScanScreenRouteProp>();
  const navigation = useNavigation<NativeStackScreenProps<RootStackParamList>['navigation']>();
  const { scan } = route.params;
  const { user } = useAuthStore();
  const [selectedVariety, setSelectedVariety] = React.useState<CoffeeVariety>('arabica');

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${t('scan_results')} - ${scan.disease} ${t('detected_with')} ${scan.confidence}% ${t('confidence')}.`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
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
      case 'early': return t('early_signs_good_chance_to_control');
      case 'progressive': return t('spreading_needs_immediate_action');
      case 'severe': return t('advanced_stage_urgent_care_needed');
      case 'healthy': return t('plant_is_in_good_health_continue_monitoring');
      default: return t('status_unknown');
    }
  };

  // Helper to get treatment recommendations
  const getTreatment = () => {
    if (
      scan.disease === 'Coffee Leaf Rust' &&
      treatmentRecommendations['Coffee Leaf Rust'] &&
      treatmentRecommendations['Coffee Leaf Rust'][scan.stage]
    ) {
      return treatmentRecommendations['Coffee Leaf Rust'][scan.stage][selectedVariety];
    }
    return null;
  };
  const treatment = getTreatment();

  // Format date for display
  const formatDate = (date: string | number | Date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "light-content"} 
        backgroundColor={COLORS.primary} 
      />
      
      <Header
        title={t('scan_details')}
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity onPress={handleShare} style={styles.headerIcon}>
            <Ionicons name="share-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView}>
        {/* Image Preview (Full Width at Top) */}
        <View style={styles.fullWidthImageContainer}>
          {scan.imageUri ? (
            <Image 
              source={{ uri: resolveImageUri(scan.imageUri) }} 
              style={styles.fullWidthScanImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.fullWidthScanImage, styles.placeholderImage, { 
              backgroundColor: isDarkMode ? themedColors.secondary : COLORS.primary + '08' 
            }]}>
              <Ionicons name="leaf-outline" size={48} color={COLORS.primary} />
            </View>
          )}
        </View>

        {/* Plant Health Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('diagnosis')}</Text>
          </View>

          <View style={[styles.diagnosisCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            <Text style={[styles.diagnosisCardDiseaseName, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{scan.disease}</Text>

            <View style={styles.stageAndConfidenceRow}>
              <View style={styles.stageBadgeContainer}>
                <Text style={[styles.diagnosisDetailLabel, { color: themedColors.gray }]}>{t('stage')}</Text>
                <View style={[styles.stageBadge, { backgroundColor: getStageColor(scan.stage) }]}>
                  <Text style={[styles.stageBadgeText, { color: COLORS.white }]}>{scan.stage === 'Healthy' ? t('healthy') : scan.stage}</Text>
                </View>
              </View>

              <View style={styles.confidenceScoreContainer}>
                <Text style={[styles.diagnosisDetailLabel, { color: themedColors.gray }]}>{t('confidence_score')}</Text>
                <Text style={[styles.confidenceValueText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{scan.confidence}%</Text>
              </View>
            </View>

            <View style={[styles.confidenceProgressBar, { backgroundColor: isDarkMode ? themedColors.lightGray : COLORS.lightGray, marginTop: 10 }]}>
              <View
                style={[
                  styles.confidenceProgressBarFill,
                  {
                    width: `${scan.confidence}%`,
                    backgroundColor: getStageColor(scan.stage)
                  }
                ]}
              />
            </View>
          </View>
        </View>

        {/* Scan Information */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('scan_information')}</Text>
          </View>

          <View style={[styles.infoCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: themedColors.gray }]}>{t('date')}</Text>
              <Text style={[styles.infoValue, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{formatDate(scan.createdAt)}</Text>
            </View>

            {scan.address && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: themedColors.gray }]}>{t('location')}</Text>
                <Text style={[styles.infoValue, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                  {[scan.address.barangay, scan.address.cityMunicipality, scan.address.province]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Treatment Recommendations or Preventive Tips Section */}
        {(scan.disease === 'Coffee Leaf Rust' && scan.stage !== 'Healthy') && (
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
                    {scan.disease} - {scan.stage} {t('stage')}
                  </Text>
                  <View style={[styles.stageBadge, { backgroundColor: getStageColor(scan.stage) }]}>
                    <Text style={styles.stageBadgeText}>{scan.stage === 'Healthy' ? t('healthy') : scan.stage}</Text>
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
        {(scan.disease === 'Healthy Plant' || scan.stage === 'Healthy') && (
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
  headerIcon: {
    padding: 8,
  },
  fullWidthImageContainer: {
    width: '100%',
    height: 250,
    overflow: 'hidden',
    marginBottom: 20,
  },
  fullWidthScanImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
  },
  diagnosisCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    marginBottom: 20,
  },
  diagnosisCardDiseaseName: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.black,
    marginBottom: 15,
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
    marginLeft: 0,
  },
  confidenceScoreContainer: {
    alignItems: 'flex-end',
  },
  confidenceValueText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
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
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    textAlign: 'right',
    flex: 1,
    marginLeft: 10,
  },
  treatmentInfo: {
    fontSize: 15,
    color: COLORS.gray,
    marginBottom: 8,
    textAlign: 'left',
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
});

export default ViewScanScreen;