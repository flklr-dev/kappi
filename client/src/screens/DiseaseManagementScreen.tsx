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
  sources: string[];
}

// Disease data based on detected diseases in the application
const diseaseData: DiseaseInfo[] = [
  {
    id: '1',
    name: 'Leaf Rust',
    overview: 'Coffee Leaf Rust (Hemileia vastatrix) is one of the most devastating fungal diseases of coffee worldwide. It causes yellow-orange powdery pustules on leaf undersides, leading to premature leaf drop, reduced photosynthesis, and severe yield losses of up to 50% or more.',
    symptoms: [
      { 
        description: 'Yellow-orange powdery pustules on leaf undersides', 
        image: require('../assets/coffee-rust.png')
      },
      { 
        description: 'Chlorotic spots on upper leaf surface', 
        image: require('../assets/leaf-rust-2S.jpg')
      },
      { 
        description: 'Premature defoliation and bare branches', 
        image: require('../assets/leaf-rust-3S.jpg')
      },
    ],
    prevention: [
      'Plant rust-resistant varieties (e.g., Lempira, Obata)',
      'Maintain proper spacing (2-3m) for air circulation',
      'Prune regularly to open canopy and reduce humidity',
      'Apply balanced fertilization to maintain plant health',
      'Monitor after rainfall for early detection'
    ],
    treatment: [
      'Apply copper-based fungicides during wet seasons',
      'Use systemic triazole fungicides for active infections',
      'Remove and destroy severely infected leaves',
      'Alternate fungicide classes to prevent resistance',
      'Implement integrated pest management strategies'
    ],
    image: require('../assets/leaf-rust-overview.jpg'),
    sources: [
      'Agriculture Institute - Coffee Leaf Rust: Symptoms, Impact, and Control',
      'Hawaii Coffee Ed - Coffee Leaf Rust'
    ]
  },
  {
    id: '2',
    name: 'Leaf Spot',
    overview: 'Leaf Spot (Phoma spp.) is a fungal disease common in high-altitude, humid regions. It causes dark necrotic lesions on leaves that enlarge over time, leading to defoliation and reduced plant vigor.',
    symptoms: [
      { 
        description: 'Dark necrotic lesions on leaves', 
        image: require('../assets/leaf-spot-1S.jpg')
      },
      { 
        description: 'Lesions enlarge over time and can reach 2cm diameter', 
        image: require('../assets/leaf-spot-2S.jpg')
      },
      { 
        description: 'Severe leaf discoloration, yellowing, and browning', 
        image: require('../assets/leaf-spot-overview.jpg')
      },
    ],
    prevention: [
      'Maintain proper plant spacing for air circulation',
      'Reduce moisture levels through improved drainage',
      'Practice meticulous sanitation (clean tools and boots)',
      'Implement crop rotation with non-host plants',
      'Consider intercropping with legumes to block spore movement'
    ],
    treatment: [
      'Apply foliar fertilizers (manganese-based most effective)',
      'Use copper-based or protective fungicides during wet periods',
      'Prune affected leaves to reduce inoculum spread',
      'Improve air circulation between plants',
      'Apply biological control agents when available'
    ],
    image: require('../assets/leaf-spot-overview.jpg'),
    sources: [
      'Ebru Coffee - Blight and Phoma Leaf Diseases',
      'Revista Cultivar - Management of Phoma spot in coffee plants'
    ]
  },
  {
    id: '3',
    name: 'Brown Spot',
    overview: 'Brown Spot (Cercospora coffeicola) is a common fungal disease affecting leaves. It thrives in high humidity and causes circular brown lesions, and reduced coffee quality.',
    symptoms: [
      { 
        description: 'Circular brown spots with tan or gray centers on leaves', 
        image: require('../assets/brown-spot-1S.jpg')
      },
      { 
        description: 'Yellow halos surrounding leaf spots', 
        image: require('../assets/brown-spot-2S.jpg')
      },
      { 
        description: 'Leaf yellowing and premature drop', 
        image: require('../assets/anthracnose.png')
      }
    ],
    prevention: [
      'Maintain optimal shade levels (40-50%)',
      'Ensure adequate micronutrient nutrition (zinc, manganese)',
      'Improve soil drainage to reduce moisture',
      'Practice good sanitation by removing infected berries',
      'Mulch around plants to prevent soil splash'
    ],
    treatment: [
      'Apply copper hydroxide or mancozeb fungicides',
      'Use systemic fungicides for progressive infections',
      'Rotate fungicide classes to prevent resistance',
      'Apply foliar micronutrients to strengthen plants',
      'Implement complete IPM strategy for severe cases'
    ],
    image: require('../assets/anthracnose.png'),
    sources: [
      'CTAHR Hawaii - Cercospora Leaf Spot and Berry Blotch of Coffee'
    ]
  },
  {
    id: '4',
    name: 'Sooty Mold',
    overview: 'Sooty Mold is a fungal disease that grows on honeydew secreted by sap-sucking insects like green scale, mealybugs, and aphids. While not directly parasitic, it forms a black coating on leaves that reduces photosynthesis, weakens plants, and decreases yields.',
    symptoms: [
      { 
        description: 'Black, sooty coating on leaves', 
        image: require('../assets/sooty-mold-1S.jpg')
      },
      { 
        description: 'Presence of scale insects, mealybugs, or aphids', 
        image: require('../assets/sooty-mold-2S.jpg')
      },
    ],
    prevention: [
      'Control ant populations that protect scale insects',
      'Monitor regularly for sap-sucking insects',
      'Encourage beneficial insects and natural predators',
      'Maintain good air circulation through pruning',
      'Keep plantation clean and well-maintained'
    ],
    treatment: [
      'Control honeydew-producing insects with insecticides',
      'Apply horticultural oils or insecticidal soaps',
      'Wash affected leaves with water to remove mold',
      'Use systemic insecticides for severe infestations',
      'Apply biological controls like Verticillium lecanii'
    ],
    image: require('../assets/sooty-mold-overview.jpg'),
    sources: [
      'Hawaii Coffee Ed - Mealybug and Sooty Mold',
      'Hawaii Coffee Ed - Green Scale and Sooty Mold'
    ]
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

        {/* Sources Section */}
        {selectedDisease.sources && selectedDisease.sources.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : themedColors.black }]}>Sources</Text>
            </View>
            {selectedDisease.sources.map((source, index) => (
              <View key={index} style={styles.listItem}>
                <Ionicons name="document-text" size={16} color={themedColors.primary} style={styles.bullet} />
                <Text style={[styles.listItemText, { color: isDarkMode ? themedColors.white : themedColors.black }]}>{source}</Text>
              </View>
            ))}
          </View>
        )}

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