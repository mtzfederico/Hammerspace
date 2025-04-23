import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FileItem } from '@/components/displayFolders';

const currentDBVersion = "1.0"
const apiURL= process.env.EXPO_PUBLIC_API_URL

export const initDB = async () => {
const db = await SQLite.openDatabaseAsync('hammerspace.db');
console.log('Database opened at: ', db);
}

export const createTables = async() => {
  try {
    // https://react-native-async-storage.github.io/async-storage/docs/usage/
    const dbVersion = await AsyncStorage.getItem('dbVersion');
    if (dbVersion !== null) {
      // value previously stored
      if (dbVersion === currentDBVersion) {
        return;
      }
      console.log(`DB schema is an old version. Updating from '${dbVersion}' to '${currentDBVersion}`)
    } else {
      console.log(`DB not created. Using version '${currentDBVersion}'`)
    }
  } catch (e) {
    // error reading value
    console.log('Error checking if DB is already created:', e);
  }

  const db = await SQLite.openDatabaseAsync('hammerspace.db');
  try { 
    db.runAsync(
      `CREATE TABLE IF NOT EXISTS users (
        userID    VARCHAR(36)   PRIMARY KEY,
        pfpID     VARCHAR(50)   NOT NULL
      );`
    );
    
    db.runAsync(
      `CREATE TABLE IF NOT EXISTS folders (
        id           VARCHAR(36)    PRIMARY KEY,
        parentDir    VARCHAR(50)    NOT NULL,
        name         VARCHAR(50)    NOT NULL,
        type         VARCHAR(50)    NOT NULL,
        uri          VARCHAR(500),
        fileSize     INT            NOT NULL,
        userID       VARCHAR(50)    NOT NULL
      );`
    );

    db.runAsync(
      `CREATE TABLE IF NOT EXISTS folder_keys (
        folderID        VARCHAR(36)    PRIMARY KEY,
        folderOwnerID   VARCHAR(50)    NOT NULL,
        privateKey      VARCHAR(80)    NOT NULL,
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

export const insertFolder = async (name: string, dirID: string, parentID: string, userID: string) => {
  const db = await SQLite.openDatabaseAsync('hammerspace.db');
  db.runAsync(
      'INSERT INTO folders (id, parentDir, name, type, fileSize, uri, userID) VALUES (?, ?, ?, ?, ?, ?, ?)', dirID, parentID, name, "folder", 0, "null", userID
    );
};

export const seeFiles = async () => {
  console.log('SeeFiles')
  const db = await SQLite.openDatabaseAsync('hammerspace.db');
  const result = await db.getAllAsync('SELECT name FROM folders WHERE type="File";');
  console.log("result of call is here " +result)
};

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

  export const getFileURIFromDB = async (id: string) => {
    console.log('[getFileURIFromDB] called with ID:', id);
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try {
      // Use db.getFirstAsync to retrieve a single row, specifying the correct shape of the result
      // db.getFirstAsync('SELECT uri FROM folders WHERE id=?;', id)
      const row = await db.getFirstAsync<{ "uri": string }>('SELECT uri FROM folders WHERE id=?;', id);
      
      // Check if the row is found
      if (!row) {
        console.log(`[getFileURIFromDB] No file found with ID: ${id}`);
        // Return null if no row is found
        return;
      }
  
      // Check if uri is null in the found row
      if (row.uri === null) {
        console.log(`[getFileURIFromDB] File found but URI is null for ID: ${id}`);
        // Return null if uri is null
        return;
      }
  
      // Return the uri if found and it's not null
      return row.uri;
    } catch (error) {
      console.error('[getFileURIFromDB] Error getting file URI:', error);
      // Return null in case of an error
    }

    return null;
  };
  
  export const updateFileUri = async (id: string, uri: string) => {
    console.log('[UpdateFileUri] called with ID:', id);
    // TODO: check if we should have a single db and use that one, or if this is ok.
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try {
      await db.runAsync('UPDATE folders SET uri=? WHERE id=?;', uri, id);
      console.log('[UpdateFileUri] File URI updated successfully');
    } catch (error) {
      console.error('[UpdateFileUri] Error updating file URI:', error);
    }
  };
  
  // should return an array of FileItems
  export const getItemsInParentDB = async (parentID: string, userID: string, callback: (folders: FileItem[]) => void) => {
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try { 
      const result = await db.getAllAsync('SELECT * FROM folders WHERE parentDir=?', parentID,);
      const items = Array.isArray(result) ? result as FileItem[] : []; // Ensure we handle cases where result is not an array.
      console.log(items)
      callback(items);
    } catch (error) {
      console.error('[getItemsInParentDB] Error getting items:', error);
    }
  };
  // CqpIEl2Zmb4H6Q==
  // raging
  //curl -X POST "http://localhost:9090/sync" -H 'Content-Type: application/json' -d '{"userID":"raging","authToken":"CqpIEl2Zmb4H6Q=="}'

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

      if (!response.ok) {
        let errorMessage = `Failed to sync: ${response.status} - ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errorMessage += ` - ${errorData.error}`;
          }
        } catch (jsonError) {
          console.error("Failed to parse error JSON", jsonError);
        }
        console.error('[syncWithBackend] Failed to sync with backend:', errorMessage);
      throw new Error(errorMessage);
    }

      const data = await response.json();
     
      console.log("syncWithBackend response: " + JSON.stringify(data));
  
      if (Array.isArray(data.folders)) {
        // Clear local folders for the given user
        await db.runAsync('DELETE FROM folders WHERE userID = ?;', [userID]);
  
        // Insert synced folders
        for (const folder of data.folders) {
          console.log(`[syncWithBackend] syncing dir: ${folder.parentDir}`)

          try { 
          await db.runAsync(
            'INSERT OR REPLACE INTO folders (id, parentDir, name, type, uri, fileSize, userID) VALUES (?, ?, ?, ?, ?, ?, ?)',
            folder.id, folder.parentDir, folder.name, folder.type, "" ,folder.fileSize, folder.userID
          );
        } catch (error) {
          console.error('[syncWithBackend] Error inserting folder:', error);
        }
      }
        console.log('[syncWithBackend] Sync completed with no errors');
      } else {
        console.error('[syncWithBackend] No folders received from backend');
      }
    } catch (error) {
      console.error('[syncWithBackend] Error syncing with backend:', error);
    }
  };
    
  
  /*
  // NOT USED
  // it does the same things as getItemsInParentDB. it could probably be replaced
  export const getAllFilesURi = async (parentID: string, userID: string, callback: (folders: any[]) => void) => {
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try { 
      const result = await db.getAllAsync('SELECT id, uri FROM folders WHERE parentDir=? AND userID=?', parentID, userID);
      const items = Array.isArray(result) ? result : []; // Ensure we handle cases where result is not an array.
      await db.closeAsync();
      callback(items);
    } catch (error) {
      console.error('[getAllFilesURi] Error getting items:', error);
    }
  };
  */

  // Deletes the file from the local DB and the file if it is downloaded
  export const deleteFileLocally = async (fileID: string) => {
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try { 
      const result = await db.getFirstAsync('SELECT uri FROM folders WHERE id=?', fileID);
      const uri = result as string || '';
      if (uri !== '') {
          // delete the file
          FileSystem.deleteAsync(uri, {
            idempotent: true
          });
      }
      await db.runAsync('DELETE FROM folders WHERE id=?', fileID);
    } catch (error) {
      console.error('[deleteFileLocally] Error getting items:', error);
      throw error;
    }
  };

  export const saveFolderKey = async (folderID: string, folderOwnerID: string, privateKey: string) => {
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try {
      console.log('[saveFolderKey] Inserting folderKey for folderID:', folderID);
    
    db.runAsync('INSERT INTO folder_keys (folderID, folderOwnerID, privateKey) VALUES (?, ?, ?)', folderID, folderOwnerID, privateKey);
    } catch (error) {
      console.error('[saveFolderKey] Error inserting folderKey' + error)
      return error;
    }
  };

  export const getFolderKey = async (folderID: string): Promise<string | null> => {
    console.log('[getFolderKey] called with folderID:', folderID);
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try {
      // Use db.getFirstAsync to retrieve a single row, specifying the correct shape of the result
      // db.getFirstAsync('SELECT uri FROM folders WHERE id=?;', id)
      const row = await db.getFirstAsync<{ "privateKey": string }>('SELECT privateKey FROM folder_keys WHERE folderID=?;', folderID);
      
      // Check if the row is found
      if (!row) {
        console.log(`[getFolderKey] No folderKey found for folderID: ${folderID}`);
        // Return null if no row is found
        return null;
      }
  
      // Check if uri is null in the found row
      if (row.privateKey === null) {
        console.log(`[getFolderKey] folderKey is null for folderID: ${folderID}`);
        // Return null if uri is null
        return null;
      }
  
      // Return the uri if found and it's not null
      return row.privateKey;
    } catch (error) {
      console.error('[getFolderKey] Error getting folderKey:', error);
      // Return null in case of an error
      throw error;
    }
  };

  // Deletes everthing from the local DB and all of the files that are downloaded
  export const deleteEverythingLocally = async () => {
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    try { 
      // sqlite doesn't have truncate
      await db.runAsync('DELETE FROM folders');
      await db.runAsync('DELETE FROM users');

      FileSystem.deleteAsync(FileSystem.documentDirectory || '', {
        idempotent: true
      });
    } catch (error) {
      console.error('[deleteFileLocally] Error getting items:', error);
      throw error;
    }
  };

export default initDB
