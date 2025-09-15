import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { Ionicons } from '@expo/vector-icons';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Onboarding'
>;

interface Props {
  navigation: OnboardingScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

interface Disease {
  name: string;
  part: string;
  color: string;
  icon: string;
}

const diseases: Disease[] = [
  { name: 'Coffee Leaf Rust', part: 'Leaves', color: '#E74C3C', icon: 'leaf-rust-icon.png' },
  { name: 'Anthracnose', part: 'Leaves', color: '#9B59B6', icon: 'anthracnose-icon.png' },
  { name: 'Thread Blight', part: 'Leaves', color: '#3498DB', icon: 'thread-blight-icon.png' },
  { name: 'Coffee Berry Disease', part: 'Berries', color: '#27AE60', icon: 'berry-disease-icon.png' },
  { name: 'Coffee Wilt Disease', part: 'Stems', color: '#E67E22', icon: 'wilt-disease.png' },
];



const OnboardingScreen: React.FC<Props> = ({ navigation }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onboardingData = [
    {
      id: '1',
      title: 'Welcome to KAPPI',
      subtitle: 'Your AI-powered coffee disease detection assistant for better farming',
      content: (
        <View style={styles.introSection}>
          <View style={styles.imageContainer}>
            <Image 
              source={require('../assets/logo-with-elements.png')}
              style={styles.captureImage}
              resizeMode="contain"
            />
          </View>
        </View>
      ),
    },
    {
      id: '2',
      title: 'Capture Coffee Plants',
      subtitle: 'Take clear photos to get accurate disease detection',
      content: (
        <View style={styles.captureSection}>
          <View style={styles.imageContainer}>
            <Image 
              source={require('../assets/plant-with-camera5.png')}
              style={styles.captureImage}
              resizeMode="contain"
            />
          </View>
        </View>
      ),
    },
    {
      id: '3',
      title: 'Diseases We Detect',
      subtitle: 'Our AI can identify these common coffee plant diseases',
      content: (
        <View style={styles.diseasesSection}>
          <View style={styles.imageContainer}>
            <Image 
              source={require('../assets/disease-detect.png')}
              style={styles.captureImage}
              resizeMode="contain"
            />
          </View>
        </View>
      ),
    },
  ];

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      navigation.replace('Login');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      navigation.replace('Login');
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const renderItem = ({ item }: { item: typeof onboardingData[0] }) => (
    <View style={styles.slide}>
      <View style={styles.contentContainer}>
        {item.content}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.pagination}>
      {onboardingData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            currentIndex === index && styles.paginationDotActive,
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        keyExtractor={(item) => item.id}
      />

      {renderPagination()}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  skipButton: {
    position: 'absolute',
    top: height * 0.06,
    right: 24,
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  skipText: {
    color: '#666',
    fontSize: Math.min(16, width * 0.04),
    fontWeight: '600',
  },
  slide: {
    width: width,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: height * 0.08,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: height * 0.05,
  },
  captureSlideLayout: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  textContainer: {
    position: 'absolute',
    bottom: height * 0.18,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: Math.min(32, width * 0.08),
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: height * 0.015,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: Math.min(18, width * 0.045),
    color: '#666',
    textAlign: 'center',
    marginBottom: height * 0.06,
    lineHeight: Math.min(26, width * 0.065),
    fontWeight: '400',
    paddingHorizontal: 20,
  },
  
  // Common image container
  imageContainer: {
    alignItems: 'center',
    marginBottom: height * 0.02,
    maxHeight: height * 0.4,
  },
  
  // Introduction Screen
  introSection: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  
  // Capture Screen
  captureSection: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },
  captureImage: {
    width: Math.min(width * 1, 500),
    height: Math.min(width * 1, 500),
    maxWidth: 500,
    maxHeight: 500,
  },
  
  // Diseases Screen
  diseasesSection: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
  },

  
  // Navigation
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: height * 0.03,
    position: 'absolute',
    bottom: height * 0.12,
    left: 0,
    right: 0,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: height * 0.05,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  nextButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: height * 0.022,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: Math.min(18, width * 0.045),
    fontWeight: '700',
  },
});

export default OnboardingScreen;