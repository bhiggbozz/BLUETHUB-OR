import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './routes';
import './index.css'
import { Toaster } from "@bluethub/ui-kit"
import { useTokenRefresh } from './hooks/useTokenRefresh';
import { ensureAllStoresExist } from './utils/db';
import "katex/dist/katex.min.css";

function App() {
  useTokenRefresh();

  // Initialize IndexedDB stores on app startup
  useEffect(() => {
    ensureAllStoresExist().catch(err => console.error('[App] IndexedDB init failed:', err));
  }, []);

  return (
    <>
      <Toaster position="bottom-center" />
      <RouterProvider router={router} />
    </>
  );
}

export default App
