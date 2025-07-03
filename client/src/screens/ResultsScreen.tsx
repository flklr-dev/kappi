import React from 'react';
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
import { COLORS } from '../constants/colors';
import Header from '../components/Header';
import { NavigationProp, RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ScanResult, useScanStore } from '../viewmodels/ScanViewModel';
import { useAuthStore } from '../stores/authStore';
import VarietySelector, { CoffeeVariety } from '../components/VarietySelector';
import { treatmentRecommendations } from '../constants/treatmentRecommendations';

type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;

const ResultsScreen = () => {
  const route = useRoute<ResultsScreenRouteProp>();
  const navigation = useNavigation();
  const { imageUri, diagnosis } = route.params;
  const saveScanResult = useScanStore((s) => s.saveScanResult);
  const { user } = useAuthStore();
  const [selectedVariety, setSelectedVariety] = React.useState<CoffeeVariety>('arabica');

  if (!diagnosis) {
    return (
      <SafeAreaView style={styles.container}>
        <Header title="Scan Results" showBackButton onBackPress={() => navigation.goBack()} />
        <View style={styles.centeredContainer}>
          <Text style={styles.errorText}>No diagnosis data available</Text>
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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <Header
        title="Scan Results"
        showBackButton
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.scrollView}>
        {/* Image Preview */}
        <View style={styles.imageSection}>
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: imageUri }} 
              style={styles.scanImage}
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
        </View>

        {/* Error Message or Diagnosis Card */}
        {hasError ? (
          <View style={styles.section}>
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle-outline" size={32} color={COLORS.error} />
              <Text style={styles.errorMessage}>{errorMessage}</Text>
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
              <Ionicons 
                name={diagnosis.stage === 'Healthy' ? "checkmark-circle-outline" : "leaf-outline"} 
                size={24} 
                color={COLORS.primary} 
              />
              <Text style={styles.sectionTitle}>
                {diagnosis.stage === 'Healthy' ? 'Plant Health Status' : 'Plant Health'}
              </Text>
            </View>

            <View style={styles.diagnosisCard}>
              <View style={styles.diseaseHeader}>
                <Text style={styles.diseaseName}>{diagnosis.disease}</Text>
              </View>

              <View style={styles.stageContainer}>
                <View style={[styles.stageCard, { backgroundColor: getStageColor(diagnosis.stage) + '15' }]}> 
                  <View style={styles.stageIconContainer}>
                    <Ionicons 
                      name={getStageIcon(diagnosis.stage)} 
                      size={24} 
                      color={getStageColor(diagnosis.stage)} 
                    />
                  </View>
                  <View style={styles.stageInfo}>
                    <Text style={[styles.stageTitle, { color: getStageColor(diagnosis.stage) }]}> 
                      {diagnosis.stage === 'Healthy' ? 'Healthy Plant' : `${diagnosis.stage} Stage`} 
                    </Text>
                    <Text style={styles.stageDescription}> 
                      {getStageDescription(diagnosis.stage)} 
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.confidenceSection}>
                <Text style={styles.confidenceLabel}>Confidence: {diagnosis.confidence}%</Text>
                <View style={styles.confidenceBar}>
                  <View 
                    style={[
                      styles.confidenceFill, 
                      { 
                        width: `${diagnosis.confidence}%`,
                          backgroundColor: getStageColor(diagnosis.stage)
                      }
                    ]} 
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Treatment Recommendations or Preventive Tips Section */}
          {(diagnosis.disease === 'Coffee Leaf Rust' && diagnosis.stage !== 'Healthy') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medkit-outline" size={24} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Treatment Recommendations</Text>
              </View>
              <Text style={styles.treatmentInfo}>Choose your coffee variety:</Text>
              <VarietySelector value={selectedVariety} onChange={setSelectedVariety} />
              {treatment ? (
                <View style={styles.treatmentCardSingle}>
                  {/* Chemical Control */}
                  <View style={styles.treatmentBlock}>
                    <View style={styles.treatmentBlockHeader}>
                      <Text style={styles.treatmentBlockIcon}>🧪</Text>
                      <Text style={styles.treatmentBlockTitle}>Chemical Control</Text>
                    </View>
                    <Text style={styles.treatmentBlockDesc}>Use these only if needed and follow label instructions. Wear gloves and avoid spraying on windy days.</Text>
                    {treatment.chemical.map((item, idx) => (
                      <Text key={idx} style={styles.treatmentBlockText}>• {item}</Text>
                    ))}
                  </View>
                  {/* Divider */}
                  <View style={styles.treatmentDivider} />
                  {/* Cultural Control */}
                  <View style={styles.treatmentBlock}>
                    <View style={styles.treatmentBlockHeader}>
                      <Text style={styles.treatmentBlockIcon}>🌱</Text>
                      <Text style={styles.treatmentBlockTitle}>Cultural Control</Text>
                    </View>
                    <Text style={styles.treatmentBlockDesc}>Simple farm practices to help prevent and control disease.</Text>
                    {treatment.cultural.map((item, idx) => (
                      <Text key={idx} style={styles.treatmentBlockText}>• {item}</Text>
                    ))}
                  </View>
                  <Text style={styles.treatmentSources}>Sources: {treatment.sources.join(', ')}</Text>
                </View>
              ) : (
                <Text style={styles.treatmentBlockText}>No recommendations available for this stage/variety.</Text>
              )}
            </View>
          )}

          {/* Preventive Tips for Healthy Plant */}
          {(diagnosis.disease === 'Healthy Plant' || diagnosis.stage === 'Healthy') && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
                <Text style={styles.sectionTitle}>Preventive Tips</Text>
              </View>
              <Text style={styles.treatmentInfo}>Choose your coffee variety:</Text>
              <VarietySelector value={selectedVariety} onChange={setSelectedVariety} />
              {treatmentRecommendations['Coffee Leaf Rust']?.Healthy?.[selectedVariety]?.cultural?.length ? (
                <View style={styles.treatmentCardSingle}>
                  <View style={styles.treatmentBlock}>
                    <View style={styles.treatmentBlockHeader}>
                      <Text style={styles.treatmentBlockIcon}>🌱</Text>
                      <Text style={styles.treatmentBlockTitle}>Cultural Tips</Text>
                    </View>
                    <Text style={styles.treatmentBlockDesc}>Keep your plants healthy with these simple practices:</Text>
                    {treatmentRecommendations['Coffee Leaf Rust'].Healthy[selectedVariety].cultural.map((item, idx) => (
                      <Text key={idx} style={styles.treatmentBlockText}>• {item}</Text>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={styles.treatmentBlockText}>No preventive tips available for this variety.</Text>
              )}
            </View>
          )}
        </>
        )}

        {/* Action Buttons */}
        {!hasError && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
            <Ionicons name="save-outline" size={24} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Save Report</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={COLORS.primary} />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Share</Text>
          </TouchableOpacity>
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
  imageSection: {
    padding: 20,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16/9,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray,
  },
  scanImage: {
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
    borderRadius: 20,
  },
  retakeButtonText: {
    color: COLORS.white,
    marginLeft: 5,
    fontSize: 14,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginLeft: 10,
  },
  diagnosisCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  diseaseHeader: {
    marginBottom: 20,
  },
  diseaseName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  confidenceSection: {
    marginTop: 15,
  },
  confidenceLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: 4,
  },
  stageContainer: {
    marginBottom: 20,
  },
  stageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  stageIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stageInfo: {
    flex: 1,
  },
  stageTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stageDescription: {
    fontSize: 14,
    color: COLORS.gray,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  secondaryButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  secondaryButtonText: {
    color: COLORS.primary,
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
    borderRadius: 25,
    marginTop: 10,
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
    textAlign: 'center',
  },
  treatmentCardSingle: {
    backgroundColor: '#F7F7F7',
    borderRadius: 15,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  treatmentBlock: {
    marginBottom: 12,
  },
  treatmentBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  treatmentBlockIcon: {
    fontSize: 28,
    marginRight: 8,
  },
  treatmentBlockTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  treatmentBlockDesc: {
    fontSize: 15,
    color: COLORS.gray,
    marginBottom: 4,
    marginLeft: 2,
  },
  treatmentBlockText: {
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 2,
    marginLeft: 8,
    lineHeight: 22,
  },
  treatmentDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
    borderRadius: 1,
  },
  treatmentSources: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 10,
    fontStyle: 'italic',
    textAlign: 'right',
  },
});

export default ResultsScreen; 