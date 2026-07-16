import { Routes, Route } from 'react-router-dom'
import MapPage from './pages/MapPage.jsx'
import AdminPage from './pages/AdminPage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import TermsPage from './pages/TermsPage.jsx'
import TawkChat from './components/TawkChat.jsx'

function App() {
  return (
    <>
      <TawkChat />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/terms" element={<TermsPage />} />
      </Routes>
    </>
  )
}

export default App
