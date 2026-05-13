import { useState } from 'react';
import { registerUser, loginUser, loginWithGoogle } from '../../firebase/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn, UserPlus, Globe } from 'lucide-react';
import './Auth.css';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await loginUser(email, password);
      } else {
        await registerUser(email, password, name);
      }
      navigate('/');
    } catch (err) {
      toast.error(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card glass">
        <div className="auth-logo">
          <span className="logo-q">Q</span>uizora
        </div>
        <p className="auth-tagline">Master any subject. Track your progress.</p>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Sign In</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <input className="auth-input" type="text" placeholder="Your name" value={name}
              onChange={e => setName(e.target.value)} required />
          )}
          <input className="auth-input" type="email" placeholder="Email address" value={email}
            onChange={e => setEmail(e.target.value)} required />
          <input className="auth-input" type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? <><LogIn size={16}/> Sign In</> : <><UserPlus size={16}/> Create Account</>}
          </button>
        </form>

        <div className="auth-divider"><span>or</span></div>

        <button className="btn-google" onClick={handleGoogle} disabled={loading}>
          <Globe size={18}/> Continue with Google
        </button>
      </div>
    </div>
  );
}
