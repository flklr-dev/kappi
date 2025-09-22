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
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/colors';
import Header from '../components/Header';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { AuthContext } from '../context/AuthContext';
import { useAuthStore } from '../stores/authStore';
import { authViewModel } from '../viewmodels/AuthViewModel';
import { secureStorage } from '../utils/secureStorage';
import PasswordComplexity from '../components/PasswordComplexity';
import { sanitizeInput } from '../utils/secureStorage';
import { ThemeContext } from '../context/ThemeContext';

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
    {user?.profilePictureUrl ? (
      <Image source={{ uri: user.profilePictureUrl }} style={styles.profilePicture} />
    ) : (
      <View style={[styles.initialsContainer, { backgroundColor: isDarkMode ? themedColors.primary + '20' : COLORS.primary + '10' }]}>
        <Text style={[styles.initialsText, { color: isDarkMode ? themedColors.primary : COLORS.primary }]}>
          {user?.fullName?.charAt(0)?.toUpperCase() || '?'}
        </Text>
      </View>
    )}
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
  const { isDarkMode } = useContext(ThemeContext);
  // Use a ternary to avoid TypeScript issues
  const themedColors = isDarkMode ? {
    primary: '#6F8F3F',
    background: '#121212',
    secondary: '#2A2A2A',
    accent: '#804E49',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#AAAAAA',
    lightGray: '#555555',
    transparent: 'transparent',
    error: '#D32F2F',
    success: '#4CAF50'
  } : COLORS;
  
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { setIsAuthenticated } = useContext(AuthContext);
  const { logout, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState({
    google: false,
    facebook: false
  });
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editedName, setEditedName] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showAboutApp, setShowAboutApp] = useState(false);
  const [userCapabilities, setUserCapabilities] = useState<UserCapabilities | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false); // Track logout state
  
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
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => console.log("Delete account") }
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
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
              Alert.alert("Error", "Failed to logout. Please try again.");
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
        Alert.alert('Error', 'Failed to sign in with Google account. Please try again.');
      } else if (response) {
        // Show success message
        Alert.alert(
          'Success',
          'Signed in successfully with Google account!',
          [{ 
            text: 'OK',
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
        Alert.alert('Error', 'Failed to sign in with Google account. Please try again.');
      }
    } finally {
      setLinkingLoading({ ...linkingLoading, google: false });
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setShowAccountSelector(false);
      setLinkingLoading({ ...linkingLoading, facebook: true });
      const response = await authViewModel.facebookLogin(false);
      
      if (!response && !authViewModel.error) {
        console.log('Facebook sign-in cancelled');
      } else if (authViewModel.error) {
        Alert.alert('Error', 'Failed to sign in with Facebook account. Please try again.');
      } else if (response) {
        // Show success message
        Alert.alert(
          'Success',
          'Signed in successfully with Facebook account!',
          [{ 
            text: 'OK',
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
        Alert.alert('Error', 'Failed to sign in with Facebook account. Please try again.');
      }
    } finally {
      setLinkingLoading({ ...linkingLoading, facebook: false });
    }
  };

  const handleLinkGoogle = async () => {
    if (hasProvider('google')) {
      Alert.alert('Account Already Linked', 'Your Google account is already linked to your profile.');
      return;
    }

    try {
      setLinkingLoading({ ...linkingLoading, google: true });
      await authViewModel.linkGoogleAccount();
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Alert.alert('Error', 'Failed to link Google account. Please try again.');
      }
    } finally {
      setLinkingLoading({ ...linkingLoading, google: false });
    }
  };

  const handleLinkFacebook = async () => {
    if (hasProvider('facebook')) {
      Alert.alert('Account Already Linked', 'Your Facebook account is already linked to your profile.');
      return;
    }

    try {
      setLinkingLoading({ ...linkingLoading, facebook: true });
      await authViewModel.linkFacebookAccount();
    } catch (error: any) {
      if (!error.message?.includes('cancelled')) {
        Alert.alert('Error', 'Failed to link Facebook account. Please try again.');
      }
    } finally {
      setLinkingLoading({ ...linkingLoading, facebook: false });
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

  const handleSaveProfile = async () => {
    setProfileError(null);
    setProfileLoading(true);
    
    try {
      const result = await authViewModel.updateProfile(editedName);
      
      if (result.success) {
        Alert.alert('Success', result.message, [
          { text: 'OK', onPress: () => {
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
      setProfileError(error.message || 'An unexpected error occurred');
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
          setPasswordError('New password and confirmation are required');
          setPasswordLoading(false);
          return;
        }
      } else {
        // For users with existing passwords, require all fields
        if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
          setPasswordError('Current password, new password, and confirmation are all required');
          setPasswordLoading(false);
          return;
        }
      }
      
      // Validate password match
      if (newPassword !== confirmPassword) {
        setPasswordError('New passwords do not match');
        setPasswordLoading(false);
        return;
      }
      
      // Don't sanitize passwords - they need special characters!
      // Only sanitize old password if it exists
      const sanitizedOld = isSettingFirstPassword ? '' : (oldPassword || '');
      
      const result = await authViewModel.changePassword(sanitizedOld, newPassword, confirmPassword);
      
      if (result.success) {
        Alert.alert('Success', result.message, [
          { text: 'OK', onPress: () => {
            handleCloseChangePassword();
            // Only refresh user capabilities if this was a first-time password setting (not a logout scenario)
            if (result.message !== 'Password changed successfully. Please log in again.') {
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
      setPasswordError(error.message || 'An unexpected error occurred');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: themedColors.background }]}>
        <ActivityIndicator size="large" color={themedColors.primary} />
        <Text style={[styles.loadingText, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>Loading profile...</Text>
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
        title="Profile"
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* New Profile Header Section */}
        <ProfileHeader user={user} handleEditProfile={handleEditProfile} isDarkMode={isDarkMode} themedColors={themedColors} />
        
        {/* Connected Accounts Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Connected Accounts</Text>
          <View style={[styles.menuContainer, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <View style={[styles.linkedAccountItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]}>
              <View style={styles.linkedAccountInfo}>
                <View style={[styles.accountIconContainer, { backgroundColor: '#4285F4' }]}>
                  <Ionicons name="logo-google" size={18} color={themedColors.white} />
                </View>
                <Text style={[styles.linkedAccountText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Google Account</Text>
              </View>
              
              {hasProvider('google') ? (
                <View style={styles.linkedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={themedColors.success} />
                  <Text style={[styles.linkedText, { color: themedColors.success }]}>Linked</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={handleLinkGoogle}
                  disabled={linkingLoading.google}
                >
                  {linkingLoading.google ? (
                    <ActivityIndicator size="small" color={themedColors.white} />
                  ) : (
                    <Text style={[styles.linkButtonText, { color: COLORS.white }]}>Link</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            <View style={[styles.linkedAccountItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]}>
              <View style={styles.linkedAccountInfo}>
                <View style={[styles.accountIconContainer, { backgroundColor: '#3b5998' }]}>
                  <Ionicons name="logo-facebook" size={18} color={themedColors.white} />
                </View>
                <Text style={[styles.linkedAccountText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Facebook Account</Text>
              </View>
              
              {hasProvider('facebook') ? (
                <View style={styles.linkedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={themedColors.success} />
                  <Text style={[styles.linkedText, { color: themedColors.success }]}>Linked</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={handleLinkFacebook}
                  disabled={linkingLoading.facebook}
                >
                  {linkingLoading.facebook ? (
                    <ActivityIndicator size="small" color={themedColors.white} />
                  ) : (
                    <Text style={[styles.linkButtonText, { color: COLORS.white }]}>Link</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={[styles.accountLinkingNote, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
            Note: Accounts are automatically linked when you log in with Google or Facebook using the same email address.
          </Text>
        </View>

        {/* Account Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Account</Text>
          <View style={[styles.menuContainer, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={() => navigation.navigate('ScanHistory')}>
              <View style={styles.menuItemContent}>
                <Ionicons name="time-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>View Scan History</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={handleOpenChangePassword}>
              <View style={styles.menuItemContent}>
                <Ionicons name="key-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{canSetPassword() ? 'Set Password' : 'Change Password'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleDeleteAccount}>
              <View style={styles.menuItemContent}>
                <Ionicons name="trash-outline" size={20} color={themedColors.error} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: themedColors.error }]}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>App Info</Text>
          <View style={[styles.menuContainer, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={() => setShowAboutApp(true)}>
              <View style={styles.menuItemContent}>
                <Ionicons name="information-circle-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>About the App</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '20' }]} onPress={() => console.log('Terms & Conditions')}>
              <View style={styles.menuItemContent}>
                <Ionicons name="document-text-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Terms & Conditions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={() => console.log('Privacy Policy')}>
              <View style={styles.menuItemContent}>
                <Ionicons name="shield-checkmark-outline" size={20} color={themedColors.primary} style={styles.menuIcon} />
                <Text style={[styles.menuText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDarkMode ? themedColors.gray : COLORS.gray} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Account Selector Modal */}
      <Modal
        visible={showAccountSelector}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccountSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Choose Account</Text>
              <TouchableOpacity onPress={() => setShowAccountSelector(false)}>
                <Ionicons name="close" size={24} color={isDarkMode ? themedColors.white : COLORS.black} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>Select an account to sign in with</Text>
            
            <TouchableOpacity 
              style={[styles.accountOption, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background }]}
              onPress={handleGoogleLogin}
              disabled={linkingLoading.google}
            >
              <View style={[styles.accountIconContainer, { backgroundColor: '#4285F4' }]}>
                <Ionicons name="logo-google" size={18} color={themedColors.white} />
              </View>
              <Text style={[styles.accountOptionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Google</Text>
              {linkingLoading.google && (
                <ActivityIndicator size="small" color={themedColors.primary} style={styles.accountLoader} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.accountOption, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background }]}
              onPress={handleFacebookLogin}
              disabled={linkingLoading.facebook}
            >
              <View style={[styles.accountIconContainer, { backgroundColor: '#3b5998' }]}>
                <Ionicons name="logo-facebook" size={18} color={themedColors.white} />
              </View>
              <Text style={[styles.accountOptionText, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Facebook</Text>
              {linkingLoading.facebook && (
                <ActivityIndicator size="small" color={themedColors.primary} style={styles.accountLoader} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowAccountSelector(false)}
            >
              <Text style={[styles.cancelButtonText, { color: themedColors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>{canSetPassword() ? 'Set Password' : 'Change Password'}</Text>
              <TouchableOpacity onPress={handleCloseChangePassword}>
                <Ionicons name="close" size={24} color={isDarkMode ? themedColors.white : COLORS.black} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
              {canSetPassword() ? 'Set a password to enable email/password login.' : 'Enter your current and new password below.'}
            </Text>
            {!canSetPassword() && (
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.inputLabel, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>Current Password</Text>
                <View style={[styles.inputRow, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background, borderColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '30' }]}>
                  <TextInput
                    style={[styles.input, { color: isDarkMode ? themedColors.white : COLORS.black }]}
                    value={oldPassword}
                    onChangeText={setOldPassword}
                    placeholder="Current Password"
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
              <Text style={[styles.inputLabel, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>New Password</Text>
              <View style={[styles.inputRow, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background, borderColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '30' }]}>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? themedColors.white : COLORS.black }]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New Password"
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
              <Text style={[styles.inputLabel, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>Confirm New Password</Text>
              <View style={[styles.inputRow, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background, borderColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '30' }]}>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? themedColors.white : COLORS.black }]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm New Password"
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
                <Text style={styles.loginWithText}>{canSetPassword() ? 'Set Password' : 'Change Password'}</Text>
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
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>Edit Profile</Text>
              <TouchableOpacity onPress={handleCloseEditProfile}>
                <Ionicons name="close" size={24} color={isDarkMode ? themedColors.white : COLORS.black} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>
              You can only change your name once every 5 days.
            </Text>
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.inputLabel, { color: isDarkMode ? themedColors.gray : COLORS.gray }]}>Full Name</Text>
              <View style={[styles.inputRow, { backgroundColor: isDarkMode ? themedColors.background : COLORS.background, borderColor: isDarkMode ? themedColors.lightGray : COLORS.secondary + '30' }]}>
                <TextInput
                  style={[styles.input, { color: isDarkMode ? themedColors.white : COLORS.black }]}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Full Name"
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
                <Text style={styles.loginWithText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About the App Modal */}
      <Modal
        visible={showAboutApp}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAboutApp(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? themedColors.secondary : COLORS.white }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? themedColors.white : COLORS.black }]}>About the App</Text>
              <TouchableOpacity onPress={() => setShowAboutApp(false)}>
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
            <Text style={[styles.logoutText, { color: COLORS.white }]}>Logout</Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  // --- Redesigned Styles ---
  profileHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    marginBottom: 24, // Add margin bottom for spacing
  },
  profilePicture: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
  },
  initialsContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  initialsText: {
    fontSize: 28,
    fontWeight: 'bold',
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
    marginBottom: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
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
  // -- Keep existing styles for other components like modals to maintain functionality
  loginWithButton: {
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginBottom: 15,
  },
  loginWithIcon: {
    marginRight: 8,
  },
  loginWithText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    marginBottom: 15,
    minHeight: 50,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteAccountText: {
    fontSize: 14,
  },
  linkedAccountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  linkedAccountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkedAccountText: {
    fontSize: 16,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkedText: {
    marginLeft: 5,
    fontWeight: '500',
  },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 15,
    minWidth: 70,
    alignItems: 'center',
  },
  linkButtonText: {
    fontWeight: '500',
  },
  accountLinkingNote: {
    fontSize: 14,
    marginTop: 10,
    marginBottom: 20,
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
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  accountOptionText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 10,
  },
  accountLoader: {
    marginLeft: 10,
  },
  cancelButton: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scanHistoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 10,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  scanHistoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  scanHistoryCardText: {
    fontSize: 16,
    fontWeight: '600',
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
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  profileDetailsSection: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 18,
    marginBottom: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  profileLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    marginTop: 8,
  },
  profileValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileDivider: {
    height: 1,
    marginVertical: 8,
    borderRadius: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profileIcon: {
    marginRight: 8,
  },
  logoutButtonBottom: {
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 32,
    marginBottom: 32,
    minHeight: 50,
  },
});

export default ProfileScreen;
