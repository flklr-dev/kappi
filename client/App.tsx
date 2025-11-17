import React from 'react';
import { ThemeProvider } from './src/context/ThemeContext';
import { LanguageProvider } from './src/context/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';

// Initialize network status monitoring
const NetworkStatusInitializer = () => {
  useNetworkStatus();
  return null;
};

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <NetworkStatusInitializer />
        <AppNavigator />
      </ThemeProvider>
    </LanguageProvider>
  );
}