import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ShieldCheck, Calendar, User, FileText, Download, History, Clock, Check, X, Search, Filter, CheckSquare, Square } from 'lucide-react';
import Papa from 'papaparse';
import { useLanguage } from '../context/LanguageContext';

const Calibrations = () => {
    const { t, lang } = useLanguage();
    const [data, setData] = useState([]);
    const [activeTab, setActiveTab] = useState('all');
    const [daysThreshold, setDaysThreshold] = useState(30);

    // Modal states
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyData, setHistoryData] = useState([]);
    const [selectedEq, setSelectedEq] = useState(null);
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateForm, setUpdateForm] = useState({
        equipment_id: '',
        calibration_date: new Date().toISOString().split('T')[0],
        result: 'Passed',
        technician: '',
        certificate_number: '',
        notes: '',
        next_due_date: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkForm, setBulkForm] = useState({
        calibration_date: new Date().toISOString().split('T')[0],
        result: 'Passed',
        technician: '',
        certificate_number: '',
        notes: '',
        next_due_date: ''
    });

    useEffect(() => {
        if (updateForm.calibration_date) {
            const calDate = new Date(updateForm.calibration_date);
            const nextDate = new Date(calDate.setFullYear(calDate.getFullYear() + 1));
            setUpdateForm(prev => ({ ...prev, next_due_date: nextDate.toISOString().split('T')[0] }));
        }
    }, [updateForm.calibration_date]);

    useEffect(() => {
        if (bulkForm.calibration_date) {
            const calDate = new Date(bulkForm.calibration_date);
            const nextDate = new Date(calDate.setFullYear(calDate.getFullYear() + 1));
            setBulkForm(prev => ({ ...prev, next_due_date: nextDate.toISOString().split('T')[0] }));
        }
    }, [bulkForm.calibration_date]);

    const fetchData = async () => {
        try {
            const res = await axios.get(`/api/equipment`);
            // Lấy tất cả thiết bị có đánh dấu cần hiệu chuẩn
            setData(res.data.filter(e => e.is_calibrated));
        } catch (e) {
            console.error("Error fetching data:", e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredItems = data.filter(item => {
        // Tab filtering
        const nextDate = item.expiry_date ? new Date(item.expiry_date) : null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let matchesTab = true;
        if (activeTab === 'overdue') {
            matchesTab = nextDate && nextDate < today;
        } else if (activeTab === 'upcoming') {
            if (!nextDate) matchesTab = false;
            else {
                const diffTime = nextDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                matchesTab = diffDays >= 0 && diffDays <= daysThreshold;
            }
        }

        // Search filtering
        const searchUpper = searchTerm.toUpperCase();
        const matchesSearch = searchTerm === '' ||
            item.code?.toUpperCase().includes(searchUpper) ||
            item.name?.toUpperCase().includes(searchUpper) ||
            item.serial_no?.toUpperCase().includes(searchUpper);

        return matchesTab && matchesSearch;
    });

    const toggleSelect = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredItems.length) setSelectedIds([]);
        else setSelectedIds(filteredItems.map(i => i.id));
    };

    const handleBulkUpdateSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/calibrations/bulk`, {
                equipment_ids: selectedIds,
                ...bulkForm
            });
            alert(t('save_calibration_success'));
            setShowBulkModal(false);
            setSelectedIds([]);
            fetchData();
        } catch (e) {
            alert(t('save_error'));
        }
    };

    const handleViewHistory = async (eq) => {
        setSelectedEq(eq);
        try {
            const res = await axios.get(`/api/calibrations/${eq.id}`);
            setHistoryData(res.data);
            setShowHistoryModal(true);
        } catch (e) {
            alert(t('error_loading_history'));
        }
    };

    const handleOpenUpdate = (eq) => {
        setSelectedEq(eq);
        const today = new Date().toISOString().split('T')[0];
        const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];
        setUpdateForm({
            equipment_id: eq.id,
            calibration_date: today,
            result: 'Passed',
            technician: '',
            certificate_number: '',
            notes: '',
            next_due_date: nextYear
        });
        setShowUpdateModal(true);
    };

    const submitUpdate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`/api/calibrations`, updateForm);
            alert(t('save_calibration_success'));
            setShowUpdateModal(false);
            fetchData();
        } catch (e) {
            alert(t('save_error'));
        }
    };

    const handleExportCSV = () => {
        if (!filteredItems || filteredItems.length === 0) {
            alert(t('no_data_export'));
            return;
        }

        const csvData = filteredItems.map(item => ({
            'Mã Thiết Bị': item.code,
            'Tên Thiết Bị': item.name,
            'Ngày hiệu chuẩn gần nhất': item.last_calibration ? new Date(item.last_calibration).toLocaleDateString('vi-VN') : '',
            'Ngày hiệu chuẩn tiếp theo': item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('vi-VN') : '',
            'Trạng Thái': item.status || 'OK'
        }));

        const csv = Papa.unparse(csvData);
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");

        const now = new Date();
        const dateStr = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0');

        link.href = url;
        link.setAttribute("download", `Lich_Hieu_Chuan_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const [viewMode, setViewMode] = useState('schedule'); // schedule or log
    const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [allHistory, setAllHistory] = useState([]);

    const fetchAllHistory = async () => {
        try {
            const res = await axios.get(`/api/calibrations/history/all`);
            setAllHistory(res.data);
        } catch (e) {
            console.error("Error fetching all history:", e);
        }
    };

    useEffect(() => {
        if (viewMode === 'log') {
            fetchAllHistory();
        }
    }, [viewMode]);

    const filteredLogs = allHistory.filter(h => {
        const hDate = new Date(h.calibration_date).toISOString().split('T')[0];
        return hDate === logDate;
    });

    const dateLocale = lang === 'vi' ? 'vi-VN' : (lang === 'ko' ? 'ko-KR' : 'en-US');

    const upcomingCount = data.filter(item => {
        if (!item.expiry_date) return false;
        const nextDate = new Date(item.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffTime = nextDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= daysThreshold;
    }).length;

    const overdueCount = data.filter(item => {
        if (!item.expiry_date) return false;
        const nextDate = new Date(item.expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return nextDate < today;
    }).length;

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '0.75rem', borderRadius: '12px', color: 'white' }}>
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#1e293b', fontWeight: '800' }}>{t('calibrations_title')}</h1>
                        <p style={{ margin: 0, color: '#64748b' }}>{t('calibration_desc')}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '10px', marginRight: '0.5rem' }}>
                        <button onClick={() => setViewMode('schedule')} style={{ border: 'none', background: viewMode === 'schedule' ? 'white' : 'transparent', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: viewMode === 'schedule' ? '#6366f1' : '#64748b', boxShadow: viewMode === 'schedule' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                            {t('schedule') || 'Lịch trình'}
                        </button>
                        <button onClick={() => setViewMode('log')} style={{ border: 'none', background: viewMode === 'log' ? 'white' : 'transparent', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', color: viewMode === 'log' ? '#6366f1' : '#64748b', boxShadow: viewMode === 'log' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}>
                            {t('calibration_log') || 'Nhật ký'}
                        </button>
                    </div>
                    {selectedIds.length > 0 && viewMode === 'schedule' && (
                        <button className="btn btn-primary" onClick={() => setShowBulkModal(true)} style={{ background: '#f59e0b', display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.2)' }}>
                            <CheckSquare size={18} /> {t('bulk_update')} ({selectedIds.length})
                        </button>
                    )}
                    <button className="btn" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0' }}>
                        <Download size={18} color="#6366f1" /> {t('export_csv')}
                    </button>
                </div>
            </div>

            {viewMode === 'schedule' ? (
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
                        <button onClick={() => setActiveTab('all')} style={{ flex: 1, border: 'none', background: activeTab === 'all' ? 'white' : 'transparent', color: activeTab === 'all' ? '#1e293b' : '#64748b', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '800', boxShadow: activeTab === 'all' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.75rem', transition: 'all 0.2s' }}>
                            {t('all')} <span style={{ background: activeTab === 'all' ? '#6366f1' : '#cbd5e1', color: 'white', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>{data.length}</span>
                        </button>
                        <button onClick={() => setActiveTab('upcoming')} style={{ flex: 1, border: 'none', background: activeTab === 'upcoming' ? '#10b981' : 'transparent', color: activeTab === 'upcoming' ? 'white' : '#64748b', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.75rem', transition: 'all 0.2s' }}>
                            {t('upcoming')} <span style={{ background: activeTab === 'upcoming' ? 'rgba(255,255,255,0.2)' : '#cbd5e1', color: activeTab === 'upcoming' ? 'white' : 'white', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>{upcomingCount}</span>
                        </button>
                        <button onClick={() => setActiveTab('overdue')} style={{ flex: 1, border: 'none', background: activeTab === 'overdue' ? '#ef4444' : 'transparent', color: activeTab === 'overdue' ? 'white' : '#64748b', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', padding: '0.75rem', transition: 'all 0.2s' }}>
                            {t('overdue')} <span style={{ background: activeTab === 'overdue' ? 'rgba(255,255,255,0.2)' : '#cbd5e1', color: activeTab === 'overdue' ? 'white' : 'white', padding: '0.15rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem' }}>{overdueCount}</span>
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder={activeTab === 'all' ? t('search_placeholder') : `${t('search_placeholder')} (${t('searching_in_category') || 'trong danh mục'})`}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="input-field"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                                    fontSize: '0.95rem',
                                    border: '1px solid #cbd5e1',
                                    background: 'white',
                                    borderRadius: '8px',
                                    boxShadow: 'none'
                                }}
                            />
                        </div>
                        {searchTerm && (
                            <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', borderLeft: '3px solid #3b82f6', paddingLeft: '1rem' }}>
                                📊 {t('results') || 'Kết quả'}: <span style={{ color: '#1e293b', fontSize: '1.1rem' }}>{filteredItems.length}</span>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ background: 'white', padding: '0.75rem', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Calendar size={20} color="#6366f1" />
                            <span style={{ fontWeight: 'bold', color: '#475569' }}>{t('select_date') || 'Chọn ngày'}:</span>
                            <input
                                type="date"
                                value={logDate}
                                onChange={e => setLogDate(e.target.value)}
                                style={{ border: 'none', background: 'transparent', fontWeight: 'bold', color: '#6366f1', outline: 'none', cursor: 'pointer', fontSize: '1rem' }}
                            />
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                            {t('total_calibrated_today') || 'Tổng số thiết bị hiệu chuẩn'}: <strong style={{ color: '#1e293b', fontSize: '1.1rem' }}>{filteredLogs.length}</strong>
                        </div>
                    </div>
                    <button className="btn" onClick={fetchAllHistory} style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                        <Clock size={16} /> {t('refresh') || 'Làm mới'}
                    </button>
                </div>
            )}

            <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0 }}>{viewMode === 'schedule' ? t('calibration_schedule') : (t('calibration_log_title') || 'Danh sách thiết bị đã hiệu chuẩn')}</h3>
                    {viewMode === 'schedule' && activeTab === 'upcoming' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f0fdf4', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                            <Calendar size={16} color="#166534" />
                            <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: '600' }}>{t('days_to_calibrate')}:</span>
                            <input
                                type="number"
                                value={daysThreshold}
                                onChange={e => setDaysThreshold(parseInt(e.target.value) || 0)}
                                style={{ width: '60px', padding: '0.25rem', borderRadius: '4px', border: '1px solid #d1d5db', textAlign: 'center' }}
                            />
                        </div>
                    )}
                </div>
                <table>
                    <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                            {viewMode === 'schedule' ? (
                                <>
                                    <th style={{ width: '40px', paddingLeft: '1.25rem' }}>
                                        <input type="checkbox" checked={selectedIds.length === filteredItems.length && filteredItems.length > 0} onChange={toggleSelectAll} style={{ width: '16px', height: '16px' }} />
                                    </th>
                                    <th style={{ padding: '1rem' }}>{t('equipment_identity')}</th>
                                    <th>{lang === 'vi' ? 'Số Serial (S/N)' : 'Serial No.'}</th>
                                    <th>{t('last_calibration')}</th>
                                    <th>{t('next_calibration')}</th>
                                    <th>{t('status')}</th>
                                    <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>{t('actions')}</th>
                                </>
                            ) : (
                                <>
                                    <th style={{ padding: '1rem', paddingLeft: '1.25rem' }}>{t('equipment_identity')}</th>
                                    <th>{lang === 'vi' ? 'Kết quả' : 'Result'}</th>
                                    <th>{lang === 'vi' ? 'Người thực hiện' : 'Technician'}</th>
                                    <th>{lang === 'vi' ? 'Số GCN' : 'Cert No.'}</th>
                                    <th>{lang === 'vi' ? 'Ngày đến hạn tiếp' : 'Next Due'}</th>
                                    <th style={{ textAlign: 'right', paddingRight: '1.25rem' }}>{t('actions')}</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {viewMode === 'schedule' ? (
                            filteredItems.length > 0 ? filteredItems.map(item => {
                                const isOverdue = item.expiry_date && new Date(item.expiry_date) < new Date().setHours(0, 0, 0, 0);
                                return (
                                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: isOverdue ? '#fff1f2' : (selectedIds.includes(item.id) ? '#eff6ff' : 'transparent') }}>
                                        <td style={{ paddingLeft: '1.25rem' }}>
                                            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} style={{ width: '16px', height: '16px' }} />
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            <div style={{ fontWeight: '800', color: '#1e293b' }}>{item.code}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.name}</div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.9rem', color: '#475569', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                                {item.serial_no || 'N/A'}
                                            </span>
                                        </td>
                                        <td>{item.last_calibration ? new Date(item.last_calibration).toLocaleDateString(dateLocale) : t('none')}</td>
                                        <td>
                                            <span style={{ color: isOverdue ? '#e11d48' : '#ec4899', fontWeight: 'bold' }}>
                                                {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString(dateLocale) : '---'}
                                                {isOverdue && <span style={{ marginLeft: '4px', fontSize: '0.7rem', verticalAlign: 'middle' }}>⚠️</span>}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge status-${item.status ? item.status.toLowerCase().replace(' ', '-') : 'available'}`}>
                                                {item.status === 'Available' ? t('available') :
                                                    item.status === 'In Use' ? t('in_use') :
                                                        item.status === 'Maintenance' ? t('maintenance') : (item.status || t('available'))}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                                                <button className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }} onClick={() => handleOpenUpdate(item)}>
                                                    {t('update_result')}
                                                </button>
                                                <button className="btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0' }} onClick={() => handleViewHistory(item)}>
                                                    <History size={14} color="#6366f1" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} /><br />
                                        {activeTab === 'overdue' ? 'Không có thiết bị quá hạn 👏' : t('no_calibrations')}
                                    </td>
                                </tr>
                            )
                        ) : (
                            filteredLogs.length > 0 ? filteredLogs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1rem', paddingLeft: '1.25rem' }}>
                                        <div style={{ fontWeight: '800', color: '#1e293b' }}>{log.equipment_code}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{log.equipment_name}</div>
                                    </td>
                                    <td>
                                        <span className={`badge status-${log.result === 'Passed' ? 'available' : 'maintenance'}`}>
                                            {log.result === 'Passed' ? t('passed') : (log.result === 'Failed' ? t('failed') : t('needs_repair'))}
                                        </span>
                                    </td>
                                    <td>{log.technician || '---'}</td>
                                    <td>{log.certificate_number || '---'}</td>
                                    <td>
                                        <span style={{ fontWeight: 'bold', color: '#6366f1' }}>
                                            {log.next_due_date ? new Date(log.next_due_date).toLocaleDateString(dateLocale) : '---'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', paddingRight: '1.25rem' }}>
                                        <button className="btn" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', marginLeft: 'auto' }} onClick={() => handleViewHistory({ id: log.equipment_id, name: log.equipment_name, code: log.equipment_code })}>
                                            <History size={14} color="#6366f1" />
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} /><br />
                                        {lang === 'vi' ? `Không có thiết bị nào được hiệu chuẩn vào ngày ${new Date(logDate).toLocaleDateString('vi-VN')}` : `No equipment calibrated on ${new Date(logDate).toLocaleDateString()}`}
                                    </td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Lịch sử */}
            {showHistoryModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px', position: 'relative', paddingTop: '3rem' }}>
                        <button className="btn" onClick={() => setShowHistoryModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'transparent' }}>
                            <X size={24} />
                        </button>
                        <h3>{t('history_view')} - {selectedEq?.name} ({selectedEq?.code})</h3>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>{t('transaction_date')}</th>
                                        <th>{t('calibration_result')}</th>
                                        <th>{t('technician')}</th>
                                        <th>{t('next_calibration')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyData.length > 0 ? historyData.map(h => (
                                        <tr key={h.id}>
                                            <td>{new Date(h.calibration_date).toLocaleDateString(dateLocale)}</td>
                                            <td>
                                                <span className={`badge status-${h.result === 'Passed' ? 'available' : 'maintenance'}`}>
                                                    {h.result === 'Passed' ? t('passed') : (h.result === 'Failed' ? t('failed') : t('needs_repair'))}
                                                </span>
                                            </td>
                                            <td>{h.technician || '---'}</td>
                                            <td>{h.next_due_date ? new Date(h.next_due_date).toLocaleDateString(dateLocale) : '---'}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan="4" style={{ textAlign: 'center' }}>{t('no_data')}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Cập nhật */}
            {showUpdateModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '700px', position: 'relative', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                        {/* Header Cao Cấp */}
                        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', padding: '1.5rem 2rem', color: 'white', position: 'relative' }}>
                            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
                                <ShieldCheck size={28} /> {t('update_result')}
                            </h2>
                            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                                {selectedEq?.name} <span style={{ opacity: 0.7 }}>[{selectedEq?.code}]</span>
                            </p>
                            <button className="btn" onClick={() => setShowUpdateModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={submitUpdate} style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {t('calibration_date')} *
                                </label>
                                <input type="date" required value={updateForm.calibration_date} onChange={e => setUpdateForm({ ...updateForm, calibration_date: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {t('calibration_result')} *
                                </label>
                                <select value={updateForm.result} onChange={e => setUpdateForm({ ...updateForm, result: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }}>
                                    <option value="Passed">✅ {t('passed')}</option>
                                    <option value="Failed">❌ {t('failed')}</option>
                                    <option value="Needs Repair">🛠️ {t('needs_repair')}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {t('technician')}
                                </label>
                                <input type="text" placeholder="Họ tên người thực hiện..." value={updateForm.technician} onChange={e => setUpdateForm({ ...updateForm, technician: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {t('certificate_number')}
                                </label>
                                <input type="text" placeholder="Số GCN / Report No..." value={updateForm.certificate_number} onChange={e => setUpdateForm({ ...updateForm, certificate_number: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e11d48', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {lang === 'vi' ? 'Ngày hết hạn hiệu chuẩn' : 'Calibration Expiry Date'} *
                                </label>
                                <input type="date" required value={updateForm.next_due_date} onChange={e => setUpdateForm({ ...updateForm, next_due_date: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #fee2e2', background: '#fff1f2', padding: '0.75rem', fontWeight: 'bold', color: '#e11d48' }} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                    {t('notes_label')}
                                </label>
                                <textarea placeholder="Ghi chú thêm nếu có..." value={updateForm.notes} onChange={e => setUpdateForm({ ...updateForm, notes: e.target.value })} className="input-field" style={{ height: '80px', borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }}></textarea>
                            </div>
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '1rem', fontSize: '1rem', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', border: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Check size={20} /> {t('save')}
                                </button>
                                <button type="button" className="btn" style={{ flex: 1, padding: '1rem', fontSize: '1rem', borderRadius: '12px', fontWeight: 'bold' }} onClick={() => setShowUpdateModal(false)}>{t('cancel')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Cập nhật hàng loạt */}
            {showBulkModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '700px', position: 'relative', padding: 0, overflow: 'hidden', borderRadius: '16px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', padding: '1.5rem 2rem', color: 'white', position: 'relative' }}>
                            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.5rem' }}>
                                <CheckSquare size={28} /> {t('bulk_update')}
                            </h2>
                            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
                                {t('selected_items_count').replace('{count}', selectedIds.length)}
                            </p>
                            <button className="btn" onClick={() => setShowBulkModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleBulkUpdateSubmit} style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="form-group">
                                <label style={{ color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>{t('calibration_date')} *</label>
                                <input type="date" required value={bulkForm.calibration_date} onChange={e => setBulkForm({ ...bulkForm, calibration_date: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>{t('calibration_result')} *</label>
                                <select value={bulkForm.result} onChange={e => setBulkForm({ ...bulkForm, result: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }}>
                                    <option value="Passed">✅ {t('passed')}</option>
                                    <option value="Failed">❌ {t('failed')}</option>
                                    <option value="Needs Repair">🛠️ {t('needs_repair')}</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>{t('technician')}</label>
                                <input type="text" placeholder="Họ tên người thực hiện..." value={bulkForm.technician} onChange={e => setBulkForm({ ...bulkForm, technician: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }} />
                            </div>
                            <div className="form-group">
                                <label style={{ color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>{t('certificate_number')}</label>
                                <input type="text" placeholder="Số GCN / Report No..." value={bulkForm.certificate_number} onChange={e => setBulkForm({ ...bulkForm, certificate_number: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label style={{ color: '#e11d48', fontWeight: 'bold', marginBottom: '0.5rem' }}>{lang === 'vi' ? 'Ngày hết hạn hiệu chuẩn' : 'Expiry Date'} *</label>
                                <input type="date" required value={bulkForm.next_due_date} onChange={e => setBulkForm({ ...bulkForm, next_due_date: e.target.value })} className="input-field" style={{ borderRadius: '8px', border: '2px solid #fee2e2', background: '#fff1f2', padding: '0.75rem', fontWeight: 'bold', color: '#e11d48' }} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label style={{ color: '#475569', fontWeight: 'bold', marginBottom: '0.5rem' }}>{t('notes_label')}</label>
                                <textarea placeholder="Ghi chú chung cho toàn bộ thiết bị..." value={bulkForm.notes} onChange={e => setBulkForm({ ...bulkForm, notes: e.target.value })} className="input-field" style={{ height: '80px', borderRadius: '8px', border: '2px solid #e2e8f0', padding: '0.75rem' }}></textarea>
                            </div>
                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '1rem', fontSize: '1rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Check size={20} /> {t('bulk_update')}
                                </button>
                                <button type="button" className="btn" style={{ flex: 1, padding: '1rem', fontSize: '1rem', borderRadius: '12px', fontWeight: 'bold' }} onClick={() => setShowBulkModal(false)}>{t('cancel')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .badge {
          padding: 0.25rem 0.625rem;
          border-radius: 99px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .status-available { background: #dcfce7; color: #166534; }
        .status-in-use { background: #dbeafe; color: #1e40af; }
        .status-maintenance { background: #fef3c7; color: #92400e; }
        .status-calibration { background: #fef3c7; color: #92400e; }
      `}</style>
        </div>
    );
};

export default Calibrations;

