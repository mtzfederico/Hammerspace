import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { dropDatabase, createTables } from '@/services/database';
import * as SecureStore from 'expo-secure-store';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

//allows user to be able to tab off keyboard:
import { TouchableWithoutFeedback, Keyboard } from 'react-native';



const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

//const apiUrl = "http://216.37.99.155:9090"

//login screen
export default function Login() {
 
  const [userID, setUserID] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      console.log("hello world " + apiUrl)
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, password }),
      });

      const data = await response.json();
      console.log("data: " + JSON.stringify(data))
      if (data.success) {
        console.log("Lmaomsoklf s, do " + data.authToken)
        await SecureStore.setItem('authToken', String(data.authToken));
        await SecureStore.setItem('userID', String(data.userID));
        router.replace('/tabs/homescreen');
      } else {
        setError(data.error || 'Failed to log in');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during login: ' + err);
    }
  };

  
  return (
    //wraps the screen so that the keyboard can be clicked off of:
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}> 
      <ImageBackground source={require('../assets/images/login-background.png')} style={styles.backgroundImage} resizeMode='cover'>

      <View style={styles.container}>
      <Text style={styles.title}>Hammerspace</Text>
      <Text style={styles.subtitle}>Welcome!</Text>
      <Text style={styles.description}>Create a free account or login to get started.</Text>
      <TextInput
        style={styles.input}
        placeholder="username"
        autoCapitalize="none"
        placeholderTextColor="#ccc"
        value={userID}
        onChangeText={setUserID}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        autoCapitalize="none"
        placeholderTextColor="#ccc"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>By continuing you accept our Terms & Conditions and Privacy Policy</Text>

      <TouchableOpacity onPress={() => router.push('/register')}>
        <Text style={styles.registerLink}>Don't have an account? Register</Text>
      </TouchableOpacity>
    </View>
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    
    padding: 20,
  },
  title: {
    color: 'rgba(204, 204, 204, 1)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.250980406999588)',
    textShadowRadius: 4,
    textShadowOffset: {"width":0,"height":4},
    fontFamily: 'Kavoon',
    fontSize: 36,
    fontStyle: 'normal',
    fontWeight: '400',
    letterSpacing: -0.36,
  },
  subtitle: {
    fontSize: 20,
    color: '#fff',
  },
  description: {
    color: '#fff',
    marginVertical: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 400,
    height: 50,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  loginButton: {
    width: '100%',
    maxWidth: 400,
    height: 50,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  orText: {
    color: '#fff',
    marginVertical: 10,
  },
  socialButton: {
    width: '100%',
    maxWidth: 400,
    height: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },
  socialButtonText: {
    color: '#000',
    fontSize: 18,
  },
  footerText: {
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
  },
  registerLink: {
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
