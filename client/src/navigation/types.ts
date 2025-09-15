import { ScanResult } from '../viewmodels/ScanViewModel';

// Root Stack contains splash, onboarding, auth screens and main app
export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email: string };
  ResetPassword: { email: string; otp: string };
  MainTabs: undefined;
  Results: {
    imageUri: string;
    diagnosis: ScanResult;
  };
  ScanHistory: undefined;
};

// Main tab navigator params
export type MainTabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;
  ReportsTab: undefined;
  ProfileTab: undefined;
}; 