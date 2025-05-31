// Root Stack contains both auth screens and main app
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  Results: {
    imageUri: string;
    scanType: 'leaf' | 'cherry' | 'stem';
  };
};

// Main tab navigator params
export type MainTabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;
  ReportsTab: undefined;
  ProfileTab: undefined;
}; 