import React, { useContext } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, DARK_COLORS } from '../constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBackButton = false,
  onBackPress,
  rightComponent,
}) => {
  const insets = useSafeAreaInsets();
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;

  // Default right component is the theme toggle button
  const defaultRightComponent = (
    <TouchableOpacity style={styles.themeButton} onPress={toggleTheme}>
      <Ionicons 
        name={isDarkMode ? 'sunny' : 'moon'} 
        size={24} 
        color={themedColors.white} 
      />
    </TouchableOpacity>
  );

  const finalRightComponent = rightComponent || defaultRightComponent;

  return (
    <View style={[styles.container, { 
      backgroundColor: themedColors.primary,
      paddingTop: Math.max(insets.top, 20) 
    }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={themedColors.primary} 
      />
      
      <View style={styles.headerContent}>
        <View style={styles.leftContainer}>
          {showBackButton && (
            <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
              <Ionicons name="chevron-back" size={28} color={themedColors.white} />
            </TouchableOpacity>
          )}
          
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: themedColors.white }]}>{title}</Text>
            {subtitle && <Text style={[styles.subtitle, { color: themedColors.white + 'E6' }]}>{subtitle}</Text>}
          </View>
        </View>
        
        <View style={styles.rightContainer}>{finalRightComponent}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingBottom: 10,
    elevation: 4,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: Math.min(24, width * 0.06), // Responsive font size
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: Math.min(14, width * 0.035), // Responsive font size
    color: COLORS.white + 'E6', // Adding transparency
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeButton: {
    padding: Math.min(8, width * 0.02),
  },
});

export default Header;