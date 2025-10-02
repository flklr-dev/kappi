import React, { useContext } from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

type AboutAppScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AboutAppScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;
  const navigation = useNavigation<AboutAppScreenNavigationProp>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={themedColors.primary} 
      />
      <Header
        title="About Kappi"
        showBackButton={true}
        onBackPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerSection}>
          <Image source={require('../../assets/icon.png')} style={styles.appIcon} />
          <Text style={[styles.appName, { color: isDarkMode ? themedColors.primary : COLORS.primary }]}>Kappi</Text>
          <Text style={[styles.appVersion, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>Version 1.0.0</Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Overview</Text>
          <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>
            Kappi is a mobile application designed to help coffee farmers detect and manage plant diseases using AI-powered image recognition. Our core purpose is to provide accessible, real-time disease detection, enabling farmers to take timely action to protect their crops.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Key Features</Text>
          <View>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>• AI-powered disease detection: Identify common coffee plant diseases.</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>• Personalized recommendations: Get variety-specific advice and stage-based treatment plans (chemical and cultural options).</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>• Scan history: Keep track of past scans with geolocation data.</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>• User profile: Manage your profile and settings.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Supported Diseases</Text>
          <View>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Kappi currently focuses on detecting:</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>• Coffee Leaf Rust (CLR)</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>• Thread Blight</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>• Anthracnose</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>• Coffee Wilt Disease</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>• Coffee Berry Disease</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Target Users</Text>
          <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>
            This app is built for coffee farmers, agricultural workers, extension officers, and researchers studying coffee plant diseases.
          </Text>
        </View>

        <Text style={[styles.footerText, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
          © {new Date().getFullYear()} Kappi Team. All rights reserved.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40, // Add some extra space at the bottom
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appIcon: {
    width: 100,
    height: 100,
    marginBottom: 15,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  appVersion: {
    fontSize: 16,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  footerText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 30,
  },
});

export default AboutAppScreen;
