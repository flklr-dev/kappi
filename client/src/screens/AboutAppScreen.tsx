import React, { useContext } from 'react';
import { StyleSheet, Text, View, SafeAreaView, StatusBar, Image, ScrollView, Dimensions } from 'react-native';
import { COLORS, DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import { ThemeContext } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useLanguage } from '../context/LanguageContext';

type AboutAppScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

const AboutAppScreen = () => {
  const { isDarkMode } = useContext(ThemeContext);
  const { t } = useLanguage(); // Added LanguageContext usage
  const themedColors = {
    ...COLORS,
    ...(isDarkMode ? DARK_COLORS : {}),
    text: isDarkMode ? DARK_COLORS.white : COLORS.black,
    textSecondary: isDarkMode ? DARK_COLORS.gray : COLORS.gray,
    background: isDarkMode ? DARK_COLORS.background : COLORS.background,
    primary: isDarkMode ? DARK_COLORS.primary : COLORS.primary,
    gray: isDarkMode ? DARK_COLORS.gray : COLORS.gray
  };
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
        <View style={styles.logoSection}>
          <Image 
            source={require('../assets/logo-with-text-color.png')} 
            style={styles.appLogo} 
          />
          <Text style={[styles.version, { color: themedColors.gray }]}>
            Version 1.0.0
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.contentSection}>
          <Text style={[styles.heading, { color: themedColors.text }]}>
            {t('overview')}
          </Text>
          <Text style={[styles.bodyText, { color: themedColors.textSecondary }]}>
            {t('overview_description')}
          </Text>
        </View>

        <View style={styles.contentSection}>
          <Text style={[styles.heading, { color: themedColors.text }]}>
            {t('key_features')}
          </Text>
          <View style={styles.list}>
            <Text style={[styles.listItem, { color: themedColors.textSecondary }]}>
              {t('ai_powered_disease_detection_feature')}
            </Text>
            <Text style={[styles.listItem, { color: themedColors.textSecondary }]}>
              {t('personalized_recommendations_feature')}
            </Text>
            <Text style={[styles.listItem, { color: themedColors.textSecondary }]}>
              {t('scan_history_feature')}
            </Text>
            <Text style={[styles.listItem, { color: themedColors.textSecondary }]}>
              {t('user_profile_feature')}
            </Text>
          </View>
        </View>

        <View style={styles.contentSection}>
          <Text style={[styles.heading, { color: themedColors.text }]}>
            {t('supported_diseases')}
          </Text>
          <Text style={[styles.bodyText, { color: themedColors.textSecondary, marginBottom: 12 }]}>
            {t('kappi_currently_focuses_on_detecting')}
          </Text>
          <View style={styles.list}>
            <Text style={[styles.listItem, { color: themedColors.textSecondary }]}>
              • Coffee Leaf Rust
            </Text>
            <Text style={[styles.listItem, { color: themedColors.textSecondary }]}>
              • Leaf Spot (Phoma)
            </Text>
            <Text style={[styles.listItem, { color: themedColors.textSecondary }]}>
              • Brown Spot (Cercospora)
            </Text>
            <Text style={[styles.listItem, { color: themedColors.textSecondary }]}>
              • Sooty Mold
            </Text>
          </View>
        </View>

        <View style={styles.contentSection}>
          <Text style={[styles.heading, { color: themedColors.text }]}>
            {t('target_users')}
          </Text>
          <Text style={[styles.bodyText, { color: themedColors.textSecondary }]}>
            {t('target_users_description')}
          </Text>
        </View>

        <View style={styles.divider} />

        <Text style={[styles.copyright, { color: themedColors.gray }]}>
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
    flexGrow: 1,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  appLogo: {
    width: width * 0.65,
    height: width * 0.32,
    resizeMode: 'contain',
  },
  version: {
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
    opacity: 0.3,
  },
  contentSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 0.2,
  },
  list: {
    marginTop: 4,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  copyright: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    fontWeight: '400',
  },
});

export default AboutAppScreen;