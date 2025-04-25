import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Button, StyleSheet, Alert, ActivityIndicator, Dimensions } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
// type FriendRequest = string; // Just the sender's userID

export default function NotificationsScreen() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  type AlertData = {
    id: string;
    alertType: string;
    dataPrimary: string;
    dataSecondary?: string;
    createdDate: string;
  };

  const getNotificationTitle = (alert: AlertData): string => {
    if (alert.alertType === "friendRequest") {
      return "Friend Request";
    }
    return alert.alertType;
  };

  const getNotificationBody = (alert: AlertData): string => {
    if (alert.alertType === "friendRequest") {
      return `${alert.dataPrimary} sent you a friend request`;
    }
    return alert.dataPrimary;
  };

  const getNotificationButtonTitle = (alert: AlertData): string => {
    if (alert.alertType === "friendRequest") {
      return "Accept";
    }
    return "No handler";
  };

  const handleNotificationButtonTapped = (alert: AlertData): void => {
    if (alert.alertType === "friendRequest") {
      acceptFriendRequest(alert.dataPrimary);
      return;
    }
    return;
  };
  
  type ItemProps = {alert: AlertData};
  const dismissNotification = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };
  
  const Notification = ({ alert }: ItemProps) => (
    <View style={[styles.card, { backgroundColor: isDarkMode ? '#b0b0b0' : '#cbcfd6' }]}>
      {/* X Dismiss button */}
      <TouchableOpacity style={styles.dismissButton} onPress={() => dismissNotification(alert.id)}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
  
      <Text style={[styles.cardTitle, { color: isDarkMode ? 'black' : '#2a2d38' }]}>
        {getNotificationTitle(alert)}
      </Text>
      <Text style={[styles.cardBody, { color: isDarkMode ? 'black' : '#2a2d38' }]}>
        {getNotificationBody(alert)}
      </Text>
  
      {/* Accept styled button */}
      <TouchableOpacity
        style={styles.acceptButton}
        onPress={() => handleNotificationButtonTapped(alert)}
      >
        <Text style={styles.acceptButtonText}>{getNotificationButtonTitle(alert)}</Text>
      </TouchableOpacity>
    </View>
  );

  /*
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{item}</Text>
    <Button title="Accept" onPress={() => acceptRequest(item)}/>
  </View>
  */

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const userID = await SecureStore.getItemAsync('userID');
      const authToken = await SecureStore.getItemAsync('authToken');
 
      const response = await fetch(`${apiUrl}/getAlerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, authToken }),
      });
 
      const data = await response.json();
      if (!response.ok) {
        console.log("[fetchNotifications] Error getting notifications", data.error || "<no data>")
        Alert.alert('Error', data.error || 'Failed to load notifications');
        return;
      }
 
      console.log('Notifications data:', data); // Log for debugging
      setAlerts(data.alerts);
    } catch (error) {
      Alert.alert('Error', 'Could not fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const acceptFriendRequest = async (fromUserID: string) => {
    try {
      const userID = await SecureStore.getItemAsync('userID');
      const authToken = await SecureStore.getItemAsync('authToken');

      console.log('[acceptFriendRequest] Accepting request from:', fromUserID); // Log for debugging
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
        await fetchNotifications(); // Refresh list
      } else {
        Alert.alert('Error', data.error || 'Could not accept request');
      }
    } catch (err) {
      Alert.alert('Error', `${err || 'unknown error'}`);
    }
  };

  const handlePullToRefresh = () => {
    setIsRefreshing(true);
    console.log("Pull to refresh")
    fetchNotifications();
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <LinearGradient colors={isDarkMode ? ['#030303', '#767676'] : ['#FFFFFF', '#92A0C3']} style={styles.gradientBackground}>
        <SafeAreaView edges={['top', 'bottom']}>
          <Text style={[styles.heading, isDarkMode && {color: 'white'}]}>Notifications</Text>
          {loading && <ActivityIndicator size="large" style={{margin: 20}} color="white" />}
            <FlatList
              style={styles.table}
              data={alerts || []}
              keyExtractor={(item) => item.id}
              refreshing={isRefreshing}
              ListEmptyComponent={<Text style={styles.noRequests}>No Notifications</Text>}
              onRefresh={handlePullToRefresh}
              renderItem={({ item }) => (
                <Notification alert={item}/>
              )}
            />
        </SafeAreaView>
      </LinearGradient>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    padding: 20,
    width: '100%',
    height: '100%',
  },
  heading: {
    fontSize: 28,
    fontWeight: '600',
    marginTop: 20,
    color: '#333', 
  },
  noRequests: {
    marginTop: 20,
    fontSize: 16,
    color: 'gray',
    textAlign: 'center',
  },
  table: {
    paddingTop: 20,
    height: (Dimensions.get('window').height),
  },
  card: {
    padding: 16,
    borderRadius: 20,
    marginTop:20,
    marginBottom: 10,
    width: '95%',
    alignSelf: 'center',
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    marginBottom: 8,   
  },
  dismissButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    backgroundColor: '#ff6666',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dismissText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButton: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#2a2d38',
    fontWeight: 'bold',
  },
  
});


