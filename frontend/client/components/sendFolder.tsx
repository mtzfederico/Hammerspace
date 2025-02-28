


const sendFolder = async (dirName) => {
    try {
        console.log('before error hopefully')
      const response = await fetch('http://216.37.97.95:9090/uploadFolder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dirName }),
      });
      console.log("after error")
  
      if (response.ok) {
        const data = await response.json();
        console.log('Directory created successfully:', data);
      } else {
        console.error('Error creating directory:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Network error:', error);
    }
  };

  export default sendFolder