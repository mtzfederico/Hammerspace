import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';


// Prevent the splash screen from auto-hiding before asset loading is complete
SplashScreen.preventAutoHideAsync();

// Root Layout gets loaded first
// It allows us to define the routes of the app
export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    Kavoon: require('../assets/fonts/Kavoon-Regular.ttf'),
  });
  const router = useRouter();

  // Ensure splash screen is hidden once fonts and assets are loaded
  useEffect(() => {
    if (loaded !== null) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);


  if (!loaded  === null) {
    // Wait for fonts and login check before rendering anything
    return null;
  }
 

  

  // Show home or tab screen if logged in
  


  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style="auto" />
      <Stack >

          <Stack.Screen
            name="index" // This will auto-reference `app/login.tsx`
            options={{ headerShown: false }}
          />
            {/* Show the home or tab screen if the user is logged in */}
            <Stack.Screen
            name="tabs" // This will auto-reference `app/tabs.tsx`
            options={{ headerShown: false }}
          />
         <Stack.Screen
            name="login" // This will auto-reference `app/login.tsx`
            options={{ headerShown: false }}
          />
        <Stack.Screen
            name="register" // This will auto-reference `app/tabs.tsx`
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="profile/[userID]" // This will auto-reference `app/tabs.tsx`
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="friends" // This will auto-reference `app/tabs.tsx`
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="PDFView"
            options={{ headerShown: false }}
          />
      </Stack>
    </ThemeProvider>
  );
}
