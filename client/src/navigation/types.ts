import { NavigatorScreenParams } from '@react-navigation/native';

// Auth navigator params
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

// Main tab navigator params
export type MainTabParamList = {
  Home: undefined;
  Scan: undefined;
  Reports: undefined;
  Profile: undefined;
  Results: {
    imageUri: string;
  };
};

// Root navigator that includes both auth and main flows
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
}; 