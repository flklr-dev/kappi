import React, { useState, useEffect, useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  StatusBar,
  Image,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/authStore';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { getRemoteScans } from '../services/api';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// Reusable quick action button
const QuickAction = ({
  icon,
  title,
  subtitle,
  onPress,
  isDarkMode,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string; 
  onPress: () => void;
  isDarkMode: boolean;
}) => (
  <TouchableOpacity style={[styles.quickActionCard, { backgroundColor: isDarkMode ? DARK_COLORS.secondary : COLORS.white }]} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.actionIconContainer, { backgroundColor: isDarkMode ? DARK_COLORS.primary + '15' : COLORS.primary + '15' }]}> 
      <Ionicons name={icon} size={28} color={COLORS.primary} />
    </View>
    <Text style={[styles.actionTitle, { color: isDarkMode ? DARK_COLORS.white : COLORS.black }]}>{title}</Text>
    <Text style={[styles.actionSubtitle, { color: isDarkMode ? DARK_COLORS.gray : COLORS.gray }]}>{subtitle}</Text>
  </TouchableOpacity>
);

interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: {
    barangay: string;
    cityMunicipality: string;
    province: string;
  };
}

const HomeScreen = () => {
  const [location, setLocation] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tipsSlideIndex, setTipsSlideIndex] = useState(0);
  const { user, updateUserLocation } = useAuthStore();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const { isDarkMode } = useContext(ThemeContext);

  const formatAddress = (address: Location.LocationGeocodedAddress): string => {
    let barangay = '';
    let cityMunicipality = '';
    let province = '';

    // Try to extract barangay
    if (address.street?.toLowerCase().includes('barangay')) {
      barangay = address.street;
    } else if (address.district?.toLowerCase().includes('barangay')) {
      barangay = address.district;
    } else if (address.subregion?.toLowerCase().includes('barangay')) {
      barangay = address.subregion;
    }

    // Try to get city/municipality
    if (address.city) {
      cityMunicipality = address.city;
    } else if (address.subregion && !address.subregion.toLowerCase().includes('barangay')) {
      cityMunicipality = address.subregion;
    }

    // Try to get province
    if (address.region && !address.region.toLowerCase().includes('region')) {
      province = address.region;
    }

    const parts = [barangay, cityMunicipality, province].filter(Boolean);
    return parts.join(', ');
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);

      // Get current location with high accuracy
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation
      });
      
      // Get address from coordinates
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        
        // Extract address components
        const addressComponents = {
          barangay: '',
          cityMunicipality: '',
          province: ''
        };

        // Try to extract barangay
        if (address.street?.toLowerCase().includes('barangay')) {
          addressComponents.barangay = address.street.replace(/^barangay\s+/i, '');
        } else if (address.district?.toLowerCase().includes('barangay')) {
          addressComponents.barangay = address.district.replace(/^barangay\s+/i, '');
        } else if (address.subregion?.toLowerCase().includes('barangay')) {
          addressComponents.barangay = address.subregion.replace(/^barangay\s+/i, '');
        }

        // Try to get city/municipality
        if (address.city) {
          addressComponents.cityMunicipality = address.city;
        } else if (address.subregion && !address.subregion.toLowerCase().includes('barangay')) {
          addressComponents.cityMunicipality = address.subregion;
        }

        // Try to get province
        if (address.region && !address.region.toLowerCase().includes('region')) {
          addressComponents.province = address.region;
        }

        // Format display string
        const displayParts = [
          addressComponents.barangay ? `Barangay ${addressComponents.barangay}` : '',
          addressComponents.cityMunicipality,
          addressComponents.province
        ].filter(Boolean);
        
        setLocation(displayParts.join(', '));

        // Save location data
        const locationData: LocationData = {
          coordinates: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude
          },
          address: addressComponents
        };

        await updateUserLocation(locationData);
      } else {
        setLocation('Location not found');
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocation('Unable to get location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Denied',
            'Please grant location permissions to use this feature.',
            [{ text: 'OK' }]
          );
          setLoading(false);
          return;
        }

        await getCurrentLocation();
      } catch (error) {
        console.error('Error in location permission:', error);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Fetch recent scans from backend
    const fetchRecent = async () => {
      setRecentLoading(true);
      try {
        const scans = await getRemoteScans();
        setRecentScans(scans.slice(0, 2));
      } catch (e) {
        setRecentScans([]);
      }
      setRecentLoading(false);
    };
    fetchRecent();
  }, []);

  const formatDate = (date: string | number | Date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  // Get colors based on theme
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "dark-content" : "light-content"} 
        backgroundColor={COLORS.primary} 
      />
      
      <Header
        title="KAPPI"
      />

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Welcome Section with Location below name */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeContent}>
            <Text style={[styles.greetingText, { color: themedColors.gray }]}>{isDarkMode ? 'Good evening,' : 'Good day,'}</Text>
            {user && (
              <Text style={[styles.userNameText, { color: isDarkMode ? themedColors.white : themedColors.black }]} numberOfLines={1}>
                {user.fullName || 'Guest'}
              </Text>
            )}
            {loading ? (
              <ActivityIndicator size="small" color={themedColors.gray} style={{ marginTop: 4 }} />
            ) : location ? (
              <TouchableOpacity onPress={getCurrentLocation} style={styles.locationDisplayInline}> 
                <Ionicons name="location-sharp" size={14} color={themedColors.gray} />
                <Text style={[styles.locationTextInline, { color: themedColors.gray }]} numberOfLines={1}> 
                  {location}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={getCurrentLocation} style={styles.locationDisplayInline}> 
                <Ionicons name="location-sharp" size={14} color={themedColors.gray} />
                <Text style={[styles.locationTextInline, { color: themedColors.gray }]} numberOfLines={1}> 
                  Location Unavailable
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity style={[styles.profileIconContainer, { backgroundColor: themedColors.primary }]} onPress={() => stackNavigation.navigate('Profile')}> 
            <Ionicons name="person-circle-outline" size={40} color={themedColors.white} />
          </TouchableOpacity>
        </View>
        
        {/* Farmer Hero Section */}
        <View style={[styles.farmerHeroSection, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.primary + '15' }]}> 
          <Image 
            source={require('../assets/farmer.png')} 
            style={styles.farmerImage}
            resizeMode="contain"
          />
          <View style={styles.farmerCardContent}>
            <Text style={[styles.farmerCardTitle, { color: themedColors.primary }]}>Grow Smarter and Harvest Better!</Text>
            <Text style={[styles.farmerCardText, { color: themedColors.gray }]}>
              <Text>Identify diseases early and</Text>
              <Text> manage crops effectively.</Text>
            </Text>
          </View>
        </View>

        {/* Core CTAs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Quick Actions</Text>
            <Text style={[styles.sectionSubtitle, { color: themedColors.gray }]}>What would you like to do?</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            <QuickAction 
              icon="camera" 
              title="Scan Plant" 
              subtitle="Diagnose diseases" 
              onPress={() => tabNavigation.navigate('ScanTab')}
              isDarkMode={isDarkMode}
            />
            <QuickAction 
              icon="time" 
              title="Scan History" 
              subtitle="View past scans" 
              onPress={() => stackNavigation.navigate('ScanHistory')}
              isDarkMode={isDarkMode}
            />
            <QuickAction 
              icon="analytics" 
              title="Reports" 
              subtitle="Analytics & insights" 
              onPress={() => tabNavigation.navigate('ReportsTab')}
              isDarkMode={isDarkMode}
            />
            <QuickAction 
              icon="leaf" 
              title="Plant Care" 
              subtitle="Manage & prevent" 
              onPress={() => stackNavigation.navigate('DiseaseManagement', {})}
              isDarkMode={isDarkMode}
            />
          </View>
        </View>
        
        {/* Recent Scans Section */}
        <View style={styles.section}> 
          <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Recent Scans</Text>
            <TouchableOpacity style={styles.viewAllButton} onPress={() => stackNavigation.navigate('ScanHistory')}> 
              <Text style={[styles.viewAllText, { color: COLORS.primary }]}>View All</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.scansContainer}>
            {recentLoading ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : recentScans.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 24 }}>
                <Ionicons name="cloud-outline" size={36} color={themedColors.gray} style={{ marginBottom: 8 }} />
                <Text style={{ color: themedColors.gray, fontSize: 15 }}>No recent scans yet.</Text>
              </View>
            ) : (
              recentScans.map((scan, idx) => {
                const isHealthy = scan.disease?.toLowerCase().includes('healthy');
                const badgeText = isHealthy ? 'Healthy' : (scan.stage || scan.severity || 'Unknown');
                const badgeColor = isHealthy ? '#4CAF50' : 
                                  scan.stage === 'Early' ? '#FF9800' :
                                  scan.stage === 'Progressive' ? '#FF5722' :
                                  scan.stage === 'Severe' ? '#F44336' : '#9E9E9E';
                
                return (
                  <TouchableOpacity 
                    key={scan._id || scan.id || idx} 
                    style={[styles.scanCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      // Navigate to scan details or results
                    }}
                  >
                    <View style={styles.scanImageContainer}>
                      {scan.imageUri ? (
                        <Image source={{ uri: scan.imageUri }} style={styles.scanImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.scanImage, styles.placeholderImage, { backgroundColor: isDarkMode ? themedColors.background : COLORS.primary + '08' }]}> 
                          <Ionicons name="leaf-outline" size={40} color={COLORS.primary} />
                        </View>
                      )}
                      <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>{scan.confidence || 0}%</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}> 
                        <Text style={styles.statusText}>{badgeText}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.scanContent}>
                      <View style={styles.scanInfoRow}>
                        <View style={styles.scanTitleContainer}>
                          <Text style={[styles.scanTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]} numberOfLines={1}>{scan.disease}</Text>
                          <Text style={[styles.scanTime, { color: themedColors.gray }]}>{formatDate(scan.createdAt)}</Text>
                        </View>
                        
                        {scan.address && (
                          <View style={styles.locationContainer}>
                            <Ionicons name="location" size={12} color={COLORS.primary} />
                            <Text style={styles.scanLocation} numberOfLines={1}>
                              {scan.address.cityMunicipality || 'Unknown Location'}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Helpful Tips</Text>
            <Text style={[styles.sectionSubtitle, { color: themedColors.gray }]}>Improve your scanning results</Text>
          </View>
          <View style={styles.tipsContainer}>
            <TouchableOpacity style={[styles.tipCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]} activeOpacity={0.7}>
              <View style={[styles.tipIconContainer, { backgroundColor: isDarkMode ? themedColors.background : COLORS.primary + '12' }]}>
                <Ionicons name="sunny" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Best Time to Scan</Text>
                <Text style={[styles.tipText, { color: themedColors.gray }]}>Take photos in the morning (7-10 AM) for optimal lighting</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={themedColors.gray} />
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.tipCard, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]} activeOpacity={0.7}>
              <View style={[styles.tipIconContainer, { backgroundColor: isDarkMode ? themedColors.background : COLORS.primary + '12' }]}>
                <Ionicons name="camera" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={[styles.tipTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Photo Quality</Text>
                <Text style={[styles.tipText, { color: themedColors.gray }]}>Hold steady, ensure good lighting, and focus on affected areas</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={themedColors.gray} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom padding for scroll view */}
        <View style={{ height: 100 }} />
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
  // Redesigned Welcome Section (with inline location)
  welcomeSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
  },
  welcomeContent: {
    flex: 1,
    paddingRight: 16,
  },
  greetingText: {
    fontSize: 16,
    color: COLORS.gray,
    fontWeight: '500',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  locationDisplayInline: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationTextInline: {
    fontSize: 13,
    color: COLORS.gray,
    marginLeft: 5,
    fontWeight: '600',
  },
  profileIconContainer: {
    // Reusing the avatarContainer style conceptually
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  // Farmer Hero Section
  farmerHeroSection: {
    flexDirection: 'row',
    alignItems: 'center', // Changed to center alignment to vertically center content
    justifyContent: 'flex-end', // Aligns content to the right side of the card
    marginHorizontal: 20, // Added margin to reduce overall width
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 20,
    height: 150, // Reduced height for the card
    overflow: 'hidden',
    // The background color is now applied inline based on the theme.
  },
  farmerImage: {
    width: '40%', // Adjust width as needed for inside card
    height: 130, // Reduced height for the image
    position: 'absolute',
    left: 0,
    bottom: 0, // Align to bottom edge of the card
    zIndex: 1,
  },
  farmerCardContent: {
    flex: 1,
    paddingLeft: '35%', // Space for the image on the left
    justifyContent: 'center', // Vertically center content
    alignItems: 'center',
    marginRight: 20,
  },
  farmerCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 6,
    textAlign: 'right',
  },
  farmerCardText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'right',
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    fontWeight: '500',
    marginTop: 2,
  },
  // Redesigned Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between', 
  },
  quickActionCard: {
    width: (width - 60) / 2, 
    backgroundColor: COLORS.white,
    borderRadius: 15, 
    paddingVertical: 20,
    paddingHorizontal: 15,
    alignItems: 'center',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, 
    shadowRadius: 5, 
    marginBottom: 16, 
  },
  actionIconContainer: {
    width: 60, 
    height: 60, 
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, 
    shadowRadius: 3, 
  },
  actionTitle: {
    fontSize: 17, 
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 2, 
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 13, 
    color: COLORS.gray,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 18,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  scansContainer: {
    paddingHorizontal: 20,
  },
  scanCard: {
    backgroundColor: COLORS.white,
    borderRadius: 15, // Cohesive with QuickActionCard
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Cohesive with QuickActionCard
    shadowRadius: 5, // Cohesive with QuickActionCard
  },
  scanImageContainer: {
    position: 'relative',
    height: 140,
  },
  scanImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F8F9FA',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '08',
  },
  confidenceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scanContent: {
    padding: 16,
  },
  scanInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  scanTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  scanTime: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 120,
    gap: 3,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  scanLocation: {
    fontSize: 10,
    color: '#6C757D',
    fontWeight: '600',
    flex: 1,
  },
  tipsContainer: {
    paddingHorizontal: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 15, // Cohesive with QuickActionCard
    padding: 18, // Adjusted for consistency
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Cohesive with QuickActionCard
    shadowRadius: 5, // Cohesive with QuickActionCard
  },
  tipIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  tipText: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
    fontWeight: '500',
  },
});

export default HomeScreen;