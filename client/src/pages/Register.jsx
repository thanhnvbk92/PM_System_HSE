import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, User, Lock, FileText, CheckCircle, AlertCircle, Briefcase, Building, Hash, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const Register = () => {
    const { t } = useLanguage();
    const [form, setForm] = useState({ username: '', password: '', full_name: '', employee_id: '', department: '', position: '' });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const res = await axios.post(`/api/auth/register`, form);
            setMessage(t('register_success') || res.data.message);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || t('register_failed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg" style={{ backgroundImage: 'url("/login_bg.png")' }}></div>
            <div className="auth-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem 1rem' }}>
                <div className="glass-card auth-glass" style={{ width: '100%', maxWidth: '540px', padding: '3rem', borderRadius: '24px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                        <div style={{ width: '70px', height: '70px', background: 'rgba(255, 255, 255, 0.15)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', transform: 'rotate(-10deg)', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
                            <ShieldCheck size={40} color="#fff" />
                        </div>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: '900', letterSpacing: '-0.025em', marginBottom: '0.5rem' }}>{t('register_title')}</h2>
                        <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1rem' }}>{t('pms_join_desc') || 'Join our system'}</p>
                    </div>

                    {message && (
                        <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <CheckCircle size={20} /> {message}
                        </div>
                    )}

                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{t('username')}</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input type="text" required className="input-field" style={{ width: '100%', paddingLeft: '40px' }} placeholder={t('username')} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{t('password')}</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input type="password" required className="input-field" style={{ width: '100%', paddingLeft: '40px' }} placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{t('full_name')}</label>
                            <div style={{ position: 'relative' }}>
                                <FileText size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input type="text" required className="input-field" style={{ width: '100%', paddingLeft: '40px' }} placeholder="Nguyễn Văn A" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{t('employee_id')}</label>
                                <div style={{ position: 'relative' }}>
                                    <Hash size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input type="text" required className="input-field" style={{ width: '100%', paddingLeft: '40px' }} placeholder="VD: HS12345" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{t('department')}</label>
                                <div style={{ position: 'relative' }}>
                                    <Building size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input type="text" required className="input-field" style={{ width: '100%', paddingLeft: '40px' }} placeholder="VD: IT, PM-IVI" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                                </div>
                            </div>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>{t('position')}</label>
                                <div style={{ position: 'relative' }}>
                                    <Briefcase size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input type="text" required className="input-field" style={{ width: '100%', paddingLeft: '40px' }} placeholder="VD: Kỹ sư, Manager" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !!message}
                            className="btn btn-primary"
                            style={{ width: '100%', justifyContent: 'center', padding: '0.8rem', fontSize: '1rem', background: '#fff', color: '#6366f1' }}
                        >
                            {loading ? t('processing') : t('submit_registration')}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                        {t('have_account')} <Link to="/login" style={{ color: '#fff', fontWeight: '700', textDecoration: 'underline' }}>{t('login')}</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;

