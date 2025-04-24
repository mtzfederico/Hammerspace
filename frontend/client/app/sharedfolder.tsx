// app/sharedFolder.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Button,
  Alert,
  useColorScheme,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import sendFolder  from '../components/sendFolder';
import addFolder from "../app/tabs/homescreen";
import { getFolderKey } from '../services/getFolderKey';
import { insertFolder, saveFolderKey } from '../services/database';
import { LinearGradient } from 'expo-linear-gradient';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

type Friend = {
  userID: string;
};

export default function SharedFolder() {
  const router = useRouter();
  const { folderName, parentID } = useLocalSearchParams<{ folderName: string; parentID: string }>();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [profilePictures, setProfilePictures] = useState<{ [key: string]: string }>({});
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;

  const userID = String(SecureStore.getItem('userID'));
  const authToken = String(SecureStore.getItem('authToken'));

  const getFriends = async () => {
    try {
      const res = await fetch(`${apiUrl}/getFriends`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, authToken }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.friends)) {
        setFriends(data.friends.map((id: string) => ({ userID: id })));
      }
    } catch (e) {
      Alert.alert('Error loading friends');
    }
  };

  const fetchProfilePicture = async (forUserID: string) => {
    try {
      const res = await fetch(`${apiUrl}/getProfilePicture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userID, authToken, forUserID }),
      });
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(',')[1];
        if (base64) {
          const uri = FileSystem.documentDirectory + `${forUserID}_profile.jpg`;
          await FileSystem.writeAsStringAsync(uri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          setProfilePictures((prev) => ({ ...prev, [forUserID]: uri }));
        }
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error('Failed to fetch profile image', e);
    }
  };

  useEffect(() => {
    getFriends();
  }, []);

  useEffect(() => {
    friends.forEach((f) => {
      if (!profilePictures[f.userID]) fetchProfilePicture(f.userID);
    });
  }, [friends]);

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  const submit = async () => {
    console.log('Sharing with:', selected);
    if (!folderName || !parentID) {
      Alert.alert("Missing folder name or parentID");
      return;
    }

    try {
      // Create and share folder
      console.log(selected)
      const folderID = await sendFolder(folderName, parentID, selected);
      if (folderID == null) {
        console.error("Failed to create folder");
        return;
      }

      insertFolder(folderName, folderID, parentID, userID);
      const folderKey = await getFolderKey(folderID);
      saveFolderKey(folderID, userID, folderKey);
    } catch (error) {
      console.error('Error sharing folder:', error);
      Alert.alert('Error sharing folder',`${ error || "Unknown error"}`);
    }
    router.back(); // Or go to next screen
  };

  return (
    <SafeAreaProvider>
  <LinearGradient
    colors={isDarkMode ? ['#030303', '#767676'] : ['#FFFFFF', '#92A0C3']}
    style={{ flex: 1 }}
  >
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={[styles.title, textStyle]}>Select friends to share with:</Text>
        <FlatList
          data={friends}
          keyExtractor={(item) => item.userID}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => toggleSelect(item.userID)} style={styles.item}>
              <Image
                source={{
                  uri:
                    profilePictures[item.userID] ||
                    require('../assets/images/default-profile-picture.jpeg'),
                }}
                style={styles.profilePicture}
              />
              <Text style={[styles.name, textStyle]}>{item.userID}</Text>
              <Text style={textStyle}>{selected.includes(item.userID) ? '✓' : ''}</Text>
            </TouchableOpacity>
          )}
        />
        <Button title="Share Folder" onPress={submit} disabled={selected.length === 0} />
      </View>
    </SafeAreaView>
  </LinearGradient>
</SafeAreaProvider>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    padding: 16,
  },
  title: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 12 
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  name: { 
    marginLeft: 12, 
    flex: 1, 
    fontSize: 18 
  },
    profilePicture: { 
      width: 40, 
      height: 40, 
      borderRadius: 20 
    },
  darkText: { 
    color: '#fff' 
  },
  lightText: { 
    color: '#000' 
  },
  darkBackground: { 
    backgroundColor: '#000' 
  },
  lightBackground: { 
    backgroundColor: '#fff' 
  },
});
