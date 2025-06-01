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
  Modal
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

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { setIsAuthenticated } = useContext(AuthContext);
  const { logout, user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [linkingLoading, setLinkingLoading] = useState({
    google: false,
    facebook: false
  });
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  
  // Fetch user data when component mounts
  useEffect(() => {
    const checkUserData = async () => {
      // If user data is not in store, try to get from secure storage
      if (!user) {
        const userData = await secureStorage.getItem('@kappi_auth_user');
        if (userData) {
          useAuthStore.getState().setUser(userData);
        }
      }
    };
    
    checkUserData();
  }, [user]);

  // Check if user has linked providers
  const hasProvider = (provider: string) => {
    return user?.providers?.includes(provider) ?? false;
  };

  // Right component for the header (settings icon)
  const headerRight = (
    <TouchableOpacity style={styles.headerIcon}>
      <Ionicons name="settings-outline" size={24} color={COLORS.white} />
    </TouchableOpacity>
  );

  const handleEditProfile = () => {
    // Implement edit profile logic
    console.log('Edit profile');
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
            try {
              setLoading(true);
              await logout();
              // Navigation will be handled automatically by AppNavigator
            } catch (error) {
              Alert.alert("Error", "Failed to logout. Please try again.");
            } finally {
              setLoading(false);
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

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      
      <Header
        title="Profile"
        rightComponent={headerRight}
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Information Section */}
        <View style={styles.profileHeader}>
          <View style={styles.userInfoContainer}>
            <View style={styles.nameEmailContainer}>
              <Text style={styles.userName}>{user.fullName}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <Ionicons name="pencil-outline" size={16} color={COLORS.white} />
              <Text style={styles.editProfileText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          {user.location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={18} color={COLORS.primary} />
              <Text style={styles.userLocation}>
                {user.location.address?.barangay && `${user.location.address.barangay}, `}
                {user.location.address?.cityMunicipality && `${user.location.address.cityMunicipality}, `}
                {user.location.address?.province || 'Location not set'}
              </Text>
            </View>
          )}
        </View>

        {/* Farm Activity Summary */}
        <View style={styles.activityContainer}>
          <Text style={styles.sectionTitle}>Farm Activity</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <View style={styles.statIconContainer}>
                <Ionicons name="scan-outline" size={24} color={COLORS.primary} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Scans This Month</Text>
              </View>
            </View>
            <View style={styles.statRow}>
              <View style={styles.statIconContainer}>
                <Ionicons name="leaf-outline" size={24} color="#F44336" />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statValue}>Coffee Leaf Rust</Text>
                <Text style={styles.statLabel}>Most Common Disease</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Connected Accounts */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Connected Accounts</Text>
          <View style={styles.menuContainer}>
            <View style={styles.linkedAccountItem}>
              <View style={styles.linkedAccountInfo}>
                <View style={[styles.accountIconContainer, { backgroundColor: '#4285F4' }]}>
                  <Ionicons name="logo-google" size={18} color={COLORS.white} />
                </View>
                <Text style={styles.linkedAccountText}>Google Account</Text>
              </View>
              
              {hasProvider('google') ? (
                <View style={styles.linkedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.linkedText}>Linked</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={handleLinkGoogle}
                  disabled={linkingLoading.google}
                >
                  {linkingLoading.google ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.linkButtonText}>Link</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
            
            <View style={styles.linkedAccountItem}>
              <View style={styles.linkedAccountInfo}>
                <View style={[styles.accountIconContainer, { backgroundColor: '#3b5998' }]}>
                  <Ionicons name="logo-facebook" size={18} color={COLORS.white} />
                </View>
                <Text style={styles.linkedAccountText}>Facebook Account</Text>
              </View>
              
              {hasProvider('facebook') ? (
                <View style={styles.linkedBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                  <Text style={styles.linkedText}>Linked</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.linkButton}
                  onPress={handleLinkFacebook}
                  disabled={linkingLoading.facebook}
                >
                  {linkingLoading.facebook ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                  ) : (
                    <Text style={styles.linkButtonText}>Link</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          <Text style={styles.accountLinkingNote}>
            Note: Accounts are automatically linked when you log in with Google or Facebook using the same email address.
          </Text>
        </View>

        {/* Account Management */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <Ionicons name="key-outline" size={20} color={COLORS.primary} style={styles.menuIcon} />
                <Text style={styles.menuText}>Change Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <Ionicons name="document-text-outline" size={20} color={COLORS.primary} style={styles.menuIcon} />
                <Text style={styles.menuText}>Terms & Conditions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemContent}>
                <Ionicons name="shield-checkmark-outline" size={20} color={COLORS.primary} style={styles.menuIcon} />
                <Text style={styles.menuText}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.loginWithButton} 
            onPress={() => setShowAccountSelector(true)}
          >
            <Ionicons name="people-outline" size={20} color={COLORS.white} style={styles.loginWithIcon} />
            <Text style={styles.loginWithText}>Login with Different Account</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color="white" style={styles.logoutIcon} />
                <Text style={styles.logoutText}>Logout</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Account</Text>
              <TouchableOpacity onPress={() => setShowAccountSelector(false)}>
                <Ionicons name="close" size={24} color={COLORS.black} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Select an account to sign in with</Text>
            
            <TouchableOpacity 
              style={styles.accountOption}
              onPress={handleGoogleLogin}
              disabled={linkingLoading.google}
            >
              <View style={[styles.accountIconContainer, { backgroundColor: '#4285F4' }]}>
                <Ionicons name="logo-google" size={18} color={COLORS.white} />
              </View>
              <Text style={styles.accountOptionText}>Google</Text>
              {linkingLoading.google && (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.accountLoader} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.accountOption}
              onPress={handleFacebookLogin}
              disabled={linkingLoading.facebook}
            >
              <View style={[styles.accountIconContainer, { backgroundColor: '#3b5998' }]}>
                <Ionicons name="logo-facebook" size={18} color={COLORS.white} />
              </View>
              <Text style={styles.accountOptionText}>Facebook</Text>
              {linkingLoading.facebook && (
                <ActivityIndicator size="small" color={COLORS.primary} style={styles.accountLoader} />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowAccountSelector(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
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
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.gray,
  },
  headerIcon: {
    padding: 5,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  profileHeader: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  nameEmailContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.gray,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userLocation: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: 8,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editProfileText: {
    color: COLORS.white,
    marginLeft: 6,
    fontWeight: '500',
  },
  activityContainer: {
    padding: 20,
  },
  statsContainer: {
    marginTop: 15,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.gray,
  },
  sectionContainer: {
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 15,
  },
  menuContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
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
    borderBottomColor: COLORS.secondary + '20',
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
    color: COLORS.black,
  },
  loginWithButton: {
    backgroundColor: COLORS.primary,
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
    color: COLORS.white,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#F43F5E',
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
    color: COLORS.white,
    fontWeight: '600',
  },
  deleteAccountButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  deleteAccountText: {
    fontSize: 14,
    color: '#F43F5E',
  },
  linkedAccountItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.secondary + '20',
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
    color: COLORS.black,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkedText: {
    marginLeft: 5,
    color: COLORS.success,
    fontWeight: '500',
  },
  linkButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 15,
    minWidth: 70,
    alignItems: 'center',
  },
  linkButtonText: {
    color: COLORS.white,
    fontWeight: '500',
  },
  accountLinkingNote: {
    fontSize: 14,
    color: COLORS.gray,
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
    backgroundColor: COLORS.white,
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
    color: COLORS.black,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 20,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  accountOptionText: {
    fontSize: 16,
    color: COLORS.black,
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
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default ProfileScreen; 