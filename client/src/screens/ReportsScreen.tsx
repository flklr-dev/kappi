import React, { useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  StatusBar, 
  ScrollView,
  Dimensions,
} from 'react-native';
import { COLORS, DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import { ThemeContext } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { PieChart, LineChart } from 'react-native-chart-kit'; // Import LineChart

const { width } = Dimensions.get('window');

// Mock data for now
const mockScanSummary = {
  totalScans: 47,
  thisMonthScans: 12,
  thisMonthChange: 15, // Positive for increase, negative for decrease
  healthyPercentage: 65,
  diseasedPercentage: 35,
};

const mockDiseaseDistribution = {
  labels: ['Healthy', 'Leaf Rust', 'Berry Disease', 'Wilt Disease', 'Anthracnose'],
  data: [65, 15, 10, 5, 5], // Percentages for each category
  colors: ['#4CAF50', '#F44336', '#3F51B5', '#FF9800', '#9E9E9E'],
};

// Mock data for Weekly Scan Activity
const mockWeeklyScanActivity = {
  labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6', 'Wk 7', 'Wk 8'],
  datasets: [
    {
      data: [2, 5, 3, 7, 6, 9, 8, 10],
      color: (opacity = 1) => `rgba(26, 163, 74, ${opacity})`, // Green color from COLORS.primary
      strokeWidth: 2,
    },
  ],
};

const ReportsScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;

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
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Scan Summary</Text>
          <View style={styles.summaryGrid}>

            {/* Total Scans Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.summaryCardTitle, { color: themedColors.gray }]}>Total Scans</Text>
              <Text style={[styles.summaryCardValue, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{mockScanSummary.totalScans}</Text>
            </View>

            {/* This Month Scans Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.summaryCardTitle, { color: themedColors.gray }]}>This Month</Text>
              <View style={styles.summaryValueWithTrend}>
                <Text style={[styles.summaryCardValue, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{mockScanSummary.thisMonthScans}</Text>
                <View style={styles.trendContainer}>
                  <Ionicons 
                    name={mockScanSummary.thisMonthChange > 0 ? "arrow-up-circle" : "arrow-down-circle"}
                    size={18}
                    color={mockScanSummary.thisMonthChange > 0 ? COLORS.success : COLORS.error}
                  />
                  <Text style={[styles.trendText, { color: mockScanSummary.thisMonthChange > 0 ? COLORS.success : COLORS.error }]}>{Math.abs(mockScanSummary.thisMonthChange)}%</Text>
                </View>
              </View>
            </View>

            {/* Healthy Percentage Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.summaryCardTitle, { color: themedColors.gray }]}>Healthy Plants</Text>
              <Text style={[styles.summaryCardValue, { color: COLORS.success }]}>{mockScanSummary.healthyPercentage}%</Text>
            </View>

            {/* Diseased Percentage Card */}
            <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
              <Text style={[styles.summaryCardTitle, { color: themedColors.gray }]}>Diseased Plants</Text>
              <Text style={[styles.summaryCardValue, { color: COLORS.error }]}>{mockScanSummary.diseasedPercentage}%</Text>
            </View>
          </View>
        </View>

        {/* Disease Distribution Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Disease Distribution</Text>
          <View style={[styles.chartCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            <Text style={[styles.chartCardTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Scans by Disease Type</Text>
            <Text style={[styles.chartCardSubtitle, { color: themedColors.gray }]}>Percentage of all scans</Text>
            <PieChart
              data={mockDiseaseDistribution.labels.map((label, index) => ({
                name: label,
                population: mockDiseaseDistribution.data[index],
                color: mockDiseaseDistribution.colors[index],
                legendFontColor: isDarkMode ? themedColors.white : COLORS.black,
                legendFontSize: 12,
              }))}
              width={width - 40} // Adjust width based on screen size minus padding
              height={200}
              chartConfig={{
                backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white,
                backgroundGradientFrom: isDarkMode ? themedColors.secondary : themedColors.white,
                backgroundGradientTo: isDarkMode ? themedColors.secondary : themedColors.white,
                color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[0, 0]} // Adjust center if needed
              absolute // Show absolute values in legend
            />
          </View>
        </View>

        {/* Weekly Scan Activity Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Weekly Scan Activity</Text>
          <View style={[styles.chartCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            <Text style={[styles.chartCardTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Number of Scans over Time</Text>
            <Text style={[styles.chartCardSubtitle, { color: themedColors.gray }]}>Last 8 weeks</Text>
            <LineChart
              data={mockWeeklyScanActivity}
              width={width - 40} // from react-native
              height={220}
              chartConfig={{
                backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white,
                backgroundGradientFrom: isDarkMode ? themedColors.secondary : themedColors.white,
                backgroundGradientTo: isDarkMode ? themedColors.secondary : themedColors.white,
                decimalPlaces: 0, // optional, defaults to 2dp
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
              bezier // Smooth curves
              style={{
                marginVertical: 8,
                borderRadius: 16,
                marginLeft: -15, // Adjust this value to shift the graph left
              }}
              yAxisInterval={1} // force ten steps in y-axis
            />
          </View>
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
  scrollContent: {
    flexGrow: 1,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
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
    width: (width - 40 - 15) / 2, // 20px padding each side, 15px gap in between
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
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray,
  },
  summaryCardValue: {
    fontSize: 24,
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
    fontSize: 14,
    fontWeight: '600',
  },
  // Styles for Disease Distribution Chart
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 5,
  },
  chartCardSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 15,
  },
});

export default ReportsScreen;