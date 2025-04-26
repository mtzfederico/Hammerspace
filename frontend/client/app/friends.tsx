import React, { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';

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

  const UserProfile = ({ userID, isDarkMode }: { userID: string; isDarkMode: boolean }) => (
    <View style={[styles.UserProfile, isDarkMode ? styles.darkProfile : styles.lightProfile]}>
      <Image
        source={{
          uri: profilePictures[userID] || '../assets/images/default-profile-picture.jpeg',
        }}
        style={styles.profilePicture}
      />
      <Text style={[styles.title, textStyle]}>{userID}</Text>
    </View>
  );
  
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <LinearGradient
          colors={isDarkMode ? ['#030303', '#767676'] : ['#FFFFFF', '#92A0C3']}
          style={styles.gradientBackground}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, isDarkMode ? styles.darkBackButton : styles.lightBackButton]}
          >
            <Text style={styles.backButtonText}>{'< Back'}</Text>
          </TouchableOpacity>

          <Text style={[styles.pageTitle, textStyle]}>Friends</Text>

          <TouchableOpacity
            style={[styles.addButton, isDarkMode ? styles.darkAddButton : styles.lightAddButton]}
            onPress={() => router.push('/addFriends')}
          >
            <Image
              source={require('../assets/images/plus.png')}
              style={[styles.plusImage, { tintColor: 'white' }]} // Ensure the plus icon is white
            />
          </TouchableOpacity>

          {error && <Text style={[styles.error, textStyle]}>{error}</Text>}

          <View style={styles.table}>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 10 }} />
            ) : (
              <FlatList
                data={friends}
                renderItem={({ item }) => <UserProfile userID={item.userID} isDarkMode={isDarkMode} />}
                ListEmptyComponent={<Text style={textStyle}>You have no friends</Text>}
                keyExtractor={(item) => item.userID}
              />
            )}
          </View>
        </LinearGradient>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  gradientBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  plusImage: {
    height: 20,
    width: 20,
  },
  addButton: {
    position: 'absolute',
    top: 70,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  UserProfile: {
    padding: 20,
    width: 380,
    height: 68,
    flexDirection: 'row',
    borderRadius: 20,
  },
  darkProfile: {
    backgroundColor: '#444',
  },
  lightProfile: {
    backgroundColor: '#C1C8D9',
  },  
  profilePicture: {
    width: 32,
    height: 32,
    alignItems: 'center',
    borderRadius: 25,
    zIndex: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    marginLeft: 30,
    
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#ccc',
    borderRadius: 5,
  },
  backButtonText: {
    color: 'white', 
  },
  table: {
    marginTop: 0,
    marginBottom: 0,
  },
  container: {
    flex: 1,
    paddingTop: 0,
    paddingBottom: 0,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 25,
    marginTop: 300,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  lightText: {
    color: 'black',
  },
  darkText: {
    color: 'white',
  },
  darkBackButton: {
    backgroundColor: '#444',
  },
  lightBackButton: {
    backgroundColor: '#C1C8D9',
  },
  darkAddButton: {
    backgroundColor: '#333',
    borderRadius: 10,
    top: 70,
  },
  lightAddButton: {
    backgroundColor: '#C1C8D9',
    borderRadius: 10,
    top: 70,
  },
});
