Para recuperar todas as gravações do SD Card (nao apenas eventos), o caminho e o Método A — Streaming de Playback via REPLAYLIST:
                                                                                                                                               
  ---                                                                                      
  Passo 1 — Configurar o webhook receptor (uma vez)                                                                                            
                                                                                                                                               
  Envie via API 128:                                                                                                                           
  cmdContent: FILELIST,<URL_DO_SEU_ENDPOINT>                                                                                                   
  Ex: FILELIST,http://seu-saas.com/api/filelist             
                                                                                                                                               
  Seu endpoint deve responder {"code":0,"ok":true} quando receber o POST do dispositivo.                                                       
                                                                                                                                               
  ---                                                                                                                                          
  Passo 2 — Solicitar a lista completa de arquivos                                                                                             
                                                            
  Firmware 1.6.3+ (recomendado, com filtro por data e camera):
  cmdContent: TFFILELIST,<YYYYMMDD>,<camera>                                                                                                   
  - Camera: 0 = ambas, 1 = frontal, 2 = interna
  - Ex: TFFILELIST,20250415,0 → todos os arquivos do dia de hoje                                                                               
                                                                                                                                               
  Firmware anterior (sem filtros, lista tudo):                                                                                                 
  cmdContent: FILELIST                                                                                                                         
                                                                                                                                               
  O dispositivo fara um POST para o seu webhook com imei + fileNameList contendo todos os arquivos gravados, incluindo gravacoes continuas (nao
   so eventos).                                                                                                                                
                                                                                                                                               
  ---                                                                                                                                          
  Passo 3 — Fazer stream de um arquivo especifico           
                                                                                                                                               
  Com o nome do arquivo da lista (ex: 2025_04_15_10_30_00.mp4):
  cmdContent: REPLAYLIST,2025_04_15_10_30_00.mp4                                                                                               
                                                            
  O dispositivo transmite o arquivo para o iothub-media e voce consome via:                                                                    
  - FLV: http://{servidor}:8881/live/{IMEI}.flv                                                                                                
  - HLS: http://{servidor}:8881/live/{IMEI}/hls.m3u8                                                                                           
                                                                                                                                               
  ---                                                                                                                                          
  Diferenca em relacao ao HVIDEO/EVIDEO                     
                                                                                                                                               
  ┌─────────────────────────┬───────────────────────────────────────────────────────────────────────────┐
  │         Comando         │                              Para que serve                               │                                      
  ├─────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ TFFILELIST + REPLAYLIST │ Lista todos os arquivos e faz streaming diretamente                       │                                      
  ├─────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ HVIDEO                  │ Faz upload de um arquivo especifico (gravacao de 3min) para download HTTP │                                      
  ├─────────────────────────┼───────────────────────────────────────────────────────────────────────────┤                                      
  │ EVIDEO                  │ Gera um clipe curto em torno de um evento especifico                      │                                      
  └─────────────────────────┴───────────────────────────────────────────────────────────────────────────┘                                      
                                                            
  Para uma timeline completa do cartao SD, o fluxo TFFILELIST → REPLAYLIST e o correto.                                                        
                                                            
※ recap: Working on the GD14 JT808 server at 50.30.32.171. The capability flags were fixed to 0x0F in both jt1078.mjs and constants.mjs. Next: 
  copy constants.mjs to the remote server and restart PM2.                                 
                                                                                     
Primeiro vou ler as partes relevantes do listener.mjs para entender bem a estrutura antes de escrever qualquer codigo.                       
                                                                                                                                               
  Read 1 file (ctrl+o to expand)                                                                                                               
                                                                                                                                               
● Deixa eu ler mais algumas partes antes de escrever.                                      
                                                                                                                                               
  Read 1 file (ctrl+o to expand)                                                                                                               
                                                                                                                                               
● Tenho o que preciso. Vou fazer as alteracoes em 4 pontos cirurgicos no listener.mjs:                                                         
                                                                                                                                               
● Update(V2.0.12/iothub/iothub/listener.mjs)                                                                                                   
  ⎿  Added 1 line                                                                                                                              
      53  // Pending file list requests - wait for pushresourcelist response                                                                   
      54  // ──────────────────────────────────────────────────────────────────────                                                            
      55  const pendingFileListRequests = new Map(); // deviceImei -> { resolve, reject, timeout }                                             
      56 +const pendingFileListJC400 = new Map();   // deviceImei -> { resolve, reject, timeout }                                              
      57                                                                                                                                       
      58  // ──────────────────────────────────────────────────────────────────────                                                            
      59  // REQUEST LOGGING MIDDLEWARE                                                                                                        

● Update(V2.0.12/iothub/iothub/listener.mjs)         
  ⎿  Added 27 lines                                                                       
      1661  }                                        
      1662                                                                                                                                     
      1663  // ──────────────────────────────────────────────────────────────────────
      1664 +// HELPER: Send a JIMI text command (proNo 128) to a device                                                                        
      1665 +// Used for TFFILELIST, FILELIST, REPLAYLIST, RTMP, etc.                                                                    
      1666 +// ──────────────────────────────────────────────────────────────────────                                                          
      1667 +async function sendJimiTextCommand(jimiServer, deviceImei, token, cmdContent) {                                             
      1668 +  const cleanServer = (jimiServer || '').replace(/\/+$/, '');
      1669 +  if (!cleanServer) throw new Error('jimiServer is required');
      1670 +  const urlencoded = new URLSearchParams();
      1671 +  urlencoded.append('deviceImei', deviceImei);
      1672 +  urlencoded.append('cmdContent', cmdContent);
      1673 +  urlencoded.append('serverFlagId', '0');
      1674 +  urlencoded.append('proNo', '128');
      1675 +  urlencoded.append('platform', 'web');
      1676 +  urlencoded.append('requestId', '6');
      1677 +  urlencoded.append('cmdType', 'normallns');
      1678 +  urlencoded.append('offLineFlag', '1');
      1679 +  urlencoded.append('token', token);
      1680 +  const response = await fetch(`${cleanServer}/api/device/sendInstruct`, {
      1681 +    method: 'POST',
      1682 +    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      1683 +    body: urlencoded,
      1684 +    redirect: 'follow' 
      1685 +  });
      1686 +  const text = await response.text();
      1687 +  try { return JSON.parse(text); } catch { return { raw: text }; }
      1688 +}
      1689 + 
      1690 +// ────────────────────────────────────────────────────────────────────── 
      1691  // 3. FTP Upload Endpoint (MUST BE BEFORE REGEX ROUTES)
      1692  // ──────────────────────────────────────────────────────────────────────
      1693  console.log(`[SERVER START] Registering /ftpupload route...`);

● Agora substituo o branch JC400 dentro do /getFileList:
                                                                                          
● Update(V2.0.12/iothub/iothub/listener.mjs)             
  ⎿  Added 49 lines, removed 1 line                                                                                                            
      1957      const deviceModelLower = (deviceModel || 'jc181').toLowerCase();
      1958                                                                                                                                     
      1959      if (deviceModelLower === 'jc400') {         
      1960 -      // jc400: scan /iothub/dvr-upload/uploadFile and filter by IMEI                                                              
      1960 +      // jc400: if token+jimiServer+date provided, query SD card via TFFILELIST                                             
      1961 +      const { date, camera, token, jimiServer, iothubUrl } = JSON.parse(req.body || '{}');                                         
      1962 +                                                                                                                            
      1963 +      if (token && jimiServer && date) {
      1964 +        console.log(`[getFileList/JC400] Requesting SD file list for ${deviceImei} date=${date} camera=${camera ?? 0}`);
      1965 + 
      1966 +        // Step 1: configure webhook (FILELIST,<url>) so device knows where to POST the list 
      1967 +        if (iothubUrl) {
      1968 +          const webhookUrl = `${iothubUrl.replace(/\/+$/, '')}/pushURL/pushfilelist`;
      1969 +          try {
      1970 +            await sendJimiTextCommand(jimiServer, deviceImei, token, `FILELIST,${webhookUrl}`);
      1971 +            console.log(`[getFileList/JC400] Webhook configured: ${webhookUrl}`);
      1972 +          } catch (e) {
      1973 +            console.log(`[getFileList/JC400] Warning: failed to set FILELIST webhook: ${e.message}`);
      1974 +          }
      1975 +        }
      1976 + 
      1977 +        // Step 2: register pending promise before sending TFFILELIST 
      1978 +        const waitForList = new Promise((resolve, reject) => {
      1979 +          const timeout = setTimeout(() => {
      1980 +            pendingFileListJC400.delete(deviceImei);
      1981 +            reject(new Error('Timeout waiting for JC400 fileNameList'));
      1982 +          }, 30000);
      1983 +          pendingFileListJC400.set(deviceImei, { resolve, reject, timeout });
      1984 +        });
      1985 + 
      1986 +        // Step 3: send TFFILELIST,<YYYYMMDD>,<camera> 
      1987 +        try {
      1988 +          const cameraId = camera !== undefined ? parseInt(camera, 10) : 0;
      1989 +          const jimiResult = await sendJimiTextCommand(jimiServer, deviceImei, token, `TFFILELIST,${date},${cameraId}`);
      1990 +          console.log(`[getFileList/JC400] TFFILELIST response:`, jimiResult);
      1991 +        } catch (e) {
      1992 +          pendingFileListJC400.delete(deviceImei);
      1993 +          console.log(`[getFileList/JC400] Failed to send TFFILELIST: ${e.message}`);
      1994 +          return res.status(500).json({ code: 1, ok: false, error: e.message });
      1995 +        }
      1996 + 
      1997 +        // Step 4: wait for device callback 
      1998 +        try {
      1999 +          const fileNameList = await waitForList;
      2000 +          return res.json({ code: 0, ok: true, imei: deviceImei, fileNameList });
      2001 +        } catch (e) {
      2002 +          console.log(`[getFileList/JC400] ${e.message} — falling back to local scan`);
      2003 +          const report = await processDeviceJC400(deviceImei);
      2004 +          return res.json(report);
      2005 +        }
      2006 +      }
      2007 + 
      2008 +      // Fallback: scan local upload folder (event files only) 
      2009        const report = await processDeviceJC400(deviceImei);
      2010        return res.json(report);
      2011      } else {

● Agora adiciono o endpoint /pushURL/pushfilelist e o /replaylist antes do catch-all:
                                                                                          
● Update(V2.0.12/iothub/iothub/listener.mjs)             
  ⎿  Added 54 lines                                                                                                                            
      2332  });                                          
      2333                                                                                                                                     
      2334  // ──────────────────────────────────────────────────────────────────────
      2335 +// 6b. JC400 file list webhook — device POSTs fileNameList here                                                                    
      2336 +// ──────────────────────────────────────────────────────────────────────                                                   
      2337 +app.post('/pushURL/pushfilelist', (req, res) => {                                                                                  
      2338 +  let body = {};                                                                                                            
      2339 +  try {
      2340 +    const raw = req.body || '';
      2341 +    // device may send JSON or URL-encoded 
      2342 +    if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
      2343 +      body = JSON.parse(raw);
      2344 +    } else {
      2345 +      const qs = querystring.parse(raw);
      2346 +      for (const [k, v] of Object.entries(qs)) {
      2347 +        try { body[k] = JSON.parse(v); } catch { body[k] = v; }
      2348 +      }
      2349 +    }
      2350 +  } catch (e) {
      2351 +    console.log(`[pushfilelist] Body parse error: ${e.message}`);
      2352 +  }
      2353 + 
      2354 +  const imei = body.imei || body.deviceImei;
      2355 +  const fileNameList = body.fileNameList || body.fileList || body.files || [];
      2356 +  console.log(`[pushfilelist] Received from ${imei}: ${Array.isArray(fileNameList) ? fileNameList.length : '?'} files`);
      2357 + 
      2358 +  res.json({ code: 0, ok: true });
      2359 + 
      2360 +  if (imei && pendingFileListJC400.has(imei)) {
      2361 +    const pending = pendingFileListJC400.get(imei);
      2362 +    clearTimeout(pending.timeout);
      2363 +    pendingFileListJC400.delete(imei);
      2364 +    pending.resolve(fileNameList);
      2365 +  }
      2366 +});
      2367 + 
      2368 +// ────────────────────────────────────────────────────────────────────── 
      2369 +// 6c. JC400 REPLAYLIST — stream a specific SD card file to media server 
      2370 +// POST { deviceImei, fileName, token, jimiServer } 
      2371 +// ────────────────────────────────────────────────────────────────────── 
      2372 +app.post('/replaylist', async (req, res) => {
      2373 +  try {
      2374 +    const { deviceImei, fileName, token, jimiServer } = JSON.parse(req.body || '{}');
      2375 +    if (!deviceImei || !fileName || !token || !jimiServer) {
      2376 +      return res.status(400).json({ code: 1, ok: false, error: 'deviceImei, fileName, token and jimiServer are required' });
      2377 +    }
      2378 +    console.log(`[replaylist] ${deviceImei} → REPLAYLIST,${fileName}`);
      2379 +    const result = await sendJimiTextCommand(jimiServer, deviceImei, token, `REPLAYLIST,${fileName}`);
      2380 +    console.log(`[replaylist] Jimi response:`, result);
      2381 +    return res.json({ code: 0, ok: true, jimiResponse: result });
      2382 +  } catch (e) {
      2383 +    console.log(`[replaylist] Error: ${e.message}`);
      2384 +    return res.status(500).json({ code: 1, ok: false, error: e.message });
      2385 +  }
      2386 +});
      2387 + 
      2388 +// ────────────────────────────────────────────────────────────────────── 
      2389  // 7. CATCH-ALL
      2390  // ──────────────────────────────────────────────────────────────────────
      2391  app.use((req, res) => {

● Agora atualizo o log de startup para listar as novas rotas:
                                                                                          
● Update(V2.0.12/iothub/iothub/listener.mjs)             
  ⎿  Added 1 line, removed 1 line                                                                                                              
      2408    console.log(`→ CORS:  *.rastreadorautoram.com.br + 192.168.*.* (http & https)`);
      2409    console.log(`→ SELF-SIGNED SSL SUPPORTED`);                                                                                      
      2410    console.log(`→ 100% DONE | NO CORS ERRORS | NO DOUBLE _000000`);
      2411 -  console.log(`→ REGISTERED ROUTES: /ftpupload, /getFileList, /pushURL/*\n`);                                                      
      2411 +  console.log(`→ REGISTERED ROUTES: /ftpupload, /getFileList, /replaylist, /pushURL/*\n`);                                  
      2412  });                                                                                                                                
                                                            
● Vamos verificar se o codigo ficou coerente:            
                                                                                          
  Searched for 1 pattern (ctrl+o to expand)              
                                                                                                                                               
● Tudo consistente. Agora e so fazer deploy no servidor: 
                                                                                                                                               
  ! scp /root/V2.0.12/iothub/iothub/listener.mjs root@50.30.32.171:~/V2.0.12/iothub/iothub/listener.mjs
                                                                                                                                               
  E reiniciar o processo listener:                                                                                                             
  ! ssh root@50.30.32.171 "pm2 restart listener"                                                                                               
                                                                                                                                               
  ---                                                                                                                                          
  Resumo do que foi implementado                                                                                                               
                                
  /getFileList (JC400 com TFFILELIST)                                                                                                          
  POST /getFileList                                                                                                                            
  { "deviceImei": "...", "deviceModel": "jc400",
    "date": "20250415", "camera": 0,                                                                                                           
    "token": "...", "jimiServer": "http://...",                                                                                                
    "iothubUrl": "http://50.30.32.171:3334" }                                                                                                  
  - Configura o webhook FILELIST,<url> automaticamente                                                                                         
  - Envia TFFILELIST,20250415,0 via proNo 128                                                                                                  
  - Aguarda ate 30s o callback do dispositivo                                                                                                  
  - Retorna { fileNameList: ["2025_04_15_10_00_00.mp4", ...] }                                                                                 
  - Fallback para scan local se o device nao responder                                                                                         
                                                                                                                                               
  /pushURL/pushfilelist — webhook que o dispositivo chama com a lista de arquivos                                                              
                                                                                                                                               
  /replaylist                                                                                                                                  
  POST /replaylist                                                                                                                             
  { "deviceImei": "...", "fileName": "2025_04_15_10_00_00.mp4",
    "token": "...", "jimiServer": "http://..." }                                                                                               
  - Envia REPLAYLIST,2025_04_15_10_00_00.mp4 via proNo 128
  - Dispositivo começa a transmitir para o iothub-media                                                                                        
  - Frontend puxa via http://{servidor}:8881/live/{IMEI}.flv                                                                                   
                                                                                                                                               
✻ Brewed for 1m 37s                                                                                                                            
                                                