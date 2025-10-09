import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { initializeQueue } from './src/services/OfflineQueueManager';

export default function App() {
  // Initialize offline queue and network monitoring
  useEffect(() => {
    initializeQueue();
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppWithNetworkMonitoring />
      </ThemeProvider>
    </AuthProvider>
  );
}

// Component that uses the network hook
function AppWithNetworkMonitoring() {
  useNetworkStatus(); // This hook handles network status monitoring

  return (
    <>
      <AppNavigator />
    </>
  );
}