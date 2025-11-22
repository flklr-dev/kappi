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
  Alert,
  Modal,
  Platform
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
  const [showFullScreenImage, setShowFullScreenImage] = React.useState(false);

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
      case 'early': return '#4CAF50'; // Green
      case 'progressive': return '#FFA000'; // Yellow/Orange
      case 'severe': return '#F44336'; // Red
      case 'infected': return '#F44336'; // Red
      case 'healthy': return '#4CAF50'; // Green
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

  // Helper to get scientific name for each disease
  const getScientificName = (disease: string) => {
    switch (disease) {
      case 'Coffee Leaf Rust':
        return 'Hemileia vastatrix';
      case 'Coffee Brown Spot':
        return 'Cercospora coffeicola';
      case 'Coffee Leaf Spot':
        return 'Phoma costaricensis';
      case 'Coffee Sooty Mold':
        return 'Capnodium / Cladosporium / Scorias spp.';
      default:
        return null;
    }
  };

  // Helper to get treatment recommendations with fallback to default
  const getTreatment = () => {
    // Get the disease name from scan
    const diseaseName = scan.disease;
    
    // Check if treatment recommendations exist for this disease
    if (treatmentRecommendations[diseaseName]) {
      // Try to get stage-specific treatment
      const stageTreatment = treatmentRecommendations[diseaseName][scan.stage];
      if (stageTreatment && stageTreatment[selectedVariety]) {
        return stageTreatment[selectedVariety];
      }
      // Fallback to default if stage not found
      const defaultTreatment = treatmentRecommendations[diseaseName]['Default'];
      if (defaultTreatment && defaultTreatment[selectedVariety]) {
        return defaultTreatment[selectedVariety];
      }
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
        <TouchableOpacity 
          activeOpacity={0.9}
          onPress={() => setShowFullScreenImage(true)}
        >
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
            {scan.imageUri && (
              <View style={styles.imageOverlay}>
                <Ionicons name="expand-outline" size={24} color={COLORS.white} />
                <Text style={styles.tapToViewText}>{t('tap_to_view_full_image')}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Plant Health Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('diagnosis')}</Text>
          </View>

          <View style={[styles.diagnosisCard, { 
            backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white,
            borderColor: isDarkMode ? 'transparent' : '#E8EBF0'
          }]}>
            {/* Disease Name */}
            <Text style={[styles.diagnosisCardDiseaseName, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
              {scan.disease}
            </Text>

            {/* Scientific Name */}
            {getScientificName(scan.disease) && (
              <Text style={[styles.scientificName, { color: isDarkMode ? themedColors.gray : '#666' }]}>
                {getScientificName(scan.disease)}
              </Text>
            )}

            {/* Divider */}
            <View style={[styles.diagnosisDivider, { backgroundColor: isDarkMode ? '#333' : '#E8EBF0' }]} />

            {/* Stage and Confidence Row */}
            <View style={styles.stageAndConfidenceRow}>
              <View style={styles.stageBadgeContainer}>
                <Text style={[styles.diagnosisDetailLabel, { color: themedColors.gray }]}>
                  {t('stage')}
                </Text>
                <Text style={[styles.diagnosisStageText, { color: getStageColor(scan.stage) }]}>
                  {scan.stage === 'Healthy' ? t('healthy') : scan.stage}
                </Text>
              </View>

              <View style={styles.confidenceScoreContainer}>
                <Text style={[styles.diagnosisDetailLabel, { color: themedColors.gray }]}>
                  {t('confidence_score')}
                </Text>
                <Text style={[styles.confidenceValueText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                  {scan.confidence}%
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={[styles.confidenceProgressBar, { backgroundColor: isDarkMode ? themedColors.lightGray : '#E8EBF0' }]}>
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

        {/* Treatment Recommendations - Show for all diseases except Healthy Plant */}
        {(scan.disease !== 'Healthy Plant' && scan.stage !== 'Healthy') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                {t('disease_management')}
              </Text>
            </View>
            <Text style={[styles.treatmentInfo, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>
              {t('choose_your_coffee_variety')}
            </Text>
            <View style={styles.varietySelectorContainer}>
              <VarietySelector value={selectedVariety} onChange={setSelectedVariety} />
            </View>
            {treatment && (
              <View style={[styles.treatmentContainer, { 
                backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white,
                borderColor: isDarkMode ? 'transparent' : '#E8EBF0'
              }]}>
                <View style={styles.treatmentHeader}>
                  <Text style={[styles.treatmentHeaderTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                    {scan.disease}
                  </Text>
                  <View style={[styles.stageBadge, { backgroundColor: getStageColor(scan.stage) }]}>
                    <Text style={styles.stageBadgeText}>
                      {scan.stage === 'Healthy' ? t('healthy') : scan.stage}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.treatmentCardsContainer}>
                  {/* Chemical Control Card */}
                  {treatment.chemical && treatment.chemical.length > 0 && (
                    <View style={styles.treatmentCard}>
                      <View style={styles.treatmentCardHeader}>
                        <Ionicons name="flask" size={20} color={COLORS.primary} />
                        <Text style={[styles.treatmentCardTitle, { color: isDarkMode ? themedColors.white : themedColors.primary }]}>
                          {t('chemical_control')}
                        </Text>
                      </View>
                      <View style={styles.treatmentCardContent}>
                        {treatment.chemical.map((item, idx) => (
                          <View key={idx} style={styles.treatmentItem}>
                            <View style={[styles.bulletPoint, { backgroundColor: COLORS.primary }]} />
                            <Text style={[styles.treatmentItemText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                              {item}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  
                  {/* Divider between cards */}
                  {treatment.chemical && treatment.chemical.length > 0 && treatment.cultural && treatment.cultural.length > 0 && (
                    <View style={[styles.treatmentDivider, { backgroundColor: isDarkMode ? '#333' : '#E8EBF0' }]} />
                  )}
                  
                  {/* Cultural Control Card */}
                  {treatment.cultural && treatment.cultural.length > 0 && (
                    <View style={styles.treatmentCard}>
                      <View style={styles.treatmentCardHeader}>
                        <Ionicons name="leaf" size={20} color={COLORS.primary} />
                        <Text style={[styles.treatmentCardTitle, { color: isDarkMode ? themedColors.white : themedColors.primary }]}>
                          {t('cultural_control')}
                        </Text>
                      </View>
                      <View style={styles.treatmentCardContent}>
                        {treatment.cultural.map((item, idx) => (
                          <View key={idx} style={styles.treatmentItem}>
                            <View style={[styles.bulletPoint, { backgroundColor: COLORS.primary }]} />
                            <Text style={[styles.treatmentItemText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                              {item}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
                
                {treatment.sources && treatment.sources.length > 0 && (
                  <View style={styles.sourcesContainer}>
                    <Text style={[styles.sourcesTitle, { color: isDarkMode ? themedColors.gray : themedColors.gray }]}>
                      {t('sources')}:
                    </Text>
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
              <View style={[styles.treatmentContainer, { 
                backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white,
                borderColor: isDarkMode ? 'transparent' : '#E8EBF0'
              }]}>
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

      {/* Full-Screen Image Modal */}
      {scan.imageUri && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={showFullScreenImage}
          onRequestClose={() => setShowFullScreenImage(false)}
          statusBarTranslucent
        >
          <View style={styles.fullScreenModalOverlay}>
            <TouchableOpacity 
              style={styles.closeFullScreenButton}
              onPress={() => setShowFullScreenImage(false)}
            >
              <Ionicons name="close" size={32} color={COLORS.white} />
            </TouchableOpacity>
            
            <Image 
              source={{ uri: resolveImageUri(scan.imageUri) }} 
              style={styles.fullScreenImage}
              resizeMode="contain"
            />
            
            <View style={styles.fullScreenImageInfo}>
              <Text style={styles.fullScreenImageInfoText}>
                {scan.disease} - {scan.confidence}%
              </Text>
            </View>
          </View>
        </Modal>
      )}
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
    height: 300,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  fullWidthScanImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlay: {
    position: 'absolute',
    top: 15,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tapToViewText: {
    color: COLORS.white,
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
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
    borderRadius: 16,
    padding: 24,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#E8EBF0',
  },
  diagnosisCardDiseaseName: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  scientificName: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginTop: -12,
    marginBottom: 16,
  },
  diagnosisDivider: {
    height: 1,
    backgroundColor: '#E8EBF0',
    marginBottom: 16,
  },
  stageAndConfidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
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
  diagnosisStageText: {
    fontSize: 24,
    fontWeight: '700',
  },
  confidenceScoreContainer: {
    alignItems: 'flex-end',
  },
  confidenceValueText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
  },
  confidenceProgressBar: {
    height: 6,
    backgroundColor: COLORS.lightGray,
    borderRadius: 3,
    marginTop: 16,
  },
  confidenceProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EBF0',
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
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8EBF0',
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
    // Removed gap, using dividers instead
  },
  treatmentCard: {
    paddingVertical: 8,
  },
  treatmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  treatmentCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginLeft: 8,
  },
  treatmentCardContent: {
    gap: 6,
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
  treatmentDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
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
    borderWidth: 1,
    borderColor: '#E8EBF0',
  },
  noTreatmentText: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  fullScreenModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeFullScreenButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 50 : 60,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: '100%',
    height: '100%',
  },
  fullScreenImageInfo: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 40 : 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 12,
  },
  fullScreenImageInfoText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ViewScanScreen;