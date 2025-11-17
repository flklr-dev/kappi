import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';

type LanguageSelectionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'LanguageSelection'
>;

interface Props {
  navigation: LanguageSelectionScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

const LanguageSelectionScreen: React.FC<Props> = ({ navigation }) => {
  const { setLanguage } = useLanguage();

  const handleLanguageSelect = async (selectedLanguage: string) => {
    try {
      await setLanguage(selectedLanguage);
      await AsyncStorage.setItem('hasSelectedLanguage', 'true');
      navigation.replace('Onboarding');
    } catch (error) {
      console.error('Error saving language selection:', error);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>KAPPI</Text>
          <Text style={styles.tagline}>Coffee Plant Disease Detection</Text>
        </View>
        
        <View style={styles.languageContainer}>
          <Text style={styles.title}>Select Language</Text>
          <Text style={styles.subtitle}>Pilia ang imong linguahe</Text>
          
          <TouchableOpacity 
            style={styles.languageButton}
            onPress={() => handleLanguageSelect('en')}
          >
            <Text style={styles.languageButtonText}>English</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.languageButton}
            onPress={() => handleLanguageSelect('ceb')}
          >
            <Text style={styles.languageButtonText}>Bisaya</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    fontWeight: '300',
  },
  languageContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    marginBottom: 40,
    textAlign: 'center',
  },
  languageButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 30,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  languageButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default LanguageSelectionScreen;