import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  StatusBar,
  Dimensions,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../stores/authStore';

type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

interface Props {
  navigation: SplashScreenNavigationProp;
}

const { width, height } = Dimensions.get('window');

const SplashScreen: React.FC<Props> = ({ navigation }) => {
  const checkAuth = useAuthStore(state => state.checkAuth);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize auth state
        await checkAuth();
        
        // Wait a minimum time for splash screen
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Always go to onboarding during development
        navigation.replace('Onboarding');
      } catch (error) {
        console.error('Error during app initialization:', error);
        navigation.replace('Onboarding');
      }
    };

    initializeApp();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>KAPPI</Text>
          <Text style={styles.tagline}>Coffee Plant Disease Detection</Text>
        </View>
        
        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>Powered by AI Technology</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
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
    color: COLORS.white,
    letterSpacing: 2,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '300',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 4,
  },
  dot1: {
    opacity: 0.3,
  },
  dot2: {
    opacity: 0.6,
  },
  dot3: {
    opacity: 1,
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '300',
  },
});

export default SplashScreen;