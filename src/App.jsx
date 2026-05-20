import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext.jsx';
import { useAuth } from './context/useAuth.js';
import Auth from './pages/Auth/Auth';
import Home from './pages/Home/Home';
import Quiz from './pages/Quiz/Quiz';
import Results from './pages/Results/Results';
import Profile from './pages/Profile/Profile';
import Ccp400 from './pages/Ccp400/Ccp400';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  return user ? children : <Navigate to="/auth" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/quizora">
        <Toaster position="top-center" toastOptions={{ style: { background:'var(--surface2)', color:'var(--text)', border:'1px solid var(--border-light)' } }}/>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Protected><Home /></Protected>} />
          <Route path="/quiz/:id" element={<Protected><Quiz /></Protected>} />
          <Route path="/results" element={<Protected><Results /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
          <Route path="/ccp400" element={<Protected><Ccp400 /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
