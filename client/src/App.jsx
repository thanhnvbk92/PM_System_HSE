import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    ArrowLeftRight,
    ShieldCheck,
    Settings,
    Bell,
    MapPin,
    Users,
    LogOut,
    Menu,
    X
} from 'lucide-react';

import { AuthProvider, useAuth } from './context/AuthContext';
import { useLanguage } from './context/LanguageContext';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import Transactions from './pages/Transactions';
import Calibrations from './pages/Calibrations';
import LocationManager from './pages/LocationManager';
import UserManagement from './pages/UserManagement';
import Login from './pages/Login';
import Register from './pages/Register';
import './index.css';

const SidebarItem = ({ to, icon: Icon, labelKey }) => {
    const location = useLocation();
    const { t } = useLanguage();
    const isActive = location.pathname === to;

    return (
        <Link to={to} className={`nav-item ${isActive ? 'active' : ''}`}>
            <div className="nav-item-content">
                <Icon size={20} className="nav-item-icon" />
                <span className="nav-item-label">{t(labelKey)}</span>
            </div>
        </Link>
    );
};

const PrivateRoute = ({ children, adminOnly = false }) => {
    const { user, loading } = useAuth();
    const { t } = useLanguage();
    if (loading) return <div>{t('loading')}</div>;
    if (!user) return <Navigate to="/login" />;
    if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
    return children;
};

const MainLayout = ({ children }) => {
    const { user, logout } = useAuth();
    const { lang, setLang, t } = useLanguage();
    const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
    const location = useLocation();

    const [contextMenu, setContextMenu] = React.useState({ x: 0, y: 0, visible: false });

    // --- IDLE TIMER LOGIC ---
    // Tự động đăng xuất sau 30 phút không hoạt động
    const timeoutRef = React.useRef(null);
    const IDLE_TIME = 30 * 60 * 1000; // 30 mins

    const resetTimer = React.useCallback(() => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            console.log('[IDLE] User inactive for 30 mins. Logging out...');
            logout();
        }, IDLE_TIME);
    }, [logout]);

    React.useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
        const handleActivity = () => resetTimer();

        events.forEach(event => window.addEventListener(event, handleActivity));
        resetTimer();

        return () => {
            events.forEach(event => window.removeEventListener(event, handleActivity));
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [resetTimer]);

    // --- CONTEXT MENU LOGIC ---
    const handleContextMenu = (e) => {
        e.preventDefault();
        setContextMenu({
            x: e.pageX,
            y: e.pageY,
            visible: true
        });
    };

    React.useEffect(() => {
        const handleClick = () => setContextMenu({ ...contextMenu, visible: false });
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, [contextMenu]);

    return (
        <div className="app-container">
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

            <aside className={`sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '0.5rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img src="/logo.png" alt="PM System Logo" style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
                        <span style={{ fontWeight: '800', fontSize: '1.25rem', color: '#1e293b' }}>{t('pms_system')}</span>
                    </div>
                    <button
                        className="mobile-toggle"
                        onClick={() => setIsSidebarOpen(false)}
                        style={{ display: 'none', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <SidebarItem to="/" icon={LayoutDashboard} labelKey="dashboard" />
                    <SidebarItem to="/equipment" icon={Package} labelKey="equipment" />
                    <SidebarItem to="/transactions" icon={ArrowLeftRight} labelKey="transactions" />
                    <SidebarItem to="/calibrations" icon={ShieldCheck} labelKey="calibrations" />

                    {user?.role === 'admin' && (
                        <>
                            <div className="sidebar-group-label">{t('admin_group')}</div>
                            <SidebarItem to="/locations" icon={MapPin} labelKey="locations" />
                            <SidebarItem to="/users" icon={Users} labelKey="users" />
                        </>
                    )}

                    <div className="sidebar-footer">
                        <SidebarItem to="/settings" icon={Settings} labelKey="settings" />
                        <button onClick={logout} className="nav-item nav-logout">
                            <div className="nav-item-content">
                                <LogOut size={20} className="nav-item-icon" />
                                <span className="nav-item-label">{t('logout')}</span>
                            </div>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Area */}
            <main className="main-content">
                <header className="top-bar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            className="mobile-toggle"
                            onClick={() => setIsSidebarOpen(true)}
                            style={{ display: 'none', background: 'none', border: 'none', color: '#1e293b', cursor: 'pointer' }}
                        >
                            <Menu size={28} />
                        </button>
                        <h2 style={{ margin: 0 }}>{t('factory_management')}</h2>
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        {/* Language Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', marginRight: '0.4rem', color: '#64748b' }}>LANG:</span>
                            <select
                                value={lang}
                                onChange={(e) => setLang(e.target.value)}
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontWeight: 'bold', cursor: 'pointer', color: '#6366f1', fontSize: '0.85rem' }}
                            >
                                <option value="vi">🇻🇳 VI</option>
                                <option value="en">🇺🇸 EN</option>
                                <option value="ko">🇰🇷 KO</option>
                            </select>
                        </div>

                        <Bell size={20} style={{ color: '#94a3b8', cursor: 'pointer' }} />
                        <div
                            onContextMenu={handleContextMenu}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingLeft: '1rem', borderLeft: '1px solid #e2e8f0', cursor: 'context-menu', position: 'relative' }}
                        >
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                {user?.username?.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ fontSize: '0.85rem' }}>
                                <div style={{ fontWeight: '600' }}>{user?.full_name}</div>
                                <div style={{ color: '#64748b', fontSize: '0.75rem', textTransform: 'capitalize' }}>{user?.role}</div>
                            </div>

                            {/* Custom Context Menu */}
                            {contextMenu.visible && (
                                <div style={{
                                    position: 'fixed',
                                    top: contextMenu.y,
                                    left: contextMenu.x,
                                    background: '#fff',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                    borderRadius: '10px',
                                    padding: '0.5rem',
                                    zIndex: 1000,
                                    minWidth: '150px',
                                    border: '1px solid #e2e8f0',
                                    animation: 'fadeIn 0.1s ease-out'
                                }}>
                                    <button
                                        onClick={logout}
                                        style={{
                                            width: '100%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem 1rem',
                                            background: 'none',
                                            border: 'none',
                                            borderRadius: '6px',
                                            color: '#ef4444',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        className="context-menu-item"
                                    >
                                        <LogOut size={18} />
                                        <span>{t('logout')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div style={{ padding: '1.5rem' }}>
                    {children}
                </div>
            </main>
        </div>
    );
};

const App = () => {
    const { t } = useLanguage();
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<div style={{ paddingTop: '5rem' }}><Login /></div>} />
                    <Route path="/register" element={<div style={{ paddingTop: '5rem' }}><Register /></div>} />

                    <Route path="/" element={<PrivateRoute><MainLayout><Dashboard /></MainLayout></PrivateRoute>} />
                    <Route path="/equipment" element={<PrivateRoute><MainLayout><Equipment /></MainLayout></PrivateRoute>} />
                    <Route path="/transactions" element={<PrivateRoute><MainLayout><Transactions /></MainLayout></PrivateRoute>} />
                    <Route path="/calibrations" element={<PrivateRoute><MainLayout><Calibrations /></MainLayout></PrivateRoute>} />

                    <Route path="/locations" element={<PrivateRoute adminOnly={true}><MainLayout><LocationManager /></MainLayout></PrivateRoute>} />
                    <Route path="/users" element={<PrivateRoute adminOnly={true}><MainLayout><UserManagement /></MainLayout></PrivateRoute>} />
                    <Route path="/settings" element={<PrivateRoute><MainLayout><div className="glass-card">{t('settings_page')}</div></MainLayout></PrivateRoute>} />

                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
};

export default App;
