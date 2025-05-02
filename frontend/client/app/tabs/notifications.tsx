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

  const userID = String(SecureStore.getItem('userID'));
  const authToken = String(SecureStore.getItem('authToken'));

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

    if (alert.alertType === "friendRequestAccepted") {
      return "Friend Request Accepted";
    }

    if (alert.alertType === "sharedFolder") {
      return "Folder Shared"
    }

    if (alert.alertType === "sharedFolder") {
      return "File Shared"
    }

    if (alert.alertType === "fileTypeMismatched") {
      return "Unexpected file type";
    }

    return alert.alertType;
  };

  const getNotificationBody = (alert: AlertData): string => {
    if (alert.alertType === "friendRequest") {
      return `${alert.dataPrimary} sent you a friend request`;
    }

    if (alert.alertType === "friendRequestAccepted") {
      return `${alert.dataPrimary} accepted your friend request`;
    }

    if (alert.alertType === "sharedFolder") {
      return `${alert.dataPrimary} shared a folder with you`;
    }

    if (alert.alertType === "sharedFolder") {
      return `${alert.dataPrimary} shared a file with you`;
    }

    if (alert.alertType === "fileTypeMismatched") {
      return alert.dataPrimary;
    }

    return alert.dataPrimary;
  };

  const getNotificationButtonTitle = (alert: AlertData): string => {
    if (alert.alertType === "friendRequest") {
      return "Accept";
    }

    if (alert.alertType === "sharedFolder") {
      return "Go to folder";
    }

    if (alert.alertType === "sharedFile") {
      return "Go to file";
    }

    return "Dismiss";
  };

  const handleNotificationButtonTapped = async (alert: AlertData): Promise<void> => {
    if (alert.alertType === "friendRequest") {
      acceptFriendRequest(alert.dataPrimary, alert.id);  // Pass the alert id to dismiss after success
      return;
    }

    await dismissNotification(alert.id);
  };
  
  
  type ItemProps = {alert: AlertData};
  const dismissNotification = async  (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
    try {
      const response = await fetch(`${apiUrl}/removeAlert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "userID": userID,
          "authToken": authToken,
          "alertID": id,
        }),
      });

      const data = await response.json();
      if (response.status != 200) {
        throw Error(`Failed to dismiss notification: ${data.error || `Unknown error. ${response.status}`}`)
      }
    } catch(error) {
      console.log("[dismissNotification] error: ", error)
    }
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

  const acceptFriendRequest = async (fromUserID: string, alertID: string) => {
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
        dismissNotification(alertID);  // Dismiss notification after success
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


