// Informações de Autenticação K-Tag API 
const KTAG_USERNAME = 'TagLocation';
const KTAG_PASSWORD = 'a9B3xQ7z';
const KTAG_API_URL = 'http://47.113.127.14:6176'; 


const DEVICE_ID = 'K307246'; 
const HASHED_KEY = 'Zqz6M8Yg5cDy8xWW4aMJIq7pAlNF6lgdvaifECHnZio='; 
const PRIVATE_KEY = 'ZhNggegS2k1DUzLWcT0hG+CkJH3q9/4dSOBnOw=='; 

/*deviceId: 'k300892',
    hashedKey: 'ngH71F913cawZESRhi8KhaI4W9lXAys+hk+3txMqRA8=',
    privateKey: 'eej3g1NScqaECB5sJv4ZqOJzMQIkMWQMi9y3BA=='
*/
const POLLING_INTERVAL = 30 * 1000; 


let lastSentTimestamp = 0; 


// --- BUSCAR DADOS DA K-TAG API ---

async function fetchKTagLocations() {
  // Gera o cabeçalho de autenticação Basic
  const authString = `${KTAG_USERNAME}:${KTAG_PASSWORD}`;
  const authHeader = 'Basic ' + Buffer.from(authString).toString('base64');
  
  // Corpo da solicitação POST
  const postData = {
    "accessoryId": DEVICE_ID,
    "hashed_keys": [HASHED_KEY],
    "priv_keys": [PRIVATE_KEY]
  };

  console.log(`[${new Date().toLocaleTimeString()}] Buscando dados na K-Tag API...`);

  try {
    const response = await fetch(KTAG_API_URL, {
      method: 'POST',
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(postData) 
    });

    if (!response.ok) {
      console.error(`Erro HTTP ao buscar K-Tag: Status ${response.status}`);
      return [];
    }

    const data = await response.json(); 
    return data.results || []; 

  } catch (error) {
    console.error("Erro ao comunicar com a K-Tag API:", error);
    return [];
  }
}

async function postAndLogKTagResponse() {
  const results = await fetchKTagLocations();

  console.log(`[${new Date().toLocaleTimeString()}] Resposta K-Tag API:`, results);
}

postAndLogKTagResponse().catch((error) => {
  console.error("Erro ao executar a solicitação K-Tag:", error);
});

