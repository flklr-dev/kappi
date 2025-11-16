import React, { useState, useContext, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  StatusBar, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  TextInput,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import { DARK_COLORS } from '../constants/colors';
import Header from '../components/Header';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AuthContext } from '../context/AuthContext';
import { useAuthStore } from '../stores/authStore';
import { authViewModel } from '../viewmodels/AuthViewModel';
import { authService } from '../services/api';
import { secureStorage } from '../utils/secureStorage';
import PasswordComplexity from '../components/PasswordComplexity';
import { sanitizeInput } from '../utils/secureStorage';
import { ThemeContext } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window'); // Added responsive dimensions

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface UserCapabilities {
  canSetPassword: boolean;
  hasPasswordAuth: boolean;
  providers: string[];
  user?: any;
}

// Component for the profile header - more professional and clean
const ProfileHeader = ({ user, handleEditProfile, isDarkMode, themedColors }: any) => (
  <View style={[styles.profileHeaderContainer, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white, borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]}>
    <View style={[styles.profilePictureContainer, { backgroundColor: themedColors.primary }]}>
      <Ionicons name="person-circle-outline" size={40} color={themedColors.white} />
    </View>
    <View style={styles.profileInfo}>
      <Text style={[styles.profileName, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{user?.fullName}</Text>
      <Text style={[styles.profileEmail, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>{user?.email}</Text>
    </View>
    <TouchableOpacity onPress={handleEditProfile} style={[styles.editButton, { backgroundColor: isDarkMode ? themedColors.background : COLORS.secondary + '10' }]}>
      <Ionicons name="create-outline" size={24} color={isDarkMode ? themedColors.primary : COLORS.primary} />
    </TouchableOpacity>
  </View>
);

const ProfileScreen = () => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext); // Reintroduce toggleTheme
  const { t, language, setLanguage } = useLanguage(); // Added LanguageContext usage
  // Use a ternary to avoid TypeScript issues
  const themedColors = isDarkMode ? DARK_COLORS : COLORS;
  
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { setIsAuthenticated } = useContext(AuthContext);
  const { logout, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState({
    google: false,
  });
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [userCapabilities, setUserCapabilities] = useState<UserCapabilities | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Track logout state
  const [showThemeModal, setShowThemeModal] = useState(false); // State for Theme modal
  const [showLanguageModal, setShowLanguageModal] = useState(false); // Added showLanguageModal state
  const [editedName, setEditedName] = useState(''); // Add this state
  
  // Handlers for modals
  const handleCloseTheme = () => setShowThemeModal(false);
  const handleCloseLanguage = () => setShowLanguageModal(false); // Added handleCloseLanguage handler

  const handleLanguageChange = async (selectedLanguage: string) => {
    try {
      await setLanguage(selectedLanguage);
      handleCloseLanguage();
    } catch (error) {
      console.error('Error changing language:', error);
    }
  };

  // Fetch user data and capabilities when component mounts
  useEffect(() => {
    let isMounted = true;
    
    const checkUserData = async () => {
      // If user data is not in store, try to get from secure storage
      if (!user) {
        const userData = await secureStorage.getItem('@kappi_auth_user');
        if (userData && isMounted) {
          useAuthStore.getState().setUser(userData);
        }
      }
      
      // Check if user is authenticated before fetching capabilities
      const currentState = useAuthStore.getState();
      if (!currentState.isAuthenticated || !isMounted) {
        return;
      }
      
      // Fetch current user capabilities from backend
      try {
        const capabilities = await authViewModel.refreshUserCapabilities();
        if (capabilities && isMounted) {
          setUserCapabilities({
            canSetPassword: capabilities.canSetPassword,
            hasPasswordAuth: capabilities.hasPasswordAuth,
            providers: capabilities.providers
          });
        }
      } catch (error) {
        console.error('Failed to fetch user capabilities:', error);
        // Fallback to local state if API fails
        if (user && isMounted) {
          setUserCapabilities({
            canSetPassword: user.providers?.includes('email') ?? false,
            hasPasswordAuth: user.providers?.includes('email') || false,
            providers: user.providers || []
          });
        }
      }
    };
    
    checkUserData();
    
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Check if user has linked providers
  const hasProvider = (provider: string) => {
    return user?.providers?.includes(provider) ?? false;
  };

  // Check if user has password authentication (email provider) - use backend data if available
  const hasPasswordAuth = () => {
    if (userCapabilities) {
      return userCapabilities.hasPasswordAuth;
    }
    // Fallback to local check
    if (!user?.providers || user.providers.length === 0) {
      return false;
    }
    return user.providers.includes('email');
  };

  // Check if user can set a password (only social providers, no email) - use backend data if available
  const canSetPassword = () => {
    if (userCapabilities) {
      return userCapabilities.canSetPassword;
    }
    // Fallback to local check
    if (!user?.providers || user.providers.length === 0) {
      return false;
    }
    return !user.providers.includes('email');
  };

  const handleEditProfile = () => {
    setEditedName(user?.fullName || '');
    setProfileError(null);
    setShowEditProfile(true);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('delete_account_title'),
      t('delete_account_message'),
      [
        { text: t('cancel_action'), style: "cancel" },
        { 
          text: t('delete_action'), 
          style: "destructive", 
          onPress: async () => {
            try {
              setLoading(true);
              await authService.deleteAccount();
              
              // Clear local data
              await logout();
              
              // Navigate to login screen
              Alert.alert(
                t('account_deleted'),
                t('account_deleted_message'),
                [
                  {
                    text: t('ok'),
                    onPress: () => {
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                    }
                  }
                ]
              );
            } catch (error: any) {
              Alert.alert(
                t('error_message'), 
                error.response?.data?.message || t('failed_to_delete_account')
              );
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      t('logout_title'),
      t('logout_message'),
      [
        {
          text: t('cancel_action'),
          style: "cancel"
        },
        {
          text: t('logout_action'),
          style: "destructive",
          onPress: async () => {
            if (isLoggingOut) return; // Prevent multiple logout attempts
            
            try {
              setIsLoggingOut(true);
              setLoading(true);
              await logout();
              // Navigate to login screen after successful logout
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              Alert.alert(t('error_message'), t('failed_to_logout'));
            } finally {
              setLoading(false);
              setIsLoggingOut(false);
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  const handleGoogleLogin = async () => {
    try {
      setShowAccountSelector(false);
      setLinkingLoading({ ...linkingLoading, google: true });
      const response = await authViewModel.googleLogin(false);
      
      if (!response && !authViewModel.error) {
        console.log('Google sign-in cancelled');
      } else if (authViewModel.error) {
        Alert.alert(t('error_message'), t('failed_to_sign_in_with_google_account'));
      } else if (response) {
        // Show success message
        Alert.alert(
          t('success_message'),
          t('signed_in_successfully_with_google'),
          [{ 
            text: t('ok'),
            onPress: () => {
              // Force authentication state update
              useAuthStore.getState().setAuthenticated(true);
              // Force app reload to trigger navigation
              setTimeout(() => {
                console.log('Forcing navigation to home screen');
                useAuthStore.getState().setAuthenticated(true);
              }, 100);
            }
          }]
        );
      }
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Alert.alert(t('error_message'), t('failed_to_sign_in_with_google_account'));
      }
    } finally {
      setLinkingLoading({ ...linkingLoading, google: false });
    }
  };

  const handleLinkGoogle = async () => {
    if (hasProvider('google')) {
      Alert.alert(t('account_already_linked'), t('account_already_linked_message'));
      return;
    }

    try {
      setLinkingLoading({ ...linkingLoading, google: true });
      await authViewModel.linkGoogleAccount();
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Alert.alert(t('error_message'), t('failed_to_link_google'));
      }
    } finally {
      setLinkingLoading({ ...linkingLoading, google: false });
    }
  };

  const handleOpenChangePassword = () => {
    setShowChangePassword(true);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  const handleCloseChangePassword = () => {
    setShowChangePassword(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  const handleCloseEditProfile = () => {
    setShowEditProfile(false);
    setEditedName('');
    setProfileError(null);
  };

  const handleOpenAboutApp = () => {
    navigation.navigate('AboutApp');
  };

  const handleSaveProfile = async () => {
    setProfileError(null);
    setProfileLoading(true);
    
    try {
      const result = await authViewModel.updateProfile(editedName);
      
      if (result.success) {
        Alert.alert(t('success_message'), result.message, [
          { text: t('ok'), onPress: () => {
            handleCloseEditProfile();
            // Update the user data in the auth store
            if (result.user) {
              useAuthStore.getState().setUser(result.user);
            }
          }}
        ]);
      } else {
        setProfileError(result.message);
      }
    } catch (error: any) {
      setProfileError(error.message || t('an_unexpected_error_occurred'));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordLoading(true);
    
    try {
      // Determine if user is setting first password using backend data
      const isSettingFirstPassword = canSetPassword();
      
      // Validate required fields based on scenario
      if (isSettingFirstPassword) {
        // For social users setting their first password, only require new password fields
        if (!newPassword.trim() || !confirmPassword.trim()) {
          setPasswordError(t('new_password_and_confirmation_required'));
          setPasswordLoading(false);
          return;
        }
      } else {
        // For users with existing passwords, require all fields
        if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
          setPasswordError(t('all_password_fields_required'));
          setPasswordLoading(false);
          return;
        }
      }
      
      // Validate password match
      if (newPassword !== confirmPassword) {
        setPasswordError(t('new_passwords_do_not_match'));
        setPasswordLoading(false);
        return;
      }
      
      // Don't sanitize passwords - they need special characters!
      // Only sanitize old password if it exists
      const sanitizedOld = isSettingFirstPassword ? '' : (oldPassword || '');
      
      const result = await authViewModel.changePassword(sanitizedOld, newPassword, confirmPassword);
      
      if (result.success) {
        Alert.alert(t('success_message'), result.message, [
          { text: t('ok'), onPress: () => {
            handleCloseChangePassword();
            // Only refresh user capabilities if this was a first-time password setting (not a logout scenario)
            if (result.message !== t('password_changed_successfully')) {
              // Check if user is still authenticated before refreshing capabilities
              const currentState = useAuthStore.getState();
              if (currentState.isAuthenticated) {
                // Refresh user capabilities after successful password change
                authViewModel.refreshUserCapabilities().then(capabilities => {
                  if (capabilities) {
                    setUserCapabilities({
                      canSetPassword: capabilities.canSetPassword,
                      hasPasswordAuth: capabilities.hasPasswordAuth,
                      providers: capabilities.providers
                    });
                    // Update authStore with normalized user data
                    if (capabilities.user) {
                      const normalizedUser = {
                        ...capabilities.user,
                        providers: Array.isArray(capabilities.user.providers) 
                          ? capabilities.user.providers.map((p: any) => 
                              typeof p === 'string' ? p : p.provider
                            )
                          : (capabilities.providers || [])
                      };
                      useAuthStore.getState().setUser(normalizedUser);
                    }
                  }
                }).catch(error => {
                  console.error('Failed to refresh user capabilities after password change:', error);
                  // Don't show error to user as this is not critical
                });
              }
            }
          }}
        ]);
      } else {
        setPasswordError(result.message);
      }
    } catch (error: any) {
      setPasswordError(error.message || t('an_unexpected_error_occurred'));
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
        <ActivityIndicator size="large" color={themedColors.primary} />
        <Text style={[styles.loadingText, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>{t('loading_profile')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={themedColors.primary} 
      />
      
      <Header
        title={t('profile')}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* New Profile Header Section */}
        <ProfileHeader user={user} handleEditProfile={handleEditProfile} isDarkMode={isDarkMode} themedColors={themedColors} />
        
        {/* Account Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('account')}</Text>
          <View style={[styles.menuContainer, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={() => navigation.navigate('ScanHistory')}>
              <View style={styles.menuItemContent}>
                <Ionicons name="time-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('view_scan_history')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={handleOpenChangePassword}>
              <View style={styles.menuItemContent}>
                <Ionicons name="key-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{canSetPassword() ? t('set_password') : t('change_password')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={handleDeleteAccount}>
              <View style={styles.menuItemContent}>
                <Ionicons name="trash-outline" size={20} color={themedColors.error} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: themedColors.error }]}>{t('delete_account')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
            {/* Google Account Link moved here */}
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLinkGoogle}>
              <View style={styles.menuItemContent}>
                <Ionicons name="logo-google" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('google_account')}</Text>
              </View>
              
              {hasProvider('google') ? (
                <View style={styles.menuItemContent}>
                  <Ionicons name="checkmark-circle" size={20} color={themedColors.success} style={styles.menuIcon} />
                  <Text style={[styles.menuText, { color: themedColors.success }]}>{t('linked')}</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={handleLinkGoogle}
                  disabled={linkingLoading.google}
                >
                  {linkingLoading.google ? (
                    <ActivityIndicator size="small" color={themedColors.primary} />
                  ) : (
                    <Text style={[styles.menuText, { color: themedColors.primary }]}>{t('link')}</Text>
                  )}
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>
          <Text style={[styles.accountLinkingNote, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
            {t('account_linking_note')}
          </Text>
        </View>

        {/* Preferences Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('preferences')}</Text>
          <View style={[styles.menuContainer, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={() => setShowThemeModal(true)}>
              <View style={styles.menuItemContent}>
                <Ionicons name="bulb-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('theme')}</Text>
              </View>
              <Text style={[styles.menuValueText, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>{isDarkMode ? t('dark_mode') : t('light_mode')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => setShowLanguageModal(true)}>
              <View style={styles.menuItemContent}>
                <Ionicons name="language-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('language')}</Text>
              </View>
              <Text style={[styles.menuValueText, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
                {language === 'en' ? t('english') : t('bisaya')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('about')}</Text>
          <View style={[styles.menuContainer, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={handleOpenAboutApp}>
              <View style={styles.menuItemContent}>
                <Ionicons name="information-circle-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('about_the_app')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={() => console.log('Terms & Conditions')}>
              <View style={styles.menuItemContent}>
                <Ionicons name="document-text-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('terms_and_conditions')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => console.log('Privacy Policy')}>
              <View style={styles.menuItemContent}>
                <Ionicons name="shield-checkmark-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('privacy_policy')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
          </View>
        </View>
        {/* Logout Button at the very bottom */}
        <TouchableOpacity 
          style={[styles.logoutButtonBottom, { backgroundColor: themedColors.error }]} 
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={themedColors.white} />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={COLORS.white} style={styles.logoutIcon} />
              <Text style={[styles.logoutText, { color: COLORS.white }]}>{t('logout')}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal
        visible={showChangePassword}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseChangePassword}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{canSetPassword() ? t('set_password_title') : t('change_password_title')}</Text>
              <TouchableOpacity onPress={handleCloseChangePassword}>
                <Ionicons name="close" size={24} color={isDarkMode ? themedColors.white : COLORS.black} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
              {canSetPassword() ? t('set_password_subtitle') : t('change_password_subtitle')}
            </Text>
            {!canSetPassword() && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>{t('current_password')}</Text>
                <View style={[styles.inputRow, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background, borderColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '30' }]}>
                  <TextInput
                    style={[styles.input, { color: isDarkMode ? themedColors.white : COLORS.black }]}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholder={t('current_password')}
                    placeholderTextColor={isDarkMode ? themedColors.gray : COLORS.gray}
                    secureTextEntry={!showOld}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowOld(!showOld)}>
                    <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.inputLabel, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>{t('new_password')}</Text>
              <View style={[styles.inputRow, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background, borderColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '30' }]}>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? themedColors.white : COLORS.black }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t('new_password')}
                  placeholderTextColor={isDarkMode ? themedColors.gray : COLORS.gray}
                  secureTextEntry={!showNew}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                  <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
                </TouchableOpacity>
              </View>
              <PasswordComplexity password={newPassword} />
            </View>
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.inputLabel, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>{t('confirm_new_password_text')}</Text>
              <View style={[styles.inputRow, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background, borderColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '30' }]}>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? themedColors.white : COLORS.black }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t('confirm_new_password_text')}
                  placeholderTextColor={isDarkMode ? themedColors.gray : COLORS.gray}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                  <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
                </TouchableOpacity>
              </View>
            </View>
            {passwordError ? (
              <Text style={{ color: themedColors.error, marginBottom: 10, textAlign: 'center' }}>{passwordError}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.loginWithButton, { backgroundColor: themedColors.primary, opacity: passwordLoading ? 0.7 : 1 }]}
              onPress={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? (
                <ActivityIndicator size="small" color={themedColors.white} />
              ) : (
                <Text style={styles.loginWithText}>{canSetPassword() ? t('set_password') : t('change_password')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditProfile}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseEditProfile}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('edit_profile')}</Text>
              <TouchableOpacity onPress={handleCloseEditProfile}>
                <Ionicons name="close" size={24} color={isDarkMode ? themedColors.white : COLORS.black} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
              {t('you_can_only_change_name_once_every_5_days')}
            </Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.inputLabel, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>{t('full_name_label')}</Text>
              <View style={[styles.inputRow, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background, borderColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '30' }]}>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? themedColors.white : COLORS.black }]}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder={t('full_name_label')}
                  placeholderTextColor={isDarkMode ? themedColors.gray : COLORS.gray}
                  autoCapitalize="words"
                />
              </View>
            </View>
            {profileError ? (
              <Text style={{ color: themedColors.error, marginBottom: 10, textAlign: 'center' }}>{profileError}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.loginWithButton, { backgroundColor: themedColors.primary, opacity: profileLoading ? 0.7 : 1 }]}
              onPress={handleSaveProfile}
              disabled={profileLoading}
            >
              {profileLoading ? (
                <ActivityIndicator size="small" color={themedColors.white} />
              ) : (
                <Text style={styles.loginWithText}>{t('save_changes')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About the App Modal */}
      <Modal
        visible={false} // This modal is now handled by navigation
        transparent={true}
        animationType="fade"
        onRequestClose={() => {}} // No longer needed
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('about_the_app')}</Text>
              <TouchableOpacity onPress={() => {}}>
                <Ionicons name="close" size={24} color={isDarkMode ? themedColors.white : COLORS.black} />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Image source={require('../../assets/icon.png')} style={{ width: 64, height: 64, marginBottom: 8 }} />
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDarkMode ? themedColors.primary : COLORS.primary }}>Kappi</Text>
              <Text style={{ fontSize: 14, color: isDarkMode ? themedColors.gray : COLORS.gray, marginTop: 2 }}>Version 1.0.0</Text>
            </View>
            <Text style={{ fontSize: 15, color: isDarkMode ? themedColors.white : COLORS.black, textAlign: 'center', marginBottom: 10 }}>
              Kappi helps coffee farmers detect leaf rust and manage their crops using AI-powered image analysis and farm management tools.
            </Text>
            <Text style={{ fontSize: 13, color: isDarkMode ? themedColors.gray : COLORS.gray, textAlign: 'center' }}>
              © {new Date().getFullYear()} Kappi Team. All rights reserved.
            </Text>
          </View>
        </View>
      </Modal>

      {/* Theme Modal */}
      <Modal
        visible={showThemeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseTheme}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('theme')}</Text>
              <TouchableOpacity onPress={handleCloseTheme}>
                <Ionicons name="close" size={24} color={isDarkMode ? themedColors.white : COLORS.black} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
              {t('choose_app_theme')}
            </Text>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20', paddingVertical: 15 }]}
              onPress={() => {
                toggleTheme();
                handleCloseTheme();
              }}
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="moon-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('dark_mode')}</Text>
              </View>
              <Ionicons name={isDarkMode ? "checkmark-circle" : "radio-button-off"} size={20} color={isDarkMode ? themedColors.success : themedColors.gray} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0, paddingVertical: 15 }]}
              onPress={() => {
                toggleTheme();
                handleCloseTheme();
              }}
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="sunny-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('light_mode')}</Text>
              </View>
              <Ionicons name={!isDarkMode ? "checkmark-circle" : "radio-button-off"} size={20} color={!isDarkMode ? themedColors.success : themedColors.gray} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseLanguage}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('language')}</Text>
              <TouchableOpacity onPress={handleCloseLanguage}>
                <Ionicons name="close" size={24} color={isDarkMode ? themedColors.white : COLORS.black} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
              {t('choose_app_language')}
            </Text>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20', paddingVertical: 15 }]}
              onPress={() => handleLanguageChange('en')}
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="language-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('english')}</Text>
              </View>
              <Ionicons name={language === 'en' ? "checkmark-circle" : "radio-button-off"} size={20} color={language === 'en' ? themedColors.success : themedColors.gray} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomWidth: 0, paddingVertical: 15 }]}
              onPress={() => handleLanguageChange('ceb')}
            >
              <View style={styles.menuItemContent}>
                <Ionicons name="language-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{t('bisaya')}</Text>
              </View>
              <Ionicons name={language === 'ceb' ? "checkmark-circle" : "radio-button-off"} size={20} color={language === 'ceb' ? themedColors.success : themedColors.gray} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 20, // Adjusted padding to ensure the logout button is fully visible and has space below
  },
  profileHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 24, 
  },
  profilePictureContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Cohesive with QuickActionCard icon
    shadowRadius: 4, // Cohesive with QuickActionCard icon
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 4,
  },
  editButton: {
    padding: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, // Cohesive with other elements
    shadowRadius: 3, // Cohesive with other elements
  },
  sectionContainer: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  menuContainer: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20, // Increased for better spacing
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Cohesive with QuickActionCard
    shadowRadius: 5, // Cohesive with QuickActionCard
    // elevation: 2, // Removed, relying on shadow
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    // Removed borderBottomWidth and borderBottomColor from individual menu items to simplify
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
  },
  menuValueText: {
    fontSize: 16,
    marginLeft: 10,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 10,
    marginBottom: 5,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalCheckIcon: {
    marginLeft: 10,
  },
  modalCancelButton: {
    borderRadius: 10,
    backgroundColor: COLORS.lightGray,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // -- Keep existing styles for other components like modals to maintain functionality
  loginWithButton: {
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Cohesive with other cards
    shadowRadius: 5, // Cohesive with other cards
  },
  loginWithText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white, // Added this line to ensure text is white in all themes
  },
  logoutButtonBottom: {
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 0, // Removed marginTop as it's now within scrollview
    marginBottom: 20, // Added marginBottom for spacing after the button
    minHeight: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Cohesive with other cards
    shadowRadius: 5, // Cohesive with other cards
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Removed unused styles related to linked accounts and modals
  accountLinkingNote: {
    fontSize: 14,
    marginTop: -10,
    marginBottom: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, // Cohesive with other cards
    shadowRadius: 5, // Cohesive with other cards
    // elevation: 5, // Removed, relying on shadow
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4,
    marginLeft: 2,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15, // Cohesive with other cards
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8, // Increased for better touch target
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, // Subtle shadow
    shadowRadius: 3, // Subtle shadow
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  // socialIconProfile style is no longer used
});

export default ProfileScreen;