import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

export default function Login() {
  const [email, setEmail] = useState('');
  const [userID, setUserID] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();  // Initialize the router for navigation
  const minLength = 8
  const maxLength = 30

  const handleRegister = async () => {
    setLoading(true);
    setError('');  // Clear any previous errors

    // Validate the inputs
    if (!email || !userID || !password) {
      setError('All fields are required.');
      setLoading(false);
      return;
    }

    if (password.length < minLength || password.length > maxLength) {
      setError('Password must be between 8 and 30 characters.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          userID,
          password,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        // Registration successful, store the token securely
        await SecureStore.setItem('authToken', String(data.authToken));
        await SecureStore.setItem('userID', String(data.userID));
        // Navigate to the home screen or tab navigator
        router.push('/tabs');
      } else {
        // Handle error based on the server response
        setError(data.error || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during registration');
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hammerspace</Text>
      <Text style={styles.subtitle}>Welcome!</Text>
      <Text style={styles.description}>Create a free account or login to get started.</Text>
      <TextInput
          style={styles.input}
          placeholder="Email"
           placeholderTextColor="#ccc"
          value={email}
          onChangeText={setEmail}
        />

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
      <TouchableOpacity style={styles.loginButton} onPress={handleRegister}>
        <Text style={styles.loginButtonText}>Register</Text>
      </TouchableOpacity>

      <Text style={styles.footerText}>By continuing you accept our Terms & Conditions and Privacy Policy</Text>

      <TouchableOpacity onPress={() => router.push('/')}>
        <Text style={styles.loginLink}>Already have an account? Login</Text>
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
    color: '#E5E5E5',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
  },
  loginLink: {
    color: '#fff',
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
