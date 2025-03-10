import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';



export const initDB = async () => {
const db = await SQLite.openDatabaseAsync('hammerspace.db');
console.log('Database opened at: ', db);
}




export const createTables = async() => {
const db = await SQLite.openDatabaseAsync('hammerspace.db');


try { 
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
  

export const insertFolder =  async (name: string, dirID: string, parentID: string) => {
  const db = await SQLite.openDatabaseAsync('hammerspace.db');
  db.runAsync(
      'INSERT INTO folders (id,parentDir,name,type,fileSize,uri,userID) VALUES (?, ?, ?,?,?,?,?)',dirID, parentID,name,"Directory",0,"null","testUser" 
    );
  }

  export const seeFiles = async () => {
    console.log('SeeFiles')
    const db = await SQLite.openDatabaseAsync('hammerspace.db');
    const result = await db.getAllAsync('SELECT name FROM folders WHERE type="File";');
    console.log("result of call is here " +result)
  }

export const insertFile = async (name: string, uri: string, dirID: string, parentID: string , size: number ) => {
  const db = await SQLite.openDatabaseAsync('hammerspace.db');
  try {
    console.log('Inserting file:', { name, uri, dirID, parentID, size });
  
  db.runAsync(
    'INSERT INTO folders (id,parentDir,name,type,fileSize,uri,userID) VALUES (?, ?, ?,?,?,?,?)',dirID, parentID,name,"File",size,uri, "testUser" );
  }catch (error) {
    console.error('Error inserting file' + error)
  }
  };


export const getFoldersByParentID =  async (parentID: string, callback: (folders: any[]) => void) => {
  const db = await SQLite.openDatabaseAsync('hammerspace.db');
  try{ 
  const result = await db.getAllAsync( 'SELECT * FROM folders WHERE parentDir=? AND type="Directory"' ,parentID);
  const folders = Array.isArray(result) ? result : []; // Ensure we handle cases where result is not an array.
  callback(folders);
  }catch (error) {
    console.error('Error inserting file:', error);
  }
      
  };


export const getFilesByParentID = async (parentID: string, callback: (files: any[]) => void) => {
  const db = await SQLite.openDatabaseAsync('hammerspace.db'); 
  try{ 
    const result = await db.getAllAsync( 'SELECT * FROM folders WHERE parentDir = ? AND type="File"' ,parentID);
    const files = Array.isArray(result) ? result : []; // Ensure we handle cases where result is not an array.
    callback(files);
    }catch (error) {
      console.error('Error inserting file:', error);
    }
        
    };


export default initDB
