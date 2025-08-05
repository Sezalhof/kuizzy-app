import React, { useEffect, useState } from 'react';

const ApiTestPage = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('https://us-central1-kuizzy-app.cloudfunctions.net/api')
      .then((res) => res.json())
      .then((result) => setData(result))
      .catch((error) => console.error('API Error:', error));
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">API Test Page</h1>
      {data ? (
        <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
};

export default ApiTestPage;
