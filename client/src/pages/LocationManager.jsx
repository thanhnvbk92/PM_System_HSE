import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Layers, MapPin, Wrench, Trash2, Plus, Pencil, Check, X, Download, Upload } from 'lucide-react';
import Papa from 'papaparse';

const LocationManager = () => {
    const [lines, setLines] = useState([]);
    const [stations, setStations] = useState([]);
    const [jigs, setJigs] = useState([]);
    const [activeTab, setActiveTab] = useState('lines');

    // Edit state
    const [editing, setEditing] = useState({ id: null, type: '', name: '', parent_id: '', ip_address: '', gmes_name: '' });

    // New item form state
    const [newLine, setNewLine] = useState('');
    const [newStation, setNewStation] = useState({ name: '', line_id: '' });
    const [newJig, setNewJig] = useState({ name: '', station_id: '', line_id: '', ip_address: '', gmes_name: '' });

    const fetchData = async () => {
        try {
            const [l, s, j] = await Promise.all([
                axios.get(`/api/locations/lines`),
                axios.get(`/api/locations/stations`),
                axios.get(`/api/locations/jigs`)
            ]);
            setLines(Array.isArray(l.data) ? l.data : []);
            setStations(Array.isArray(s.data) ? s.data : []);
            setJigs(Array.isArray(j.data) ? j.data : []);
        } catch (e) {
            console.error("Error fetching locations", e);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const deleteItem = async (type, id) => {
        if (!window.confirm(`Bạn có chắc muốn xóa? Điều này sẽ xóa các mục con liên quan.`)) return;
        try {
            await axios.delete(`/api/locations/${type}/${id}`);
            fetchData();
        } catch (e) {
            const errorMsg = e.response?.data?.error || e.message;
            alert(`Lỗi xóa mục: ${errorMsg}`);
        }
    };

    const startEdit = (type, item, parentKey) => {
        setEditing({ id: item.id, type, name: item.name, parent_id: item[parentKey], ip_address: item.ip_address || '', gmes_name: item.gmes_name || '' });
    };

    const saveEdit = async () => {
        try {
            const data = { name: editing.name, ip_address: editing.ip_address, gmes_name: editing.gmes_name };
            if (editing.type === 'stations') data.line_id = editing.parent_id;
            if (editing.type === 'jigs') data.station_id = editing.parent_id;

            await axios.put(`/api/locations/${editing.type}/${editing.id}`, data);
            setEditing({ id: null, type: ``, name: '', parent_id: '' });
            fetchData();
        } catch (e) {
            const errorMsg = e.response?.data?.error || e.message;
            alert(`Lỗi cập nhật: ${errorMsg}`);
        }
    };

    const addLine = async () => {
        if (!newLine) return;
        try {
            await axios.post(`/api/locations/lines`, { name: newLine });
            setNewLine(''); fetchData();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            alert(`Lỗi thêm line: ${errorMsg}`);
        }
    };

    const addStation = async () => {
        if (!newStation.name || !newStation.line_id) return;
        try {
            await axios.post(`/api/locations/stations`, newStation);
            setNewStation({ name: '', line_id: '' }); fetchData();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            alert(`Lỗi thêm station: ${errorMsg}`);
        }
    };

    const addJig = async () => {
        if (!newJig.name || !newJig.station_id) return;
        try {
            await axios.post(`/api/locations/jigs`, { name: newJig.name, station_id: newJig.station_id, ip_address: newJig.ip_address, gmes_name: newJig.gmes_name });
            setNewJig({ name: '', station_id: '', line_id: '', ip_address: '', gmes_name: '' }); fetchData();
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message;
            alert(`Lỗi thêm jig: ${errorMsg}`);
        }
    };

    const handleExportCSV = () => {
        let dataToExport = [];
        let filename = '';

        if (activeTab === 'lines') {
            if (!lines.length) return alert('Chưa có line để xuất');
            dataToExport = lines.map(l => ({ 'ID Line': l.id, 'Tên Line': l.name }));
            filename = 'Lines.csv';
        } else if (activeTab === 'stations') {
            if (!stations.length) return alert('Chưa có station để xuất');
            dataToExport = stations.map(s => ({ 'ID Station': s.id, 'Tên Station': s.name, 'Tên Line': s.line_name, 'ID Line': s.line_id }));
            filename = 'Stations.csv';
        } else {
            if (!jigs.length) return alert('Chưa có jig để xuất');
            dataToExport = jigs.map(j => ({ 'ID Jig': j.id, 'Tên Jig': j.name, 'Tên Station': j.station_name, 'ID Station': j.station_id, 'Tên Line': j.line_name, 'IP Address': j.ip_address || '', 'GMES Name': j.gmes_name || '' }));
            filename = 'Jigs.csv';
        }

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `Data_Location_${filename}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async function (results) {
                const data = results.data;
                const fields = results.meta.fields || [];

                let required = [];
                if (activeTab === 'lines') required = ['Tên Line'];
                else if (activeTab === 'stations') required = ['Tên Station', 'ID Line'];
                else if (activeTab === 'jigs') required = ['Tên Jig', 'ID Station'];

                const missing = required.filter(f => !fields.includes(f));
                if (missing.length > 0) {
                    alert(typeof t !== 'undefined' ? t('csv_header_error').replace('{headers}', missing.join(', ')) : `Thiếu cột: ${missing.join(', ')}`);
                    return;
                }

                if (data.length === 0) return alert('File CSV trống!');

                if (!window.confirm(typeof t !== 'undefined' ? t('confirm_import').replace('{count}', data.length) : `Xác nhận Import ${data.length} dòng?`)) return;

                let success = 0, fail = 0;
                for (let row of data) {
                    try {
                        if (activeTab === 'lines') {
                            if (!row['Tên Line']) throw new Error('Cần cột Tên Line');
                            await axios.post(`/api/locations/lines`, { name: row['Tên Line'] });
                        } else if (activeTab === 'stations') {
                            let lineId = row['ID Line'] || row['line_id'];
                            let sName = row['Tên Station'] || row['name'];
                            if (!sName || !lineId) throw new Error('Thiếu trường dữ liệu');
                            await axios.post(`/api/locations/stations`, { name: sName, line_id: lineId });
                        } else if (activeTab === 'jigs') {
                            let stId = row['ID Station'] || row['station_id'];
                            let jName = row['Tên Jig'] || row['name'];
                            let ip = row['IP Address'] || row['ip_address'] || '';
                            let gmes = row['GMES Name'] || row['gmes_name'] || '';
                            if (!jName || !stId) throw new Error('Thiếu trường dữ liệu');
                            await axios.post(`/api/locations/jigs`, { name: jName, station_id: stId, ip_address: ip, gmes_name: gmes });
                        }
                        success++;
                    } catch (err) { fail++; }
                }
                const msg = t ? t('import_complete').replace('{success}', success).replace('{fail}', fail) : `Xong! Thành công: ${success}, Thất bại: ${fail}`;
                alert(msg);
                fetchData();
                e.target.value = null;
            }
        });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Quản lý sơ đồ Nhà máy</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" style={{ background: '#10b981', color: 'white' }} onClick={handleExportCSV}>
                        <Download size={18} /> Xuất CSV
                    </button>
                    <label className="btn" style={{ background: '#8b5cf6', color: 'white', cursor: 'pointer', margin: 0, display: 'flex', alignItems: 'center' }}>
                        <Upload size={18} style={{ marginRight: '0.25rem' }} /> Nhập CSV
                        <input type="file" accept=".csv" style={{ display: 'none' }} key={activeTab} onChange={handleImportCSV} />
                    </label>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <button className={`btn ${activeTab === 'lines' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('lines')}><Layers size={18} /> Lines ({lines.length})</button>
                <button className={`btn ${activeTab === 'stations' ? 'btn-primary' : ''}`} onClick={() => setActiveTab('stations')}><MapPin size={18} /> Stations ({stations.length})</button>
                <button className={`btn ${activeTab === 'jigs' ? 'btn-primary' : ''} `} onClick={() => setActiveTab('jigs')}><Wrench size={18} /> Jigs ({jigs.length})</button>
            </div>

            <div className="glass-card">
                {activeTab === 'lines' && (
                    <div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            <input type="text" placeholder="Tên Line mới..." value={newLine} onChange={e => setNewLine(e.target.value)} className="input-field" style={{ flex: 1 }} />
                            <button className="btn btn-primary" onClick={addLine}><Plus size={18} /> Thêm Line</button>
                        </div>
                        <table>
                            <thead><tr><th>ID</th><th>Tên Line</th><th>Thao tác</th></tr></thead>
                            <tbody>
                                {lines.map(l => (
                                    <tr key={l.id}>
                                        <td>{l.id}</td>
                                        <td>
                                            {editing.id === l.id && editing.type === 'lines' ? (
                                                <input type="text" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="input-field" />
                                            ) : <strong>{l.name}</strong>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {editing.id === l.id && editing.type === 'lines' ? (
                                                    <><button onClick={saveEdit} className="btn" style={{ color: '#22c55e' }}><Check size={16} /></button>
                                                        <button onClick={() => setEditing({ id: null })} className="btn" style={{ color: '#64748b' }}><X size={16} /></button></>
                                                ) : <button className="btn" onClick={() => startEdit('lines', l)}><Pencil size={16} /></button>}
                                                <button className="btn" onClick={() => deleteItem('lines', l.id)} style={{ color: '#dc2626' }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'stations' && (
                    <div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            <input type="text" placeholder="Tên Station..." value={newStation.name} onChange={e => setNewStation({ ...newStation, name: e.target.value })} className="input-field" style={{ flex: 1 }} />
                            <select className="input-field" value={newStation.line_id} onChange={e => setNewStation({ ...newStation, line_id: e.target.value })}>
                                <option value="">Chọn Line...</option>
                                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <button className="btn btn-primary" onClick={addStation}><Plus size={18} /> Thêm Station</button>
                        </div>
                        <table>
                            <thead><tr><th>Station</th><th>Thuộc Line</th><th>Thao tác</th></tr></thead>
                            <tbody>
                                {stations.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            {editing.id === s.id && editing.type === 'stations' ? (
                                                <input type="text" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="input-field" />
                                            ) : <strong>{s.name}</strong>}
                                        </td>
                                        <td>
                                            {editing.id === s.id && editing.type === 'stations' ? (
                                                <select className="input-field" value={editing.parent_id} onChange={e => setEditing({ ...editing, parent_id: e.target.value })}>
                                                    {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                            ) : s.line_name}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {editing.id === s.id && editing.type === 'stations' ? (
                                                    <><button onClick={saveEdit} className="btn" style={{ color: '#22c55e' }}><Check size={16} /></button>
                                                        <button onClick={() => setEditing({ id: null })} className="btn" style={{ color: '#64748b' }}><X size={16} /></button></>
                                                ) : <button className="btn" onClick={() => startEdit('stations', s, 'line_id')}><Pencil size={16} /></button>}
                                                <button className="btn" onClick={() => deleteItem('stations', s.id)} style={{ color: '#dc2626' }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'jigs' && (
                    <div>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
                            <input type="text" placeholder="Tên Jig..." value={newJig.name} onChange={e => setNewJig({ ...newJig, name: e.target.value })} className="input-field" style={{ flex: 1.5 }} />
                            <input type="text" placeholder="IP Address (VD: 192.168.1.100)" value={newJig.ip_address} onChange={e => setNewJig({ ...newJig, ip_address: e.target.value })} className="input-field" style={{ flex: 1 }} />
                            <input type="text" placeholder="GMES ID/Name" value={newJig.gmes_name} onChange={e => setNewJig({ ...newJig, gmes_name: e.target.value })} className="input-field" style={{ flex: 1 }} />

                            <select className="input-field" value={newJig.line_id} onChange={e => setNewJig({ ...newJig, line_id: e.target.value, station_id: '' })}>
                                <option value="">1. Chọn Line...</option>
                                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>

                            <select className="input-field" value={newJig.station_id} onChange={e => setNewJig({ ...newJig, station_id: e.target.value })} disabled={!newJig.line_id}>
                                <option value="">2. Chọn Station...</option>
                                {stations.filter(s => s.line_id == newJig.line_id).map(s => <option key={s.id} value={s.id}>{s.name} ({s.line_name})</option>)}
                            </select>

                            <button className="btn btn-primary" onClick={addJig} style={{ whiteSpace: 'nowrap' }}><Plus size={18} /> Thêm Jig</button>
                        </div>
                        <table>
                            <thead><tr><th>Jig</th><th>IP Address</th><th>GMES Name</th><th>Station / Line</th><th>Thao tác</th></tr></thead>
                            <tbody>
                                {jigs.map(j => (
                                    <tr key={j.id}>
                                        <td>
                                            {editing.id === j.id && editing.type === 'jigs' ? (
                                                <input type="text" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className="input-field" style={{ width: '100px' }} />
                                            ) : <strong>{j.name}</strong>}
                                        </td>
                                        <td>
                                            {editing.id === j.id && editing.type === 'jigs' ? (
                                                <input type="text" value={editing.ip_address} onChange={e => setEditing({ ...editing, ip_address: e.target.value })} className="input-field" style={{ width: '120px' }} />
                                            ) : (j.ip_address || '---')}
                                        </td>
                                        <td>
                                            {editing.id === j.id && editing.type === 'jigs' ? (
                                                <input type="text" value={editing.gmes_name} onChange={e => setEditing({ ...editing, gmes_name: e.target.value })} className="input-field" style={{ width: '120px' }} />
                                            ) : (j.gmes_name || '---')}
                                        </td>
                                        <td>
                                            {editing.id === j.id && editing.type === 'jigs' ? (
                                                <select className="input-field" value={editing.parent_id} onChange={e => setEditing({ ...editing, parent_id: e.target.value })}>
                                                    {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.line_name})</option>)}
                                                </select>
                                            ) : `${j.station_name} / ${j.line_name}`
                                            }
                                        </td >
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                {editing.id === j.id && editing.type === 'jigs' ? (
                                                    <><button onClick={saveEdit} className="btn" style={{ color: '#22c55e' }}><Check size={16} /></button>
                                                        <button onClick={() => setEditing({ id: null })} className="btn" style={{ color: '#64748b' }}><X size={16} /></button></>
                                                ) : <button className="btn" onClick={() => startEdit('jigs', j, 'station_id')}><Pencil size={16} /></button>}
                                                <button className="btn" onClick={() => deleteItem('jigs', j.id)} style={{ color: '#dc2626' }}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr >
                                ))}
                            </tbody >
                        </table >
                    </div >
                )}
            </div >

            <style>{`
                .input-field { padding: 0.625rem; border-radius: 8px; border: 1px solid #e2e8f0; font-family: inherit; font-size: 0.9rem; }
            `}</style>
        </div >
    );
};

export default LocationManager;
