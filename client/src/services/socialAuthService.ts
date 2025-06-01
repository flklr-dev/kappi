import { firebase, auth } from '../config/firebase';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { authService } from './api';
import { Platform } from 'react-native';

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

  // Facebook Sign-In
  async signInWithFacebook(isRegistration = false) {
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        console.log('Web not supported');
        throw new Error('Web platform not supported');
      } else {
        // Mobile implementation using Facebook SDK
        // Attempt login with permissions
        console.log('Starting Facebook login');
        const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

        if (result.isCancelled) {
          throw new Error('User cancelled the login process');
        }

        // Once signed in, get the user's AccessToken
        console.log('Getting access token');
        const data = await AccessToken.getCurrentAccessToken();
        
        if (!data) {
          throw new Error('Something went wrong obtaining access token');
        }
        
        // Create a Facebook credential with the token
        console.log('Creating Facebook credential');
        const facebookCredential = auth.FacebookAuthProvider.credential(data.accessToken);
        
        // Sign-in with credential
        console.log('Signing in with credential');
        const userCredential = await auth().signInWithCredential(facebookCredential);
        const user = userCredential.user;
        
        console.log('User signed in:', user.email);
        
        // Get additional user info from Facebook Graph API
        const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${data.accessToken}`);
        const userInfo = await response.json();
        
        // Extract user info
        const userData = {
          fullName: user.displayName || userInfo.name || '',
          email: user.email || userInfo.email || '',
          photoURL: user.photoURL || userInfo.picture?.data?.url || '',
          providerId: 'facebook.com',
        };

        // Check if the user exists in your backend
        console.log('Sending to backend API');
        const apiResponse = await authService.socialLogin({
          email: userData.email,
          fullName: userData.fullName,
          provider: 'facebook',
          providerId: user.uid,
          isRegistration
        });
        
        return apiResponse;
      }
    } catch (error) {
      console.error('Facebook Sign-In Error:', error);
      throw error;
    }
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

  // Link Facebook account to existing user
  async linkFacebookAccount(token: string) {
    try {
      if (Platform.OS === 'web') {
        // Web implementation
        console.log('Web not supported');
        throw new Error('Web platform not supported');
      } else {
        // Mobile implementation using Facebook SDK
        // Attempt login with permissions
        const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

        if (result.isCancelled) {
          throw new Error('User cancelled the login process');
        }

        // Once signed in, get the user's AccessToken
        const data = await AccessToken.getCurrentAccessToken();
        
        if (!data) {
          throw new Error('Something went wrong obtaining access token');
        }
        
        // Create a Facebook credential with the token
        const facebookCredential = auth.FacebookAuthProvider.credential(data.accessToken);
        
        // Link with credential
        const linkResult = await auth().currentUser?.linkWithCredential(facebookCredential);
        
        if (!linkResult) {
          throw new Error('Failed to link Facebook account');
        }
        
        // Update in backend
        const apiResponse = await authService.linkSocialAccount({
          provider: 'facebook',
          providerId: linkResult.user.uid,
          token
        });
        
        return apiResponse;
      }
    } catch (error) {
      console.error('Link Facebook Account Error:', error);
      throw error;
    }
  }
}; 