import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, Activity, AlertTriangle, Clock, ShieldCheck, TrendingUp, BarChart2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, LineChart, Line } from 'recharts';

const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="glass-card stat-card">
        <div style={{ color, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon size={24} />
            <span className="stat-label">{label}</span>
        </div>
        <div className="stat-value">{value}</div>
    </div>
);

const Dashboard = () => {
    const { t } = useLanguage();
    const [stats, setStats] = useState({ total: 0, ok: 0, ng: 0, okExpired: 0 });
    const [equipment, setEquipment] = useState([]);
    const [trends, setTrends] = useState({ transactions: [], ngTrends: [], calibTrends: [] });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch Equipment
                const eqRes = await axios.get(`/api/equipment`);
                const eqData = Array.isArray(eqRes.data) ? eqRes.data : [];
                setEquipment(eqData);

                const total = eqData.length;
                const ok = eqData.filter(e => e.status === 'OK' || e.status === 'Available' || e.status === 'In Use').length;
                const ng = eqData.filter(e => e.status === 'NG' || e.status === 'Broken' || e.status === 'Maintenance').length;
                const okExpired = eqData.filter(e => (e.status === 'OK' || e.status === 'Available' || e.status === 'In Use') && e.is_calibrated && new Date(e.expiry_date) < new Date()).length;

                setStats({ total, ok, ng, okExpired });

                // Fetch Trends separately
                axios.get(`/api/stats/trends`)
                    .then(res => setTrends(res.data || { transactions: [], ngTrends: [], calibTrends: [] }))
                    .catch(e => console.error("Trend data error:", e));

            } catch (err) {
                console.error("Error fetching equipment data", err);
            }
        };
        fetchData();
    }, []);

    return (
        <div>
            <h1 className="page-title">{t('pms_management')}</h1>

            <div className="stat-grid">
                <StatCard icon={Package} label="Tổng thiết bị" value={stats.total} color="#6366f1" />
                <StatCard icon={ShieldCheck} label="Thiết bị OK" value={stats.ok} color="#22c55e" />
                <StatCard icon={AlertTriangle} label="Thiết bị NG" value={stats.ng} color="#ef4444" />
                <StatCard icon={Clock} label="OK Hết hạn hiệu chuẩn" value={stats.okExpired} color="#f59e0b" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="glass-card" style={{ padding: '1.5rem', height: '380px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <TrendingUp size={20} color="#6366f1" />
                        <h3 style={{ margin: 0 }}>Xu hướng Nhập/Xuất hàng ngày</h3>
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <AreaChart data={trends.transactions}>
                            <defs>
                                <linearGradient id="colorImport" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExport" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }} />
                            <Legend iconType="circle" />
                            <Area type="monotone" dataKey="imports" name="Nhập kho" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorImport)" />
                            <Area type="monotone" dataKey="exports" name="Xuất kho" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorExport)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', minHeight: '380px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <ShieldCheck size={20} color="#10b981" />
                        <h3 style={{ margin: 0 }}>Số lượng thiết bị Hiệu chuẩn hằng ngày</h3>
                    </div>
                    <div style={{ flex: 1, minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trends.calibTrends || []}>
                                <defs>
                                    <linearGradient id="colorCalib" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }} />
                                <Area type="monotone" dataKey="count" name="Đã hiệu chuẩn" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCalib)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', height: '380px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <BarChart2 size={20} color="#ef4444" />
                        <h3 style={{ margin: 0 }}>Số lượng thiết bị lỗi (NG) phát sinh</h3>
                    </div>
                    <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={trends.ngTrends}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => new Date(val).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' })} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)' }} />
                            <Line type="stepAfter" dataKey="count" name="Số lượng lỗi" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-card">
                <h3 style={{ marginBottom: '1rem' }}>{t('recently_updated')}</h3>
                <table>
                    <thead>
                        <tr>
                            <th>{t('eq_code')} / {t('eq_name')}</th>
                            <th>{t('status')}</th>
                            <th>{t('line_station')}</th>
                            <th>{t('calibration')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(equipment) && equipment.length > 0 ? (
                            equipment.slice(0, 5).map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <strong>{item.code}</strong>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.name}</div>
                                    </td>
                                    <td>
                                        <span className={`badge status-${item.status ? item.status.toLowerCase().replace(' ', '-') : 'ok'}`}>
                                            {item.status === 'OK' ? 'Sẵn sàng (OK)' :
                                                item.status === 'NG' ? 'Lỗi/Hỏng (NG)' :
                                                    item.status === 'In Use' ? 'Đang dùng' :
                                                        item.status === 'Maintenance' ? 'Bảo trì' : (item.status || 'OK')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>{item.line_name || '---'} &gt; {item.station_name || '---'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.jig_name || '---'}</div>
                                    </td>
                                    <td>
                                        {item.is_calibrated ? (
                                            <span style={{ fontSize: '0.75rem', color: (item.expiry_date && new Date(item.expiry_date) < new Date()) ? '#dc2626' : '#059669' }}>
                                                {(item.expiry_date && new Date(item.expiry_date) < new Date()) ? t('expired_badge') : t('valid_badge')}
                                            </span>
                                        ) : <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>N/A</span>}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>{t('no_data')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            <style>{`
          .badge { padding: 0.35rem 0.75rem; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; }
          .status-available, .status-ok { background: #dcfce7; color: #15803d; border: 1px solid #bcf0da; }
          .status-in-use { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
          .status-maintenance { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
          .status-ng, .status-broken { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
      `}</style>
        </div>
    );
};

export default Dashboard;
