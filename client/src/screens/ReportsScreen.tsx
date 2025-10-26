import React, { useContext, useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  StatusBar, 
  ScrollView,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useLanguage } from '../context/LanguageContext';
import { getScanStatistics } from '../services/api';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

// Custom Pie Chart Component that shows labels directly on segments
const CustomPieChart = ({ data, width, height }: { data: any[]; width: number; height: number }) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 10;

  // Calculate total value
  const total = data.reduce((sum, item) => sum + item.population, 0);

  // Calculate angles for each segment
  let startAngle = 0;
  const segments = data.map((item) => {
    const segmentAngle = (item.population / total) * 360;
    const endAngle = startAngle + segmentAngle;
    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    // Calculate the midpoint angle for label positioning
    const midAngle = startAngle + segmentAngle / 2;
    const midAngleRad = (midAngle * Math.PI) / 180;

    // Calculate label position (closer to edge for better visibility)
    const labelRadius = radius * 0.7;
    const labelX = centerX + labelRadius * Math.cos(midAngleRad);
    const labelY = centerY + labelRadius * Math.sin(midAngleRad);

    // Create SVG path for the segment
    const x1 = centerX + radius * Math.cos(startAngleRad);
    const y1 = centerY + radius * Math.sin(startAngleRad);
    const x2 = centerX + radius * Math.cos(endAngleRad);
    const y2 = centerY + radius * Math.sin(endAngleRad);

    const largeArcFlag = segmentAngle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    const segment = {
      ...item,
      pathData,
      startAngle,
      endAngle,
      midAngle,
      midAngleRad,
      labelX,
      labelY,
      percentage: Math.round((item.population / total) * 100)
    };

    startAngle = endAngle;
    return segment;
  });

  return (
    <Svg width={width} height={height}>
      {segments.map((segment, index) => (
        <G key={index}>
          <Path
            d={segment.pathData}
            fill={segment.color}
          />
          {segment.percentage > 5 && (
            <SvgText
              x={segment.labelX}
              y={segment.labelY}
              fill="white"
              fontSize={Math.min(14, width * 0.03)}
              fontWeight="bold"
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {segment.percentage}%
            </SvgText>
          )}
        </G>
      ))}
    </Svg>
  );
};

const ReportsScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { t } = useLanguage();
  const navigation = useNavigation();
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;
  
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getScanStatistics();
      setStatistics(data);
    } catch (err) {
      setError('Failed to load statistics');
      console.error('Error fetching statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
        <StatusBar 
          barStyle={isDarkMode ? "dark-content" : "light-content"} 
          backgroundColor={COLORS.primary} 
        />
        <Header title="Reports" />
        <View style={styles.emptyStateContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.emptyStateText, { color: themedColors.gray }]}>{t('loading_statistics')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
        <StatusBar 
          barStyle={isDarkMode ? "dark-content" : "light-content"} 
          backgroundColor={COLORS.primary} 
        />
        <Header title="Reports" />
        <View style={styles.emptyStateContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={COLORS.error} />
          <Text style={[styles.emptyStateTitle, { color: themedColors.gray }]}>{t('error_message')}</Text>
          <Text style={[styles.emptyStateText, { color: themedColors.gray }]}>{error}</Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: COLORS.primary }]} 
            onPress={fetchStatistics}
          >
            <Text style={[styles.retryButtonText, { color: COLORS.white }]}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Check if there's no scan data
  const hasScanData = statistics?.summary?.totalScans > 0;

  if (!hasScanData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
        <StatusBar 
          barStyle={isDarkMode ? "dark-content" : "light-content"} 
          backgroundColor={COLORS.primary} 
        />
        <Header title="Reports" />
        <View style={styles.emptyStateContainer}>
          <Ionicons name="leaf-outline" size={80} color={COLORS.primary} />
          <Text style={[styles.emptyStateTitle, { color: themedColors.gray }]}>{t('no_scans_yet')}</Text>
          <Text style={[styles.emptyStateText, { color: themedColors.gray }]}>{t('get_started_by_scanning')}</Text>
          <TouchableOpacity 
            style={[styles.scanButton, { backgroundColor: COLORS.primary }]} 
            onPress={() => navigation.navigate('ScanTab' as never)}
          >
            <Text style={[styles.scanButtonText, { color: COLORS.white }]}>{t('scan_plant_title')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Prepare data for charts
  const diseaseDistributionData = statistics?.diseaseDistribution?.map((item: any, index: number) => ({
    name: item.disease,
    population: item.percentage,
    color: getColorByIndex(index, item.disease),
    legendFontColor: isDarkMode ? themedColors.white : COLORS.black,
    legendFontSize: 12,
  })) || [];

  const weeklyActivityData = {
    labels: statistics?.weeklyActivity?.map((item: any) => item.week) || [],
    datasets: [
      {
        data: statistics?.weeklyActivity?.map((item: any) => item.count) || [],
        color: (opacity = 1) => `rgba(26, 163, 74, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "dark-content" : "light-content"} 
        backgroundColor={COLORS.primary} 
      />
      
      <Header
        title="Reports"
      />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Scan Summary Cards */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('scan_summary')}</Text>
          <View style={styles.summaryGrid}>

            {/* Total Scans Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.summaryCardTitle, { color: themedColors.gray }]}>{t('total_scans')}</Text>
              <Text style={[styles.summaryCardValue, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{statistics?.summary?.totalScans || 0}</Text>
            </View>

            {/* This Month Scans Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.summaryCardTitle, { color: themedColors.gray }]}>{t('this_month')}</Text>
              <View style={styles.summaryValueWithTrend}>
                <Text style={[styles.summaryCardValue, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{statistics?.summary?.thisMonthScans || 0}</Text>
                <View style={styles.trendContainer}>
                  <Ionicons 
                    name={statistics?.summary?.thisMonthChange >= 0 ? "arrow-up-circle" : "arrow-down-circle"}
                    size={18}
                    color={statistics?.summary?.thisMonthChange >= 0 ? COLORS.success : COLORS.error}
                  />
                  <Text style={[styles.trendText, { color: statistics?.summary?.thisMonthChange >= 0 ? COLORS.success : COLORS.error }]}>{Math.abs(statistics?.summary?.thisMonthChange || 0)}%</Text>
                </View>
              </View>
            </View>

            {/* Healthy Percentage Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.summaryCardTitle, { color: themedColors.gray }]}>{t('healthy_plants')}</Text>
              <Text style={[styles.summaryCardValue, { color: COLORS.success }]}>{statistics?.summary?.healthyPercentage || 0}%</Text>
            </View>

            {/* Diseased Percentage Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.summaryCardTitle, { color: themedColors.gray }]}>{t('diseased_plants')}</Text>
              <Text style={[styles.summaryCardValue, { color: COLORS.error }]}>{statistics?.summary?.diseasedPercentage || 0}%</Text>
            </View>
          </View>
        </View>

        {/* Disease Distribution Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('disease_distribution')}</Text>
          <View style={[styles.chartCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            <Text style={[styles.chartCardTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('scans_by_disease_type')}</Text>
            <Text style={[styles.chartCardSubtitle, { color: themedColors.gray }]}>{t('percentage_of_all_scans')}</Text>
            {diseaseDistributionData.length > 0 ? (
              <View style={styles.pieChartContainer}>
                <View style={styles.pieChartWrapper}>
                  <CustomPieChart
                    data={diseaseDistributionData}
                    width={width * 0.5}
                    height={Math.min(200, width * 0.4)}
                  />
                </View>
                <View style={styles.legendContainer}>
                  {diseaseDistributionData.map((item: any, index: number) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendColorBox, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.legendPercentage, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
                        {item.population}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <Text style={[styles.noDataText, { color: themedColors.gray }]}>{t('no_data_available')}</Text>
            )}
          </View>
        </View>

        {/* Weekly Scan Activity Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('weekly_scan_activity')}</Text>
          <View style={[styles.chartCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            <Text style={[styles.chartCardTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{t('number_of_scans_over_time')}</Text>
            <Text style={[styles.chartCardSubtitle, { color: themedColors.gray }]}>{t('last_8_weeks')}</Text>
            {weeklyActivityData.labels.length > 0 ? (
              <LineChart
                data={weeklyActivityData}
                width={width - 40}
                height={220}
                chartConfig={{
                  backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white,
                  backgroundGradientFrom: isDarkMode ? themedColors.secondary : themedColors.white,
                  backgroundGradientTo: isDarkMode ? themedColors.secondary : themedColors.white,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(26, 163, 74, ${opacity})`,
                  labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: COLORS.primary
                  },
                }}
                bezier
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                  marginLeft: -15,
                }}
                yAxisInterval={1}
              />
            ) : (
              <Text style={[styles.noDataText, { color: themedColors.gray }]}>{t('no_data_available')}</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Helper function to generate colors for the pie chart
const getColorByIndex = (index: number, diseaseName: string) => {
  // Always use green for Healthy status regardless of position
  if (diseaseName === 'Healthy') {
    return '#4CAF50'; // Green color for healthy plants
  }
  
  const colors = ['#F44336', '#3F51B5', '#FF9800', '#9E9E9E', '#607D8B', '#795548', '#009688'];
  // Since Healthy is always green, we use the remaining colors for other diseases
  return colors[index % colors.length];
};

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
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: Math.min(24, width * 0.06),
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 15,
  },
  summaryCard: {
    width: (width - 40 - 15) / 2,
    height: 100,
    borderRadius: 15,
    padding: 15,
    justifyContent: 'space-between',
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  summaryCardTitle: {
    fontSize: Math.min(16, width * 0.035),
    fontWeight: '500',
    color: COLORS.gray,
  },
  summaryCardValue: {
    fontSize: Math.min(28, width * 0.07),
    fontWeight: '700',
    color: COLORS.black,
  },
  summaryValueWithTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: Math.min(15, width * 0.03),
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: 15,
    padding: 15,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  chartCardTitle: {
    fontSize: Math.min(20, width * 0.05),
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 5,
  },
  chartCardSubtitle: {
    fontSize: Math.min(15, width * 0.035),
    color: COLORS.gray,
    marginBottom: 15,
  },
  pieChartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  pieChartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendContainer: {
    flex: 1,
    marginLeft: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColorBox: {
    width: 12,
    height: 12,
    marginRight: 8,
    borderRadius: 2,
  },
  legendText: {
    fontSize: Math.min(14, width * 0.03),
    flex: 1,
  },
  legendPercentage: {
    fontSize: Math.min(14, width * 0.03),
    fontWeight: '600',
    marginLeft: 5,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: Math.min(22, width * 0.05),
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: Math.min(16, width * 0.035),
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: Math.min(16, width * 0.035),
    fontWeight: '600',
  },
  scanButton: {
    marginTop: 20,
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    fontSize: Math.min(16, width * 0.035),
    fontWeight: '600',
  },
  noDataText: {
    textAlign: 'center',
    fontSize: Math.min(18, width * 0.04),
    marginTop: 20,
  },
});

export default ReportsScreen;