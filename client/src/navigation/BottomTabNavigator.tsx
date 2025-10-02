import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK_COLORS } from '../constants/colors';
import { ThemeContext } from '../context/ThemeContext';
import { Dimensions } from 'react-native'; // Import Dimensions

import HomeScreen from '../screens/HomeScreen';
import ScanScreen from '../screens/ScanScreen';
import ReportsScreen from '../screens/ReportsScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const { height, width } = Dimensions.get('window'); // Get screen height and width

const BottomTabNavigator = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDarkMode ? themedColors.secondary : themedColors.white,
          borderTopWidth: 1,
          borderTopColor: isDarkMode ? themedColors.gray : 'rgba(0,0,0,0.1)',
          height: height * 0.08, // Responsive height
          paddingBottom: height * 0.01,
          paddingTop: height * 0.01,
        },
        tabBarActiveTintColor: themedColors.primary,
        tabBarInactiveTintColor: isDarkMode ? themedColors.lightGray : themedColors.gray,
        tabBarLabelStyle: { // Add style for label
          fontSize: Math.min(12, width * 0.03), // Responsive font size
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={Math.min(size, width * 0.06)} color={color} /> // Responsive icon size
          ),
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanScreen}
        options={{
          title: 'Scan',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan" size={Math.min(size, width * 0.06)} color={color} /> // Responsive icon size
          ),
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={Math.min(size, width * 0.06)} color={color} /> // Responsive icon size
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={Math.min(size, width * 0.06)} color={color} /> // Responsive icon size
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;