import React, { useEffect, useState } from 'react';
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ScrollView
} from 'react-native';
import {SafeAreaView, SafeAreaProvider} from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { router, useLocalSearchParams } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { getFolderKey } from '@/services/getFolderKey';
import { saveFolderKey } from '@/services/database';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

export default function TextView() {
  const { URI: encodedURI } = useLocalSearchParams<{ URI: string }>();
  console.log("Encoded URI" + encodedURI)
  const userID =  String(SecureStore.getItem('userID'));
  const authToken =  String(SecureStore.getItem('authToken'));
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;
  const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

  const storedToken =  String(SecureStore.getItem('authToken'));
  const storedUserID =  String(SecureStore.getItem('userID'));

  const [textToShow, SetTextToShow] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // https://docs.expo.dev/router/basics/navigation/#using-dynamic-route-variables-and-query-parameters-in-the-destination-page

  useEffect(() => {
    const loadView = async () => {
      try {
        setLoading(true)
        var uri = decodeURI(encodedURI as string)
        console.log("FIle URI: " + uri);
        const textFromFile = await FileSystem.readAsStringAsync(uri);
        SetTextToShow(textFromFile || "Error loading text from file")
      } catch (e) {
        // Catches a malformed URI
        console.error("failed to load file. " + e);
        setError("Failed to load file. " + e);
      }

      setLoading(false)
    };
    
    loadView();
    }, []);
    
  return (
    <SafeAreaProvider>
      <SafeAreaView style={backgroundStyle} edges={['top', 'bottom']}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, textStyle]}>{'< Back'}</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
            <ActivityIndicator style={{ marginTop: 10 }}/>
        ):(
          <ScrollView style={styles.scrollView}>
            <Text style={[styles.textBody, textStyle]}>{textToShow}</Text>
            </ScrollView>
          )}
        </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: '#ccc',
    borderRadius: 5,
    marginBottom: Constants.statusBarHeight,
  },
  backText: {
    fontSize: 16,
  },
  scrollView: {
    marginTop: 30,
  },
  textBody: {
    marginLeft: 8,
    marginRight: 5,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginLeft: 8,
    marginTop: 60,
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
