import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabParamList } from './types';

// Screens
import ScanScreen from '../screens/ScanScreen';
import ResultsScreen from '../screens/ResultsScreen';

// Create the stack navigator
const Stack = createNativeStackNavigator<MainTabParamList>();

const ScanStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Scan" component={ScanScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
    </Stack.Navigator>
  );
};

export default ScanStackNavigator; 