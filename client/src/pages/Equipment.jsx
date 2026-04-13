import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Plus, Search, Warehouse, MapPin, Monitor, Printer, Camera, Download, Upload, X, Check, Zap, Maximize, Wrench, History } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Papa from 'papaparse';
import { useLanguage } from '../context/LanguageContext';

const Equipment = () => {
    const { t, lang } = useLanguage();
    const [items, setItems] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [columnFilters, setColumnFilters] = useState({
        category: '',
        owner_company: '',
        status: '',
        line_name: '',
        is_at_hse: ''
    });
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(60);

    // Scanner State
    const [scanning, setScanning] = useState(false);
    const [qrScanner, setQrScanner] = useState(null);
    const [cameraCapabilities, setCameraCapabilities] = useState(null);
    const [zoomValue, setZoomValue] = useState(1);
    const [isTorchOn, setIsTorchOn] = useState(false);

    // Form State
    const [newEq, setNewEq] = useState({
        code: '', name: '', part_no: '', serial_no: '',
        category: 'Thiết bị', owner_company: 'LGE', status: 'OK', jig_id: '',
        is_calibrated: false, expiry_date: '', image_url: '',
        is_bulk: false, current_quantity: 1
    });

    // Maintenance State
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [maintenanceLogs, setMaintenanceLogs] = useState([]);
    const [newMaintenance, setNewMaintenance] = useState({
        equipment_id: null,
        type: 'Damage',
        date: new Date().toISOString().split('T')[0],
        reported_by: '',
        technician: '',
        description: '',
        result_status: 'NG'
    });
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedItemHistory, setSelectedItemHistory] = useState(null);
    const [combinedHistory, setCombinedHistory] = useState([]);

    // Location selection state
    const [lines, setLines] = useState([]);
    const [stations, setStations] = useState([]);
    const [jigs, setJigs] = useState([]);
    const [selectedLine, setSelectedLine] = useState('');
    const [selectedStation, setSelectedStation] = useState('');

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const s = searchTerm.toLowerCase().trim();
            const matchesSearch = !s ||
                item.code?.toLowerCase().includes(s) ||
                item.name?.toLowerCase().includes(s) ||
                item.part_no?.toLowerCase().includes(s) ||
                item.serial_no?.toLowerCase().includes(s);

            const matchesCategory = !columnFilters.category || item.category === columnFilters.category;
            const matchesOwner = !columnFilters.owner_company || item.owner_company === columnFilters.owner_company;
            const matchesStatus = !columnFilters.status || item.status === columnFilters.status;
            const matchesLine = !columnFilters.line_name || item.line_name === columnFilters.line_name;
            const matchesHSE = !columnFilters.is_at_hse || String(item.is_at_hse) === columnFilters.is_at_hse;

            return matchesSearch && matchesCategory && matchesOwner && matchesStatus && matchesLine && matchesHSE;
        });
    }, [items, searchTerm, columnFilters]);

    useEffect(() => {
        setVisibleCount(60);
    }, [searchTerm, columnFilters]);

    const resetFilters = () => {
        setSearchTerm('');
        setColumnFilters({ category: '', owner_company: '', status: '', line_name: '', is_at_hse: '' });
    };

    const formatDateForInput = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '';
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/equipment`);
            setItems(res.data);
        } catch (e) {
            console.error("Error fetching items:", e);
        } finally {
            setLoading(false);
        }
    };

    const fetchLines = async () => {
        const res = await axios.get(`/api/locations/lines`);
        setLines(res.data);
    };

    useEffect(() => {
        fetchItems();
        fetchLines();
    }, []);

    // Handle Location Cascading
    useEffect(() => {
        if (selectedLine) {
            axios.get(`/api/locations/stations/${selectedLine}`)
                .then(res => setStations(res.data));
            setStations([]); setJigs([]); setSelectedStation(``);
        }
    }, [selectedLine]);

    useEffect(() => {
        if (selectedStation) {
            axios.get(`/api/locations/jigs/${selectedStation}`)
                .then(res => setJigs(res.data));
            setJigs([]);
        }
    }, [selectedStation]);

    // Maintenance & History Handlers
    const handleHistoryClick = async (item) => {
        setSelectedItemHistory(item);
        try {
            // Fetch calibrations
            const calRes = await axios.get(`/api/calibrations/${item.id}`);
            const calibrations = calRes.data.map(c => ({
                ...c,
                displayType: 'Calibration',
                date: c.calibration_date
            }));

            // Fetch maintenance logs
            const mainRes = await axios.get(`/api/maintenance/${item.id}`);
            const maintenance = mainRes.data.map(m => ({
                ...m,
                displayType: 'Maintenance',
                date: m.date
            }));

            // Combine and sort by date descending
            const combined = [...calibrations, ...maintenance].sort((a, b) => new Date(b.date) - new Date(a.date));
            setCombinedHistory(combined);
            setShowHistoryModal(true);
        } catch (e) {
            console.error("Error fetching history:", e);
            alert("Lỗi khi tải lịch sử thiết bị");
        }
    };

    const handleMaintenanceClick = (item) => {
        setNewMaintenance({
            equipment_id: item.id,
            type: 'Damage',
            date: new Date().toISOString().split('T')[0],
            reported_by: '',
            technician: '',
            description: '',
            result_status: item.status === 'OK' ? 'NG' : 'OK'
        });
        setShowMaintenanceModal(true);
    };

    const handleSaveMaintenance = async () => {
        try {
            await axios.post(`/api/maintenance`, newMaintenance);
            alert("Lưu lịch sử bảo trì thành công!");
            setShowMaintenanceModal(false);
            fetchItems(); // Refresh inventory to update status
        } catch (e) {
            console.error("Error saving maintenance:", e);
            alert("Lỗi khi lưu bảo trì");
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            let res;
            if (newEq.id) {
                res = await axios.put(`/api/equipment/${newEq.id}`, newEq);
                alert(lang === 'vi' ? "Cập nhật thiết bị thành công!" : "Equipment updated successfully!");
            } else {
                res = await axios.post(`/api/equipment`, newEq);
                if (window.confirm(lang === 'vi' ? `Thêm mới thành công! Bạn có muốn IN TEM NHÃN cho thiết bị này ngay không?` : "Added successfully! Do you want to PRINT LABEL for this equipment now?")) {
                    const printData = { ...newEq, code: res.data.code };
                    handlePrintLabel(printData);
                }
            }
            setShowModal(false);
            fetchItems();
            resetNewEq();
            sessionStorage.removeItem('equipment_form_draft');
        } catch (err) {
            if (err.response && err.response.status === 409) {
                const existing = err.response.data.existing;
                const msg = lang === 'vi'
                    ? `CẢNH BÁO: Thiết bị với PN: ${existing.part_no} và SN: ${existing.serial_no} ĐÃ TỒN TẠI!\n\nMã thiết bị: ${existing.code}\nTên: ${existing.name}\nTrạng thái: ${existing.status}\n\nVui lòng kiểm tra lại để tránh nhập trùng.`
                    : `WARNING: Equipment with PN: ${existing.part_no} and SN: ${existing.serial_no} ALREADY EXISTS!\n\nCode: ${existing.code}\nName: ${existing.name}\nStatus: ${existing.status}\n\nPlease check to avoid duplicates.`;
                alert(msg);
            } else {
                alert(lang === 'vi' ? "Lỗi khi lưu thiết bị" : "Error saving equipment");
            }
        }
    };

    const handleEdit = (item) => {
        setNewEq({
            ...item,
            is_bulk: item.is_bulk === 1 || item.is_bulk === true,
            is_calibrated: item.is_calibrated === 1 || item.is_calibrated === true,
            last_calibration: formatDateForInput(item.last_calibration),
            expiry_date: formatDateForInput(item.expiry_date)
        });
        setSelectedLine(item.line_id || '');
        setSelectedStation(item.station_id || '');
        setShowModal(true);
    };

    const resetNewEq = () => {
        setNewEq({
            code: '', name: '', part_no: '', serial_no: '', category: 'Thiết bị', owner_company: 'LGE', status: 'OK', jig_id: '', is_calibrated: false, expiry_date: '', last_calibration: '', image_url: '', is_bulk: false, current_quantity: 1
        });
        setSelectedLine('');
        setSelectedStation('');
        sessionStorage.removeItem('equipment_form_draft');
    };

    // Form State Persistence (Fix for Mobile Reload)
    useEffect(() => {
        const savedData = sessionStorage.getItem('equipment_form_draft');
        if (savedData) {
            try {
                const { newEq: sEq, showModal: sShow, selectedLine: sLine, selectedStation: sStation } = JSON.parse(savedData);
                setNewEq(sEq);
                setShowModal(sShow);
                setSelectedLine(sLine);
                setSelectedStation(sStation);
            } catch (e) { console.error("Error restoring form draft:", e); }
        }
    }, []);

    useEffect(() => {
        if (showModal) {
            sessionStorage.setItem('equipment_form_draft', JSON.stringify({ newEq, showModal, selectedLine, selectedStation }));
        } else {
            sessionStorage.removeItem('equipment_form_draft');
        }
    }, [newEq, showModal, selectedLine, selectedStation]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await axios.post(`/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setNewEq({ ...newEq, image_url: res.data.url });
        } catch (err) {
            alert(t('error_upload_image'));
        }
    };

    // Scanner Logic
    useEffect(() => {
        if (scanning) {
            const html5QrCode = new Html5Qrcode("search-reader");
            setQrScanner(html5QrCode);

            const config = {
                fps: 20,
                qrbox: { width: 280, height: 280 },
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.DATA_MATRIX,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.EAN_13,
                ],
                experimentalFeatures: { useBarCodeDetectorIfSupported: true }
            };

            const startScanner = async () => {
                try {
                    await html5QrCode.start(
                        { facingMode: "environment" },
                        config,
                        (decodedText) => {
                            setScanning(false);
                            html5QrCode.stop();
                            setSearchTerm(decodedText);
                        },
                        (errorMessage) => { }
                    );
                    const capabilities = html5QrCode.getRunningTrackCapabilities();
                    setCameraCapabilities(capabilities);
                    if (capabilities.zoom) setZoomValue(capabilities.zoom.min);
                } catch (err) {
                    console.error("Scanner Error:", err);
                    alert("Camera Error: " + (err.message || err));
                    setScanning(false);
                }
            };
            startScanner();
            return () => {
                if (html5QrCode.isScanning) html5QrCode.stop().catch(e => console.error(e));
            };
        } else {
            setQrScanner(null);
            setCameraCapabilities(null);
            setIsTorchOn(false);
        }
    }, [scanning]);

    const handleZoomChange = async (e) => {
        const val = parseFloat(e.target.value);
        setZoomValue(val);
        if (qrScanner && qrScanner.isScanning) {
            try {
                await qrScanner.applyVideoConstraints({ advanced: [{ zoom: val }] });
            } catch (err) { console.error("Zoom apply error:", err); }
        }
    };

    const toggleTorch = async () => {
        const newState = !isTorchOn;
        setIsTorchOn(newState);
        if (qrScanner && qrScanner.isScanning) {
            try {
                await qrScanner.applyVideoConstraints({ advanced: [{ torch: newState }] });
            } catch (err) { console.error("Torch apply error:", err); }
        }
    };

    const handleExportCSV = () => {
        if (!items || items.length === 0) {
            alert(t('no_data_export'));
            return;
        }

        const csvData = items.map(item => ({
            'Mã Thiết Bị': item.code,
            'Tên Thiết Bị': item.name,
            'Part No': item.part_no || '',
            'Serial No': item.serial_no || '',
            'Loại (Danh mục)': item.category || '',
            'Model/Kiểu dáng': item.asset_type || '',
            'Đơn vị sở hữu': item.owner_company || '',
            'Trạng Thái': item.status || 'OK',
            'Tại Kho (HSE)': item.is_at_hse ? 'Có' : 'Không',
            'Vị trí lắp đặt': item.line_name || 'Hệ thống chung',
            'Trạm/Máy': item.station_name || '',
            'Jig': item.jig_name || '',
            'Số Lượng Tồn': item.current_quantity || 1,
            'Vật Tư Tiêu Hao': item.is_bulk ? 'Có' : 'Không',
            'Yêu cầu Hiệu chuẩn': item.is_calibrated ? 'Có' : 'Không',
            'Ngày hiệu chuẩn gần nhất': item.last_calibration ? new Date(item.last_calibration).toLocaleDateString('vi-VN') : '',
            'Ngày hết hạn': item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('vi-VN') : ''
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
        link.setAttribute("download", `DS_ThietBi_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
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

                // Validate headers
                const required = ['Mã Thiết Bị', 'Tên Thiết Bị'];
                const missing = required.filter(f => !fields.includes(f));
                if (missing.length > 0) {
                    alert(t('csv_header_error').replace('{headers}', missing.join(', ')));
                    return;
                }

                if (data.length === 0) {
                    alert(t('csv_empty_error'));
                    return;
                }

                if (!window.confirm(t('confirm_import').replace('{count}', data.length))) return;

                let successCount = 0;
                let failCount = 0;
                let duplicateCount = 0;

                for (let row of data) {
                    try {
                        const parseDate = (d) => {
                            if (!d) return null;
                            if (d.includes('/')) { // Format dd/mm/yyyy
                                const parts = d.split('/');
                                return `${parts[2]}-${parts[1]}-${parts[0]}`;
                            }
                            return d;
                        };

                        const newRow = {
                            code: row['Mã Thiết Bị'] || '',
                            name: row['Tên Thiết Bị'] || 'No Name',
                            part_no: row['Part No'] || '',
                            serial_no: row['Serial No'] || '',
                            asset_type: row['Loại (Danh mục)'] || '',
                            is_bulk: row['Vật Tư Tiêu Hao'] === 'Có' || row['Vật Tư Tiêu Hao'] === 'true',
                            current_quantity: parseInt(row['Số Lượng Tồn']) || 1,
                            status: row['Trạng Thái'] || 'Available',
                            is_calibrated: row['Yêu cầu Hiệu chuẩn'] === 'Có' || row['Yêu cầu Hiệu chuẩn'] === 'true',
                            last_calibration: parseDate(row['Ngày hiệu chuẩn gần nhất']),
                            expiry_date: parseDate(row['Ngày hết hạn']),
                            jig_id: ''
                        };

                        if (!newRow.code) {
                            failCount++;
                            continue;
                        }

                        await axios.post(`/api/equipment`, newRow);
                        successCount++;
                    } catch (err) {
                        if (err.response && err.response.status === 409) {
                            duplicateCount++;
                        } else {
                            failCount++;
                        }
                    }
                }

                let finalMsg = t('import_complete').replace('{success}', successCount).replace('{fail}', failCount);
                if (duplicateCount > 0) {
                    finalMsg += `\n- Bị trùng lặp: ${duplicateCount} (đã bỏ qua)`;
                }
                alert(finalMsg);
                fetchItems();
                e.target.value = null; // Reset input file
            },
            error: function (err) {
                alert(t('csv_read_error') + err.message);
            }
        });
    };

    const handlePrintLabel = (item) => {
        const printWindow = window.open('', '_blank', 'width=500,height=400');
        printWindow.document.write(`
            <html>
                <head>
                    <title>In Tem QR - ${item.code}</title>
                    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
                    <style>
                        body { margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                        .label-container { 
                            border: 1px solid #333; 
                            padding: 10px; 
                            width: 380px; 
                            height: 140px;
                            display: flex; 
                            align-items: center; 
                            justify-content: space-between;
                            border-radius: 4px;
                            background: white;
                        }
                        .text-info { 
                            flex: 1; 
                            display: flex; 
                            flex-direction: column; 
                            gap: 4px; 
                            padding-right: 10px;
                        }
                        .qr-box { 
                            width: 120px; 
                            height: 120px; 
                            display: flex; 
                            align-items: center; 
                            justify-content: center;
                        }
                        .title { font-weight: 800; font-size: 16px; color: #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
                        .sub-info { font-size: 11px; color: #444; }
                        .code-main { font-weight: bold; font-size: 14px; margin: 4px 0; border-bottom: 1px solid #ddd; padding-bottom: 2px; }
                        @media print {
                            .no-print { display: none; }
                            .label-container { border: 1px solid #000; }
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="margin-bottom: 20px; display:flex; gap: 10px;">
                        <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">${t('print_label_thermal')}</button>
                        <button onclick="window.close()" style="padding: 8px 16px; cursor: pointer;">${t('close')}</button>
                    </div>
                    
                    <div class="label-container">
                        <div class="qr-box" id="qrcode"></div>
                        <div class="text-info" style="padding-right: 0; padding-left: 10px;">
                            <div class="title">${item.name}</div>
                            <div class="sub-info" style="font-weight: 800; color: #2563eb; text-transform: uppercase;">${item.category || 'THIẾT BỊ'} | ${item.owner_company || ''}</div>
                            <div class="code-main">${item.code}</div>
                            <div class="sub-info"><strong>P/N:</strong> ${item.part_no || '---'}</div>
                            <div class="sub-info"><strong>S/N:</strong> ${item.serial_no || '---'}</div>
                        </div>
                    </div>

                    <script>
                        new QRCode(document.getElementById("qrcode"), {
                            text: "${item.code}",
                            width: 110,
                            height: 110,
                            colorDark : "#000000",
                            colorLight : "#ffffff",
                            correctLevel : QRCode.CorrectLevel.H
                        });
                        // setTimeout(() => window.print(), 500);
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div>
            <div className="top-bar">
                <h1 className="page-title">{t('equipment')}</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" onClick={handleExportCSV}>
                        <Download size={18} style={{ marginRight: '0.25rem' }} /> {t('export_csv')}
                    </button>
                    <label className="btn" style={{ cursor: 'pointer' }}>
                        <Upload size={18} style={{ marginRight: '0.25rem' }} /> {t('import_csv')}
                        <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCSV} />
                    </label>
                    <button className="btn btn-primary" onClick={() => { resetNewEq(); setShowModal(true); }}>
                        <Plus size={18} /> {t('add')}
                    </button>
                </div>
            </div>

            <div className="glass-card search-container">
                <div className="search-header">
                    <div className="search-main">
                        <div className="search-input-wrapper">
                            <Search size={22} className="search-icon" />
                            <input
                                type="text"
                                placeholder={t('search_placeholder') || 'Tìm kiếm hoặc quét mã...'}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            <button
                                className={`scan-btn ${scanning ? 'active' : ''}`}
                                onClick={() => setScanning(!scanning)}
                                title="Quét mã QR/Barcode"
                            >
                                <Camera size={24} />
                            </button>
                        </div>

                        <div className="search-stats">
                            <div className="stats-item">
                                <span className="stats-label">📊 {t('results')}:</span>
                                <span className="stats-value">{filteredItems.length}</span>
                                <span className="stats-total">/ {items.length}</span>
                            </div>
                            {(searchTerm || Object.values(columnFilters).some(v => v !== '')) && (
                                <button className="clear-btn" onClick={resetFilters}>
                                    <X size={14} style={{ marginRight: '4px' }} /> {t('clear_filters') || 'Xóa lọc'}
                                </button>
                            )}
                        </div>
                    </div>

                    {scanning && (
                        <div className="scanner-viewfinder">
                            <div id="search-reader" style={{ width: '100%', minHeight: '320px', background: '#000' }}></div>
                            <div className="scanner-controls">
                                {cameraCapabilities?.zoom && (
                                    <div className="control-row zoom-control">
                                        <Maximize size={18} color="white" />
                                        <input
                                            type="range"
                                            min={cameraCapabilities.zoom.min}
                                            max={cameraCapabilities.zoom.max}
                                            step={0.1}
                                            value={zoomValue}
                                            onChange={handleZoomChange}
                                        />
                                        <span className="zoom-text">{zoomValue.toFixed(1)}x</span>
                                    </div>
                                )}
                                <button className={`torch-btn ${isTorchOn ? 'on' : ''}`} onClick={toggleTorch}>
                                    <Zap size={24} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>{t('image')}</th>
                            <th>{t('eq_code')} / Part No</th>
                            <th>{t('eq_name')}</th>
                            <th>{t('category')} / {t('owner')}</th>
                            <th>{t('quantity')}</th>
                            <th>{t('status')}</th>
                            <th>{t('real_location')}</th>
                            <th>{t('location')}</th>
                            <th>{t('calibrations')}</th>
                            <th>{t('actions')}</th>
                        </tr>
                        <tr style={{ background: '#f8fafc' }}>
                            <th colSpan="3"></th>
                            <th>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <select
                                        value={columnFilters.category}
                                        onChange={e => setColumnFilters({ ...columnFilters, category: e.target.value })}
                                        style={{ fontSize: '10px', padding: '2px', border: '1px solid #cbd5e1', width: '50%' }}
                                    >
                                        <option value="">Loại...</option>
                                        {[...new Set(items.map(i => i.category))].filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <select
                                        value={columnFilters.owner_company}
                                        onChange={e => setColumnFilters({ ...columnFilters, owner_company: e.target.value })}
                                        style={{ fontSize: '10px', padding: '2px', border: '1px solid #cbd5e1', width: '50%' }}
                                    >
                                        <option value="">Cty...</option>
                                        {[...new Set(items.map(i => i.owner_company))].filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </th>
                            <th></th>
                            <th>
                                <select
                                    value={columnFilters.status}
                                    onChange={e => setColumnFilters({ ...columnFilters, status: e.target.value })}
                                    style={{ fontSize: '10px', padding: '2px', border: '1px solid #cbd5e1', width: '100%' }}
                                >
                                    <option value="">Status...</option>
                                    <option value="OK">OK</option>
                                    <option value="NG">NG</option>
                                </select>
                            </th>
                            <th>
                                <select
                                    value={columnFilters.is_at_hse}
                                    onChange={e => setColumnFilters({ ...columnFilters, is_at_hse: e.target.value })}
                                    style={{ fontSize: '10px', padding: '2px', border: '1px solid #cbd5e1', width: '100%' }}
                                >
                                    <option value="">{t('location')}...</option>
                                    <option value="1">{t('at_hse')}</option>
                                    <option value="0">{t('outside')}</option>
                                </select>
                            </th>
                            <th>
                                <select
                                    value={columnFilters.line_name}
                                    onChange={e => setColumnFilters({ ...columnFilters, line_name: e.target.value })}
                                    style={{ fontSize: '10px', padding: '2px', border: '1px solid #cbd5e1', width: '100%' }}
                                >
                                    <option value="">Line...</option>
                                    {[...new Set(items.map(i => i.line_name))].filter(Boolean).map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                            </th>
                            <th colSpan="2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.isArray(filteredItems) && filteredItems.length > 0 ? (
                            filteredItems.slice(0, visibleCount).map(item => (
                                <tr key={item.id}>
                                    <td>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Monitor size={20} color="#94a3b8" />}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '700', fontSize: '1.1rem' }}>{item.code}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>P/N: {item.part_no || 'N/A'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>S/N: {item.serial_no || 'N/A'}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{item.name}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#2563eb' }}>{item.category || 'Thiết bị'}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Owner: <span style={{ color: '#059669', fontWeight: 'bold' }}>{item.owner_company || ''}</span></div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 'bold', fontSize: '1rem', color: '#334155', textAlign: 'center' }}>
                                            {item.current_quantity || 0}
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge`} style={{ background: item.status === 'OK' ? '#dcfce7' : '#fee2e2', color: item.status === 'OK' ? '#166534' : '#991b1b' }}>
                                            {item.status || 'OK'}
                                        </span>
                                    </td>
                                    <td>
                                        {item.is_at_hse ? (
                                            <span style={{ color: '#059669', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Warehouse size={14} /> {t('at_hse')}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#d97706', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Warehouse size={14} /> {t('outside')}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            <Warehouse size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {item.line_name || t('general_system')}
                                        </div>
                                        {item.station_name && (
                                            <div style={{ fontSize: '0.85rem' }}>
                                                <MapPin size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> {item.station_name} {item.jig_name ? `> ${item.jig_name}` : ''}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {!item.is_bulk ? (
                                            item.is_calibrated ? (
                                                <div style={{ fontSize: '0.75rem' }}>
                                                    <div style={{ color: '#059669', fontWeight: 'bold' }}>✓ {t('calibrations')}</div>
                                                    <div style={{ color: '#dc2626' }}>Exp: {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US') : 'N/A'}</div>
                                                </div>
                                            ) : <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{t('not_required')}</div>
                                        ) : (
                                            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>---</div>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                            <button className="btn" onClick={() => handleEdit(item)} title={t('edit')} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}>{t('edit')}</button>
                                            <button className="btn" onClick={() => handleHistoryClick(item)} title="Xem lịch sử" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', color: '#6366f1' }}>
                                                <History size={16} />
                                            </button>
                                            <button className="btn" onClick={() => handleMaintenanceClick(item)} title="Bảo trì/Sửa chữa" style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', color: '#d97706' }}>
                                                <Wrench size={16} />
                                            </button>
                                            <button className="btn" title="Print Label" onClick={() => handlePrintLabel(item)} style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', color: '#2563eb' }}>
                                                <Printer size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="10" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>{loading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                    <div className="spinner"></div>
                                    <span>{t('loading_data') || 'Đang tải dữ liệu...'}</span>
                                </div>
                            ) : t('no_equipment_found')}</td></tr>
                        )}
                    </tbody>
                </table>
                {filteredItems.length > visibleCount && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', paddingBottom: '1rem' }}>
                        <button
                            className="btn btn-primary"
                            onClick={() => setVisibleCount(prev => prev + 50)}
                            style={{ padding: '0.75rem 3rem', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}
                        >
                            {t('load_more') || 'Xem thêm'} ({filteredItems.length - visibleCount})
                        </button>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '800px', position: 'relative', paddingTop: '3rem' }}>
                        <button
                            className="btn"
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.25rem', color: '#64748b', border: 'none', background: 'transparent' }}
                        >
                            <X size={24} />
                        </button>
                        <h2>{newEq.id ? t('edit') : t('add')} / {t('equipment')}</h2>

                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                <input type="checkbox" checked={newEq.is_bulk} onChange={e => setNewEq({ ...newEq, is_bulk: e.target.checked })} style={{ width: '18px', height: '18px' }} />
                                {lang === 'vi' ? 'Vật tư số lượng lớn (Bulk items)' : 'Bulk Items (Quantity based)'}
                            </label>
                        </div>

                        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>{t('eq_code')} / Barcode (Code)</label>
                                <input type="text" placeholder={t('eq_code_placeholder')} value={newEq.code} onChange={e => setNewEq({ ...newEq, code: e.target.value })} className="input-field" style={{ background: '#f1f5f9', fontWeight: 'bold' }} />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>{t('eq_name')}</label>
                                <input type="text" required placeholder={t('eq_name_placeholder')} value={newEq.name} onChange={e => setNewEq({ ...newEq, name: e.target.value })} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>{t('part_no')}</label>
                                <input type="text" placeholder={t('part_no')} value={newEq.part_no} onChange={e => setNewEq({ ...newEq, part_no: e.target.value })} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>{t('serial_no')}</label>
                                <input type="text" placeholder={t('serial_no')} value={newEq.serial_no} onChange={e => setNewEq({ ...newEq, serial_no: e.target.value })} className="input-field" />
                            </div>

                            <div className="form-group">
                                <label>{t('category_label')}</label>
                                <input type="text" list="categories" value={newEq.category} onChange={e => setNewEq({ ...newEq, category: e.target.value })} className="input-field" />
                                <datalist id="categories">
                                    <option value="Thiết bị" />
                                    <option value="Jig / Gá" />
                                    <option value="Vật tư tiêu hao" />
                                    <option value="Công cụ dụng cụ" />
                                </datalist>
                            </div>
                            <div className="form-group">
                                <label>Tình trạng thiết bị (OK/NG)</label>
                                <select value={newEq.status} onChange={e => setNewEq({ ...newEq, status: e.target.value })} className="input-field">
                                    <option value="OK">OK (Hoạt động tốt)</option>
                                    <option value="NG">NG (Lỗi / Đang sửa)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{t('owner_label')}</label>
                                <input type="text" list="owners" value={newEq.owner_company} onChange={e => setNewEq({ ...newEq, owner_company: e.target.value })} className="input-field" />
                                <datalist id="owners">
                                    <option value="HSE" />
                                    <option value="HPC" />
                                    <option value="Đối Tác" />
                                </datalist>
                            </div>
                            {newEq.is_bulk && (
                                <div className="form-group">
                                    <label>{t('initial_quantity')} *</label>
                                    <input type="number" value={newEq.current_quantity} onChange={e => setNewEq({ ...newEq, current_quantity: parseInt(e.target.value) || 0 })} className="input-field" />
                                </div>
                            )}

                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>{t('installation_location')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                    <select value={selectedLine} onChange={e => setSelectedLine(e.target.value)} className="input-field">
                                        <option value="">{t('select_line')}</option>
                                        {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                    <select value={selectedStation} onChange={e => setSelectedStation(e.target.value)} className="input-field" disabled={!selectedLine}>
                                        <option value="">{t('select_station')}</option>
                                        {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                    <select value={newEq.jig_id} onChange={e => setNewEq({ ...newEq, jig_id: e.target.value })} className="input-field" disabled={!selectedStation}>
                                        <option value="">{t('select_jig')}</option>
                                        {jigs.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                                    </select>
                                </div>
                                <small style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                    {t('location_note')}
                                </small>
                            </div>

                            <div className="form-group">
                                <label>{t('current_status')}</label>
                                <select value={newEq.status} onChange={e => setNewEq({ ...newEq, status: e.target.value })} className="input-field" style={{ fontWeight: 'bold', color: newEq.status === 'OK' ? '#059669' : '#dc2626' }}>
                                    <option value="OK">OK (Sẵn sàng / Tốt)</option>
                                    <option value="NG">NG (Lỗi / Cần sửa)</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{t('illustration_image')}</label>
                                <input type="file" onChange={handleImageUpload} className="input-field" style={{ fontSize: '0.8rem' }} />
                            </div>

                            {!newEq.is_bulk && (
                                <>
                                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '1rem', gridColumn: 'span 2' }}>
                                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <input type="checkbox" checked={newEq.is_calibrated} onChange={e => setNewEq({ ...newEq, is_calibrated: e.target.checked })} />
                                            {t('calibration_required')}
                                        </label>
                                    </div>

                                    {newEq.is_calibrated && (
                                        <>
                                            <div className="form-group">
                                                <label>{t('last_calibration_date')}</label>
                                                <input type="date" value={newEq.last_calibration} onChange={e => setNewEq({ ...newEq, last_calibration: e.target.value })} className="input-field" />
                                            </div>
                                            <div className="form-group">
                                                <label>{t('expiry_date_label')}</label>
                                                <input type="date" value={newEq.expiry_date} onChange={e => setNewEq({ ...newEq, expiry_date: e.target.value })} className="input-field" />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>{t('cancel')}</button>
                                <button type="submit" className="btn btn-primary" style={{ background: '#2563eb', padding: '0.75rem 2rem' }}>{t('save')}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showMaintenanceModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px', position: 'relative', paddingTop: '3rem' }}>
                        <button className="btn" onClick={() => setShowMaintenanceModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'transparent' }}><X size={24} /></button>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Wrench size={24} color="#d97706" /> Báo hỏng / Ghi nhận sửa chữa
                        </h2>
                        <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
                            Thiết bị: <strong>{items.find(i => i.id === newMaintenance.equipment_id)?.name}</strong> ({items.find(i => i.id === newMaintenance.equipment_id)?.code})
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label>Loại bảo trì</label>
                                <select value={newMaintenance.type} onChange={e => setNewMaintenance({ ...newMaintenance, type: e.target.value })} className="input-field">
                                    <option value="Damage">Damage (Báo hỏng)</option>
                                    <option value="Repair">Repair (Sửa chữa)</option>
                                    <option value="Maintenance">Maintenance (Bảo dưỡng định kỳ)</option>
                                    <option value="Inspection">Inspection (Kiểm tra)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Ngày thực hiện</label>
                                <input type="date" value={newMaintenance.date} onChange={e => setNewMaintenance({ ...newMaintenance, date: e.target.value })} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>Người báo cáo</label>
                                <input type="text" placeholder="Tên người báo cáo" value={newMaintenance.reported_by} onChange={e => setNewMaintenance({ ...newMaintenance, reported_by: e.target.value })} className="input-field" />
                            </div>
                            <div className="form-group">
                                <label>Kỹ thuật viên thực hiện</label>
                                <input type="text" placeholder="Tên người sửa/kiểm tra" value={newMaintenance.technician} onChange={e => setNewMaintenance({ ...newMaintenance, technician: e.target.value })} className="input-field" />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Mô tả tình trạng / Nội dung sửa chữa</label>
                                <textarea rows="3" placeholder="Chi tiết lỗi hoặc nội dung đã xử lý..." value={newMaintenance.description} onChange={e => setNewMaintenance({ ...newMaintenance, description: e.target.value })} className="input-field" style={{ resize: 'vertical' }}></textarea>
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label>Trạng thái thiết bị sau xử lý</label>
                                <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="radio" name="res_status" checked={newMaintenance.result_status === 'OK'} onChange={() => setNewMaintenance({ ...newMaintenance, result_status: 'OK' })} /> OK (Hoạt động tốt)
                                    </label>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                        <input type="radio" name="res_status" checked={newMaintenance.result_status === 'NG'} onChange={() => setNewMaintenance({ ...newMaintenance, result_status: 'NG' })} /> NG (Vẫn hỏng / Cần xử lý tiếp)
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                            <button className="btn" onClick={() => setShowMaintenanceModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSaveMaintenance} style={{ background: '#d97706' }}>Lưu lịch sử</button>
                        </div>
                    </div>
                </div>
            )}

            {showHistoryModal && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', position: 'relative', paddingTop: '3rem' }}>
                        <button className="btn" onClick={() => setShowHistoryModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', border: 'none', background: 'transparent' }}><X size={24} /></button>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <History size={24} color="#6366f1" /> Lịch sử thiết bị: {selectedItemHistory?.code}
                        </h2>
                        <div style={{ marginBottom: '1.5rem', color: '#64748b' }}>{selectedItemHistory?.name}</div>

                        {combinedHistory.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chưa có dữ liệu lịch sử (Hiệu chuẩn/Bảo trì)</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {combinedHistory.map((log, index) => (
                                    <div key={index} style={{ padding: '1rem', borderRadius: '12px', background: '#f8fafc', borderLeft: `6px solid ${log.displayType === 'Calibration' ? '#10b981' : (log.type === 'Damage' ? '#ef4444' : '#f59e0b')}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                            <span style={{ fontWeight: '800', fontSize: '0.8rem', textTransform: 'uppercase', color: log.displayType === 'Calibration' ? '#059669' : '#d97706' }}>
                                                {log.displayType === 'Calibration' ? 'HIỆU CHUẨN' : `BẢO TRÌ: ${log.type}`}
                                            </span>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{new Date(log.date).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                                            {log.displayType === 'Calibration' ? `Kết quả: ${log.result || 'N/A'}` : log.description}
                                        </div>
                                        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                            {log.displayType === 'Calibration' ? (
                                                <>
                                                    <span>Đơn vị: {log.agency || '---'}</span>
                                                    <span>Số chứng chỉ: {log.certificate_no || '---'}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Người báo cáo: {log.reported_by || '---'}</span>
                                                    <span>Kỹ thuật: {log.technician || '---'}</span>
                                                    <span>Kết quả: <strong style={{ color: log.result_status === 'OK' ? '#059669' : '#dc2626' }}>{log.result_status}</strong></span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
                            <button className="btn btn-primary" onClick={() => setShowHistoryModal(false)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
                .form-group label { font-size: 0.85rem; font-weight: 600; color: #475569; }
                .input-field { padding: 0.625rem; border-radius: 8px; border: 1px solid #cbd5e1; font-family: inherit; font-size: 0.95rem; }
                .input-field:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
                
                /* New Search & Scanner UI */
                .search-container { padding: 1.5rem; margin-bottom: 2rem; border: none; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05), 0 8px 10px -6px rgba(0,0,0,0.05); }
                .search-header { display: flex; flex-direction: column; gap: 1.5rem; }
                .search-main { display: flex; align-items: center; gap: 1.5rem; width: 100%; }
                .search-input-wrapper { flex: 1; position: relative; display: flex; align-items: center; background: #fff; border-radius: 12px; border: 2px solid #e2e8f0; transition: all 0.2s ease; box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.03); }
                .search-input-wrapper:focus-within { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
                .search-icon { position: absolute; left: 16px; color: #94a3b8; pointer-events: none; }
                .search-input { width: 100%; padding: 1rem 1rem 1rem 3.5rem; border: none; background: transparent; font-size: 1.1rem; font-weight: 500; font-family: inherit; color: #1e293b; }
                .search-input::placeholder { color: #94a3b8; }
                .search-input:focus { outline: none; }
                
                .scan-btn { padding: 0.75rem 1.25rem; background: #f1f5f9; border: none; border-left: 2px solid #e2e8f0; color: #475569; cursor: pointer; transition: all 0.2s; display: flex; alignItems: center; justifyContent: center; }
                .scan-btn:hover { background: #e2e8f0; color: #1e293b; }
                .scan-btn.active { background: #6366f1; color: #fff; border-color: #6366f1; }
                
                .search-stats { display: flex; align-items: center; gap: 1rem; border-left: 2px solid #e2e8f0; padding-left: 1.5rem; }
                .stats-item { display: flex; align-items: baseline; gap: 0.5rem; white-space: nowrap; }
                .stats-label { font-size: 0.9rem; color: #64748b; font-weight: 600; }
                .stats-value { font-size: 1.5rem; font-weight: 800; color: #1e293b; }
                .stats-total { font-size: 0.9rem; color: #94a3b8; font-weight: 600; }
                .clear-btn { background: #fee2e2; color: #dc2626; border: none; padding: 0.5rem 1rem; border-radius: 8px; font-size: 0.85rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; transition: all 0.2s; white-space: nowrap; }
                .clear-btn:hover { background: #fecaca; transform: translateY(-1px); }

                /* Scanner Viewfinder */
                .scanner-viewfinder { margin-top: 1rem; border-radius: 16px; overflow: hidden; border: 3px solid #6366f1; position: relative; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
                .scanner-controls { position: absolute; bottom: 1.5rem; left: 1rem; right: 1rem; display: flex; flex-direction: column; gap: 1rem; z-index: 10; }
                .control-row { background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); padding: 0.75rem 1.25rem; border-radius: 14px; display: flex; align-items: center; gap: 1rem; }
                .zoom-control input { flex: 1; accent-color: #6366f1; height: 6px; border-radius: 3px; }
                .zoom-text { color: white; font-size: 0.9rem; font-weight: 700; min-width: 40px; text-align: right; }
                .torch-btn { width: 56px; height: 56px; border-radius: 28px; background: rgba(255,255,255,0.2); backdrop-filter: blur(8px); border: 2px solid rgba(255,255,255,0.3); color: white; display: flex; align-items: center; justify-content: center; margin: 0 auto; transition: all 0.2s; cursor: pointer; }
                .torch-btn.on { background: #fbbf24; border-color: #f59e0b; color: #000; box-shadow: 0 0 20px rgba(251, 191, 36, 0.4); }

                @media (max-width: 768px) {
                    .search-container { padding: 1rem; }
                    .search-main { flex-direction: column; gap: 1rem; }
                    .search-stats { border-left: none; padding-left: 0; width: 100%; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
                    .search-input { font-size: 1rem; padding-left: 3rem; }
                    .search-icon { left: 12px; }
                    .stats-value { font-size: 1.25rem; }
                    
                    /* Table optimization for mobile */
                    table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; }
                    th, td { white-space: nowrap; font-size: 0.85rem; padding: 0.75rem 0.5rem !important; }
                    .visible-count-btn { width: 100%; padding: 1rem; }
                }

                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .badge { padding: 0.25rem 0.625rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; display: inline-block; }
                .status-available { background: #dcfce7; color: #166534; }
                .status-in-use { background: #dbeafe; color: #1e40af; }
                .status-maintenance { background: #fef3c7; color: #92400e; }
            `}</style>
        </div>
    );
};

export default Equipment;
