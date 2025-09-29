import React, { useState, useContext } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Dimensions,
  Image,
  ImageSourcePropType,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { ThemeContext } from '../context/ThemeContext';

type DiseaseManagementScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'DiseaseManagement'
>;

interface DiseaseManagementRouteParams {
  diseaseName?: string;
}

// Symptom data structure with image
interface SymptomInfo {
  description: string;
  image: ImageSourcePropType;
}

// Disease data structure
interface DiseaseInfo {
  id: string;
  name: string;
  overview: string;
  symptoms: SymptomInfo[];
  prevention: string[];
  treatment: string[];
  image: ImageSourcePropType;
}

// Mock data for diseases with images
const diseaseData: DiseaseInfo[] = [
  {
    id: '1',
    name: 'Coffee Leaf Rust',
    overview: 'A serious fungal disease affecting coffee plants worldwide, causing significant yield losses by damaging the leaves.',
    symptoms: [
      { 
        description: 'Yellow-orange powdery spots on leaf undersides', 
        image: require('../assets/coffee-leaf-rust.png')
      },
      { 
        description: 'Leaf discoloration and premature dropping', 
        image: require('../assets/coffee-rust.png')
      },
      { 
        description: 'Reduced photosynthesis and plant vigor', 
        image: require('../assets/coffee-rust.png')
      }
    ],
    prevention: [
      'Plant resistant coffee varieties',
      'Maintain proper plant spacing for air circulation',
      'Regular pruning to improve airflow',
      'Monitor weather conditions for early warnings'
    ],
    treatment: [
      'Apply copper-based fungicides preventively',
      'Use systemic fungicides like triazoles during outbreaks',
      'Remove and destroy severely infected plants',
      'Implement integrated pest management practices'
    ],
    image: require('../assets/coffee-leaf-rust.png')
  },
  {
    id: '2',
    name: 'Thread Blight',
    overview: 'A fungal disease that affects the leaves of coffee plants, causing thread-like fungal growth and leaf damage.',
    symptoms: [
      { 
        description: 'Thread-like fungal strands on leaf surfaces', 
        image: require('../assets/thread-blight.jpg')
      },
      { 
        description: 'White to pale yellow fungal growth', 
        image: require('../assets/thread-blight.jpg')
      },
      { 
        description: 'Leaf browning and wilting', 
        image: require('../assets/thread-blight.jpg')
      },
      { 
        description: 'Progressive leaf drop', 
        image: require('../assets/thread-blight.jpg')
      }
    ],
    prevention: [
      'Maintain proper plant spacing to reduce humidity',
      'Prune to improve air circulation',
      'Remove infected plant debris',
      'Avoid overhead watering during high humidity'
    ],
    treatment: [
      'Apply fungicides containing copper or mancozeb',
      'Prune affected branches to reduce inoculum',
      'Improve drainage around plants',
      'Use biological control agents when possible'
    ],
    image: require('../assets/thread-blight.jpg')
  },
  {
    id: '3',
    name: 'Anthracnose',
    overview: 'A fungal disease that causes dark, sunken lesions on leaves, stems, and fruits of coffee plants.',
    symptoms: [
      { 
        description: 'Dark, sunken lesions on leaves', 
        image: require('../assets/anthracnose.png')
      },
      { 
        description: 'Leaf spotting and blighting', 
        image: require('../assets/anthracnose.png')
      },
      { 
        description: 'Premature defoliation', 
        image: require('../assets/anthracnose.png')
      },
      { 
        description: 'Twig dieback in severe cases', 
        image: require('../assets/anthracnose.png')
      }
    ],
    prevention: [
      'Avoid overhead irrigation',
      'Maintain proper plant spacing',
      'Remove and destroy infected plant material',
      'Apply preventive fungicides during wet seasons'
    ],
    treatment: [
      'Apply fungicides containing copper or chlorothalonil',
      'Prune affected branches and twigs',
      'Improve air circulation through pruning',
      'Remove and destroy fallen leaves and debris'
    ],
    image: require('../assets/anthracnose.png')
  },
  {
    id: '4',
    name: 'Coffee Wilt Disease',
    overview: 'A vascular disease caused by the fungus Fusarium xylarioides. It affects the vascular system of coffee plants, leading to wilting and death.',
    symptoms: [
      { 
        description: 'Progressive wilting of leaves starting from the top', 
        image: require('../assets/coffee-wilt.jpg')
      },
      { 
        description: 'Dark streaking in the stem vascular tissue', 
        image: require('../assets/coffee-wilt.jpg')
      },
      { 
        description: 'Yellowing and dropping of leaves', 
        image: require('../assets/coffee-wilt.jpg')
      },
      { 
        description: 'Death of branches and eventually the entire plant', 
        image: require('../assets/coffee-wilt.jpg')
      }
    ],
    prevention: [
      'Avoid planting in areas with previous wilt disease history',
      'Use disease-free planting material',
      'Practice proper soil drainage',
      'Implement crop rotation with non-host plants'
    ],
    treatment: [
      'Remove and destroy infected plants immediately',
      'Apply soil fumigants in severely affected areas',
      'Improve soil drainage and aeration',
      'Consider resistant rootstocks for replanting'
    ],
    image: require('../assets/coffee-wilt.jpg')
  },
  {
    id: '5',
    name: 'Coffee Berry Disease',
    overview: 'A fungal disease that affects coffee berries, causing significant yield losses. The disease is caused by the fungus Colletotrichum kahawae.',
    symptoms: [
      { 
        description: 'Dark, sunken lesions on coffee berries', 
        image: require('../assets/coffee-berry-disease.jpg')
      },
      { 
        description: 'Pinkish spore masses on infected berries', 
        image: require('../assets/coffee-berry-disease.jpg')
      },
      { 
        description: 'Premature berry drop', 
        image: require('../assets/coffee-berry-disease.jpg')
      },
      { 
        description: 'Mummified berries remaining on the plant', 
        image: require('../assets/coffee-berry-disease.jpg')
      }
    ],
    prevention: [
      'Prune and remove infected branches regularly',
      'Maintain proper spacing between plants for air circulation',
      'Apply appropriate fungicides during high-risk periods',
      'Remove and destroy fallen berries and plant debris'
    ],
    treatment: [
      'Apply systemic fungicides like carbendazim or thiophanate-methyl',
      'Use copper-based fungicides as a preventive measure',
      'Implement integrated pest management practices',
      'Consider resistant coffee varieties when replanting'
    ],
    image: require('../assets/coffee-berry-disease.jpg')
  }
];

const DiseaseManagementScreen = () => {
  const navigation = useNavigation<DiseaseManagementScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as DiseaseManagementRouteParams | undefined;
  const { diseaseName } = params || {};
  const { isDarkMode } = useContext(ThemeContext);
  const [selectedDisease, setSelectedDisease] = useState<DiseaseInfo>(
    diseaseData.find(d => d.name === diseaseName) || diseaseData[0]
  );
  const [refreshing, setRefreshing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedSymptomImage, setSelectedSymptomImage] = useState<ImageSourcePropType | null>(null);

  const themedColors = isDarkMode ? DARK_COLORS : COLORS;

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderSection = (title: string, items: string[], icon: string) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{title}</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Ionicons name="checkmark-circle" size={16} color={themedColors.primary} style={styles.bullet} />
          <Text style={[styles.listItemText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{item}</Text>
        </View>
      ))}
    </View>
  );

  const renderSymptomItem = (item: SymptomInfo, index: number) => (
    <View key={index} style={styles.symptomItem}>
      <TouchableOpacity onPress={() => {
        setSelectedSymptomImage(item.image);
        setShowImageModal(true);
      }}>
        <View style={styles.symptomImageContainer}>
          <Image 
            source={item.image} 
            style={styles.symptomImage}
            resizeMode="cover"
          />
        </View>
      </TouchableOpacity>
      <View style={styles.symptomContent}>
        <Text style={[styles.symptomText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={themedColors.primary} 
      />
      
      <Header
        title="Plant Care"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Disease Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={selectedDisease.image} 
            style={styles.diseaseImage}
            resizeMode="cover"
          />
          <View style={[styles.imageOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
            <Text style={styles.diseaseNameOverlay}>{selectedDisease.name}</Text>
          </View>
        </View>

        {/* Disease Selector - Horizontal Scroll */}
        <View style={[styles.selectorSection, { marginTop: 20 }]}>
          <Text style={[styles.selectorTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Select Disease</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.diseaseSelector}
            contentContainerStyle={styles.diseaseSelectorContent}
          >
            {diseaseData.map((disease) => (
              <TouchableOpacity
                key={disease.id}
                style={[
                  styles.diseaseChip,
                  { backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white },
                  selectedDisease.id === disease.id && [styles.selectedDiseaseChip, { borderColor: themedColors.primary }]
                ]}
                onPress={() => setSelectedDisease(disease)}
              >
                <Text 
                  style={[
                    styles.diseaseChipText,
                    { color: isDarkMode ? themedColors.white : themedColors.black },
                    selectedDisease.id === disease.id && { color: themedColors.primary }
                  ]}
                >
                  {disease.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Disease Overview */}
        <View style={[styles.contentSection, { paddingHorizontal: 20 }]}>
          <View style={styles.overviewHeader}>
            <Text style={[styles.overviewTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>
              About {selectedDisease.name}
            </Text>
          </View>
          <Text style={[styles.overviewText, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
            {selectedDisease.overview}
          </Text>
        </View>

        {/* Symptoms Section */}
        <View style={[styles.contentSection, { paddingHorizontal: 20 }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Symptoms</Text>
          </View>
          <View style={styles.symptomsContainer}>
            {selectedDisease.symptoms.map(renderSymptomItem)}
          </View>
        </View>

        {/* Prevention Section */}
        {renderSection('Prevention', selectedDisease.prevention, 'shield-checkmark')}

        {/* Treatment Section */}
        {renderSection('Treatment', selectedDisease.treatment, 'medical')}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Full-size Image Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showImageModal}
        onRequestClose={() => setShowImageModal(false)}
      >
        <TouchableOpacity 
          style={styles.fullImageModalOverlay} 
          activeOpacity={1}
          onPress={() => setShowImageModal(false)}
        >
          <View style={[styles.fullImageModalContent, { backgroundColor: isDarkMode ? DARK_COLORS.secondary : COLORS.white }]}>
            {selectedSymptomImage && (
              <Image 
                source={selectedSymptomImage} 
                style={styles.fullSymptomImage}
                resizeMode="contain"
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: 200,
    borderRadius: 0, // No border radius for full width image
    marginVertical: 0, // No vertical margin
    overflow: 'hidden',
  },
  diseaseImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 15,
  },
  diseaseNameOverlay: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  selectorSection: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  diseaseSelector: {
    // No specific styles needed for ScrollView, it handles horizontal scrolling
  },
  diseaseSelectorContent: {
    alignItems: 'center',
  },
  diseaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  diseaseChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedDiseaseChip: {
    borderColor: COLORS.primary,
  },
  contentSection: {
    marginBottom: 25,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
  },
  overviewText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.gray,
  },
  section: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    marginTop: 2,
    marginRight: 10,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.black,
  },
  symptomsContainer: {
    gap: 15,
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symptomImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 15,
  },
  symptomImage: {
    width: '100%',
    height: '100%',
  },
  symptomContent: {
    flex: 1,
  },
  symptomText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.black,
  },
  fullImageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImageModalContent: {
    width: Dimensions.get('window').width * 0.9,
    height: Dimensions.get('window').height * 0.9,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fullSymptomImage: {
    width: '100%',
    height: '100%',
  },
});

export default DiseaseManagementScreen;