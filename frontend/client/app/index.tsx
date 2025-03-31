import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Stack } from 'expo-router';
import { API_URL } from '@env';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

//const apiUrl = "http://216.37.99.155:9090"

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
      if (response.ok) {
        console.log("Lmaomsoklf s, do " + data.authToken)
        await SecureStore.setItem('authToken', String(data.authToken));
        await SecureStore.setItem('userID', String(data.userID));
        router.push('/tabs');
      } else {
        setError(data.error || 'Failed to log in');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during login');
    }
  };

  return (
    
    <View style={styles.container}>
      <Text style={styles.title}>Hammerspace</Text>
      <Text style={styles.subtitle}>Welcome!</Text>
      <Text style={styles.description}>Create a free account or login to get started.</Text>
      <TextInput
        style={styles.input}
        placeholder="username"
        placeholderTextColor="#ccc"
        value={userID}
        onChangeText={setUserID}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#b2b2ed',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
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
