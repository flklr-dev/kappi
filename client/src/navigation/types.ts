// Root Stack contains both auth screens and main app
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Results: {
    imageUri: string;
  };
};

// Main tab navigator params
export type MainTabParamList = {
  Home: undefined;
  Scan: undefined;
  Reports: undefined;
  Profile: undefined;
}; 