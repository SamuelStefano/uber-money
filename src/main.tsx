import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Buffer } from 'buffer'
import './index.css'
import { App } from './App'
import { AppWalletProvider } from '@/providers/WalletProvider'

;(globalThis as { Buffer?: typeof Buffer }).Buffer = Buffer

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppWalletProvider>
        <App />
      </AppWalletProvider>
    </QueryClientProvider>
  </StrictMode>,
)
