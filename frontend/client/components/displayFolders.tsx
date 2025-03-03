import { StyleSheet, View, Image, Text, useColorScheme , FlatList, SafeAreaView} from "react-native";




const imageWidth = 80


const DisplayFolders = ({ folders }) => {
  const colorScheme = useColorScheme();

  const isDarkMode = colorScheme === 'dark';

  const backgroundStyle = isDarkMode ? styles.darkBackground : styles.lightBackground;

  const textStyle = isDarkMode ? styles.darkText : styles.lightText;
   
  
  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        horizontal
        contentContainerStyle={{ gap: 40 }}
        data={folders}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={backgroundStyle}>
              <Image source={require('../assets/images/folder.webp')}style={styles.image} />
            <Text style={textStyle}>{item.name}</Text>
            
          </View>
        )}
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
    height: 60,
    width: imageWidth,
  },
  darkBackground: {
    flex: 1,
    backgroundColor: "black",
    tintColor: 'black',
    height: 45,
    width: 45,
    
  },
  lightBackground: {
    flex: 1,
    backgroundColor: "white",
    height: 45,
    width: 45,
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
      
      