import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const ResellersPage = () => {
  const [searchParams] = useSearchParams();
  const reseller = searchParams.get('reseller');
  const [files, setFiles] = useState([]);
  const [folderPath, setFolderPath] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/list-files')
      .then(response => response.json())
      .then(data => {
        setFiles(data.files || []);
        setFolderPath(data.folderPath || '');
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching files:', error);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '24px',
      fontWeight: 'bold',
      gap: '20px',
      padding: '20px'
    }}>
      <div>success</div>
      
      <div style={{ 
        fontSize: '16px', 
        color: '#888',
        fontWeight: 'normal'
      }}>
        Folder: {folderPath}
      </div>
      
      {reseller && (
        <div style={{ 
          fontSize: '18px', 
          color: '#666',
          fontWeight: 'normal'
        }}>
          Reseller: {reseller}
        </div>
      )}

      <div style={{ 
        fontSize: '16px', 
        color: '#333',
        fontWeight: 'normal',
        marginTop: '40px'
      }}>
        <h3>Available Reseller Files:</h3>
        {loading ? (
          <div>Loading files...</div>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            textAlign: 'left'
          }}>
            {files.map((file, index) => (
              <div key={index} style={{
                padding: '10px',
                backgroundColor: '#f5f5f5',
                borderRadius: '5px',
                fontSize: '14px',
                fontFamily: 'monospace'
              }}>
                {file}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResellersPage;