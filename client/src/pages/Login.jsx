import React, { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, User, LogIn, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Login = () => {
    const { t } = useLanguage();
    const [credentials, setCredentials] = useState(() => {
        const savedUsername = localStorage.getItem('remembered_username') || '';
        return { username: savedUsername, password: '' };
    });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberUsername, setRememberUsername] = useState(() => {
        return !!localStorage.getItem('remembered_username');
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (rememberUsername) {
            localStorage.setItem('remembered_username', credentials.username);
        } else {
            localStorage.removeItem('remembered_username');
        }

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
                <div className="glass-card auth-glass fade-in" style={{
                    width: '100%',
                    maxWidth: '440px',
                    padding: '3.5rem 2.5rem',
                    borderRadius: '32px',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'linear-gradient(90deg, #6366f1, #ec4899)'
                    }}></div>

                    <div style={{ width: '120px', height: '120px', marginBottom: '1.5rem', margin: '0 auto', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))' }}>
                        <img src="/favicon.png" alt="PM System Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: '900', letterSpacing: '-0.05em', marginBottom: '0.5rem', color: '#fff' }}>{t('login')}</h2>
                        <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.95rem', fontWeight: '500' }}>{t('pms_management')}</p>
                    </div>

                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#fff', padding: '0.75rem', borderRadius: '8px', margin: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{t('username')}</label>
                            <div style={{ position: 'relative' }}>
                                <User size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                <input
                                    type="text" required
                                    className="input-field"
                                    style={{
                                        width: '100%',
                                        padding: '1rem 1rem 1rem 3.5rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '16px',
                                        fontSize: '1rem',
                                        color: '#fff',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                    placeholder={t('placeholder_username')}
                                    value={credentials.username}
                                    onChange={e => setCredentials({ ...credentials, username: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '2.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.9rem', fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>{t('password')}</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={20} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'} required
                                    className="input-field"
                                    style={{
                                        width: '100%',
                                        padding: '1rem 3.5rem 1rem 3.5rem',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '16px',
                                        fontSize: '1rem',
                                        color: '#fff',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                    }}
                                    placeholder="••••••••"
                                    value={credentials.password}
                                    onChange={e => setCredentials({ ...credentials, password: e.target.value })}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '16px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.4)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '4px',
                                        transition: 'color 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.8)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center' }}>
                            <input
                                type="checkbox"
                                id="rememberUsername"
                                checked={rememberUsername}
                                onChange={(e) => setRememberUsername(e.target.checked)}
                                style={{
                                    marginRight: '0.6rem',
                                    width: '18px',
                                    height: '18px',
                                    accentColor: '#6366f1',
                                    cursor: 'pointer'
                                }}
                            />
                            <label htmlFor="rememberUsername" style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', userSelect: 'none' }}>
                                {t('remember_username')}
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                padding: '1rem',
                                fontSize: '1rem',
                                fontWeight: '700',
                                background: '#fff',
                                color: '#6366f1',
                                borderRadius: '12px',
                                boxShadow: '0 10px 20px -5px rgba(0,0,0,0.3)',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {loading ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(99, 102, 241, 0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    {t('authenticating')}
                                </span>
                            ) : <><LogIn size={20} style={{ marginRight: '0.5rem' }} /> {t('login')}</>}
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

