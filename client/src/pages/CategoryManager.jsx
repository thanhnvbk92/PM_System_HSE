import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layers, Trash2, Plus, Pencil, Check, X, Download } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const CategoryManager = () => {
    const { t } = useLanguage();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state for new category
    const [newCat, setNewCat] = useState({ name: '', description: '' });

    // Edit state
    const [editing, setEditing] = useState({ id: null, name: '', description: '' });

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/categories');
            setCategories(res.data);
        } catch (e) {
            console.error("Error fetching categories:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newCat.name.trim()) return;
        try {
            await axios.post('/api/categories', newCat);
            setNewCat({ name: '', description: '' });
            fetchCategories();
        } catch (err) {
            alert(err.response?.data?.error || "Error adding category");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(t('confirm_delete') || "Are you sure?")) return;
        try {
            await axios.delete(`/api/categories/${id}`);
            fetchCategories();
        } catch (err) {
            alert(err.response?.data?.error || "Error deleting category");
        }
    };

    const startEdit = (cat) => {
        setEditing({ id: cat.id, name: cat.name, description: cat.description || '' });
    };

    const saveEdit = async () => {
        if (!editing.name.trim()) return;
        try {
            await axios.put(`/api/categories/${editing.id}`, {
                name: editing.name,
                description: editing.description
            });
            setEditing({ id: null, name: '', description: '' });
            fetchCategories();
        } catch (err) {
            alert(err.response?.data?.error || "Error updating category");
        }
    };

    if (loading && categories.length === 0) return <div className="p-8">{t('loading')}</div>;

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="page-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Layers size={32} color="#6366f1" />
                    {t('categories') || 'Quản lý Loại Item'}
                </h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* NEW CATEGORY FORM */}
                <div className="glass-card" style={{ height: 'fit-content' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>{t('add_new_category') || 'Thêm loại mới'}</h3>
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label>{t('category_name') || 'Tên loại'} (*)</label>
                            <input
                                type="text"
                                required
                                className="input-field"
                                value={newCat.name}
                                onChange={e => setNewCat({ ...newCat, name: e.target.value })}
                                placeholder="e.g. Spare Part, Consumable..."
                            />
                        </div>
                        <div className="form-group">
                            <label>{t('description')}</label>
                            <textarea
                                className="input-field"
                                rows="3"
                                value={newCat.description}
                                onChange={e => setNewCat({ ...newCat, description: e.target.value })}
                                style={{ resize: 'none' }}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
                            <Plus size={18} /> {t('add')}
                        </button>
                    </form>
                </div>

                {/* CATEGORIES LIST */}
                <div className="glass-card">
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.25rem' }}>{t('category_list') || 'Danh sách loại'} ({categories.length})</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>ID</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>{t('category_name') || 'Tên loại'}</th>
                                    <th style={{ textAlign: 'left', padding: '1rem' }}>{t('description')}</th>
                                    <th style={{ textAlign: 'center', padding: '1rem' }}>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map(cat => (
                                    <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="hover-row">
                                        <td style={{ padding: '1rem', color: '#64748b' }}>#{cat.id}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {editing.id === cat.id ? (
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={editing.name}
                                                    onChange={e => setEditing({ ...editing, name: e.target.value })}
                                                    style={{ padding: '0.4rem' }}
                                                />
                                            ) : (
                                                <strong style={{ color: '#1e293b' }}>{cat.name}</strong>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', color: '#475569' }}>
                                            {editing.id === cat.id ? (
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    value={editing.description}
                                                    onChange={e => setEditing({ ...editing, description: e.target.value })}
                                                    style={{ padding: '0.4rem', width: '100%' }}
                                                />
                                            ) : (
                                                cat.description || '---'
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                                                {editing.id === cat.id ? (
                                                    <>
                                                        <button onClick={saveEdit} className="btn" style={{ color: '#22c55e', padding: '0.4rem' }} title={t('save')}>
                                                            <Check size={18} />
                                                        </button>
                                                        <button onClick={() => setEditing({ id: null, name: '', description: '' })} className="btn" style={{ color: '#64748b', padding: '0.4rem' }} title={t('cancel')}>
                                                            <X size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn" onClick={() => startEdit(cat)} style={{ color: '#6366f1', padding: '0.4rem' }} title={t('edit')}>
                                                            <Pencil size={18} />
                                                        </button>
                                                        <button className="btn" onClick={() => handleDelete(cat.id)} style={{ color: '#ef4444', padding: '0.4rem' }} title={t('delete')}>
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {categories.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                            {t('no_data') || 'Không có dữ liệu'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                .hover-row:hover { background: #f8fafc; }
                .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
                .form-group label { font-size: 0.85rem; font-weight: 700; color: #475569; }
                .input-field { padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; font-family: inherit; font-size: 0.9rem; transition: all 0.2s; }
                .input-field:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
            `}</style>
        </div>
    );
};

export default CategoryManager;
