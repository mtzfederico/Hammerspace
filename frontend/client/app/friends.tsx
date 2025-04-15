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
import { router } from 'expo-router';
import {SafeAreaView, SafeAreaProvider} from 'react-native-safe-area-context';

const apiUrl = String(process.env.EXPO_PUBLIC_API_URL);

export default function friends() {
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
  const [error, setError] = useState<string | null>(null);

  const data = [
    {userID: "testUser"},
    {userID: "anotherTestUser"},
]

useEffect(() => {
    const getFriendsList = async () => {
      // setError("")
    };

    getFriendsList();
  }, []);

type ItemProps = {userID: string};

/*
  const UserProfile = ({userID}: ItemProps) => (
    <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 50, backgroundColor: 'lightyellow'}}>
            <Image source={{ uri: "../app/assets/profile-circle.png" }} style={styles.image} />
        </View>
        <View style={{ width: 400, backgroundColor: 'lightpink'}}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center'}}>{userID}</Text>
        </View>
    </View>
)*/

const UserProfile = ({userID}: ItemProps) => (
  <View style={styles.UserProfile}>
    <Image source={{ uri: "../assets/images/default-profile-picture.jpeg" }} style={styles.profilePicture}/>
    <Text style={styles.title}>{userID}</Text>
  </View>
);

const handleAddFriend = async () => {
    alert("not implemented")
  };

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
          if (data.success) {
            // addUser(data.userID, "default")
            // Navigate to the home screen or tab navigator
            // router.push('/tabs');
          } else {
            // Handle error based on the server response
            setError(data.error || 'error getting friends list');
          }
        } catch (err) {
          console.error(err);
          setError('Error: ' + err);
        }
    
        setLoading(false);
      };

  return (
    /*
    <View style={[styles.screen, backgroundStyle]}>
      <TouchableOpacity onPress={() => router.push('/tabs')} style={styles.backButton}>
        <Text style={[styles.backText, textStyle]}>{'< Back'}</Text>
      </TouchableOpacity>

      <View style={styles.container}>
        

        {loading ? (
          <ActivityIndicator style={{ marginTop: 10 }} />
        ) : (
          // some views
        )}
            
              <FlatList data={data} renderItem={({item}) => <UserProfile userID={item.userID} />} keyExtractor={item => item.userID} />
          
      </View>
    </View>
    */


    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text >{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={[styles.pageTitle, textStyle]}>Friends</Text>
        <View style={styles.addButton}><Button title="+" onPress={handleAddFriend}/></View>
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.table}>
          <FlatList
            data={data}
            renderItem={({item}) => <UserProfile userID={item.userID} />}
            keyExtractor={item => item.userID}
          />
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  UserProfile: {
      padding: 20,
      marginVertical: 8,
      marginHorizontal: 16,
      flexDirection: 'row',
      borderColor: 'black',
      borderWidth: 2,
      borderRadius: 8,
    },
    title: {
      fontSize: 32,
      left: 10,
    },
    screen: {
      flex: 1,
      paddingTop: 40, // extra padding for top
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
    addButton: {
      position: 'absolute',
      top: 10,
      right: 20,
      zIndex: 10,
      padding: 8,
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
        marginVertical: 20, // creates spacing below the title
    },
    profilePicture: {
      width: 60,
      height: 60,
      left: 2,
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

