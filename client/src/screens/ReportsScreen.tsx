import React, { useState, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  StatusBar, 
  FlatList, 
  TouchableOpacity,
  Image,
  ScrollView,
  Share,
  Dimensions,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import Header from '../components/Header';
import { LineChart, PieChart } from 'react-native-chart-kit';

// Define types for our data
type ScanRecord = {
  id: string;
  date: string;
  time: string;
  imageUri: string;
  disease: string | null;
  confidence: number;
  healthStatus: 'healthy' | 'at_risk' | 'infected';
  location: string;
  environmental: {
    temperature: number;
    humidity: number;
    rainfall: number;
    weather: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
};

type Insight = {
  id: string;
  type: 'trend' | 'recommendation' | 'warning';
  message: string;
  icon: string;
  actionable: boolean;
};

type TimeFrame = 'week' | 'month' | 'year';
type FilterType = 'all' | 'healthy' | 'infected' | 'high_risk';
type ViewMode = 'detailed' | 'simple';

// Mock data
const mockScans: ScanRecord[] = [
  {
    id: '1',
    date: '2024-04-08',
    time: '10:30 AM',
    imageUri: 'https://www.plantvillage.psu.edu/sites/default/files/styles/picture_large/public/coffee_leaf_rust_hemileia_vastatrix_4.jpg',
    disease: 'Coffee Leaf Rust',
    confidence: 94,
    healthStatus: 'infected',
    location: 'North Field',
    environmental: {
      temperature: 24,
      humidity: 85,
      rainfall: 2.5,
      weather: 'Cloudy',
      riskLevel: 'high'
    }
  },
  {
    id: '2',
    date: '2024-04-07',
    time: '09:15 AM',
    imageUri: 'https://www.plantvillage.psu.edu/sites/default/files/styles/picture_large/public/brown_eye_spot_cercospora_coffeicola_2.jpg',
    disease: 'Brown Eye Spot',
    confidence: 87,
    healthStatus: 'infected',
    location: 'East Field',
    environmental: {
      temperature: 26,
      humidity: 72,
      rainfall: 0,
      weather: 'Sunny',
      riskLevel: 'medium'
    }
  },
  {
    id: '3',
    date: '2024-04-05',
    time: '11:45 AM',
    imageUri: 'https://www.plantvillage.psu.edu/sites/default/files/styles/picture_large/public/coffee_healthy_leaf_3.jpg',
    disease: null,
    confidence: 98,
    healthStatus: 'healthy',
    location: 'South Field',
    environmental: {
      temperature: 23,
      humidity: 65,
      rainfall: 0,
      weather: 'Partly Cloudy',
      riskLevel: 'low'
    }
  }
];

const mockInsights: Insight[] = [
  {
    id: '1',
    type: 'trend',
    message: 'Coffee Rust appears more frequently during rainy weeks',
    icon: 'trending-up',
    actionable: false
  },
  {
    id: '2',
    type: 'recommendation',
    message: 'Consider applying treatment during early signs of spotting',
    icon: 'bulb',
    actionable: true
  },
  {
    id: '3',
    type: 'warning',
    message: 'High humidity levels detected in North Field',
    icon: 'warning',
    actionable: true
  },
  {
    id: '4',
    type: 'trend',
    message: 'Your crops were healthiest during dry periods',
    icon: 'analytics',
    actionable: false
  }
];

const mockChartData = {
  disease: {
    labels: ['Rust', 'Spot', 'Blight', 'Healthy'],
    data: [25, 15, 10, 50],
    colors: ['#F44336', '#FF9800', '#9C27B0', '#4CAF50']
  },
  monthly: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        data: [20, 45, 28, 80, 99, 43],
        color: () => `rgba(76, 175, 80, 0.8)`,
        strokeWidth: 2
      }
    ],
    legend: ['Healthy Plants %']
  }
};

// Add new mock data for disease patterns
const mockDiseasePatterns = {
  labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  diseaseData: [20, 45, 28, 80, 99, 43, 60],
  humidityData: [65, 70, 75, 85, 90, 80, 75],
  temperatureData: [24, 25, 26, 27, 28, 27, 26],
  uvData: [5, 6, 7, 8, 9, 8, 7]
};

// Component starts here
const ReportsScreen = () => {
  const [activeTimeFrame, setActiveTimeFrame] = useState<TimeFrame>('week');
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('simple');
  
  const screenWidth = Dimensions.get('window').width;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate a refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1500);
  }, []);

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out my crop health report from KAPPI!',
        title: 'Crop Health Report'
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleExport = () => {
    // Implement export functionality
    console.log('Export report');
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return '#4CAF50';
      case 'at_risk': return '#FFC107';
      case 'infected': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'high': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getWeatherIcon = (weather: string) => {
    switch (weather.toLowerCase()) {
      case 'sunny': return 'sunny-outline';
      case 'cloudy': return 'cloudy-outline';
      case 'rainy': return 'rainy-outline';
      case 'partly cloudy': return 'partly-sunny-outline';
      default: return 'cloud-outline';
    }
  };

  const renderTimeFrameSelector = () => (
    <View style={styles.timeFrameSelector}>
      {(['week', 'month', 'year'] as TimeFrame[]).map((timeFrame) => (
        <TouchableOpacity
          key={timeFrame}
          style={[styles.timeFrameButton, activeTimeFrame === timeFrame && styles.activeTimeFrameButton]}
          onPress={() => setActiveTimeFrame(timeFrame)}
        >
          <Text 
            style={[
              styles.timeFrameText, 
              activeTimeFrame === timeFrame && styles.activeTimeFrameText
            ]}
          >
            {timeFrame.charAt(0).toUpperCase() + timeFrame.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderScanCard = ({ item }: { item: ScanRecord }) => {
    const isExpanded = expandedScanId === item.id;
    
    return (
      <TouchableOpacity 
        style={styles.scanCard}
        onPress={() => setExpandedScanId(isExpanded ? null : item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.scanCardHeader}>
          <View style={styles.scanCardRow}>
            <Image 
              source={{ uri: item.imageUri }}
              style={styles.scanThumbnail}
              resizeMode="cover"
            />
            <View style={styles.scanInfo}>
              <View style={styles.scanDateRow}>
                <Ionicons name="calendar-outline" size={12} color={COLORS.gray} />
                <Text style={styles.scanDate}>{item.date} • {item.time}</Text>
              </View>
              <Text style={styles.scanDisease} numberOfLines={1}>
                {item.disease || 'No disease detected'}
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={COLORS.gray} />
                <Text style={styles.locationText} numberOfLines={1}>{item.location}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.scanCardRight}>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: getHealthStatusColor(item.healthStatus) }
            ]}>
              <Text style={styles.statusText}>
                {item.healthStatus === 'healthy' ? 'HEALTHY' : (item.healthStatus === 'at_risk' ? 'AT RISK' : 'INFECTED')}
              </Text>
            </View>
            <Ionicons 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={18} 
              color={COLORS.gray} 
              style={styles.expandIcon}
            />
          </View>
        </View>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            
            <View style={styles.confidenceSection}>
              <Text style={styles.expandedSectionTitle}>Confidence</Text>
              <View style={styles.confidenceRow}>
                <View style={styles.confidenceBarContainer}>
                  <View 
                    style={[
                      styles.confidenceBar, 
                      { width: `${item.confidence}%`, backgroundColor: getHealthStatusColor(item.healthStatus) }
                    ]}
                  />
                </View>
                <Text style={styles.confidenceValue}>{item.confidence}%</Text>
              </View>
            </View>
            
            <View style={styles.environmentalSection}>
              <Text style={styles.expandedSectionTitle}>Environmental Conditions</Text>
              <View style={styles.environmentalGrid}>
                <View style={styles.environmentalItem}>
                  <Ionicons name="thermometer-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.environmentalValue}>{item.environmental.temperature}°C</Text>
                  <Text style={styles.environmentalLabel}>Temp</Text>
                </View>
                <View style={styles.environmentalItem}>
                  <Ionicons name="water-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.environmentalValue}>{item.environmental.humidity}%</Text>
                  <Text style={styles.environmentalLabel}>Humidity</Text>
                </View>
                <View style={styles.environmentalItem}>
                  <Ionicons name="rainy-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.environmentalValue}>{item.environmental.rainfall} mm</Text>
                  <Text style={styles.environmentalLabel}>Rainfall</Text>
                </View>
                <View style={styles.environmentalItem}>
                  <View style={[
                    styles.riskBadge, 
                    { backgroundColor: getRiskLevelColor(item.environmental.riskLevel) }
                  ]}>
                    <Text style={styles.riskText}>
                      {item.environmental.riskLevel.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.environmentalLabel}>Risk Level</Text>
                </View>
              </View>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="eye-outline" size={14} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>View Details</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="share-social-outline" size={14} color={COLORS.primary} />
                <Text style={styles.actionButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <Header
        title="Crop Health"
        subtitle="Track and analyze plant health"
        rightComponent={
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={22} color={COLORS.white} />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Advice Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Farming Advice</Text>
          </View>
          <View style={styles.insightsContainer}>
            {mockInsights
              .filter(item => item.type === 'recommendation')
              .map(item => (
                <View key={item.id} style={styles.adviceCard}>
                  <View style={styles.adviceIconContainer}>
                    <Ionicons name={item.icon as any} size={24} color="#4CAF50" />
                  </View>
                  <View style={styles.adviceContent}>
                    <Text style={styles.adviceMessage}>{item.message}</Text>
                  </View>
                </View>
              ))}
          </View>
        </View>

        {/* Health Analytics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Health Analytics</Text>
            {renderTimeFrameSelector()}
          </View>
          
          <View style={styles.chartCards}>
            {/* Disease Distribution Chart - Simplified for farmers */}
            <View style={styles.chartCard}>
              <View style={styles.chartTitleContainer}>
                <Ionicons name="pie-chart" size={20} color={COLORS.primary} />
                <Text style={styles.chartTitle}>Your Plants This Month</Text>
              </View>
              <Text style={styles.chartSubtitle}>Shows healthy vs. infected plants</Text>
              <PieChart
                data={mockChartData.disease.labels.map((label, index) => ({
                  name: label === 'Healthy' ? 'Healthy Plants' : label + ' Disease',
                  population: mockChartData.disease.data[index],
                  color: mockChartData.disease.colors[index],
                  legendFontColor: '#000000',
                  legendFontSize: 12
                }))}
                width={screenWidth - 42}
                height={180}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16
                  }
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                hasLegend={true}
                center={[screenWidth > 350 ? 10 : 0, 0]}
                absolute
              />
            </View>
          </View>
        </View>
        
        {/* Scan History Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
          </View>
          
          <View style={styles.scansContainer}>
            <FlatList
              data={mockScans}
              renderItem={renderScanCard}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              contentContainerStyle={styles.scansList}
            />
          </View>
          
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Records</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
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
  headerButton: {
    padding: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  filterContainer: {
    height: 70,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
  },
  filterContentContainer: {
    paddingHorizontal: 10,
    height: 70,
    paddingVertical: 10,
    alignItems: 'center',
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    height: 44,
  },
  riskTab: {
    minWidth: 85,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    color: COLORS.black,
    fontWeight: '600',
    fontSize: 13,
    flexShrink: 1,
  },
  activeFilterText: {
    color: COLORS.white,
  },
  section: {
    marginBottom: 20,
    paddingTop: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  timeFrameSelector: {
    flexDirection: 'row',
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 3,
  },
  timeFrameButton: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  activeTimeFrameButton: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeFrameText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '500',
  },
  activeTimeFrameText: {
    color: COLORS.black,
  },
  insightsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  insightCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  warningCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#F44336',
  },
  recommendationCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#4CAF50',
  },
  trendCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#2196F3',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightType: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.gray,
  },
  insightMessage: {
    fontSize: 16,
    color: COLORS.black,
    lineHeight: 22,
    marginBottom: 15,
  },
  insightActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  insightActionText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 5,
  },
  insightActionButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 5,
  },
  insightActionTextFull: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  chartCards: {
    paddingHorizontal: 15,
  },
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginLeft: 10,
  },
  chartSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 15,
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  activeToggleButton: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 5,
  },
  activeToggleText: {
    color: COLORS.white,
  },
  simpleView: {
    paddingVertical: 10,
  },
  simpleInsightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: COLORS.black,
    marginLeft: 10,
    flex: 1,
  },
  detailedView: {
    marginTop: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 5,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '48%',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.black,
  },
  lineChart: {
    borderRadius: 16,
    marginLeft: -15,
  },
  scansContainer: {
    paddingHorizontal: 15,
  },
  scansList: {
    paddingBottom: 5,
  },
  scanCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scanCardRow: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  scanCardRight: {
    alignItems: 'flex-end',
  },
  scanThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    marginRight: 12,
  },
  scanInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  scanDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scanDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  scanDisease: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.black,
    marginVertical: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  expandIcon: {
    marginTop: 5,
  },
  expandedContent: {
    marginTop: 10,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 12,
  },
  expandedSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  confidenceSection: {
    marginBottom: 15,
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    marginRight: 10,
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 4,
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
    width: 40,
    textAlign: 'right',
  },
  environmentalSection: {
    marginBottom: 15,
  },
  environmentalGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  environmentalItem: {
    alignItems: 'center',
    width: '22%',
  },
  environmentalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.black,
    marginVertical: 5,
  },
  environmentalLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 3,
  },
  riskText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: 'bold',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 5,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  exportButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.primary,
    marginLeft: 5,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 16,
    marginHorizontal: 15,
    marginTop: 5,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
    marginRight: 5,
  },
  adviceCard: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  adviceIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#EDFBEF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  adviceContent: {
    flex: 1,
  },
  adviceMessage: {
    fontSize: 16,
    color: COLORS.black,
    lineHeight: 22,
  },
});

export default ReportsScreen; 
