import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import UserProvider from './context/userContext.jsx'
import { WebRTCProvider } from './context/WebRTCContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <SocketProvider>
        <WebRTCProvider>
          <NotificationProvider>
            <App />
          </NotificationProvider>
        </WebRTCProvider>
      </SocketProvider>
    </UserProvider>
  </StrictMode>,
)


