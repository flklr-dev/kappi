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

const { width } = Dimensions.get('window');

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

        {/* Quick Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {/* Capture Image Button */}
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconContainer, { backgroundColor: COLORS.primary }]}>
                <Ionicons name="camera" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.actionTitle}>Take Photo</Text>
              <Text style={styles.actionSubtitle}>Scan your plants</Text>
            </TouchableOpacity>

            {/* Gallery Button */}
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="images" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.actionTitle}>Gallery</Text>
              <Text style={styles.actionSubtitle}>Use saved photos</Text>
            </TouchableOpacity>

            {/* View Reports */}
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#2196F3' }]}>
                <Ionicons name="stats-chart" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.actionTitle}>Reports</Text>
              <Text style={styles.actionSubtitle}>View analysis</Text>
            </TouchableOpacity>

            {/* Get Help */}
            <TouchableOpacity style={styles.actionCard}>
              <View style={[styles.actionIconContainer, { backgroundColor: '#FF9800' }]}>
                <Ionicons name="help-circle" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.actionTitle}>Help</Text>
              <Text style={styles.actionSubtitle}>Get assistance</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Recent Scans Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
        
          <View style={styles.scansContainer}>
            {/* Scan Card 1 */}
            <TouchableOpacity style={styles.scanCard}>
              <Image 
                source={{ uri: 'https://www.plantvillage.psu.edu/sites/default/files/styles/picture_large/public/coffee_leaf_rust_hemileia_vastatrix_4.jpg' }}
                style={styles.scanImage}
              />
              <View style={styles.scanContent}>
                <View style={styles.scanHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: '#F44336' }]}>
                    <Text style={styles.statusText}>Problem Found</Text>
              </View>
                  <Text style={styles.scanTime}>2h ago</Text>
                </View>
                <Text style={styles.scanTitle}>Coffee Leaf Rust</Text>
                <Text style={styles.scanLocation}>North Field • Block A</Text>
                <TouchableOpacity style={styles.viewDetailsButton}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* Scan Card 2 */}
            <TouchableOpacity style={styles.scanCard}>
              <Image 
                source={{ uri: 'https://www.plantvillage.psu.edu/sites/default/files/styles/picture_large/public/coffee_healthy_leaf_3.jpg' }}
                style={styles.scanImage}
              />
              <View style={styles.scanContent}>
                <View style={styles.scanHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: '#4CAF50' }]}>
                    <Text style={styles.statusText}>Healthy</Text>
                </View>
                  <Text style={styles.scanTime}>Yesterday</Text>
                </View>
                <Text style={styles.scanTitle}>Healthy Plant</Text>
                <Text style={styles.scanLocation}>South Field • Block C</Text>
                <TouchableOpacity style={styles.viewDetailsButton}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Helpful Tips</Text>
          <View style={styles.tipsContainer}>
            <TouchableOpacity style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="sunny" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Best Time to Scan</Text>
                <Text style={styles.tipText}>Take photos in the morning (7-10 AM) for best results</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.tipCard}>
              <View style={styles.tipIconContainer}>
                <Ionicons name="camera" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>Photo Tips</Text>
                <Text style={styles.tipText}>Hold your phone steady and ensure good lighting</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  locationWidget: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
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
  },
  locationValueContainer: {
    minHeight: 24,
    justifyContent: 'center',
  },
  locationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  refreshIconContainer: {
    marginLeft: 12,
    padding: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 16,
  },
  actionCard: {
    width: (width - 56) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  scanImage: {
    width: '100%',
    height: 150,
    backgroundColor: COLORS.lightGray,
  },
  scanContent: {
    padding: 16,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  scanTime: {
    fontSize: 12,
    color: COLORS.gray,
  },
  scanTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  scanLocation: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 12,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
    marginRight: 4,
  },
  tipsContainer: {
    paddingHorizontal: 20,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tipIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.gray,
  },
});

export default HomeScreen; 