import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, TouchableOpacity } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';

const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    const userID = await SecureStore.getItemAsync('userID');
    const authToken = await SecureStore.getItemAsync('authToken');

    try {
      const response = await fetch(`${apiUrl}/changePassword`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userID,
          authToken,
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      Alert.alert('Success', 'Password changed successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Unknown error occurred');
    }
  };

  return (
    <LinearGradient colors={ colorScheme === 'dark'? ['#030303', '#767676'] : ['#FFFFFF', '#92A0C3']} style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: isDarkMode ? '#444' : '#C1C8D9' },]}>
        <Text style={[styles.backText, { color: isDarkMode ? '#fff' : '#fff' }]}>{'< Back'}</Text>
      </TouchableOpacity>
      <Text style={[styles.title, {color: colorScheme == 'dark' ? 'white' : '#2a2d38'},]}>Change Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Current Password"
        placeholderTextColor="#888"
        secureTextEntry
        onChangeText={setCurrentPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="New Password"
        placeholderTextColor="#888"
        secureTextEntry
        onChangeText={setNewPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm New Password"
        placeholderTextColor="#888"
        secureTextEntry
        onChangeText={setConfirmPassword}
      />
      <TouchableOpacity style={[styles.button,{backgroundColor: colorScheme === 'dark' ? '#2f416b' : '#4c8ef7'}]} onPress={handleChangePassword}>
        <Text style={styles.buttonText}>Update Password</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        paddingTop: 200,
        flex: 1,
      },
      title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 30,
        alignSelf: 'center',
        color: 'black',
      },
      input: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 30,
      },
      button: {
        backgroundColor: '#4c8ef7',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5, // Android shadow
      },
      backButton: {
        position: 'absolute',
        top: 70,
        left: 20,
        padding: 8,
        backgroundColor: '#ccc',
        borderRadius: 5,
      },
      backText: {
        fontSize: 16,
      },
      buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
      },
      
});
