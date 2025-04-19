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
  import React, { useState } from 'react';
  import { useRouter } from 'expo-router';
  import * as SecureStore from 'expo-secure-store';
  
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
          router.push('/friends');
        } else {
          Alert.alert('Error', data.error || 'Failed to send friend request');
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? '#000' : '#fff' },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: isDark ? '#fff' : '#000' }]}>
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
          style={[
            styles.input,
            {
              backgroundColor: isDark ? '#1a1a1a' : '#f9f9f9',
              color: isDark ? '#fff' : '#000',
              borderColor: isDark ? '#555' : '#ccc',
            },
          ]}
        />
  
        <Button
          title={isLoading ? 'Sending...' : 'Send Friend Request'}
          onPress={sendFriendRequest}
          disabled={isLoading}
          color={isDark ? '#1e90ff' : undefined}
        />
      </View>
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
    backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      padding: 8,
      backgroundColor: '#ccc',
      borderRadius: 5,
    },
    backText: {
      fontSize: 16,
    },
  });
  