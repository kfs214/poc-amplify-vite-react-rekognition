import { Routes, Route } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { PoCContextProvider } from './contexts/PoCContext';
import UploadScreen from './screens/UploadScreen';
import LivenessScreen from './screens/LivenessScreen';
import ResultScreen from './screens/ResultScreen';

function App() {
  const { signOut } = useAuthenticator();

  return (
    <main>
      <div style={{ padding: '20px' }}>
        <h1>顔認証 PoC</h1>
        <button onClick={signOut} style={{ marginBottom: '20px' }}>Sign out</button>
        
        <PoCContextProvider>
          <Routes>
            <Route path="/" element={<UploadScreen />} />
            <Route path="/liveness" element={<LivenessScreen />} />
            <Route path="/result" element={<ResultScreen />} />
          </Routes>
        </PoCContextProvider>
      </div>
    </main>
  );
}

export default App;
