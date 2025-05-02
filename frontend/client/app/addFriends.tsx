import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';

export default function AddFriends() {
  const [forUserID, setForUserID] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const sendFriendRequest = async () => {
    if (!forUserID.trim()) {
      Alert.alert('Error', 'Please enter a valid user ID');
      return;
    }

    try {
      setIsLoading(true);
      const authToken = await SecureStore.getItemAsync('authToken');
      const userID = await SecureStore.getItemAsync('userID');

      if (!authToken || !userID) {
        Alert.alert('Error', 'User not logged in');
        return;
      }

      const response = await fetch(`${apiUrl}/addFriends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userID,
          authToken,
          forUserID,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Friend request sent!');
        setForUserID('');
        router.back();
      } else {
        Alert.alert('Failed to send request', data.error || `Unknown Error: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={isDark ? ['#030303', '#767676'] : ['#FFFFFF', '#92A0C3']} // Linear gradient based on light or dark mode
      style={styles.container}
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={[
          styles.backButton,
          { backgroundColor: isDark ? '#333' : '#C1C8D9' },
        ]}
      >
        <Text style={[styles.backText, { color: isDark ? '#fff' : 'black' }]}>
          {'< Back'}
        </Text>
      </TouchableOpacity>
      <Text style={[styles.header, { color: isDark ? '#fff' : '#000' }]}>
        Add a Friend
      </Text>
      <TextInput
        placeholder="Enter User ID"
        placeholderTextColor={isDark ? '#aaa' : '#666'}
        value={forUserID}
        onChangeText={setForUserID}
        autoCapitalize="none"
        style={[
          styles.input,
          {
            backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9',
            color: isDark ? '#fff' : '#000',
            borderColor: isDark ? '#555' : '#ccc',
          },
        ]}
      />


<TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isDark ? '#bdb7b7' : '#007bff', 
          },
        ]}
        onPress={sendFriendRequest}
        disabled={isLoading}
      >
        <Text
          style={[
            styles.buttonText,
            {
              color: isDark ? '#fff' : '#fff', 
            },
          ]}
        >
          {isLoading ? 'Sending...' : 'Send Friend Request'}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    fontSize: 24,
    marginBottom: 10,
    alignSelf: 'center',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
});



