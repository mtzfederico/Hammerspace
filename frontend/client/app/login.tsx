import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, Image, StyleSheet, ImageBackground, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { dropDatabase, createTables, deleteEverythingLocally } from '@/services/database';
import * as SecureStore from 'expo-secure-store';
import { Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { TouchableWithoutFeedback, Keyboard } from 'react-native';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

// login screen
export default function Login() {
  
  const [loading, setLoading] = useState(false);
  const [userID, setUserID] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    if (userID === "" || password === "") {
      setError("Username and password can't be empty");
      setLoading(false);
      return;
    }

    const passLen = password.length;
    // got numbers from register screen
    if (passLen < 8 || passLen > 30) {
      setError('Password must be between 8 and 30 characters');
      setLoading(false);
      return;
    }

    try {
      console.log("apiUrl: " + apiUrl)
      const response = await fetch(`${apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, password }),
      });

      const data = await response.json();
      console.log("data: " + JSON.stringify(data))
      if (data.success) {
        const authToken = String(data.authToken);
        const userID = String(data.userID);

        if (authToken === null || userID === null) {
          console.error("got null for authToken or userID in the response. " + response.status);
          setError("got null for authToken or userID in the response (" + response.status + ")");
          return;
        }

        console.log("Lmaomsoklf s, do " + data.authToken)
        console.log("\n  [PickDocument] authToken is here " + data.authToken + "\n")
        await SecureStore.setItemAsync('authToken', String(data.authToken));
        await SecureStore.setItemAsync('userID', String(data.userID));
        router.replace('/tabs/homescreen');
      } else {
        setError(data.error || `log in request failed. Status: ${response.status}`);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during login: ' + err);
    }
    setLoading(false);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ImageBackground source={require('../assets/images/login-background.png')} style={styles.backgroundImage} resizeMode='cover'>
          <View style={styles.container}>
            <Text style={styles.title}>Hammerspace</Text>
            <Text style={styles.subtitle}>Welcome!</Text>
            <Text style={styles.description}>Create a free account or login to get started.</Text>
            {loading && <ActivityIndicator size="large" style={{margin: 20}} color="white" />}
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
            <Pressable style={styles.loginButton} onPress={handleLogin} disabled={loading}>
              <Text style={styles.loginButtonText}>Login</Text>
            </Pressable>
            <Text style={styles.footerText}>By continuing you accept our Terms & Conditions and Privacy Policy</Text>
            <Pressable onPress={() => router.push('/register')}>
              <Text style={styles.registerLink}>Don't have an account? Register</Text>
            </Pressable>
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
    top:5,
  },
  description: {
    color: '#fff',
    marginVertical: 20,
    textAlign: 'center',
  },
  activityIndicator: {
    margin: 20,
    color: "#0000ff",
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
