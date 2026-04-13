import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Shield, UserCheck, Clock, Check, Trash2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const UserManagement = () => {
    const { t } = useLanguage();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`/api/admin/users`);
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error("Error fetching users", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const approveUser = async (id) => {
        try {
            await axios.put(`/api/admin/users/${id}/approve`);
            fetchUsers();
        } catch (e) {
            alert(t('save_error'));
        }
    };

    const updateRole = async (id, newRole) => {
        try {
            await axios.put(`/api/admin/users/${id}/role`, { role: newRole });
            fetchUsers();
            alert(t('update_role_success'));
        } catch (e) {
            alert(t('save_error'));
        }
    };

    const deleteUser = async (id) => {
        if (!window.confirm(t('delete_user_confirm'))) return;
        try {
            await axios.delete(`/api/admin/users/${id}`);
            fetchUsers();
            alert(t('delete_user_success'));
        } catch (e) {
            alert(t('save_error'));
        }
    };

    const StatusBadge = ({ status }) => {
        const isApproved = status === 'approved';
        return (
            <span style={{
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: '600',
                background: isApproved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: isApproved ? '#22c55e' : '#f59e0b',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
            }}>
                {isApproved ? <UserCheck size={12} /> : <Clock size={12} />}
                {isApproved ? t('approved') : t('pending')}
            </span>
        );
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#6366f1' }}>{t('loading')}...</div>;

    return (
        <div>
            <h1 className="page-title">Quản lý người dùng</h1>

            <div className="glass-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <Users color="#6366f1" />
                    <h3 style={{ margin: 0 }}>Danh sách tài khoản hệ thống</h3>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>{t('full_name') || 'Họ và tên'}</th>
                            <th>Username</th>
                            <th>{t('role')}</th>
                            <th>{t('status')}</th>
                            <th>{t('created_at') || 'Ngày đăng ký'}</th>
                            <th>{t('actions') || 'Thao tác'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td><strong>{u.full_name}</strong></td>
                                <td>{u.username}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {u.role === 'admin' ? <ShieldCheck size={16} color="#6366f1" /> : <ShieldAlert size={16} color="#94a3b8" />}
                                        <select
                                            value={u.role}
                                            className="input-field"
                                            style={{ padding: '2px 8px', fontSize: '0.8rem', width: 'auto' }}
                                            onChange={(e) => updateRole(u.id, e.target.value)}
                                        >
                                            <option value="user">{t('user_role')}</option>
                                            <option value="manager">{t('manager_role')}</option>
                                            <option value="admin">{t('admin_role')}</option>
                                        </select>
                                    </div>
                                </td>
                                <td><StatusBadge status={u.status} /></td>
                                <td>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {u.status === 'pending' && (
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => approveUser(u.id)}
                                                style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                                            >
                                                <Check size={14} /> {t('approve')}
                                            </button>
                                        )}
                                        <button
                                            className="btn"
                                            onClick={() => deleteUser(u.id)}
                                            style={{ padding: '4px', color: '#ef4444' }}
                                            title={t('delete')}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;
