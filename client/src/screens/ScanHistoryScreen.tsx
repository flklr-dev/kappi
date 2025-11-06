import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Modal,
  Alert, // Import Alert for confirmation dialogs
} from 'react-native';
import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { getRemoteScans, resolveImageUri, deleteScan } from '../services/api'; // Import deleteScan
import { ThemeContext } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();
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
  const [selectedDisease, setSelectedDisease] = useState<string | null>(null); // State for disease filter
  const [selectedStage, setSelectedStage] = useState<string | null>(null); // State for stage filter
  const [diseaseFilterVisible, setDiseaseFilterVisible] = useState(false); // State for disease filter modal
  const [stageFilterVisible, setStageFilterVisible] = useState(false); // State for stage filter modal

  // Dummy disease options (will be replaced by actual data)
  const diseaseOptions = [t('all_diseases'), 'Coffee Leaf Rust', 'Anthracnose', 'Thread Blight', 'Coffee Berry Disease', 'Coffee Wilt Disease', t('healthy')];
  const stageOptions = [t('all_stages'), 'Early', 'Progressive', 'Severe', t('healthy'), t('unknown')];

  const fetchRemote = async () => {
    setLoading(true);
    try {
      const filters: { disease?: string, stage?: string } = {};
      if (selectedDisease && selectedDisease !== 'All Diseases') {
        filters.disease = selectedDisease;
      }
      if (selectedStage && selectedStage !== 'All Stages') {
        filters.stage = selectedStage;
      }
      const data = await getRemoteScans(filters);
      setScans(data);
      setPage(1); // Reset to first page on filter change
    } catch (e) {
      console.error("Failed to fetch scans:", e);
      setScans([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRemote();
  }, [selectedDisease, selectedStage]); // Re-fetch when filters change

  // Re-fetch when screen gains focus to reflect newly synced scans
  useFocusEffect(
    React.useCallback(() => {
      fetchRemote();
      // no cleanup needed
      return () => {};
    }, [selectedDisease, selectedStage])
  );

  // Add delete scan function
  const handleDeleteScan = (scanId: string, diseaseName: string) => {
    Alert.alert(
      t('delete_scan_confirmation'),
      `${t('delete_scan_message')} ${diseaseName}?`,
      [
        {
          text: t('cancel'),
          style: 'cancel'
        },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScan(scanId);
              // Remove the deleted scan from the local state
              setScans(prevScans => prevScans.filter(scan => scan._id !== scanId));
              // Show success message
              Alert.alert(t('success'), t('scan_deleted_successfully'));
            } catch (error) {
              console.error('Failed to delete scan:', error);
              Alert.alert(t('error'), t('failed_to_delete_scan'));
            }
          }
        }
      ]
    );
  };

  const totalPages = Math.max(1, Math.ceil(scans.length / PAGE_SIZE));
  const pagedScans = scans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const renderItem = ({ item }: { item: any }) => {
    const isHealthy = item.disease?.toLowerCase().includes('healthy');
    const badgeText = isHealthy ? t('healthy') : (item.stage || item.severity || t('unknown'));
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
            <Image source={{ uri: resolveImageUri(item.imageUri) }} style={styles.historyScanImage} resizeMode="cover" />
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
          {/* Delete button - positioned absolutely within the image container */}
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteScan(item._id, item.disease)}
          >
            <Ionicons name="trash-outline" size={width * 0.045} color={themedColors.error} />
          </TouchableOpacity>
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
                  {item.address.cityMunicipality || t('unknown_location')}
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
      <Header title={t('scan_history')} showBackButton onBackPress={() => navigation.goBack()} />

      {/* Filter Section */}
      <View style={[styles.filterContainer, { backgroundColor: themedColors.background }]}>
        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white, borderColor: isDarkMode ? themedColors.lightGray : COLORS.lightGray }]} 
          onPress={() => setDiseaseFilterVisible(true)}
        >
          <Text style={[styles.filterButtonText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{selectedDisease || t('all_diseases')}</Text>
          <Ionicons name="chevron-down" size={width * 0.04} color={isDarkMode ? themedColors.white : themedColors.black} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.filterButton, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white, borderColor: isDarkMode ? themedColors.lightGray : COLORS.lightGray }]} 
          onPress={() => setStageFilterVisible(true)}
        >
          <Text style={[styles.filterButtonText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{selectedStage || t('all_stages')}</Text>
          <Ionicons name="chevron-down" size={width * 0.04} color={isDarkMode ? themedColors.white : themedColors.black} />
        </TouchableOpacity>
      </View>

      {/* Disease Filter Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={diseaseFilterVisible}
        onRequestClose={() => setDiseaseFilterVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setDiseaseFilterVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            {diseaseOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.modalOption, index === diseaseOptions.length - 1 && styles.lastModalOption]}
                onPress={() => {
                  setSelectedDisease(option);
                  setDiseaseFilterVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: isDarkMode ? themedColors.white : themedColors.black }, selectedDisease === option && styles.selectedOptionText]}>
                  {option}
                </Text>
                {selectedDisease === option && <Ionicons name="checkmark" size={width * 0.05} color={themedColors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Stage Filter Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={stageFilterVisible}
        onRequestClose={() => setStageFilterVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setStageFilterVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white }]}>
            {stageOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.modalOption, index === stageOptions.length - 1 && styles.lastModalOption]}
                onPress={() => {
                  setSelectedStage(option);
                  setStageFilterVisible(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: isDarkMode ? themedColors.white : themedColors.black }, selectedStage === option && styles.selectedOptionText]}>
                  {option}
                </Text>
                {selectedStage === option && <Ionicons name="checkmark" size={width * 0.05} color={themedColors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={themedColors.primary} />
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-outline" size={48} color={themedColors.gray} style={{ marginBottom: 12 }} />
          <Text style={[styles.emptyText, { color: themedColors.gray }]}>{t('no_scan_history_yet')}</Text>
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
              <Text style={[styles.pageButtonText, { color: page === 1 ? themedColors.gray : themedColors.primary }, page === 1 && styles.pageButtonTextDisabled]}>{t('previous_page')}</Text>
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
              <Text style={[styles.pageButtonText, { color: page === totalPages ? themedColors.gray : themedColors.primary }, page === totalPages && styles.pageButtonTextDisabled]}>{t('next_page')}</Text>
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
    borderRadius: 15, // Cohesive with other cards
    marginBottom: isTablet ? 16 : 12,
    overflow: 'hidden',
    // elevation: 2, // Removed, relying on shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Cohesive with other cards
    shadowRadius: 5, // Cohesive with other cards
    // borderWidth: 1, // Removed for cleaner look
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
    left: width * 0.02,
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
    borderRadius: 15, // Cohesive with other badges/cards
    // elevation: 1, // Removed, relying on shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, // Subtle shadow
    shadowRadius: 3, // Subtle shadow
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
    borderRadius: 15, // Cohesive with other cards/buttons
    maxWidth: width * 0.25,
    gap: width * 0.005,
    // borderWidth: 1, // Removed for cleaner look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, // Subtle shadow
    shadowRadius: 3, // Subtle shadow
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
    borderRadius: 15, // Cohesive with other buttons/cards
    paddingVertical: 8,
    paddingHorizontal: 18,
    // elevation: 1, // Removed, relying on shadow
    // borderWidth: 1, // Removed for cleaner look
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Cohesive shadow
    shadowRadius: 5, // Cohesive shadow
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
    fontSize: Math.min(15, width * 0.04),
    fontWeight: '500',
    marginHorizontal: width * 0.02,
  },

  // Filter styles
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray + '50',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    // backgroundColor and borderColor set inline
  },
  filterButtonText: {
    fontSize: Math.min(15, width * 0.04),
    fontWeight: '600',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.8,
    borderRadius: 15,
    paddingVertical: 10,
    maxHeight: height * 0.7,
    // backgroundColor set inline
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray + '50',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastModalOption: {
    borderBottomWidth: 0,
  },
  modalOptionText: {
    fontSize: Math.min(16, width * 0.04),
  },
  selectedOptionText: {
    fontWeight: '700',
    color: COLORS.primary,
  },
  
  // Delete button styles
  deleteButton: {
    position: 'absolute',
    top: width * 0.02,
    right: width * 0.02,
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: (width * 0.08) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    // Add subtle shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default ScanHistoryScreen;