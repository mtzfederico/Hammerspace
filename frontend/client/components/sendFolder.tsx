import { insertFolder } from '../../client/services/database';

// 192.168.107.78
    var user = "testUser"
    var token = "K1xS9ehuxeC5tw=="

const sendFolder = async (dirName, parentID) => {
  if (!parentID) {
    console.error('parentID is undefined. Ensure it is correctly passed.');
    return;
  }
  const jsonData = {
    "useriD": user,
    "authToken": token,
    "dirName": dirName,
    "ParentDir": parentID
  }
  console.log("Sending folder creation request, ParentDir: " + jsonData.ParentDir);
  
    try {
        console.log('before error hopefully')
      const response = await fetch('http://192.168.107.78:9090/createFolder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        
        body:JSON.stringify(jsonData), 
      });
      console.log("after error")
  
      if (response.ok) {
        const data = await response.json();
        console.log('Directory created successfully:', data);
         var dirID= String(data.dirID)
        //insertFolder(dirName, dirID, parentID)
        return dirID
        
      } else {
        alert("yo mama messed up the directorys")
        console.error('Error creating directory:', response.status, response.statusText);
        console.log(response.json())
      }
    } catch (error) {
      console.error('Network error:', error);
      
    }
  };

  export default sendFolder