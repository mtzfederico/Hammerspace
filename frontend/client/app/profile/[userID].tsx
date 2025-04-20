// app/profile/[userID].tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';

import { deleteEverythingLocally } from '@/services/database';

const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';

export default function UserProfileScreen() {
  const { userID: forUserID } = useLocalSearchParams<{ userID: string }>();
  const [profilePictureUri, setProfilePictureUri] = useState<any>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const storedToken =  String(SecureStore.getItem('authToken'));
  const storedUserID =  String(SecureStore.getItem('userID'));
  const [error, setError] = useState<string | null>(null);
  // const [profilePicture, setProfilePicture] = useState<string | null>(null);
  // const [profilePictureMimeType, setProfilePictureMimeType] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;
  const navigation = useNavigation();

  
  
  const defaultProfilePicture = require('@/assets/images/default-profile-picture.jpeg');
console.log('defaultProfilePicture:', defaultProfilePicture);



  useEffect(() => {
    const init = async () => {

      if (!storedUserID || !storedToken || !forUserID) {
        Alert.alert('Error', 'User credentials missing');
        return;
      } 
      setIsOwnProfile(storedUserID === forUserID);
      await checkLocalProfilePicture(storedUserID, storedToken, forUserID);
      console.log('Profile picture URI:', profilePictureUri);
    };

    init()
  }, [forUserID]);

  

  const checkLocalProfilePicture = async (userID: string, token: string, forUserID: string) => {
    const localUri = FileSystem.documentDirectory + `${forUserID}_profile.jpg`;
    const fileInfo = await FileSystem.getInfoAsync(localUri);

    if (fileInfo.exists) {
      console.log('Using cached image');
      setProfilePictureUri(localUri);
    } else {
      console.log('Downloading image');
      await fetchProfilePicture(userID, token, forUserID);
    }
  };

  const fetchProfilePicture = async (userID: string, authToken: string, forUserID:string) => {
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
      const contentType = response.headers.get('Content-Type') || '';

      if (!response.ok) {
        console.log(`[fetchProfilePicture] Status ${response.status}`);
        const data = await response.json();
        throw new Error(data.error || response.status + ' ' + response.statusText);
      }
  
      // 🟡 Handle default case (JSON with profilePictureID = "default")
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data.profilePictureID === 'default' || data.profilePictureID === '') {
          console.log('Setting default profile picture:', defaultProfilePicture);
          setProfilePictureUri(defaultProfilePicture);
           console.log('Using default profile picture' + profilePictureUri);
           
          return;   
        } else {
          console.warn('Unexpected JSON response:', data);
          setProfilePictureUri(defaultProfilePicture);
          return;
        }
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
          setProfilePictureUri(localUri);
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

  const requestPermission = async () => {
    if (Platform.OS === 'ios') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
    return true;
  };

  const handlePickImage = async () => {
    const granted = await requestPermission();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      const mimeType = result.assets[0].mimeType || 'image/jpeg';
      const fileSize = result.assets[0].fileSize || -1;

      if (fileSize > 2_000_000) {
        Alert.alert('Error', 'Image must be less than 2MB');
        return;
      }

      setSelectedImage(imageUri);
      setMimeType(mimeType);
    }
  };

  const handleUpload = async () => {
    setLoading(true);
    setError(null);
    console.log("Uploading profile picture");
    if (!selectedImage) {
      setError('Please select a picture to upload');
      setLoading(false);
      return;
	  }

    const formData = new FormData();
    formData.append('file', {
      uri: selectedImage,
      name: 'profile-picture',
      type: mimeType,
    } as any);
      

    formData.append("userID", storedUserID);
    formData.append("authToken", storedToken);

    try {
      const response = await fetch(`${apiUrl}/updateProfilePicture`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(`${response.status}: ${data.error || 'Error uploading profile picture. Please try again.'}`);
      }

      if (data.success) {
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading profile picture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // dropDatabase();
    // return
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          { userID: storedUserID, authToken: storedToken } ),
      });
      const data = await response.json();
      if (data.success || data.error === "Invalid Credentials") { 
        // the item's should still be deleted if the backend returns certain errors like "Invalid Credentials"
        // delete the files that are stored locally and truncate the db
       // await deleteEverythingLocally()
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('userID');
        navigation.reset({
          index: 0,
          routes: [{ name: 'login' as never }],
        });
      }
      else {
        console.log(`Failed to log out '${data.error}'`)
        Alert.alert('Failed to log out', data.error || `${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting SecureStore items:', error);
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
    <View style={[styles.container, backgroundStyle]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, textStyle]}>{'< Back'}</Text>
      </TouchableOpacity>

      <Text style={[styles.header, textStyle]}>
        {isOwnProfile ? 'Your Profile' : `User: ${forUserID}`}
      </Text>

      {loading && <ActivityIndicator size="large" style={{ margin: 20 }} />}

      {profilePictureUri && (
       <Image
       source={typeof profilePictureUri === 'string' ? { uri: profilePictureUri } : profilePictureUri}
       style={styles.profileImage}
       resizeMode="cover"
     />
      )}

      {isOwnProfile && (
        <>
          <Button title="Pick New Image" onPress={handlePickImage} />
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={styles.profileImage} />
          )}
          <Button
            title="Upload"
            onPress={handleUpload}
            disabled={!selectedImage || loading}
          />
        <View style={styles.friendsText}>
        <Text
          style={[styles.header, textStyle]}
          onPress={() => router.push('/friends')}
        >
          Your Friends
        </Text>
      </View>
      <Text
  style={[styles.logoutText]}
  onPress={() => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: handleLogout },
      ]
    );
  }}
>
  Logout
</Text>

        </>
      )}
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginVertical: 20,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    padding: 8,
    backgroundColor: '#ccc',
    borderRadius: 5,
  },
  backText: {
    fontSize: 16,
  },
  lightBackground: {
    backgroundColor: 'white',
  },
  darkBackground: {
    backgroundColor: 'black',
  },
  lightText: {
    color: 'black',
  },
  darkText: {
    color: 'white',
  },
  friendsText: {
    position: 'absolute',
    bottom: 400, // Adjust as needed to position it close to the bottom
    fontSize: 22,
    fontWeight: 'bold',
    alignSelf: 'center', // Center horizontally
  },
  logoutText: {
    position: 'absolute',
    bottom: 80, // Adjust as needed to position it close to the bottom
    fontSize: 22,
    fontWeight: 'bold',
    alignSelf: 'center', // Center horizontally
    color: 'red',
  },
});
