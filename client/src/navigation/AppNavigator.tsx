import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, AppState } from 'react-native';
import SplashScreen from '../screens/SplashScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import VerifyOTPScreen from '../screens/VerifyOTPScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import BottomTabNavigator from './BottomTabNavigator';
import ResultsScreen from '../screens/ResultsScreen';
import ViewScanScreen from '../screens/ViewScanScreen'; // Add this import
import ScanHistoryScreen from '../screens/ScanHistoryScreen';
import DiseaseManagementScreen from '../screens/DiseaseManagementScreen';
import AboutAppScreen from '../screens/AboutAppScreen'; // Import the new screen
import { RootStackParamList } from './types';
import { useAuthStore } from '../stores/authStore';
import { COLORS } from '../constants/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const navigationRef = useRef(null);

  useEffect(() => {
    // Let splash screen handle the initialization
    setIsLoading(false);
    
    // Check auth state on app start
    useAuthStore.getState().checkAuth();
    
    // Handle app state changes to check auth when app comes to foreground
    const handleAppStateChange = (nextAppState: any) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App has come to the foreground, check auth state
        useAuthStore.getState().checkAuth();
      }
      setAppState(nextAppState);
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription?.remove();
    };
  }, [appState]);

  // Log authentication state changes
  useEffect(() => {
    console.log('Auth state changed:', isAuthenticated ? 'authenticated' : 'not authenticated');
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.white }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer 
      ref={navigationRef}
      onStateChange={() => {
        // Log navigation state changes for debugging
        console.log('Navigation state changed');
      }}
    >
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
        <Stack.Screen name="Results" component={ResultsScreen} />
        <Stack.Screen name="ViewScan" component={ViewScanScreen} />
        <Stack.Screen name="ScanHistory" component={ScanHistoryScreen} />
        <Stack.Screen name="DiseaseManagement" component={DiseaseManagementScreen} />
        <Stack.Screen name="AboutApp" component={AboutAppScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;