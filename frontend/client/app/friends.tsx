import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Button,
  Image,
  FlatList,
  Platform,
  Alert,
  StatusBar,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

type Friends = {
  userID: string;
};

export default function Friends() {
  const userID = String(SecureStore.getItem('userID'));
  const authToken = String(SecureStore.getItem('authToken'));
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friends[]>([]);
  const [profilePictures, setProfilePictures] = useState<{ [key: string]: string }>({}); // Store profile pictures by userID

  const getFriends = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/getFriends`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userID,
          authToken,
        }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.friends)) {
        setFriends(data.friends.map((id: string) => ({ userID: id })));
      } else {
        setError(data.error || 'Failed to load friends.');
      }
    } catch (err) {
      console.error(err);
      setError('Error: ' + err);
    }

    setLoading(false);
  };

  const fetchProfilePicture = async (userID: string, authToken: string, forUserID: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/getProfilePicture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userID,
          authToken,
          forUserID,
        }),
      });

      if (!response.ok) {
        console.log(`[fetchProfilePicture] Status ${response.status}`);
        const data = await response.json();
        throw new Error(data.error || response.status + ' ' + response.statusText);
      }

      const blob = await response.blob();

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result?.toString().split(',')[1];
        if (base64data) {
          const localUri = FileSystem.documentDirectory + `${forUserID}_profile.jpg`;
          await FileSystem.writeAsStringAsync(localUri, base64data, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setProfilePictures((prev) => ({ ...prev, [forUserID]: localUri }));
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Image fetch failed: ', error);
      Alert.alert('Could not load profile picture', '' + error || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getFriends();
  }, []);

  useEffect(() => {
    // Fetch profile pictures for all friends
    friends.forEach((friend) => {
      if (!profilePictures[friend.userID]) {
        fetchProfilePicture(userID, authToken, friend.userID);
      }
    });
  }, [friends]);

  const UserProfile = ({ userID }: { userID: string }) => (
    <View style={styles.UserProfile}>
      <Image
        source={{
          uri: profilePictures[userID] || '../assets/images/default-profile-picture.jpeg', // Show default if no picture is found
        }}
        style={styles.profilePicture}
      />
      <Text style={[styles.title, textStyle]}>{userID}</Text>
    </View>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, backgroundStyle]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, isDarkMode ? styles.darkBackButton : styles.lightBackButton]}
        >
          <Text style={textStyle}>{'< Back'}</Text>
        </TouchableOpacity>

        <Text style={[styles.pageTitle, textStyle]}>Friends</Text>

        <TouchableOpacity
          style={[styles.addButton, isDarkMode ? styles.darkAddButton : styles.lightAddButton]}
          onPress={() => router.push('/addFriends')}
        >
          <Image
            source={require('../assets/images/plus.png')}
            style={[styles.plusImage, { tintColor: isDarkMode ? 'white' : 'black' }]}
          />
        </TouchableOpacity>

        {error && <Text style={[styles.error, textStyle]}>{error}</Text>}

        <View style={styles.table}>
          {loading ? (
            <ActivityIndicator style={{ marginTop: 10 }} />
          ) : (
            <FlatList
              data={friends}
              renderItem={({ item }) => <UserProfile userID={item.userID} />}
              ListEmptyComponent={<Text style={textStyle}>You have no friends</Text>}
              keyExtractor={(item) => item.userID}
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  plusImage: {
    tintColor: 'black',
    height: 40,
    width: 40,
  },
  addButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  UserProfile: {
    padding: 20,
    marginVertical: 8,
    marginHorizontal: 16,
    flexDirection: 'row',
    borderColor: 'black',
    borderWidth: 2,
    borderRadius: 8,
  },
  profilePicture: {
    width: 60,
    height: 60,
    left: 2,
    borderRadius: 50,
    zIndex: 10,
    backgroundColor: 'red',
  },
  title: {
    fontSize: 32,
    left: 10,
    top: 8,
  },
  screen: {
    flex: 1,
    paddingTop: 40,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#ccc',
    borderRadius: 5,
  },
  table: {
    marginTop: StatusBar.currentHeight || 0,
  },
  backText: {
    fontSize: 16,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginTop: 30,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 25,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  imagePickerWrapper: {
    marginVertical: 20,
  },
  lightBackground: {
    backgroundColor: 'white',
  },
  darkBackground: {
    backgroundColor: '#121212', // Darker background for dark mode
  },
  lightText: {
    color: 'black',
  },
  darkText: {
    color: 'white',
  },
  darkUserProfile: {
    backgroundColor: '#1a1a1a',
    borderColor: '#444',
  },
  lightUserProfile: {
    backgroundColor: '#fff',
    borderColor: '#000',
  },
  darkBackButton: {
    backgroundColor: '#444',
  },
  lightBackButton: {
    backgroundColor: '#ccc',
  },
  darkAddButton: {
    backgroundColor: '#333',
    borderRadius: 10,
  },
  lightAddButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
});
