import { Platform } from 'react-native';

type ErrorUtilsType = {
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

if (Platform.OS !== 'web') {
  const ErrorUtils = (global as any).ErrorUtils as ErrorUtilsType;
  
  if (ErrorUtils) {
    const originalHandler = ErrorUtils.getGlobalHandler();
    
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      console.error('Global error caught:', error, 'isFatal:', isFatal);
      
      if (originalHandler) {
        originalHandler(error, isFatal);
      }
    });
  }
} else {
  window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
}



export {};
