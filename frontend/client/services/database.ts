import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const apiURL= process.env.EXPO_PUBLIC_API_URL


export const initDB = async () => {
const db = await SQLite.openDatabaseAsync('hammerspace.db');
console.log('Database opened at: ', db);
}


export const createTables = async() => {
    try {
      // https://react-native-async-storage.github.io/async-storage/docs/usage/
      const value = await AsyncStorage.getItem('isDBCreated');
      if (value !== null) {
        // value previously stored
        // Maybe check if it needs to be updated.
        return
      }
      console.log("DB not created...")
    } catch (e) {
      // error reading value
      console.log('Error checking if DB is already created:', e);
    }


const db = await SQLite.openDatabaseAsync('hammerspace.db');
try { 
  db.runAsync(
    `CREATE TABLE IF NOT EXISTS users  (
      userID    VARCHAR(36)   PRIMARY KEY,
      pfpID     VARCHAR(50)   NOT NULL
    );`
  );

  
   db.runAsync(
      `CREATE TABLE IF NOT EXISTS folders  (
        id            VARCHAR(36)   PRIMARY KEY,
        parentDir     VARCHAR(50)   NOT NULL,
        name          VARCHAR(50)   NOT NULL,
        type          VARCHAR(50)   NOT NULL,
        uri          VARCHAR(500)   NOT NULL,
        fileSize          INT        NOT NULL,
        userID        VARCHAR(50)   NOT NULL
      );`
    );
      try {
        // Retrieve the table names from sqlite_master
        const result = await db.getAllAsync('SELECT name FROM sqlite_master WHERE type="table";');
        
        // Log the result properly
        if (Array.isArray(result)) {
          console.log('Tables in database:', result);

          try {
            await AsyncStorage.setItem('isDBCreated', "true");
            console.log("created DB successfully")
          } catch (e) {
            // saving error
            console.log('Error saving isDBCreated:', result);
          }

        } else {
          console.log('Unexpected result format:', result);
        }
      } catch (error) {
        console.error('Error checking tables:', error);
      }
    } catch (error) {
      console.error('Error creating tables:', error);
    }


  };

 export const dropDatabase = async () => {
  console.log("drop database")
  const db = await SQLite.openDatabaseAsync("hammerspace.db");
    await db.execAsync("DROP TABLE IF EXISTS folders;")
   
      try {
        // Retrieve the table names from sqlite_master
        const result = await db.getAllAsync('SELECT name FROM sqlite_master WHERE type="table";');
        
        // Log the result properly
        console.log("before checking tables")
        if (Array.isArray(result)) {
          console.log('Tables in database:', result);
        } else {
          console.log('Unexpected result format:', result);
        }

        try {
          await AsyncStorage.removeItem('isDBCreated');
          console.log("created DB successfully")
        } catch (e) {
          // saving error
          console.log('Error saving isDBCreated:', result);
        }

      } catch (error) {
        console.error('Error checking tables:', error);
      }
    };
    
  export const testDBname = async () => {
    console.log('names will be here hopefully')
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    const result = await db.getAllAsync('SELECT name, parentDir FROM folders');
    console.log(result)
  }
  
  export const addUser = async (userID: string, pfpID: string) => {
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try { 
      console.log('Adding user:', { userID, pfpID });
      await db.runAsync(
        'INSERT INTO users (userID, pfpID) VALUES (?, ?)',
        userID,
        pfpID
      );
      console.log('User added successfully');
    } catch (error) { 
      console.error('Error adding user:', error);
    }
  }

  export const getPfpIDByUserID = async (userID: string) => {
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try {
      const result = await db.runAsync('SELECT pfpID FROM users WHERE userID = ?', userID);
      if (Array.isArray(result) && result.length > 0) {
        return result
        ; // Return the pfpID of the user
      } else {
        console.error('User not found');
      }
    } catch (error) {
      console.error('Error fetching pfpID:', error);
    }
  };

export const insertFolder =  async (name: string, dirID: string, parentID: string, userID: string) => {
  const db = await SQLite.openDatabaseAsync('hammerspace.db');
  db.runAsync(
      'INSERT INTO folders (id, parentDir, name, type, fileSize, uri, userID) VALUES (?, ?, ?, ?, ?, ?, ?)', dirID, parentID, name, "folder", 0, "null", userID
    );
  }

  export const seeFiles = async () => {
    console.log('SeeFiles')
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    const result = await db.getAllAsync('SELECT name FROM folders WHERE type="File";');
    console.log("result of call is here " +result)
  }

export const insertFile = async (name: string, uri: string, dirID: string, type: string, parentID: string, size: number, userID: string) => {
  const db = await SQLite.openDatabaseAsync('hammerspace.db');
  try {
    console.log('Inserting file:', { name, uri, dirID, parentID, size });
  
  db.runAsync(
    'INSERT INTO folders (id,parentDir,name,type,fileSize,uri,userID) VALUES (?, ?, ?,?,?,?,?)', dirID, parentID, name, type, size, uri, userID );
  }catch (error) {
    console.error('Error inserting file' + error)
  }
  };

  export const getItemsInParentDB = async (parentID: string, userID: string, callback: (folders: any[]) => void) => {
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try { 
      const result = await db.getAllAsync('SELECT * FROM folders WHERE parentDir=? AND userID=?', parentID, userID);
      const items = Array.isArray(result) ? result : []; // Ensure we handle cases where result is not an array.
      callback(items);
    } catch (error) {
      console.error('[getItemsInParentDB] Error getting items:', error);
    }
  };

    export const syncWithBackend = async (userID: string, authToken: string) => {
      const db = await SQLite.openDatabaseAsync('hammerspace.db');
      try {
        const response = await fetch(`${apiURL}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userID, authToken }),
        });
    
        const data = await response.json();
        if (data.success) {
          console.error('[syncWithBackend] Failed to sync with backend:', response.statusText);
          return;
        }
    
        console.log("syncWithBackend response: " + JSON.stringify(data));
    
        if (Array.isArray(data.folders)) {
          // Clear local folders for the given user
          await db.runAsync('DELETE FROM folders WHERE userID = ?;', [userID]);
    
          // Insert synced folders
          for (const folder of data.folders) {
            console.log( folder.parentDir )

            // TODO: type is hardcoded to directory. backend uses folder 
            await db.runAsync(
              'INSERT OR REPLACE INTO folders (id, parentDir, name, type, fileSize, uri, userID) VALUES (?, ?, ?, ?, ?, ?, ?)',
              folder.id, folder.parentDir, folder.name, folder.type, 0, "null", folder.userID
            );
            
          }
          console.log('[syncWithBackend] Sync completed with no errors');
        } else {
          console.error('[syncWithBackend] No folders received from backend');
        }
      } catch (error) {
        console.error('[syncWithBackend] Error syncing with backend:', error);
      }
    };
    

export default initDB
