import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import { getRemoteScans } from '../services/api';
import { ThemeContext } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;
const scale = Math.min(width / 375, height / 667);

function formatDate(date: string | number | Date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const getDiseaseColor = (disease: string, isDarkMode: boolean) => {
  if (!disease) return isDarkMode ? '#AAAAAA' : COLORS.gray;
  const name = disease.toLowerCase();
  if (name.includes('rust')) return '#F44336';
  if (name.includes('healthy')) return '#4CAF50';
  if (name.includes('blight')) return '#FF9800';
  return isDarkMode ? '#6F8F3F' : COLORS.primary;
};

const PAGE_SIZE = 10;

const ScanHistoryScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode } = useContext(ThemeContext);
  // Use inline object for dark colors to avoid TypeScript issues
  const themedColors = isDarkMode ? {
    primary: '#6F8F3F',
    background: '#121212',
    secondary: '#2A2A2A',
    accent: '#804E49',
    white: '#1E1E1E', // Dark card background
    black: '#FFFFFF', // White text on dark background
    gray: '#AAAAAA',
    lightGray: '#555555',
    transparent: 'transparent',
    error: '#D32F2F',
    success: '#4CAF50'
  } : COLORS;
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchRemote = async () => {
    setLoading(true);
    try {
      const data = await getRemoteScans();
      setScans(data);
    } catch (e) {
      setScans([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRemote();
  }, []);

  const totalPages = Math.max(1, Math.ceil(scans.length / PAGE_SIZE));
  const pagedScans = scans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderItem = ({ item }: { item: any }) => {
    const isHealthy = item.disease?.toLowerCase().includes('healthy');
    const badgeText = isHealthy ? 'Healthy' : (item.stage || item.severity || 'Unknown');
    const badgeColor = isHealthy ? '#4CAF50' : 
                      item.stage === 'Early' ? '#FF9800' :
                      item.stage === 'Progressive' ? '#FF5722' :
                      item.stage === 'Severe' ? '#F44336' : '#9E9E9E';

    return (
      <TouchableOpacity 
        style={[styles.historyScanCard, { 
          backgroundColor: themedColors.white,
          borderColor: isDarkMode ? themedColors.lightGray : '#F0F0F0'
        }]}
        activeOpacity={0.7}
      >
        <View style={styles.historyScanImageContainer}>
          {item.imageUri ? (
            <Image source={{ uri: item.imageUri }} style={styles.historyScanImage} resizeMode="cover" />
          ) : (
            <View style={[styles.historyScanImage, styles.historyPlaceholderImage, { 
              backgroundColor: isDarkMode ? themedColors.secondary : COLORS.primary + '08' 
            }]}> 
              <Ionicons name="leaf-outline" size={width * 0.06} color={isDarkMode ? themedColors.primary : COLORS.primary} />
            </View>
          )}
          <View style={styles.historyConfidenceBadge}>
            <Text style={styles.historyConfidenceText}>{item.confidence || 0}%</Text>
          </View>
          <View style={[styles.historyStatusBadge, { backgroundColor: badgeColor }]}> 
            <Text style={styles.historyStatusText}>{badgeText}</Text>
          </View>
        </View>
        
        <View style={styles.historyScanContent}>
          <View style={styles.historyScanInfoRow}>
            <View style={styles.historyScanTitleContainer}>
              <Text style={[styles.historyScanTitle, { color: isDarkMode ? themedColors.black : COLORS.black }]} numberOfLines={1}>{item.disease}</Text>
              <Text style={[styles.historyScanTime, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>{formatDate(item.createdAt)}</Text>
            </View>
            
            {item.address && (
              <View style={[styles.historyLocationContainer, { 
                backgroundColor: isDarkMode ? themedColors.secondary : '#F8F9FA',
                borderColor: isDarkMode ? themedColors.lightGray : '#E9ECEF'
              }]}>
                <Ionicons name="location" size={width * 0.025} color={isDarkMode ? themedColors.primary : COLORS.primary} />
                <Text style={[styles.historyScanLocation, { color: isDarkMode ? themedColors.gray : '#6C757D' }]} numberOfLines={1}>
                  {item.address.cityMunicipality || 'Unknown Location'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themedColors.background }]}>
      <Header title="Scan History" showBackButton onBackPress={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={themedColors.primary} />
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-outline" size={48} color={themedColors.gray} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: themedColors.gray }]}>No scan history yet.</Text>
        </View>
      ) : (
        <>
          <FlatList
            data={pagedScans}
            keyExtractor={item => item._id || item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          />
          <View style={styles.paginationRow}>
            <TouchableOpacity
              style={[styles.pageButton, { 
                backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white,
                borderColor: isDarkMode ? themedColors.lightGray : '#E9ECEF'
              }, page === 1 && styles.pageButtonDisabled]}
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={20} color={page === 1 ? themedColors.gray : themedColors.primary} />
              <Text style={[styles.pageButtonText, { color: page === 1 ? themedColors.gray : themedColors.primary }, page === 1 && styles.pageButtonTextDisabled]}>Prev</Text>
            </TouchableOpacity>
            <Text style={[styles.pageInfo, { color: themedColors.gray }]}>{page} / {totalPages}</Text>
            <TouchableOpacity
              style={[styles.pageButton, { 
                backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white,
                borderColor: isDarkMode ? themedColors.lightGray : '#E9ECEF'
              }, page === totalPages && styles.pageButtonDisabled]}
              onPress={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <Text style={[styles.pageButtonText, { color: page === totalPages ? themedColors.gray : themedColors.primary }, page === totalPages && styles.pageButtonTextDisabled]}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color={page === totalPages ? themedColors.gray : themedColors.primary} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.gray,
    textAlign: 'center',
  },
  historyScanCard: {
    borderRadius: isTablet ? 16 : 12,
    marginBottom: isTablet ? 16 : 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
  },
  historyScanImageContainer: {
    position: 'relative',
    height: width * 0.25,
  },
  historyScanImage: {
    width: '100%',
    height: '100%',
  },
  historyPlaceholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyConfidenceBadge: {
    position: 'absolute',
    top: width * 0.02,
    right: width * 0.02,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: width * 0.015,
    paddingVertical: width * 0.005,
    borderRadius: width * 0.025,
  },
  historyConfidenceText: {
    color: '#FFFFFF',
    fontSize: width * 0.025,
    fontWeight: '700',
  },
  historyStatusBadge: {
    position: 'absolute',
    bottom: width * 0.02,
    left: width * 0.02,
    paddingHorizontal: width * 0.02,
    paddingVertical: width * 0.008,
    borderRadius: width * 0.04,
    elevation: 1,
  },
  historyStatusText: {
    color: '#FFFFFF',
    fontSize: width * 0.022,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyScanContent: {
    padding: width * 0.03,
  },
  historyScanInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: width * 0.02,
  },
  historyScanTitleContainer: {
    flex: 1,
    minWidth: 0,
  },
  historyScanTitle: {
    fontSize: width * 0.04,
    fontWeight: '700',
    marginBottom: width * 0.005,
    letterSpacing: 0.1,
  },
  historyScanTime: {
    fontSize: width * 0.03,
    fontWeight: '500',
  },
  historyLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.015,
    paddingVertical: width * 0.005,
    borderRadius: width * 0.015,
    maxWidth: width * 0.25,
    gap: width * 0.005,
    borderWidth: 1,
  },
  historyScanLocation: {
    fontSize: width * 0.023,
    fontWeight: '600',
    flex: 1,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    gap: 16,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    elevation: 1,
    borderWidth: 1,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginHorizontal: 2,
  },
  pageButtonTextDisabled: {
    opacity: 0.6,
  },
  pageInfo: {
    fontSize: 15,
    fontWeight: '500',
    marginHorizontal: 8,
  },
});

export default ScanHistoryScreen;