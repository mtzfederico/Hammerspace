import { StyleSheet, View, Image, Text, useColorScheme , FlatList, SafeAreaView} from "react-native";



const imageHeight =60
const imageWidth = 60


const DisplayFolders = ({ data }) => {

  
  const colorScheme = useColorScheme();

  const isDarkMode = colorScheme === 'dark';

  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;

  const textStyle = isDarkMode ? styles.darkText : styles.lightText;

  const renderItem = ({ item }) => {
    console.log("name " + item.name)
    console.log("uri " + item.uri)
    if (item.type === 'Directory') {
      return (
        <View style={backgroundStyle}>
          <Image source={require('../assets/images/folder.webp')}style={styles.image} />
            <Text style={textStyle}>{item.name}</Text>
        </View>
      );
    } else if (item.type === 'File') {
      return (
        <View style={backgroundStyle}>
          <Image source={{ uri: `${item.uri}` }} style={styles.image} />
            <Text style={textStyle}>{item.name}</Text>
        </View>
      );
    } else {
      return null;
    }
  };
   
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        horizontal
        contentContainerStyle={{ gap: 40 }}
        data={data}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
      />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  itemContainer: {
    backgroundColor: '#f1f1f1',
    padding: 15,
    marginBottom: 10,
    borderRadius: 5,
  },
  itemText: {
    fontSize: 18,
    color: '#333',
  },
  image: {
    width: '100%',

    height: '100%',

    resizeMode: 'cover' 
  },
  darkBackground: {
    flex: 1,
     backgroundColor: "#333",
    tintColor: 'black',
    height: imageHeight,
    width: imageWidth,
    marginBottom: 10,
    
    
  },
  lightBackground: {
    flex: 1,
    backgroundColor: "white",
    height: imageHeight,
    width: imageWidth,
  },

  lightText: {
    color: 'black',
    fontSize: 16,
    width: imageWidth
   
  },
  darkText: {
    color: 'white',
    fontSize: 16,
    width : imageWidth
   
  },
  
  
});

export default DisplayFolders;
      
      