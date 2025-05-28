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
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import Header from '../components/Header';
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList } from '../navigation/types';

type ResultsScreenProps = NativeStackScreenProps<MainTabParamList, 'Results'>;

const ResultsScreen = ({ route, navigation }: ResultsScreenProps) => {
  const { imageUri } = route.params;

  // Simplified data for farmers
  const scanData = {
    imageUri: imageUri || 'https://example.com/scan.jpg',
    diagnosis: {
      disease: 'Coffee Leaf Rust',
      confidence: 94,
      severity: 'high', // 'low' | 'medium' | 'high'
      stage: 'Progressive', // 'Early' | 'Progressive' | 'Severe'
      variety: 'Robusta',
      treatment: {
        fungicide: 'Copper-based fungicide',
        organic: 'Neem oil solution',
        immediateSteps: [
          'Isolate affected plants',
          'Remove severely infected leaves',
          'Apply treatment within 24 hours'
        ],
        prevention: [
          'Maintain proper plant spacing',
          'Regular monitoring during rainy season',
          'Prune for better air circulation'
        ]
      }
    },
    environmental: {
      riskLevel: 'medium', // 'low' | 'medium' | 'high'
      indicators: [
        { name: 'Humidity', value: '85%', risk: 'high' },
        { name: 'Rainfall', value: 'Low', risk: 'favorable' },
        { name: 'Temperature', value: '31°C', risk: 'medium' }
      ]
    },
    location: 'Davao del Sur, Farm Lot 3',
    timestamp: new Date().toLocaleString()
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Scan Results - ${scanData.diagnosis.disease} detected with ${scanData.diagnosis.confidence}% confidence. Location: ${scanData.location}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getRiskColor = (risk: string) => {
    switch(risk.toLowerCase()) {
      case 'high': return '#F44336';
      case 'medium': return '#FFC107';
      case 'low': return '#4CAF50';
      case 'favorable': return '#4CAF50';
      default: return '#9E9E9E';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch(risk.toLowerCase()) {
      case 'high': return 'alert-circle';
      case 'medium': return 'warning';
      case 'low': return 'checkmark-circle';
      case 'favorable': return 'checkmark-circle';
      default: return 'help-circle';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'high': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'early': return '#4CAF50';
      case 'progressive': return '#FFA000';
      case 'severe': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'early': return 'leaf';
      case 'progressive': return 'warning';
      case 'severe': return 'alert-circle';
      default: return 'help-circle';
    }
  };

  const getStageDescription = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'early': return 'Early signs - Good chance to control';
      case 'progressive': return 'Spreading - Needs immediate action';
      case 'severe': return 'Advanced stage - Urgent care needed';
      default: return 'Status unknown';
    }
  };

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

        {/* Simple Diagnosis Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="leaf-outline" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Plant Health</Text>
          </View>

          <View style={styles.diagnosisCard}>
            <View style={styles.diseaseHeader}>
              <Text style={styles.diseaseName}>{scanData.diagnosis.disease}</Text>
              <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(scanData.diagnosis.severity) }]}>
                <Text style={styles.severityText}>{scanData.diagnosis.severity.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.varietyContainer}>
              <View style={styles.varietyBadge}>
                <Ionicons name="cafe" size={16} color={COLORS.primary} />
                <Text style={styles.varietyText}>{scanData.diagnosis.variety} Coffee</Text>
              </View>
            </View>

            <View style={styles.stageContainer}>
              <View style={[styles.stageCard, { backgroundColor: getStageColor(scanData.diagnosis.stage) + '15' }]}>
                <View style={styles.stageIconContainer}>
                  <Ionicons 
                    name={getStageIcon(scanData.diagnosis.stage)} 
                    size={24} 
                    color={getStageColor(scanData.diagnosis.stage)} 
                  />
                </View>
                <View style={styles.stageInfo}>
                  <Text style={[styles.stageTitle, { color: getStageColor(scanData.diagnosis.stage) }]}>
                    {scanData.diagnosis.stage} Stage
                  </Text>
                  <Text style={styles.stageDescription}>
                    {getStageDescription(scanData.diagnosis.stage)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.confidenceSection}>
              <Text style={styles.confidenceLabel}>Confidence: {scanData.diagnosis.confidence}%</Text>
              <View style={styles.confidenceBar}>
                <View 
                  style={[
                    styles.confidenceFill, 
                    { 
                      width: `${scanData.diagnosis.confidence}%`,
                      backgroundColor: getSeverityColor(scanData.diagnosis.severity)
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        </View>

        {/* Environmental Conditions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="thermometer-outline" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Weather Conditions</Text>
          </View>

          <View style={styles.environmentalCard}>
            <View style={styles.riskLevelContainer}>
              <View style={[styles.riskLevelIndicator, { backgroundColor: getRiskColor(scanData.environmental.riskLevel) }]}>
                <Ionicons 
                  name={getRiskIcon(scanData.environmental.riskLevel)} 
                  size={20} 
                  color={COLORS.white} 
                />
              </View>
              <Text style={styles.riskLevelText}>Overall Risk: {scanData.environmental.riskLevel.toUpperCase()}</Text>
            </View>

            {scanData.environmental.indicators.map((indicator, index) => (
              <View key={index} style={styles.indicatorRow}>
                <Text style={styles.indicatorName}>{indicator.name}</Text>
                <View style={styles.indicatorValueContainer}>
                  <Text style={styles.indicatorValue}>{indicator.value}</Text>
                  <View style={[styles.indicatorRisk, { backgroundColor: getRiskColor(indicator.risk) }]}>
                    <Ionicons 
                      name={getRiskIcon(indicator.risk)} 
                      size={16} 
                      color={COLORS.white} 
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Treatment Recommendations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb-outline" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Treatment Options</Text>
          </View>

          <View style={styles.recommendationsCard}>
            {/* Treatment Suggestions */}
            <View style={styles.recommendationGroup}>
              <View style={styles.recommendationHeader}>
                <Ionicons name="flask-outline" size={20} color={COLORS.primary} />
                <Text style={styles.recommendationTitle}>Chemical Treatment</Text>
              </View>
              
              <View style={styles.treatmentOption}>
                <Ionicons name="flask" size={20} color="#FF6B6B" />
                <View style={styles.treatmentContent}>
                  <Text style={styles.treatmentValue}>{scanData.diagnosis.treatment.fungicide}</Text>
                </View>
              </View>

              <View style={styles.recommendationHeader}>
                <Ionicons name="leaf-outline" size={20} color={COLORS.primary} />
                <Text style={styles.recommendationTitle}>Natural Treatment</Text>
              </View>

              <View style={styles.treatmentOption}>
                <Ionicons name="leaf-outline" size={20} color="#4CAF50" />
                <View style={styles.treatmentContent}>
                  <Text style={styles.treatmentValue}>{scanData.diagnosis.treatment.organic}</Text>
                </View>
              </View>
            </View>

            {/* Immediate Steps */}
            <View style={styles.recommendationGroup}>
              <View style={styles.recommendationHeader}>
                <Ionicons name="alert-circle-outline" size={20} color={COLORS.primary} />
                <Text style={styles.recommendationTitle}>What to Do Now</Text>
              </View>
              
              {scanData.diagnosis.treatment.immediateSteps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumberContainer}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Prevention Tips */}
            <View style={styles.recommendationGroup}>
              <View style={styles.recommendationHeader}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} />
                <Text style={styles.recommendationTitle}>How to Prevent</Text>
              </View>
              
              {scanData.diagnosis.treatment.prevention.map((tip, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepIconContainer}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  </View>
                  <Text style={styles.stepText}>{tip}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Location & Timestamp */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="location-outline" size={24} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Scan Details</Text>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.gray} />
              <Text style={styles.detailText}>{scanData.location}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={20} color={COLORS.gray} />
              <Text style={styles.detailText}>{scanData.timestamp}</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="save-outline" size={24} color={COLORS.white} />
            <Text style={styles.actionButtonText}>Save Report</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={COLORS.primary} />
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>Share</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  diseaseName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  severityText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
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
  environmentalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  riskLevelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  riskLevelIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  riskLevelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  indicatorName: {
    fontSize: 16,
    color: COLORS.black,
  },
  indicatorValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorValue: {
    fontSize: 16,
    color: COLORS.black,
    marginRight: 8,
  },
  indicatorRisk: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    fontSize: 16,
    color: COLORS.black,
    marginLeft: 10,
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
  recommendationsCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  recommendationGroup: {
    marginBottom: 20,
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginLeft: 10,
  },
  treatmentOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  treatmentContent: {
    flex: 1,
    marginLeft: 16,
  },
  treatmentValue: {
    fontSize: 16,
    color: COLORS.black,
    lineHeight: 24,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.black,
    lineHeight: 22,
  },
  varietyContainer: {
    marginBottom: 16,
  },
  varietyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  varietyText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginLeft: 6,
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
});

export default ResultsScreen; 