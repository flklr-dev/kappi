import React, { useState, useEffect } from 'react';
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
import { COLORS } from '../constants/colors';
import Header from '../components/Header';
import * as Location from 'expo-location';
import { useAuthStore } from '../stores/authStore';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { getRemoteScans } from '../services/api';

const { width } = Dimensions.get('window');

// Reusable quick action button
const QuickAction = ({
  icon,
  title,
  subtitle,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  color: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.85}>
    <View style={[styles.actionIconContainer, { backgroundColor: color }]}> 
      <Ionicons name={icon} size={28} color={COLORS.white} />
    </View>
    <Text style={styles.actionTitle}>{title}</Text>
    <Text style={styles.actionSubtitle}>{subtitle}</Text>
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
  const { user, updateUserLocation } = useAuthStore();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <Header
        title="KAPPI"
      />

      {/* Welcome message */}
      {user && (
        <Text style={styles.welcomeText}>
          Welcome, {user.fullName.split(' ')[0]}!
        </Text>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        {/* Location Status Widget */}
        <TouchableOpacity 
          style={styles.locationWidget}
          onPress={getCurrentLocation}
        >
          <View style={styles.locationIconContainer}>
            <Ionicons name="location" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationText}>Your Location</Text>
            <View style={styles.locationValueContainer}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.locationValue}>
                  {location || 'Location not available'}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.refreshIconContainer}>
            <Ionicons 
              name="refresh" 
              size={20} 
              color={COLORS.gray} 
            />
          </View>
        </TouchableOpacity>

        {/* Core CTAs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.sectionSubtitle}>What would you like to do?</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            <QuickAction 
              icon="camera" 
              title="Scan Plant" 
              subtitle="Diagnose diseases" 
              color={COLORS.primary}
              onPress={() => tabNavigation.navigate('ScanTab')}
            />
            <QuickAction 
              icon="time" 
              title="Scan History" 
              subtitle="View past scans" 
              color="#FF6B35"
              onPress={() => stackNavigation.navigate('ScanHistory')}
            />
            <QuickAction 
              icon="analytics" 
              title="Reports" 
              subtitle="Analytics & insights" 
              color="#4A90E2"
              onPress={() => {}}
            />
            <QuickAction 
              icon="medical" 
              title="Treatment" 
              subtitle="Browse remedies" 
              color="#27AE60"
              onPress={() => {}}
            />
          </View>
        </View>
        
        {/* Recent Scans Section */}
        <View style={styles.section}> 
          <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }]}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            <TouchableOpacity style={styles.viewAllButton} onPress={() => stackNavigation.navigate('ScanHistory')}>
              <Text style={styles.viewAllText}>View All</Text>
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
                <Ionicons name="cloud-outline" size={36} color={COLORS.gray} style={{ marginBottom: 8 }} />
                <Text style={{ color: COLORS.gray, fontSize: 15 }}>No recent scans yet.</Text>
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
                    style={styles.scanCard}
                    activeOpacity={0.7}
                    onPress={() => {
                      // Navigate to scan details or results
                    }}
                  >
                    <View style={styles.scanImageContainer}>
                      {scan.imageUri ? (
                        <Image source={{ uri: scan.imageUri }} style={styles.scanImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.scanImage, styles.placeholderImage]}> 
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
                          <Text style={styles.scanTitle} numberOfLines={1}>{scan.disease}</Text>
                          <Text style={styles.scanTime}>{formatDate(scan.createdAt)}</Text>
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
            <Text style={styles.sectionTitle}>Helpful Tips</Text>
            <Text style={styles.sectionSubtitle}>Improve your scanning results</Text>
          </View>
          <View style={styles.tipsContainer}>
            <TouchableOpacity style={styles.tipCard} activeOpacity={0.7}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="sunny" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Best Time to Scan</Text>
                <Text style={styles.tipText}>Take photos in the morning (7-10 AM) for optimal lighting</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tipCard} activeOpacity={0.7}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="camera" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Photo Quality</Text>
                <Text style={styles.tipText}>Hold steady, ensure good lighting, and focus on affected areas</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
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
  notificationButton: {
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'red',
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
  locationWidget: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 28,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  locationIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 4,
    fontWeight: '500',
  },
  locationValueContainer: {
    minHeight: 24,
    justifyContent: 'center',
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    lineHeight: 20,
  },
  refreshIconContainer: {
    marginLeft: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
  },
  // Redesigned Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
  },
  quickActionCard: {
    width: (width - 56) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    fontWeight: '500',
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
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F5F7FA',
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
    borderRadius: 18,
    padding: 20,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#F5F5F5',
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
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.black,
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
});

export default HomeScreen; 