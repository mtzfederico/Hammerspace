import React, { useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Button,
  Image,
  Platform,
  Alert,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

const Profile = () => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;
  const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

  const storedToken =  String(SecureStore.getItem('authToken'));
  const storedUserID =  String(SecureStore.getItem('userID'));

  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPermission = async () => {
    if (Platform.OS === 'ios') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'You need to grant permission to access the media library');
        return false;
      }
    }
    return true;
  };

  const handlePickImage = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      exif: false,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      const mimeType = result.assets[0].mimeType;
      const fileSize = result.assets[0].fileSize;
      console.log("image fileSize: " + fileSize + " bytes. MimeType: " + mimeType);
      /*
      if (fileSize > 2000000) {
        // the image is bigger than 2 megabytes
        // TODO: Improve this
        alert("the image is too big")
      } */
      setProfilePicture(imageUri);
    }
  };


  const handleUpload = async () => {
    if (!profilePicture) {
      setError('Please select a picture to upload');
      return;
    }
    
    const formData = new FormData();
    formData.append('file', {
      uri: profilePicture,
      name: 'profile-picture.jpg',
      type: 'image/jpeg',
    } as any);

    formData.append("userID", storedUserID);
    formData.append("authToken", storedToken);

    setLoading(true);
    setError(null);

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
        Alert.alert('Success', 'Profile picture updated successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'Error uploading profile picture. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, backgroundStyle]}>
      <TouchableOpacity onPress={() => router.push('/tabs')} style={styles.backButton}>
        <Text style={[styles.backText, textStyle]}>{'< Back'}</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        <Text style={[styles.header, textStyle]}>Update Profile Picture</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.imagePickerWrapper}>
          <Button title="Pick an Image" onPress={handlePickImage} disabled={loading} />
        </View>

        {profilePicture && !loading && (
          <Image source={{ uri: profilePicture }} style={styles.image} />
        )}

        {loading ? (
          <ActivityIndicator style={{ marginTop: 10 }} />
        ) : (
          <Button
            title="Upload"
            onPress={handleUpload}
            disabled={!profilePicture}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingTop: 40, // extra padding for top
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#ccc',
    borderRadius: 5,
  },
  backText: {
    fontSize: 16,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  imagePickerWrapper: {
    marginVertical: 20, // creates spacing below the title
  },
  image: {
    width: 100,
    height: 100,
    marginVertical: 16,
    borderRadius: 50,
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
});

export default Profile;
