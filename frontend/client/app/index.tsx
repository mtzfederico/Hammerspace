import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import Login from "./login";
import HomeScreen from './tabs/homescreen';
import { router, useRouter } from 'expo-router';


// This is the entry point of the app
// It checks if the user is logged in and shows the appropriate screen
// If the user is logged in, it shows the home screen, If the user is not logged in, it shows the login screen

export default function appIndex(){
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkLoginStatus = async () => {
      const authToken = await SecureStore.getItem('authToken');
      console.log('authToken:', authToken);
      setIsLoggedIn(!!authToken);
    };

    checkLoginStatus();
  }, []);

  // Show home or tab screen if logged in
 

  
  useEffect(() => {
    if (isLoggedIn === null) return; // Don't redirect until status is known

    if (isLoggedIn) {
      router.replace('/tabs/homescreen');
    } else {
      router.replace('/login');
    }
  }, [isLoggedIn]);

  // Optional: return a loading spinner here
  return null;
}