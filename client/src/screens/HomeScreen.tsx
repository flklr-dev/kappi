import React from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Image,
  StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import Header from '../components/Header';

const HomeScreen = () => {
  // Right component for the header (notification icon)
  const headerRight = (
    <TouchableOpacity style={styles.notificationButton}>
      <Ionicons name="notifications-outline" size={24} color={COLORS.white} />
      <View style={styles.notificationBadge} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <Header
        title="KAPPI"
        subtitle="Your coffee crop health companion"
        rightComponent={headerRight}
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Weather Widget */}
        <View style={styles.weatherWidget}>
          <View style={styles.weatherInfo}>
            <Text style={styles.weatherLocation}>Benguet, Philippines</Text>
            <Text style={styles.weatherTemp}>24°C</Text>
            <Text style={styles.weatherDesc}>Partly Cloudy</Text>
            <Text style={styles.weatherTip}>Good conditions for inspection</Text>
          </View>
          <View style={styles.weatherIconContainer}>
            <Ionicons name="partly-sunny" size={50} color="#FFC107" />
          </View>
        </View>

        {/* Risk Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#4CAF50'}]} />
            <Text style={styles.legendText}>Low Risk</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#FFC107'}]} />
            <Text style={styles.legendText}>Medium Risk</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, {backgroundColor: '#F44336'}]} />
            <Text style={styles.legendText}>High Risk</Text>
          </View>
        </View>

        {/* Environmental Snapshot Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Environmental Conditions</Text>
            <TouchableOpacity>
              <Ionicons name="refresh-outline" size={18} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.environmentalGrid}>
            <View style={styles.environmentalCard}>
              <View style={styles.envCardHeader}>
                <Ionicons name="thermometer-outline" size={18} color="#FF6B6B" />
                <Text style={styles.riskLabel}>Medium</Text>
              </View>
              <Text style={styles.environmentalValue}>24°C</Text>
              <Text style={styles.environmentalLabel}>Temperature</Text>
            </View>
            
            <View style={styles.environmentalCard}>
              <View style={styles.envCardHeader}>
                <Ionicons name="water-outline" size={18} color="#4DABF7" />
                <Text style={[styles.riskLabel, styles.highRiskLabel]}>High</Text>
              </View>
              <Text style={styles.environmentalValue}>85%</Text>
              <Text style={styles.environmentalLabel}>Humidity</Text>
            </View>
            
            <View style={styles.environmentalCard}>
              <View style={styles.envCardHeader}>
                <Ionicons name="rainy-outline" size={18} color="#74C0FC" />
                <Text style={[styles.riskLabel, styles.lowRiskLabel]}>Low</Text>
              </View>
              <Text style={styles.environmentalValue}>2.5 mm</Text>
              <Text style={styles.environmentalLabel}>Rainfall</Text>
            </View>
            
            <View style={styles.environmentalCard}>
              <View style={styles.envCardHeader}>
                <Ionicons name="pulse-outline" size={18} color="#38D9A9" />
                <Text style={styles.riskLabel}>Medium</Text>
              </View>
              <Text style={styles.environmentalValue}>42</Text>
              <Text style={styles.environmentalLabel}>AQI</Text>
            </View>
            
            <View style={styles.environmentalCard}>
              <View style={styles.envCardHeader}>
                <Ionicons name="speedometer-outline" size={18} color="#748FFC" />
                <Text style={[styles.riskLabel, styles.lowRiskLabel]}>Low</Text>
              </View>
              <Text style={styles.environmentalValue}>12 km/h</Text>
              <Text style={styles.environmentalLabel}>Wind Speed</Text>
            </View>
            
            <View style={styles.environmentalCard}>
              <View style={styles.envCardHeader}>
                <Ionicons name="sunny-outline" size={18} color="#FFD43B" />
                <Text style={[styles.riskLabel, styles.highRiskLabel]}>High</Text>
              </View>
              <Text style={styles.environmentalValue}>8.2</Text>
              <Text style={styles.environmentalLabel}>UV Index</Text>
            </View>
          </View>
        </View>
        
        {/* Disease Risk Forecast Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, styles.spacedSectionTitle]}>
            Disease Risk Forecast
          </Text>
          
          <View style={styles.riskForecastContainer}>
            <View style={styles.riskHeader}>
              <View style={styles.riskLevelIndicator}>
                <Ionicons name="warning" size={20} color="#fff" />
                <Text style={styles.riskLevelText}>MODERATE RISK</Text>
              </View>
              <Text style={styles.riskDateText}>Today</Text>
            </View>
            
            <View style={styles.riskDiseaseContainer}>
              <View style={styles.riskDiseaseIconContainer}>
                <Ionicons name="leaf" size={22} color="#BF7F00" />
              </View>
              <View style={styles.riskDiseaseTextContainer}>
                <Text style={styles.riskForecastTitle}>Coffee Leaf Rust</Text>
                <Text style={styles.riskForecastSubtitle}>Hemileia vastatrix</Text>
              </View>
            </View>
            
            <Text style={styles.riskForecastDescription}>
              Current temperature and humidity conditions may favor the development of coffee leaf rust. 
              Consider preventive measures before symptoms appear.
            </Text>
            
            <View style={styles.riskFactorsList}>
              <View style={styles.riskFactorRow}>
                <View style={[styles.riskFactorIndicator, {backgroundColor: '#F44336'}]}>
                  <Ionicons name="water" size={16} color="#fff" />
                </View>
                <Text style={styles.riskFactorText}>High Humidity (85%)</Text>
              </View>
              
              <View style={styles.riskFactorRow}>
                <View style={[styles.riskFactorIndicator, {backgroundColor: '#FFC107'}]}>
                  <Ionicons name="thermometer" size={16} color="#fff" />
                </View>
                <Text style={styles.riskFactorText}>Warm Temperature (24°C)</Text>
              </View>
              
              <View style={styles.riskFactorRow}>
                <View style={[styles.riskFactorIndicator, {backgroundColor: '#4CAF50'}]}>
                  <Ionicons name="rainy" size={16} color="#fff" />
                </View>
                <Text style={styles.riskFactorText}>Recent Rainfall (2.5 mm)</Text>
              </View>
            </View>
            
            <TouchableOpacity style={styles.recommendationsButton}>
              <Text style={styles.recommendationsButtonText}>View Recommendations</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, styles.spacedSectionTitle]}>
            Quick Actions
          </Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionItem}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="scan-outline" size={22} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionText}>Scan Leaf</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionItem}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="stats-chart-outline" size={22} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionText}>Reports</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionItem}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="thermometer-outline" size={22} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionText}>Environment</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionItem}>
              <View style={styles.quickActionIcon}>
                <Ionicons name="medical-outline" size={22} color={COLORS.white} />
              </View>
              <Text style={styles.quickActionText}>Diagnosis</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.recentActivityContainer}>
            <TouchableOpacity style={styles.activityItem}>
              <View style={styles.activityIconContainer}>
                <Ionicons name="leaf" size={22} color={COLORS.white} />
              </View>
              <View style={styles.activityDetails}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>Coffee Leaf Rust</Text>
                  <Text style={styles.activityTime}>2h ago</Text>
                </View>
                <Text style={styles.activityDesc}>Robusta coffee plant - Severity: Medium</Text>
                <View style={styles.activityTagContainer}>
                  <View style={[styles.activityTag, {backgroundColor: '#FFC107' + '30'}]}>
                    <Text style={[styles.activityTagText, {color: '#FFC107'}]}>Treatment suggested</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.activityItem}>
              <View style={[styles.activityIconContainer, {backgroundColor: '#4CAF50'}]}>
                <Ionicons name="checkmark-circle" size={22} color={COLORS.white} />
              </View>
              <View style={styles.activityDetails}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>Healthy Leaf</Text>
                  <Text style={styles.activityTime}>Yesterday</Text>
                </View>
                <Text style={styles.activityDesc}>Arabica coffee plant - No issues detected</Text>
                <View style={styles.activityTagContainer}>
                  <View style={[styles.activityTag, {backgroundColor: '#4CAF50' + '30'}]}>
                    <Text style={[styles.activityTagText, {color: '#4CAF50'}]}>Healthy</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Tips Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, styles.spacedSectionTitle]}>
            Coffee Health Tips
          </Text>
          
          <View style={styles.healthTipCard}>
            <View style={styles.healthTipHeader}>
              <Ionicons name="bulb" size={24} color="#FFC107" />
              <Text style={styles.healthTipTitle}>Regular Monitoring</Text>
            </View>
            
            <View style={styles.healthTipContent}>
              <View style={styles.healthTipBadge}>
                <Text style={styles.healthTipBadgeText}>IMPORTANT</Text>
              </View>
              <Text style={styles.healthTipText}>
                Regular monitoring of your coffee plants can help catch leaf rust early. 
                Scan leaves at least once a week during the rainy season.
              </Text>
            </View>
            
            <View style={styles.healthTipFooter}>
              <TouchableOpacity style={styles.healthTipButton}>
                <Text style={styles.healthTipButtonText}>More Tips</Text>
                <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom padding for scroll view */}
        <View style={{ height: 80 }} />
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
  notificationButton: {
    padding: 5,
  },
  notificationBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
  },
  weatherWidget: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  weatherInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  weatherLocation: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 4,
  },
  weatherTemp: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.black,
  },
  weatherDesc: {
    fontSize: 16,
    color: COLORS.black,
    marginBottom: 4,
  },
  weatherTip: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  weatherIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  // Legend styles
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    marginHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.black,
  },
  sectionContainer: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  spacedSectionTitle: {
    marginBottom: 18,
  },
  seeAllText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Environmental snapshot styles
  environmentalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  environmentalCard: {
    backgroundColor: COLORS.white,
    width: '31%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  envCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  riskLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFC107',
    backgroundColor: '#FFC107' + '20',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  lowRiskLabel: {
    color: '#4CAF50',
    backgroundColor: '#4CAF50' + '20',
  },
  highRiskLabel: {
    color: '#F44336',
    backgroundColor: '#F44336' + '20',
  },
  environmentalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
  },
  environmentalLabel: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 4,
  },
  // Disease risk forecast styles
  riskForecastContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFA94D',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  riskLevelIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskLevelText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  riskDateText: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: '500',
  },
  riskDiseaseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 15,
    paddingBottom: 0,
  },
  riskDiseaseIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFD8A8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  riskDiseaseTextContainer: {
    flex: 1,
  },
  riskForecastTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  riskForecastSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  riskForecastDescription: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: 15,
    lineHeight: 20,
    paddingHorizontal: 15,
  },
  riskFactorsList: {
    marginHorizontal: 15,
    marginBottom: 15,
    backgroundColor: COLORS.background + '60',
    borderRadius: 10,
    padding: 12,
  },
  riskFactorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskFactorIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  riskFactorText: {
    fontSize: 14,
    color: COLORS.black,
  },
  recommendationsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary + '30',
  },
  recommendationsButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginRight: 5,
    fontSize: 14,
  },
  // Quick actions styles
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 10,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  quickActionText: {
    color: COLORS.black,
    fontSize: 14,
    fontWeight: '600',
  },
  // Recent activity styles
  recentActivityContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary + '20',
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityDetails: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  activityTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  activityDesc: {
    fontSize: 13,
    color: COLORS.black,
    marginBottom: 6,
  },
  activityTagContainer: {
    flexDirection: 'row',
  },
  activityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  activityTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Health tip styles
  healthTipCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  healthTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary + '20',
  },
  healthTipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
    marginLeft: 10,
  },
  healthTipContent: {
    padding: 15,
    backgroundColor: '#4CAF50' + '10',
    position: 'relative',
  },
  healthTipBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  healthTipBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  healthTipText: {
    fontSize: 14,
    color: COLORS.black,
    lineHeight: 20,
  },
  healthTipFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.secondary + '20',
    padding: 10,
    alignItems: 'flex-end',
  },
  healthTipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  healthTipButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 5,
  },
});

export default HomeScreen; 