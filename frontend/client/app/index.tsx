import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import Login from "./login";
import HomeScreen from './tabs/index';

export default function appIndex(){
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

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
    <HomeScreen/>
  )
} else {
    return (
      <Login/>
    )
  }

}