Firebase.js
// src/App.js
import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// ✅ Inline SVG icons
const CheckIcon = () => (
  <svg className="h-5 w-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const WarnIcon = () => (
  <svg className="h-5 w-5 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugMessage, setDebugMessage] = useState('Testing connection...');
  const [debugStatus, setDebugStatus] = useState('pending'); // 'success' | 'failed' | 'pending'
  const [connectionStatus, setConnectionStatus] = useState({
    isOnline: false,
    lastChecked: null,
    error: null,
  });

  // ✅ Firestore Debug with cache-first then server check
  useEffect(() => {
    const testFirestoreConnection = async () => {
      const testDocRef = doc(db, "debug_tests", "connection_check");

      try {
        const cachedSnap = await getDoc(testDocRef, { source: 'cache' });
        if (cachedSnap.exists()) {
          setDebugMessage("⚡ Loaded from cache: " + cachedSnap.data().status);
        }

        const freshSnap = await getDoc(testDocRef, { source: 'server' });
        if (freshSnap.exists()) {
          setDebugMessage("✅ Firestore online: " + freshSnap.data().status);
          setDebugStatus('success');
        } else {
          setDebugMessage("❌ Document not found on server");
          setDebugStatus('failed');
        }
      } catch (error) {
        setDebugMessage(`❌ Error: ${error.code} - ${error.message}`);
        setDebugStatus('failed');
      }
    };

    testFirestoreConnection();
  }, []);

  // ✅ Network Resilience Layer (auto-check every 2 min)
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isOk = await testConnection();
        setConnectionStatus({
          isOnline: isOk,
          lastChecked: new Date().toISOString(),
          error: null,
        });
      } catch (error) {
        setConnectionStatus({
          isOnline: false,
          lastChecked: new Date().toISOString(),
          error: error.message,
        });
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 120000);
    return () => clearInterval(interval);
  }, []);

  // ✅ Improved testConnection() with retry logic
  const testConnection = async (attempt = 1) => {
    try {
      const docRef = doc(db, "_connection_tests", `test_${Date.now()}`);
      await setDoc(docRef, { timestamp: new Date() });
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (error) {
      if (attempt <= 3) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return testConnection(attempt + 1);
      }
      throw error;
    }
  };

  // ✅ Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("✅ Logged in successfully!");
      window.location.reload();
    } catch (error) {
      alert("❌ Login failed: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">Kuizzy</h1>

      {/* ✅ Connection Status */}
      <div className={`p-3 mb-4 rounded-lg border ${
        connectionStatus.isOnline
          ? 'bg-green-50 border-green-200 text-green-800'
          : 'bg-yellow-50 border-yellow-200 text-yellow-800'
      }`}>
        <div className="flex items-center">
          {connectionStatus.isOnline ? (
            <>
              <CheckIcon />
              <span>Live connection established</span>
            </>
          ) : (
            <>
              <WarnIcon />
              <div>
                <p>Offline mode - using cached data</p>
                {connectionStatus.error && (
                  <p className="text-xs mt-1">Error: {connectionStatus.error}</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ Firestore Debug Display */}
      <div className={`p-3 mb-4 rounded-md ${
        debugStatus === 'success' ? 'bg-green-100 border border-green-400' :
        debugStatus === 'failed' ? 'bg-red-100 border border-red-400' :
        'bg-yellow-100 border border-yellow-400'
      }`}>
        <h3 className="font-bold mb-1">Firestore Debug:</h3>
        <div className="flex items-center">
          {debugStatus === 'success' && <span className="mr-2">✅</span>}
          {debugStatus === 'failed' && <span className="mr-2">❌</span>}
          {debugStatus === 'pending' && <span className="mr-2">⏳</span>}
          <span>{debugMessage}</span>
        </div>
      </div>

      {/* ✅ Login Form */}
      <form onSubmit={handleLogin} className="mt-4">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="block w-full p-2 border mb-2 rounded"
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="block w-full p-2 border mb-2 rounded"
          placeholder="Password"
          required
        />
        <button
          type="submit"
          disabled={isLoading}
          className={`bg-blue-500 hover:bg-blue-600 text-white p-2 w-full rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <p className="mt-4 text-sm text-gray-600">Check browser console (F12) for detailed logs</p>
    </div>
  );
}

export default App;


