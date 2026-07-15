import { Routes, Route } from 'react-router-dom'
import MapPage from './pages/MapPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import TawkChat from './components/TawkChat.jsx'

function App() {
  return (
    <>
      <TawkChat />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </>
  )
}

export default App
