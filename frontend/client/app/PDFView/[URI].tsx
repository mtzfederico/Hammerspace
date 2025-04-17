import React, { useEffect, useState } from 'react';
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
import * as SecureStore from 'expo-secure-store';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

export default function PDFView() {
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

  const [loading, setLoading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // https://docs.expo.dev/router/basics/navigation/#using-dynamic-route-variables-and-query-parameters-in-the-destination-page


  useEffect(() => {
    try {
        setLoading(true)
        var uri = decodeURI(encodedURI as string)
        console.log("FIle URI: " + uri);
        setFilePath(uri);
      } catch (e) {
        // Catches a malformed URI
        console.error("failed to decode URI. " + e);
        setError("Failed to decode URI. " + e);
      }

      setLoading(false)
      
    }, []);

    console.log("Final WebView file path:", filePath);
    
  return (
    <View style={[styles.screen, backgroundStyle]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={[styles.backText, textStyle]}>{'< Back'}</Text>
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
      {loading ? (
            <ActivityIndicator style={{ marginTop: 10 }} />
        ) : (
            // TODO: when null maybe set the path to an error page
            <WebView style={styles.container}  originWhitelist={['*']}
      source={{ uri: filePath || '' }}
      allowFileAccess={true}  // Allow file access
      allowUniversalAccessFromFileURLs={true}  // Allow access to local URLs
      javaScriptEnabled={true}
      startInLoadingState={true}
      renderLoading={() => <ActivityIndicator size="large" color="#0000ff" />}/>
        )}
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
  container: {
    flex: 1,
    marginTop: Constants.statusBarHeight,
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
