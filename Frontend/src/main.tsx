import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { RelayEnvironmentProvider } from 'react-relay'
import { Toaster } from '@/components/ui/sonner'
import { createRelayEnvironment } from '@/lib/RelayEnvironment'
import App from './App'
import './index.css'

const relayEnvironment = createRelayEnvironment()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RelayEnvironmentProvider environment={relayEnvironment}>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </RelayEnvironmentProvider>
  </StrictMode>,
)
