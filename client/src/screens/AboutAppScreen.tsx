import React, { useContext } from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext'; // Added LanguageContext import

type AboutAppScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AboutAppScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { t } = useLanguage(); // Added LanguageContext usage
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;
  const navigation = useNavigation<AboutAppScreenNavigationProp>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={themedColors.primary} 
      />
      <Header
        title={t('about_kappi')}
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
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('overview')}</Text>
          <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>
            {t('overview_description')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('key_features')}</Text>
          <View>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('ai_powered_disease_detection_feature')}</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('personalized_recommendations_feature')}</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('scan_history_feature')}</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('user_profile_feature')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('supported_diseases')}</Text>
          <View>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('kappi_currently_focuses_on_detecting')}</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('coffee_leaf_rust_disease')}</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('thread_blight_disease')}</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('anthracnose_disease')}</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('coffee_wilt_disease_disease')}</Text>
            <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('coffee_berry_disease_disease')}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('target_users')}</Text>
          <Text style={[styles.sectionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>
            {t('target_users_description')}
          </Text>
        </View>

        <Text style={[styles.footerText, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
          {t('kappi_team_copyright').replace('{year}', new Date().getFullYear().toString())}
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