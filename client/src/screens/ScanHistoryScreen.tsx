import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import { getRemoteScans } from '../services/api';

function formatDate(date: string | number | Date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

const getDiseaseColor = (disease: string) => {
  if (!disease) return COLORS.gray;
  const name = disease.toLowerCase();
  if (name.includes('rust')) return '#F44336';
  if (name.includes('healthy')) return '#4CAF50';
  if (name.includes('blight')) return '#FF9800';
  return COLORS.primary;
};

const PAGE_SIZE = 5;

const ScanHistoryScreen = () => {
  const navigation = useNavigation();
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

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {item.imageUri ? (
          <Image source={{ uri: item.imageUri }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="leaf-outline" size={32} color={COLORS.primary} />
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <View style={styles.diseaseRow}>
          <View style={[styles.diseaseBadge, { backgroundColor: getDiseaseColor(item.disease) }] }>
            <Ionicons name="bug-outline" size={14} color={COLORS.white} style={{ marginRight: 4 }} />
            <Text style={styles.diseaseBadgeText}>{item.disease}</Text>
          </View>
        </View>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        <View style={styles.row}>
          <Ionicons name="location-outline" size={15} color={COLORS.gray} style={{ marginRight: 2 }} />
          <Text style={styles.location} numberOfLines={1}>
            {item.address?.barangay ? item.address.barangay + ', ' : ''}
            {item.address?.cityMunicipality ? item.address.cityMunicipality + ', ' : ''}
            {item.address?.province || ''}
          </Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="shield-checkmark-outline" size={15} color={COLORS.primary} style={{ marginRight: 2 }} />
          <Text style={styles.confidence}>Confidence: {item.confidence}%</Text>
        </View>
        <View style={styles.row}>
          <Ionicons name="pulse-outline" size={15} color={COLORS.primary} style={{ marginRight: 2 }} />
          <Text style={styles.stage}>Stage: {item.stage}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Scan History" showBackButton onBackPress={() => navigation.goBack()} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : scans.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-outline" size={48} color={COLORS.gray} style={{ marginBottom: 12 }} />
          <Text style={styles.emptyText}>No scan history yet.</Text>
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
              style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <Ionicons name="chevron-back" size={20} color={page === 1 ? COLORS.gray : COLORS.primary} />
              <Text style={[styles.pageButtonText, page === 1 && styles.pageButtonTextDisabled]}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
            <TouchableOpacity
              style={[styles.pageButton, page === totalPages && styles.pageButtonDisabled]}
              onPress={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <Text style={[styles.pageButtonText, page === totalPages && styles.pageButtonTextDisabled]}>Next</Text>
              <Ionicons name="chevron-forward" size={20} color={page === totalPages ? COLORS.gray : COLORS.primary} />
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
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray,
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  infoContainer: {
    flex: 1,
    minWidth: 0,
  },
  diseaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  diseaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 8,
  },
  diseaseBadgeText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 2,
  },
  date: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: 2,
    marginBottom: 6,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  location: {
    fontSize: 13,
    color: COLORS.gray,
    flexShrink: 1,
  },
  confidence: {
    fontSize: 13,
    color: COLORS.black,
    marginBottom: 2,
  },
  stage: {
    fontSize: 13,
    color: COLORS.black,
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
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 18,
    elevation: 1,
  },
  pageButtonDisabled: {
    backgroundColor: COLORS.background,
  },
  pageButtonText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '600',
    marginHorizontal: 2,
  },
  pageButtonTextDisabled: {
    color: COLORS.gray,
  },
  pageInfo: {
    fontSize: 15,
    color: COLORS.gray,
    fontWeight: '500',
    marginHorizontal: 8,
  },
});

export default ScanHistoryScreen; 