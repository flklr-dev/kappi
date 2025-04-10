import React, { useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Navigators
import AuthNavigator from './AuthNavigator';
import BottomTabNavigator from './BottomTabNavigator';

// Create the root stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  // For development purposes, set this to true to see the main app screens directly
  const [isAuthenticated, setIsAuthenticated] = useState(true); // Set to true for testing the main app flow

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={BottomTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

export default RootNavigator; 