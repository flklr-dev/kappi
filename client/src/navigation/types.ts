import { ScanResult } from '../viewmodels/ScanViewModel';

// Root Stack contains splash, onboarding, auth screens and main app
export type RootStackParamList = {
  Splash: undefined;
  LanguageSelection: undefined;
  Onboarding: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email: string };
  ResetPassword: { email: string; otp: string };
  MainTabs: { screen?: keyof MainTabParamList };
  Results: {
    imageUri: string;
    diagnosis: ScanResult;
  };
  ViewScan: {
    scan: any; // This will be the scan object with all details
  };
  ScanHistory: undefined;
  DiseaseManagement: { diseaseName?: string };
  AboutApp: undefined;
};

// Main tab navigator params
export type MainTabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;
  ReportsTab: undefined;
  ProfileTab: undefined;
};