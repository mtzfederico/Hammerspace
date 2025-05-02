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
  if (isLoggedIn === null) {
    return null; // Wait for login check
  }

  if(isLoggedIn === true){
    return (
    router.replace('/tabs/homescreen') // Redirect to the home screen
  )
} else {
    return (
      router.replace('/login') // Redirect to the login screen
    )
  }
    
 /* return (
    <Login/>
  ) */
}