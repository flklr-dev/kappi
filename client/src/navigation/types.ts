// Root Stack contains both auth screens and main app
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  Results: {
    imageUri: string;
    scanType: 'leaf' | 'cherry' | 'stem';
    diagnosis?: {
      disease: string;
      confidence: number;
      severity: 'low' | 'medium' | 'high';
      stage: 'Early' | 'Progressive' | 'Severe';
      variety: string;
      treatment: {
        fungicide: string;
        organic: string;
        immediateSteps: string[];
        prevention: string[];
      };
    };
  };
};

// Main tab navigator params
export type MainTabParamList = {
  HomeTab: undefined;
  ScanTab: undefined;
  ReportsTab: undefined;
  ProfileTab: undefined;
}; 