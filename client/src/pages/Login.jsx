import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Login = () => {
    const { t } = useLanguage();
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post(`/api/auth/login`, credentials);
            login(res.data.token, res.data.user);
            navigate('/');
        } catch (err) {
            console.error(err);
            if (!err.response) {
                setError(`${t('network_error')}`);
            } else {
                setError(err.response.data?.error || `${t('login_failed')}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg" style={{ backgroundImage: 'url("/login_bg.png")' }}></div>
            <div className="auth-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
                <div className="glass-card auth-glass" style={{ width: '100%', maxWidth: '440px', padding: '3rem', borderRadius: '24px' }}>
                    <div style={{ width: '80px', height: '80px', marginBottom: '1.5rem', margin: '0 auto' }}>
                        <img src="/logo.png" alt="PM System Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: '900', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>{t('login')}</h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1rem' }}>{t('pms_management')}</p>

                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fff', padding: '0.75rem', borderRadius: '8px', margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>{t('username')}</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                                <input
                                    type="text" required
                                    className="input-field"
                                    style={{ width: '100%', paddingLeft: '40px' }}
                                    placeholder={t('placeholder_username')}
                                    value={credentials.username}
                                    onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600' }}>{t('password')}</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)' }} />
                                <input
                                    type="password" required
                                    className="input-field"
                                    style={{ width: '100%', paddingLeft: '40px' }}
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '1rem', background: '#fff', color: '#6366f1' }}
                        >
                            {loading ? t('authenticating') : <><LogIn size={20} style={{ marginRight: '0.5rem' }} /> {t('login')}</>}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                        {t('dont_have_account')} <Link to="/register" style={{ color: '#fff', fontWeight: '700', textDecoration: 'underline' }}>{t('register_now')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;

