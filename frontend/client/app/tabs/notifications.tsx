import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type FriendRequest = string; // Just the sender's userID


export default function NotificationsScreen() {
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const userID = await SecureStore.getItemAsync('userID');
      const authToken = await SecureStore.getItemAsync('authToken');
  
      const response = await fetch(`${apiUrl}/getPendingFriendRequests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, authToken }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to load requests');
        return;
      }
  
      const data = await response.json();
      console.log('Friend requests data:', data); // Log for debugging
      if (data.success) {
        setFriendRequests(data.pendingRequests); // Use 'pendingRequests' key
      } else {
        Alert.alert('Error', data.error || 'Failed to load requests');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not fetch friend requests');
    } finally {
      setLoading(false);
    }
  };
  

  const acceptRequest = async (fromUserID: string) => {
    try {
      const userID = await SecureStore.getItemAsync('userID');
      const authToken = await SecureStore.getItemAsync('authToken');

      console.log('Accepting request from:', fromUserID); // Log for debugging
      console.log('User ID:', userID); // Log for debugging
    
     

      const response = await fetch(`${apiUrl}/acceptFriendRequest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userID: userID,
          authToken: authToken,
          forUserID: fromUserID,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Could not accept request');
        return;
      }

      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Friend request accepted');
        fetchRequests(); // Refresh list
      } else {
        Alert.alert('Error', data.error || 'Could not accept request');
      }
    } catch (err) {
      Alert.alert('Error', `${err || 'unknown error'}`);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Friend Requests</Text>
      {friendRequests && friendRequests.length === 0 ? (
    <Text style={styles.noRequests}>No pending friend requests</Text>
) : (
    <FlatList
    data={friendRequests || []}
    keyExtractor={(item) => item}
    renderItem={({ item }) => (
      <View style={styles.card}>
        <Text style={styles.username}>{item}</Text>
        <Button title="Accept" onPress={() => acceptRequest(item)} />
      </View>
    )}
  />
)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  noRequests: {
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
  },
  card: {
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#eee',
    marginBottom: 10,
  },
  username: {
    fontSize: 18,
    marginBottom: 8,
  },
});
