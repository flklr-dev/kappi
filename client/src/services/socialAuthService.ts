import { firebase, auth } from '../config/firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken, Profile, GraphRequest, GraphRequestManager } from 'react-native-fbsdk-next';
import { authService } from './api';
import { Platform, Alert } from 'react-native';

// Define interface for Google user info
interface GoogleUserInfo {
  email?: string;
  name?: string;
  photo?: string | null;
}

// Configure Google Sign-In with the correct settings
GoogleSignin.configure({
  webClientId: '648552085310-plufhtimu2j3i9l6q6fnu70d2rtspgtc.apps.googleusercontent.com', // Use the web client ID from google-services.json
  scopes: ['profile', 'email'],
  offlineAccess: false, // if you want to access Google API on behalf of the user FROM YOUR SERVER
  forceCodeForRefreshToken: true, // Force code-based auth instead of token-based
  accountName: '', // Setting to empty to force account picker every time
});

// Check if Google Play Services are available
GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
  .then(() => console.log('Google Play Services available'))
  .catch((error: unknown) => console.error('Google Play Services error:', error));

export const socialAuthService = {
  // Google Sign-In
  async signInWithGoogle(isRegistration = false) {
    console.log('Starting Google Sign-In');
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        console.log('Web not supported');
        throw new Error('Web platform not supported');
      } else {
        // Mobile implementation using Google Sign-In
        try {
          // Check if your device supports Google Play
          console.log('Checking Google Play Services');
          await GoogleSignin.hasPlayServices();
          
          // Sign out first to force account picker
          await GoogleSignin.signOut();
          console.log('Signed out from previous Google session');
          
          // Sign in
          console.log('Starting Google Sign-In flow');
          const userInfo = await GoogleSignin.signIn();
          
          // Log the entire userInfo object to debug
          console.log('Google Sign-In response:', JSON.stringify(userInfo));
          
          // Based on the log output, the structure is:
          // { type: 'success', data: { user: { email, name, photo, etc. } } }
          if (userInfo && 'data' in userInfo && userInfo.data) {
            if ('user' in userInfo.data && userInfo.data.user) {
              const googleUser = userInfo.data.user;
              const email = googleUser.email || '';
              const name = googleUser.name || '';
              const photo = googleUser.photo || '';
              console.log('Successfully extracted user info:', { email, name });
              
              if (!email) {
                throw new Error('Failed to get email from Google Sign-In');
              }
              
              console.log('Google Sign-In successful:', email);
              
              // Get tokens
              const { idToken } = await GoogleSignin.getTokens();
              console.log('Got ID token');
              
              if (!idToken) {
                throw new Error('No ID token received');
              }
              
              // Create credential
              console.log('Creating Firebase credential');
              const googleCredential = auth.GoogleAuthProvider.credential(idToken);
              
              // Sign in to Firebase
              console.log('Signing in to Firebase');
              const userCredential = await auth().signInWithCredential(googleCredential);
              console.log('Firebase sign-in successful');
              
              // Extract user data
              const firebaseUser = userCredential.user;
              const userData = {
                fullName: firebaseUser.displayName || name || '',
                email: firebaseUser.email || email || '',
                photoURL: firebaseUser.photoURL || photo || '',
                providerId: 'google.com',
              };
              
              // Send to backend
              console.log('Sending to backend API');
              const response = await authService.socialLogin({
                email: userData.email,
                fullName: userData.fullName,
                provider: 'google',
                providerId: firebaseUser.uid,
                isRegistration
              });
              
              return response;
            }
          }
          
          throw new Error('Failed to get user info from Google Sign-In');
        } catch (error) {
          console.log('Google sign-in error:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  },

  // Facebook Sign-In with improved error handling and user data fetching
  async signInWithFacebook(isRegistration = false) {
    try {
      if (Platform.OS === 'web') {
        throw new Error('Facebook login on web is not supported in this implementation');
      }

      console.log('Starting Facebook login flow...');
      
      // First, logout any existing session to ensure clean state
      await LoginManager.logOut();
      
      // Request permissions
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      
      if (result.isCancelled) {
        console.log('Facebook login cancelled by user');
        throw new Error('User cancelled the login process');
      }
      
      if (result.declinedPermissions && result.declinedPermissions.includes('email')) {
        throw new Error('Email permission is required for registration');
      }

      // Get access token
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('Failed to obtain Facebook access token');
      }

      console.log('Facebook access token obtained successfully');

      // Get user profile using Facebook SDK
      const profile = await Profile.getCurrentProfile();
      if (!profile) {
        throw new Error('Failed to get Facebook user profile');
      }

      // Get detailed user info including email using Graph API
      const userInfo = await this.getFacebookUserInfo(data.accessToken);
      
      if (!userInfo.email) {
        throw new Error('Email is required but not provided by Facebook account');
      }

      console.log('Facebook user info retrieved:', { 
        email: userInfo.email, 
        name: userInfo.name,
        id: userInfo.id 
      });

      // Create Firebase credential
      const facebookCredential = auth.FacebookAuthProvider.credential(data.accessToken);
      
      // Sign in with Firebase
      console.log('Signing in with Firebase...');
      const userCredential = await auth().signInWithCredential(facebookCredential);
      const firebaseUser = userCredential.user;
      
      console.log('Firebase authentication successful');

      // Prepare user data
      const userData = {
        fullName: userInfo.name || profile.name || '',
        email: userInfo.email,
        photoURL: userInfo.picture?.data?.url || profile.imageURL || '',
        providerId: firebaseUser.uid,
      };

      // Send to backend
      console.log('Sending authentication data to backend...');
      const response = await authService.socialLogin({
        email: userData.email,
        fullName: userData.fullName,
        provider: 'facebook',
        providerId: userData.providerId,
        isRegistration
      });
      
      console.log('Backend authentication successful');
      return response;
      
    } catch (error: any) {
      console.error('Facebook Sign-In Error:', error);
      
      // Handle specific error cases
      if (error.message?.includes('cancelled')) {
        throw new Error('cancelled');
      }
      
      if (error.message?.includes('network')) {
        throw new Error('Network error. Please check your internet connection and try again.');
      }
      
      if (error.message?.includes('Email permission')) {
        throw new Error('Email permission is required to complete registration. Please try again and allow email access.');
      }
      
      if (error.response?.status === 400) {
        throw new Error(error.response.data?.message || 'Registration failed. Please try again.');
      }
      
      throw new Error(error.message || 'Facebook login failed. Please try again.');
    }
  },

  // Helper method to get Facebook user info via Graph API
  async getFacebookUserInfo(accessToken: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = new GraphRequest(
        '/me',
        {
          accessToken,
          parameters: {
            fields: {
              string: 'id,name,email,picture.type(large)'
            }
          }
        },
        (error, result) => {
          if (error) {
            console.error('Facebook Graph API error:', error);
            reject(new Error('Failed to fetch user information from Facebook'));
          } else {
            resolve(result);
          }
        }
      );
      
      new GraphRequestManager().addRequest(request).start();
    });
  },

  // Link Google account to existing user
  async linkGoogleAccount(token: string) {
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        console.log('Web not supported');
        throw new Error('Web platform not supported');
      } else {
        // Mobile implementation using Google Sign-In
        // Check if your device supports Google Play
        console.log('Checking Google Play Services');
        await GoogleSignin.hasPlayServices();
        
        // Sign out first to force account picker
        await GoogleSignin.signOut();
        console.log('Signed out from previous Google session');
        
        // Sign in
        console.log('Starting Google Sign-In flow');
        const userInfo = await GoogleSignin.signIn();
        
        // Log the entire userInfo object to debug
        console.log('Google Sign-In response:', JSON.stringify(userInfo));
        
        // Extract data from the response based on actual structure
        let email = '';
        
        // Based on the log output, the structure is:
        // { type: 'success', data: { user: { email, name, photo, etc. } } }
        if (userInfo && 'data' in userInfo && userInfo.data) {
          if ('user' in userInfo.data && userInfo.data.user) {
            email = userInfo.data.user.email || '';
          }
        }
        
        if (!email) {
          throw new Error('Failed to get email from Google Sign-In');
        }
        
        // Get tokens
        const { idToken } = await GoogleSignin.getTokens();
        console.log('Got ID token');
        
        if (!idToken) {
          throw new Error('No ID token received');
        }
        
        // Create credential
        console.log('Creating Firebase credential');
        const googleCredential = auth.GoogleAuthProvider.credential(idToken);
        
        // Link with credential
        console.log('Linking with credential');
        const result = await auth().currentUser?.linkWithCredential(googleCredential);
        
        if (!result) {
          throw new Error('Failed to link Google account');
        }
        
        console.log('Account linked successfully');
        
        // Update in backend
        const response = await authService.linkSocialAccount({
          provider: 'google',
          providerId: result.user.uid,
          token
        });
        
        return response;
      }
    } catch (error) {
      console.error('Link Google Account Error:', error);
      throw error;
    }
  },

  // Link Facebook account to existing user with improved implementation
  async linkFacebookAccount(token: string) {
    try {
      if (Platform.OS === 'web') {
        throw new Error('Facebook account linking on web is not supported in this implementation');
      }

      console.log('Starting Facebook account linking...');
      
      // Logout any existing session
      await LoginManager.logOut();
      
      // Request permissions
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

      if (result.isCancelled) {
        console.log('Facebook account linking cancelled by user');
        throw new Error('cancelled');
      }

      // Get access token
      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('Failed to obtain Facebook access token');
      }

      // Get user profile
      const profile = await Profile.getCurrentProfile();
      if (!profile) {
        throw new Error('Failed to get Facebook user profile');
      }

      // Get detailed user info
      const userInfo = await this.getFacebookUserInfo(data.accessToken);
      
      if (!userInfo.email) {
        throw new Error('Email is required for account linking');
      }

      // Create Firebase credential
      const facebookCredential = auth.FacebookAuthProvider.credential(data.accessToken);
      
      // Get current Firebase user
      const currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found for linking');
      }

      // Check if this provider is already linked
      const isAlreadyLinked = currentUser.providerData.some(
        provider => provider.providerId === 'facebook.com'
      );
      
      if (isAlreadyLinked) {
        throw new Error('Facebook account is already linked to this profile');
      }

      // Link with credential
      console.log('Linking Facebook account with Firebase...');
      const linkResult = await currentUser.linkWithCredential(facebookCredential);
      
      if (!linkResult) {
        throw new Error('Failed to link Facebook account with Firebase');
      }

      console.log('Facebook account linked with Firebase successfully');

      // Update in backend
      console.log('Updating backend with linked account...');
      const apiResponse = await authService.linkSocialAccount({
        provider: 'facebook',
        providerId: linkResult.user.uid,
        token
      });
      
      console.log('Backend update successful');
      return apiResponse;
      
    } catch (error: any) {
      console.error('Link Facebook Account Error:', error);
      
      if (error.message?.includes('cancelled')) {
        throw new Error('cancelled');
      }
      
      if (error.message?.includes('already linked')) {
        throw new Error('already linked');
      }
      
      if (error.code === 'auth/provider-already-linked') {
        throw new Error('This Facebook account is already linked to another account');
      }
      
      if (error.code === 'auth/credential-already-in-use') {
        throw new Error('This Facebook account is already associated with another user');
      }
      
      throw new Error(error.message || 'Failed to link Facebook account');
    }
  }
}; 