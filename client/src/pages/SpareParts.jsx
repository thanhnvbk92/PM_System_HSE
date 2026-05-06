import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import {
    Plus, Search, Warehouse, MapPin, Monitor, Printer, Camera, Download,
    Upload, X, Check, Zap, Maximize, Wrench, History, Filter,
    ShieldCheck, AlertTriangle, LayoutGrid, List, MoreVertical, Edit2, Trash2, ArrowRight
} from 'lucide-react';
import Papa from 'papaparse';
import { useLanguage } from '../context/LanguageContext';

const SpareParts = () => {
    const { t, lang } = useLanguage();
    const [items, setItems] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
    const [columnFilters, setColumnFilters] = useState({
        category: '',
        owner_company: '',
        status: '',
    });
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(60);

    // Form State
    const [newPart, setNewPart] = useState({
        code: '', name: '', part_no: '', specification: '',
        category_id: '', owner_company: 'LGE', status: 'OK',
        image_url: '',
        current_quantity: 0, unit: 'ea', min_stock: 0
    });

    const [categories, setCategories] = useState([]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const s = searchTerm.toLowerCase().trim();
            const matchesSearch = !s ||
                item.code?.toLowerCase().includes(s) ||
                item.name?.toLowerCase().includes(s) ||
                item.part_no?.toLowerCase().includes(s);

            const matchesCategory = !columnFilters.category || (item.category === columnFilters.category || item.category_name === columnFilters.category);
            const matchesOwner = !columnFilters.owner_company || item.owner_company === columnFilters.owner_company;
            const matchesStatus = !columnFilters.status || item.status === columnFilters.status;

            return matchesSearch && matchesCategory && matchesOwner && matchesStatus;
        });
    }, [items, searchTerm, columnFilters]);

    const resetFilters = () => {
        setSearchTerm('');
        setColumnFilters({ category: '', owner_company: '', status: '' });
    };

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/spare-parts`);
            setItems(res.data);
        } catch (e) {
            console.error("Error fetching items:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await axios.get(`/api/categories`);
            setCategories(res.data);
        } catch (e) {
            console.error("Error fetching categories:", e);
        }
    };

    useEffect(() => {
        fetchItems();
        fetchCategories();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            if (newPart.id) {
                await axios.put(`/api/spare-parts/${newPart.id}`, newPart);
                alert(lang === 'vi' ? "Cập nhật linh kiện thành công!" : "Spare part updated successfully!");
            } else {
                await axios.post(`/api/spare-parts`, newPart);
                alert(lang === 'vi' ? "Thêm mới thành công!" : "Added successfully!");
            }
            setShowModal(false);
            fetchItems();
            resetNewPart();
        } catch (err) {
            alert(lang === 'vi' ? "Lỗi khi lưu dữ liệu" : "Error saving spare part");
        }
    };

    const handleEdit = (item) => {
        setNewPart({ ...item });
        setShowModal(true);
    };

    const resetNewPart = () => {
        setNewPart({
            code: '', name: '', part_no: '', specification: '', category_id: '', owner_company: 'LGE', status: 'OK', image_url: '', current_quantity: 0, unit: 'ea', min_stock: 0
        });
    };

    const handleDelete = async (id) => {
        if (!window.confirm(lang === 'vi' ? 'Bạn có chắc chắn muốn xóa linh kiện này?' : 'Are you sure you want to delete this spare part?')) return;
        try {
            await axios.delete(`/api/spare-parts/${id}`);
            fetchItems();
        } catch (e) {
            alert('Lỗi khi xóa: ' + e.message);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('image', file);
        try {
            const res = await axios.post(`/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setNewPart({ ...newPart, image_url: res.data.url });
        } catch (err) {
            alert("Lỗi upload ảnh");
        }
    };

    const handleExportCSV = () => {
        const csvData = filteredItems.map(item => ({
            'Mã': item.code,
            'Tên Linh Kiện': item.name,
            'Part No': item.part_no || '',
            'Danh mục': item.category || '',
            'Số Lượng Tồn': item.current_quantity || 0,
            'Mức Tối Thiểu': item.min_stock || 0,
            'Đơn vị': item.unit || 'ea',
            'Trạng Thái': item.status || 'OK',
            'Sở hữu': item.owner_company || ''
        }));
        const csv = Papa.unparse(csvData);
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `Bao_Cao_Ton_Kho_SP_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const InventoryHealth = ({ current, min }) => {
        const ratio = min > 0 ? (current / min) * 100 : 100;
        let color = '#10b981'; // Green
        if (current <= min) color = '#ef4444'; // Red
        else if (current <= min * 1.5) color = '#f59e0b'; // Amber

        const displayWidth = Math.min(Math.max(ratio, 10), 100);

        return (
            <div className="health-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', color: color }}>
                        {current <= min ? (lang === 'vi' ? 'Sắp hết hàng' : 'Low Stock') : (lang === 'vi' ? 'An toàn' : 'Safe')}
                    </span>
                    <span style={{ color: '#64748b' }}>{Number(current).toFixed(2)} / {Number(min).toFixed(2)}</span>
                </div>
                <div className="health-bar-bg">
                    <div className="health-bar-fill" style={{ width: `${displayWidth}%`, backgroundColor: color }}></div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ paddingBottom: '2rem' }}>
            <div className="top-bar" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <h1 className="page-title" style={{ margin: 0 }}>{lang === 'vi' ? 'Quản lý Spare Part' : 'Spare Part Management'}</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{lang === 'vi' ? 'Giám sát tồn kho và linh kiện thay thế' : 'Monitoring inventory and replacements'}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px', display: 'flex' }}>
                        <button
                            className={`btn ${viewMode === 'grid' ? 'btn-primary' : ''}`}
                            onClick={() => setViewMode('grid')}
                            style={{ padding: '0.5rem', borderRadius: '8px', boxShadow: viewMode === 'grid' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none' }}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            className={`btn ${viewMode === 'table' ? 'btn-primary' : ''}`}
                            onClick={() => setViewMode('table')}
                            style={{ padding: '0.5rem', borderRadius: '8px', boxShadow: viewMode === 'table' ? '0 4px 6px rgba(0,0,0,0.1)' : 'none' }}
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <button className="btn glass-card" onClick={handleExportCSV} style={{ border: '1px solid #e2e8f0' }}>
                        <Download size={18} /> <span className="mobile-hide">Export</span>
                    </button>
                    <button className="btn btn-primary" onClick={() => { resetNewPart(); setShowModal(true); }}>
                        <Plus size={18} /> {t('add')}
                    </button>
                </div>
            </div>

            {/* Thống kê nhanh cao cấp */}
            <div className="stat-grid" style={{ marginBottom: '2.5rem' }}>
                <div className="glass-card stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)', borderLeft: '4px solid #6366f1' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label">TOTAL PARTS</span>
                            <div className="stat-value" style={{ color: '#1e293b' }}>{items.length}</div>
                        </div>
                        <div style={{ background: '#e0e7ff', padding: '0.75rem', borderRadius: '12px' }}>
                            <Warehouse size={24} color="#6366f1" />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: '0.5rem', fontWeight: '600' }}>
                        {lang === 'vi' ? `Đang hiển thị ${filteredItems.length} kết quả` : `Showing ${filteredItems.length} results`}
                    </div>
                </div>

                <div className="glass-card stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #fff1f2 100%)', borderLeft: '4px solid #ef4444' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label">CRITICAL STOCK</span>
                            <div className="stat-value" style={{ color: '#ef4444' }}>
                                {items.filter(i => i.current_quantity <= i.min_stock).length}
                            </div>
                        </div>
                        <div style={{ background: '#fee2e2', padding: '0.75rem', borderRadius: '12px' }}>
                            <AlertTriangle size={24} color="#ef4444" />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '0.5rem', fontWeight: '600' }}>
                        {lang === 'vi' ? 'Cần nhập hàng ngay' : 'Reorder required soon'}
                    </div>
                </div>

                <div className="glass-card stat-card" style={{ background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)', borderLeft: '4px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <span className="stat-label">CATEGORIES</span>
                            <div className="stat-value" style={{ color: '#10b981' }}>{categories.length}</div>
                        </div>
                        <div style={{ background: '#dcfce7', padding: '0.75rem', borderRadius: '12px' }}>
                            <Filter size={24} color="#10b981" />
                        </div>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.5rem', fontWeight: '600' }}>
                        Organized items
                    </div>
                </div>
            </div>

            <div className="glass-card search-container" style={{ position: 'sticky', top: '0', zIndex: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', marginBottom: '2rem' }}>
                <div className="search-header">
                    <div className="search-main" style={{ flex: 1 }}>
                        <div className="search-input-wrapper" style={{ background: '#f8fafc', borderRadius: '14px' }}>
                            <Search size={20} className="search-icon" color="#64748b" />
                            <input
                                type="text"
                                placeholder={lang === 'vi' ? "Tìm theo tên, mã linh kiện, part no..." : "Search by name, code, P/N..."}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="search-input"
                                style={{ background: 'transparent' }}
                            />
                        </div>
                    </div>

                    <div className="filter-dashboard" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <select
                            value={columnFilters.category}
                            onChange={e => setColumnFilters({ ...columnFilters, category: e.target.value })}
                            className="filter-select glass-card"
                            style={{ padding: '0.625rem 1rem', borderRadius: '12px', minWidth: '140px' }}
                        >
                            <option value="">Category: {t('all')}</option>
                            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>

                        {(searchTerm || columnFilters.category) && (
                            <button className="btn" onClick={resetFilters} style={{ color: '#ef4444', padding: '0.5rem' }}>
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="spinner"></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>{t('loading')}...</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="spare-part-grid">
                    {filteredItems.slice(0, visibleCount).map(item => (
                        <div key={item.id} className="glass-card spare-part-card">
                            <div className="card-image-wrapper">
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.name} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#cbd5e1' }}>
                                        <Wrench size={64} strokeWidth={1} />
                                    </div>
                                )}
                                <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
                                    <span className={`badge ${item.status === 'OK' ? 'badge-success' : 'badge-danger'}`} style={{
                                        backgroundColor: item.status === 'OK' ? '#10b981' : '#ef4444',
                                        color: 'white',
                                        padding: '4px 12px',
                                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                                    }}>
                                        {item.status}
                                    </span>
                                </div>
                            </div>
                            <div className="card-content">
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        {item.category_name || item.category || 'Spare Part'}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{item.owner_company}</span>
                                </div>
                                <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>{item.name}</h3>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                                    <span style={{ fontWeight: '600' }}>{item.code}</span> • P/N: {item.part_no || '---'}
                                </div>

                                <InventoryHealth current={item.current_quantity} min={item.min_stock} />

                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                                    <button className="btn" style={{ flex: 1, justifyContent: 'center', background: '#f8fafc' }} onClick={() => handleEdit(item)}>
                                        <Edit2 size={16} /> {t('edit')}
                                    </button>
                                    <button className="btn" style={{ background: '#fff1f2', color: '#ef4444' }} onClick={() => handleDelete(item.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ margin: 0 }}>
                        <thead style={{ background: '#f8fafc' }}>
                            <tr>
                                <th style={{ padding: '1.25rem 1.5rem' }}>{t('image')}</th>
                                <th>Mã / Part No</th>
                                <th>Tên Linh Kiện</th>
                                <th>Danh mục</th>
                                <th>Tồn kho</th>
                                <th>Trạng Thái</th>
                                <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.slice(0, visibleCount).map(item => (
                                <tr key={item.id}>
                                    <td style={{ padding: '0.75rem 1.5rem' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '10px', overflow: 'hidden', background: '#f1f5f9' }}>
                                            {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Wrench size={20} color="#94a3b8" style={{ margin: '14px' }} />}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '700', color: '#1e293b' }}>{item.code}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{item.part_no}</div>
                                    </td>
                                    <td><div style={{ fontWeight: '600' }}>{item.name}</div></td>
                                    <td><span style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: '600' }}>{item.category_name}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: '800' }}>{Number(item.current_quantity).toFixed(2)}</span>
                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>min: {item.min_stock}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge" style={{ backgroundColor: item.status === 'OK' ? '#dcfce7' : '#fee2e2', color: item.status === 'OK' ? '#166534' : '#991b1b' }}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button className="btn btn-icon" onClick={() => handleEdit(item)}><Edit2 size={16} /></button>
                                            <button className="btn btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDelete(item.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" style={{ backdropFilter: 'blur(8px)', background: 'rgba(15, 23, 42, 0.4)' }}>
                    <div className="modal-content glass-card" style={{ maxWidth: '850px', padding: 0, overflow: 'hidden', border: 'none' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Wrench size={24} />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{newPart.id ? t('edit') : t('add')} Spare Part</h2>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{newPart.id ? 'Cập nhật thông tin chi tiết linh kiện' : 'Thêm linh kiện mới vào kho hệ thống'}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer' }}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleAdd} style={{ padding: '2rem' }}>
                            <div className="form-grid-2">
                                {/* Left Side: Media */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{
                                        width: '100%',
                                        height: '240px',
                                        borderRadius: '16px',
                                        background: '#f8fafc',
                                        border: '2px dashed #cbd5e1',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        {newPart.image_url ? (
                                            <>
                                                <img src={newPart.image_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button
                                                    type="button"
                                                    onClick={() => setNewPart({ ...newPart, image_url: '' })}
                                                    style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', padding: '5px', cursor: 'pointer' }}
                                                >
                                                    <X size={16} color="#ef4444" />
                                                </button>
                                            </>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                                <Camera size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
                                                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Click to upload image</div>
                                                <input
                                                    type="file"
                                                    onChange={handleImageUpload}
                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>Ghi chú kỹ thuật</label>
                                        <textarea
                                            value={newPart.specification}
                                            onChange={e => setNewPart({ ...newPart, specification: e.target.value })}
                                            className="input-field input-focus-effect"
                                            rows="5"
                                            placeholder="Mô tả kích thước, vật liệu, hoặc các lưu ý đặc biệt..."
                                        ></textarea>
                                    </div>
                                </div>

                                {/* Right Side: Info */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div className="form-group">
                                        <label style={{ fontWeight: '700' }}>Tên linh kiện *</label>
                                        <input type="text" required value={newPart.name} onChange={e => setNewPart({ ...newPart, name: e.target.value })} className="input-field input-focus-effect" />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: '700' }}>Mã tra cứu</label>
                                            <input type="text" value={newPart.code} onChange={e => setNewPart({ ...newPart, code: e.target.value })} className="input-field input-focus-effect" placeholder="Auto-gen" />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: '700' }}>Part No</label>
                                            <input type="text" value={newPart.part_no} onChange={e => setNewPart({ ...newPart, part_no: e.target.value })} className="input-field input-focus-effect" />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: '700' }}>Danh mục</label>
                                            <select className="input-field input-focus-effect" value={newPart.category_id} onChange={e => setNewPart({ ...newPart, category_id: e.target.value })}>
                                                <option value="">-- Chọn danh mục --</option>
                                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: '700' }}>Đơn vị</label>
                                            <input type="text" list="units" value={newPart.unit} onChange={e => setNewPart({ ...newPart, unit: e.target.value })} className="input-field input-focus-effect" />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: '700' }}>Số lượng tồn</label>
                                            <input type="number" step="0.0001" value={newPart.current_quantity} onChange={e => setNewPart({ ...newPart, current_quantity: e.target.value })} className="input-field input-focus-effect" />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: '700', color: '#ef4444' }}>Mức tối thiểu</label>
                                            <input type="number" step="0.0001" value={newPart.min_stock} onChange={e => setNewPart({ ...newPart, min_stock: e.target.value })} className="input-field input-focus-effect" style={{ background: '#fff1f2' }} />
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label style={{ fontWeight: '700' }}>Sở hữu</label>
                                            <input type="text" value={newPart.owner_company} onChange={e => setNewPart({ ...newPart, owner_company: e.target.value })} className="input-field input-focus-effect" />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontWeight: '700' }}>Trạng thái</label>
                                            <select className="input-field input-focus-effect" value={newPart.status} onChange={e => setNewPart({ ...newPart, status: e.target.value })}>
                                                <option value="OK">OK</option>
                                                <option value="NG">NG</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                                <button type="button" className="btn glass-card" onClick={() => setShowModal(false)} style={{ padding: '0.75rem 2rem' }}>{t('cancel')}</button>
                                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 3rem', borderRadius: '14px', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)' }}>
                                    {t('save')} <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .mobile-hide { display: inline; }
                @media (max-width: 640px) {
                    .mobile-hide { display: none; }
                }
                .btn-icon { padding: 0.5rem; background: #f8fafc; color: #64748b; border-radius: 8px; border: 1px solid #e2e8f0; }
                .btn-icon:hover { background: #fff; color: var(--primary); border-color: var(--primary); }
                .badge { font-family: 'Inter', sans-serif; }
            `}</style>
        </div >
    );
};

export default SpareParts;
