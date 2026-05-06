import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { ArrowUpRight, ArrowDownLeft, Printer, ScanLine, X, Trash2, Camera, ClipboardList, User, Briefcase, FileText, UserCheck, Download, Search, Zap, Maximize, ShieldCheck } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import Papa from 'papaparse';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const Transactions = () => {
    const { user } = useAuth();
    const { t, lang } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('batches');
    const [filterBatchCode, setFilterBatchCode] = useState(null);

    const [contacts, setContacts] = useState([]);
    const [saveContact, setSaveContact] = useState(false);

    // Batch Transaction State
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({
        type: 'Import', person_in_charge: '', department: '', notes: '', related_person: '', purpose: '',
        sender_name: '', sender_position: '', sender_department: '', sender_company: '',
        receiver_name: '', receiver_position: '', receiver_department: '', receiver_company: ''
    });
    const [scanCode, setScanCode] = useState('');
    const [scannedItems, setScannedItems] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [qrScanner, setQrScanner] = useState(null);
    const [cameraCapabilities, setCameraCapabilities] = useState(null);
    const [zoomValue, setZoomValue] = useState(1);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const scanInputRef = useRef(null);

    // Calibration Modal State
    const [showCalibModal, setShowCalibModal] = useState(false);
    const [calibItem, setCalibItem] = useState(null);

    const fetchData = async () => {
        const [resTx, resContacts] = await Promise.all([
            axios.get(`/api/transactions`),
            axios.get(`/api/contacts`).catch(() => ({ data: [] }))
        ]);
        setLogs(resTx.data);
        setContacts(resContacts.data);
    };

    useEffect(() => {
        const load = async () => {
            if (user) await fetchData();
        };
        load();
    }, [user]);

    useEffect(() => {
        if (showModal && user) {
            const userName = user.full_name || user.username || '';
            const userPos = user.position || '';
            const userDept = user.department || '';

            if (form.type === 'Import') {
                setForm(f => ({
                    ...f,
                    receiver_name: userName, receiver_position: userPos, receiver_department: userDept, receiver_company: 'HSE',
                    person_in_charge: userName, // Fallback for old DB view
                    sender_name: '', sender_position: '', sender_department: '', sender_company: ''
                }));
            } else {
                setForm(f => ({
                    ...f,
                    sender_name: userName, sender_position: userPos, sender_department: userDept, sender_company: 'HSE',
                    person_in_charge: userName, // Fallback for old DB view
                    receiver_name: '', receiver_position: '', receiver_department: '', receiver_company: ''
                }));
            }
        }
    }, [showModal, form.type, user]);

    const handleSelectContact = (contactId, role) => {
        if (!contactId) return;
        const c = contacts.find(x => x.id === parseInt(contactId));
        if (!c) return;
        if (role === 'sender') {
            setForm(f => ({ ...f, sender_name: c.name || '', sender_position: c.position || '', sender_department: c.department || '', sender_company: c.company || '', related_person: c.name || '' }));
        } else {
            setForm(f => ({ ...f, receiver_name: c.name || '', receiver_position: c.position || '', receiver_department: c.department || '', receiver_company: c.company || '', related_person: c.name || '' }));
        }
    };

    // Focus input continually for barcode scanner
    useEffect(() => {
        if (showModal && scanInputRef.current && !scanning) {
            scanInputRef.current.focus();
        }
    }, [showModal, scanCode, scanning]);

    const triggerSearch = async (codeStr) => {
        if (!codeStr.trim()) return;
        try {
            const res = await axios.get(`/api/lookup/code/${codeStr}`);
            setSearchResults(res.data);
        } catch (err) {
            if (err.response?.status === 404) {
                if (window.confirm(t('equipment_not_found').replace('{code}', codeStr))) {
                    window.location.href = `/equipment`;
                }
            } else {
                alert(t('error_label') + ': ' + err.message);
            }
        }
        setScanCode('');
    };

    const handleScan = async (e) => {
        e.preventDefault();
        await triggerSearch(scanCode);
    };

    useEffect(() => {
        if (scanning) {
            const html5QrCode = new Html5Qrcode("reader");
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
                experimentalFeatures: {
                    useBarCodeDetectorIfSupported: true
                }
            };

            const startScanner = async () => {
                try {
                    await html5QrCode.start(
                        { facingMode: "environment" },
                        config,
                        (decodedText) => {
                            setScanning(false);
                            html5QrCode.stop();
                            triggerSearch(decodedText);
                        },
                        (errorMessage) => { }
                    );

                    // Lấy khả năng của camera (Zoom, Flash)
                    const capabilities = html5QrCode.getRunningTrackCapabilities();
                    setCameraCapabilities(capabilities);
                    if (capabilities.zoom) {
                        setZoomValue(capabilities.zoom.min);
                    }
                } catch (err) {
                    console.error("Camera start error:", err);
                    alert(`${t('camera_error') || 'Camera Error'}: ${err.message || err}\n\nLƯU Ý: Trình duyệt thường chặn Camera trên HTTP (không phải localhost). Vui lòng dùng HTTPS hoặc cấu hình chrome://flags.`);
                    setScanning(false);
                }
            };

            startScanner();

            return () => {
                if (html5QrCode.isScanning) {
                    html5QrCode.stop().catch(e => console.error(e));
                }
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
                await qrScanner.applyVideoConstraints({
                    advanced: [{ zoom: val }]
                });
            } catch (err) {
                console.error("Zoom apply error:", err);
            }
        }
    };

    const toggleTorch = async () => {
        const newTorchState = !isTorchOn;
        setIsTorchOn(newTorchState);
        if (qrScanner && qrScanner.isScanning) {
            try {
                await qrScanner.applyVideoConstraints({
                    advanced: [{ torch: newTorchState }]
                });
            } catch (err) {
                console.error("Torch apply error:", err);
            }
        }
    };

    const confirmAdd = (eq) => {
        // 1. Kiểm tra chống trùng lặp theo Serial/Code
        if (scannedItems.some(i => i.code === eq.code)) {
            alert(t('already_in_list') || 'Thiết bị đã có trong danh sách');
            return;
        }

        const isBulk = eq.is_bulk || eq.item_type === 'spare_part';

        eq.transact_quantity = isBulk ? 1.0000 : 1;
        eq.transact_unit = eq.unit || 'ea';
        eq.scrap_weight = 0;
        eq.scrap_unit = 'kg';
        eq.last_calibration = '';
        eq.expiry_date = '';

        // 2. Kiểm tra Logic Kho (Ràng buộc Nghiệp vụ mới)
        if (!isBulk) {
            if (form.type === 'Export' && !eq.is_at_hse) {
                alert(t('export_error_outside').replace('{name}', eq.name));
                return;
            }
            if (form.type === 'Import' && eq.is_at_hse) {
                alert(t('import_error_at_hse').replace('{name}', eq.name));
                return;
            }
        } else {
            // Bulk logic
            if (form.type === 'Export' && eq.current_quantity <= 0) {
                alert(t('stock_empty_error').replace('{name}', eq.name));
                return;
            }
        }

        // Thêm vào "Giỏ hàng"
        setScannedItems([...scannedItems, eq]);
        setSearchResults([]);
        setScanCode('');
        if (scanInputRef.current) scanInputRef.current.focus();
    };

    const handleQuickCalibrateItem = (code) => {
        const today = new Date();
        const nextYear = new Date();
        nextYear.setFullYear(today.getFullYear() + 1);

        setScannedItems(scannedItems.map(item => {
            if (item.code === code) {
                return {
                    ...item,
                    last_calibration: today.toISOString().split('T')[0],
                    expiry_date: nextYear.toISOString().split('T')[0]
                };
            }
            return item;
        }));
    };

    const handleCalibrationChange = (code, field, value) => {
        setScannedItems(scannedItems.map(item => {
            if (item.code === code) {
                let updatedItem = { ...item, [field]: value };
                if (field === 'last_calibration' && value) {
                    const calDate = new Date(value);
                    if (!isNaN(calDate.getTime())) {
                        const nextDate = new Date(calDate);
                        nextDate.setFullYear(calDate.getFullYear() + 1);
                        updatedItem.expiry_date = nextDate.toISOString().split('T')[0];
                    }
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const removeScanned = (code) => {
        setScannedItems(scannedItems.filter(i => i.code !== code));
        if (scanInputRef.current) scanInputRef.current.focus();
    };

    const handleQuantityChange = (code, val) => {
        const num = parseFloat(val) || 0;
        setScannedItems(scannedItems.map(item => item.code === code ? { ...item, transact_quantity: num } : item));
    };

    const handleScrapChange = (code, field, val) => {
        setScannedItems(scannedItems.map(item => item.code === code ? { ...item, [field]: val } : item));
    };

    const handlePrintLabel = (item) => {
        if (!item.code) return alert(t('no_internal_code_print'));
        const printWindow = window.open('', '_blank', 'width=500,height=400');
        printWindow.document.write(`
            <html>
                <head>
                    <title>In Lại Tem Nhãn - ${item.code}</title>
                    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                    <style>
                        body { margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; font-family: sans-serif; }
                        .label { border: 2px dashed #ccc; padding: 15px; text-align: center; width: 320px; border-radius: 8px;}
                        canvas { max-width: 100%; margin-top: 10px; }
                        .info { font-size: 13px; margin-top: 8px; color: #333; }
                        @media print {
                            .no-print { display: none; }
                            .label { border: none; padding: 0; }
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="no-print" style="margin-bottom: 20px; display:flex; gap: 10px;">
                        <button onclick="window.print()" style="padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">${t('reprint_label_thermal')}</button>
                        <button onclick="window.close()" style="padding: 8px 16px; cursor: pointer;">${t('close')}</button>
                    </div>
                    <div class="label">
                        <div style="font-weight: 800; font-size: 16px; text-transform: uppercase;">${item.name}</div>
                        <div style="font-size: 12px; color: #666; margin-top: 2px;">${item.asset_type || t('details_tab')}</div>
                        <canvas id="barcode"></canvas>
                        <div class="info">
                            <strong>S/N:</strong> ${item.serial_no || '---'} | <strong>P/N:</strong> ${item.part_no || '---'}
                        </div>
                    </div>
                    <script>
                        JsBarcode("#barcode", "${item.code}", {
                            format: "CODE128", width: 2, height: 60, displayValue: true, fontSize: 14, margin: 10
                        });
                        // setTimeout(() => window.print(), 500); 
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleUploadEvidence = async (batchCode, type, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('batch_code', batchCode);
        formData.append('type', type);

        try {
            await axios.post(`/api/transactions/evidence`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(t('upload_evidence_success'));
            fetchData();
        } catch (e) {
            alert(t('upload_evidence_error') + e.message);
        }
    };

    const handleDeleteBatch = async (batchCode) => {
        if (!window.confirm(t('confirm_delete_batch')?.replace('{code}', batchCode) || `Xác nhận xóa TOÀN BỘ phiếu ${batchCode}? Trạng thái thiết bị sẽ được khôi phục.`)) return;
        try {
            const token = localStorage.getItem('pms_token');
            await axios.delete(`/api/transactions/batch/${batchCode}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            alert("Delete error: " + (err.response?.data?.error || err.message));
        }
    };

    const handleSaveItemCalibration = (e) => {
        e.preventDefault();
        setScannedItems(scannedItems.map(item => {
            if (item.code === calibItem.code) {
                return {
                    ...item,
                    last_calibration: calibItem.last_calibration,
                    expiry_date: calibItem.expiry_date
                };
            }
            return item;
        }));
        setShowCalibModal(false);
    };

    const handleCalibModalChange = (field, value) => {
        let updated = { ...calibItem, [field]: value };
        if (field === 'last_calibration' && value) {
            const calDate = new Date(value);
            if (!isNaN(calDate.getTime())) {
                const nextDate = new Date(calDate);
                nextDate.setFullYear(calDate.getFullYear() + 1);
                updated.expiry_date = nextDate.toISOString().split('T')[0];
            }
        }
        setCalibItem(updated);
    };

    const handleDeleteLog = async (id) => {
        if (!window.confirm(t('confirm_delete_log') || 'Xác nhận xóa dòng lịch sử này? Trạng thái thiết bị sẽ được khôi phục.')) return;
        try {
            const token = localStorage.getItem('pms_token');
            await axios.delete(`/api/transactions/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (err) {
            alert("Delete error: " + (err.response?.data?.error || err.message));
        }
    };

    const handleBatchSubmit = async (e) => {
        e.preventDefault();
        if (scannedItems.length === 0) {
            alert(t('scan_at_least_one'));
            return;
        }

        const payload = {
            items: scannedItems.map(i => ({
                id: i.id,
                quantity: i.transact_quantity,
                is_bulk: i.is_bulk || i.item_type === 'spare_part',
                item_type: i.item_type || 'equipment',
                unit: i.transact_unit || i.unit,
                scrap_weight: i.scrap_weight || 0,
                scrap_unit: i.scrap_unit || 'kg',
                last_calibration: i.last_calibration,
                expiry_date: i.expiry_date
            })),
            type: form.type,
            is_internal: form.is_internal || false,
            person_in_charge: form.person_in_charge,
            department: form.department,
            notes: form.notes,
            related_person: form.related_person,
            purpose: form.purpose,
            sender_name: form.sender_name, sender_position: form.sender_position, sender_department: form.sender_department, sender_company: form.sender_company,
            receiver_name: form.receiver_name, receiver_position: form.receiver_position, receiver_department: form.receiver_department, receiver_company: form.receiver_company
        };

        try {
            if (saveContact) {
                const role = form.type === 'Import' ? 'sender' : 'receiver';
                const contactData = {
                    name: form[`${role}_name`],
                    position: form[`${role}_position`],
                    department: form[`${role}_department`],
                    company: form[`${role}_company`]
                };
                if (contactData.name) {
                    await axios.post(`/api/contacts`, contactData);
                }
            }
            await axios.post(`/api/transactions`, payload);
            alert(t('save_transaction_success'));
            setShowModal(false);
            setScannedItems([]);
            setForm(f => ({ ...f, notes: '', related_person: '', purpose: '' }));
            setSaveContact(false);
            await fetchData();
        } catch (err) {
            console.error('Lỗi khi lưu:', err);
            alert(err.response?.data?.error || t('save_transaction_error'));
        }
    };

    const handlePrint = (log) => {
        const batchLogs = log.batch_code ? logs.filter(l => l.batch_code === log.batch_code) : [log];
        const isImport = log.type === 'Import';

        let totalQty = 0;
        let trHtml = '';
        batchLogs.forEach((l, index) => {
            totalQty += Number(l.quantity) || 0;
            trHtml += `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td>${l.equipment_name}</td>
                  <td style="text-align: center;">${l.part_no || '---'}</td>
                  <td style="text-align: center;">${l.serial_no || '---'}</td>
                  <td style="text-align: center; vertical-align: middle; padding: 5px;">
                    ${l.image_url ? `<img src="${window.location.origin}${l.image_url}" style="max-height: 80px; max-width: 100%; object-fit: contain;" />` : '---'}
                  </td> 
                  <td style="text-align: center;">${l.unit || 'ea'}</td>
                  <td style="text-align: center;"><b>${Number(l.quantity)}</b></td>
                  <td>${l.type === 'Scrap' ? `[Scrap: ${Number(l.scrap_weight)} ${l.scrap_unit}]` : (l.equipment_status || '---')}</td>
                </tr>
            `;
        });

        const printContent = `
      <html>
        <head>
          <title>Phiếu ${isImport ? 'Nhập' : 'Xuất'} Kho</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: 'Times New Roman', serif; padding: 0; margin: 0; line-height: 1.3; color: #000; }
            .header-title { text-align: center; font-weight: bold; font-size: 18px; text-transform: uppercase; margin-bottom: 2px; }
            .header-subtitle { text-align: center; font-weight: normal; font-size: 14px; font-style: italic; margin-bottom: 15px; }
            .info-text { font-size: 14px; margin-bottom: 4px; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; margin-top: 5px; }
            .content table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; table-layout: fixed; }
            .content th, .content td { border: 1px solid #000; padding: 4px; border-color: #000; text-align: center; word-wrap: break-word; }
            .content th { background-color: #f8f9fa; font-weight: bold; }
            .approval-table { width: 100%; border-collapse: collapse; text-align: center; border: 1px solid #000; font-size: 14px; margin: 20px 0 30px 0; }
            .approval-table th, .approval-table td { border: 1px solid #000; padding: 8px; }
            .approval-table th { background-color: #f8f9fa; font-weight: bold; height: 35px; }
            .approval-table td { height: 120px; vertical-align: bottom; padding-bottom: 10px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div style="display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 20px;">
              <img src="/hse_logo.png" alt="Logo" style="height: 60px; position: absolute; left: 0; top: 0;" />
              <div>
                  <div class="header-title">BIÊN BẢN BÀN GIAO DỤNG CỤ, THIẾT BỊ & TÀI SẢN</div>
                  <div class="header-subtitle" style="margin-bottom: 0;">Handover Tool, Equipment & Fix asset</div>
              </div>
          </div>
          
          <div class="info-text"><strong>Hôm nay (Today date):</strong> ${new Date(log.transaction_date).toLocaleString('vi-VN')}</div>
          
          <div class="grid-2">
            <div>
              <div class="info-text"><strong>Bên ${isImport ? 'B' : 'A'}: (${isImport ? 'Bên Nhận' : 'Bên Giao'})</strong></div>
              <div class="info-text">Công ty: ${isImport ? (log.receiver_company || 'IVI HAENGSUNG') : (log.sender_company || '..........................')}</div>
              <div class="info-text">Bộ phận: ${isImport ? (log.receiver_department || '..........................') : (log.sender_department || '..........................')}</div>
              <div class="info-text">Người đại diện: ${isImport ? (log.receiver_name || log.person_in_charge) : (log.sender_name || log.related_person || '...')}</div>
              <div class="info-text">Chức vụ: ${isImport ? (log.receiver_position || '..........................') : (log.sender_position || '..........................')}</div>
            </div>
            <div>
              <div class="info-text"><strong>Bên ${isImport ? 'A' : 'B'}: (${isImport ? 'Bên Giao' : 'Bên Nhận'})</strong></div>
              <div class="info-text">Công ty: ${isImport ? (log.sender_company || '..........................') : (log.receiver_company || 'IVI HAENGSUNG')}</div>
              <div class="info-text">Bộ phận: ${isImport ? (log.sender_department || '..........................') : (log.receiver_department || '..........................')}</div>
              <div class="info-text">Người đại diện: ${isImport ? (log.sender_name || log.related_person) : (log.receiver_name || log.person_in_charge || '...')}</div>
              <div class="info-text">Chức vụ: ${isImport ? (log.sender_position || '..........................') : (log.receiver_position || '..........................')}</div>
            </div>
          </div>

          <div class="info-text"><strong>1. Bên giao đã bàn giao cho bên nhận đầy đủ số lượng theo nội dung bảng bên dưới:</strong></div>
          <div class="info-text" style="font-style: italic; margin-bottom: 10px;">(The Transferor has fully handed over to The Transferee blow content:)</div>
          
          <div class="info-text"><strong>2. Tình trạng thiết bị bàn giao (Device status transfer):</strong> ${'Bình thường'}</div>
          <div class="info-text"><strong>3. Mục đích xuất hàng (Purpose):</strong> ${log.purpose || '---'}</div>
          
          <div class="info-text" style="margin-top: 15px;">Biên bản này được lập thành 02 bản có giá trị như nhau, mỗi bên giữ 01 bản.</div>
          <div class="info-text" style="font-style: italic;">(This report is made in two of the same, each party retaining a copy.)</div>

          <div class="content">
            <table>
              <thead>
                <tr>
                  <th style="width: 5%;">No.</th>
                  <th style="width: 22%;">Equipment Name<br/>(Tên thiết bị)</th>
                  <th style="width: 12%;">PartNo<br/>(Model)</th>
                  <th style="width: 15%;">Serial number</th>
                  <th style="width: 17%;">Image<br/>(Hình ảnh)</th>
                  <th style="width: 6%;">Unit</th>
                  <th style="width: 6%;">Q'ty</th>
                  <th style="width: 17%;">Remark</th>
                </tr>
              </thead>
              <tbody>
                ${trHtml}
                <tr>
                  <td colspan="6" style="text-align: center; font-weight: bold; padding: 8px;">TOTAL</td>
                  <td style="text-align: center; font-weight: bold;">${Number(totalQty)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <table class="approval-table">
              <tr>
                  <th>DESIGNED</th>
                  <th>CHECKED 1</th>
                  <th>CHECKED 2</th>
                  <th>APPROVED</th>
              </tr>
              <tr>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
              </tr>
          </table>

          <div style="display: grid; grid-template-columns: 1fr 1fr; text-align: center; font-size: 16px; font-weight: bold;">
            <div>Bên Giao</div>
            <div>Bên nhận</div>
          </div>

          <div style="position: fixed; bottom: 10mm; left: 10mm; font-size: 10px; color: #333; font-family: 'Times New Roman', serif;">
            Mã biên bản (Report ID): <b>${log.batch_code || '---'}</b>
          </div>

          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 1200);
            };
          </script>
        </body>
      </html>
    `;
        const win = window.open('', '_blank');
        win.document.write(printContent);
        win.document.close();
    };

    const handlePrintGatePass = (log) => {
        const batchLogs = log.batch_code ? logs.filter(l => l.batch_code === log.batch_code) : [log];

        let trHtml = '';
        let totalQty = 0;
        batchLogs.forEach(l => {
            totalQty += Number(l.quantity) || 0;
            trHtml += `
                <tr style="font-size: 12px;">
                  <td style="text-align: center; height: 20px;">${l.equipment_name}</td>
                  <td style="text-align: center;">${l.serial_no || '---'}</td>
                  <td style="text-align: center;">${l.unit || 'ea'}</td>
                  <td style="text-align: center;"><b>${Number(l.quantity)}</b></td>
                  <td>${l.type === 'Scrap' ? `Scrap: ${Number(l.scrap_weight)} ${l.scrap_unit}` : ''}</td>
                </tr>
            `;
        });

        const printContent = `
      <html>
        <head>
          <title>Giấy Đăng Ký Mang Hàng Ra Cổng</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: 'Times New Roman', serif; padding: 0; margin: 0; line-height: 1.3; color: #000; font-size: 13px; }
            .header-info { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 20px; }
            .header-info .company-name { font-size: 16px; font-weight: bold; color: #000; font-style: italic; }
            .header-title { text-align: center; font-weight: bold; font-size: 18px; text-transform: uppercase; margin-bottom: 2px; }
            .header-subtitle { text-align: center; font-style: italic; font-size: 14px; margin-bottom: 5px; }
            .so-dk { text-align: right; font-weight: bold; margin-bottom: 10px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; table-layout: fixed; }
            th, td { border: 1px solid #000; padding: 4px; text-align: center; vertical-align: middle; }
            .sign-table td { height: 100px; }
            .final-sign { margin-top: 30px; }
            .final-sign td { height: 100px; }
            
            th .vi { display: block; font-size: 13px; font-weight: bold; margin-bottom: 2px; }
            th .en { display: block; font-size: 11px; font-weight: normal; font-style: italic; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="header-info">
             <div class="company-name" style="display: flex; align-items: center; gap: 8px;">
                 <img src="/hse_logo.png" alt="Logo" style="height: 35px;" />
                 <span>Haengsung Electronics Vietnam Co.,Ltd</span>
             </div>
             <div style="text-align: center;">
                 <div>MST: 0201635899</div>
                 <div>Đc: Lô K1, KCN Tràng Duệ, H.An Dương, HP</div>
             </div>
          </div>

          <div class="header-title">GIẤY ĐĂNG KÝ MANG HÀNG RA CỔNG</div>
          <div class="header-subtitle">REGISTER THE OUT OF GATE SHEET</div>
          <div class="so-dk">Số ĐK : HS00....BP:.........</div>

          <table class="info-table">
            <tr>
              <th style="width: 25%"><span class="vi">BP đăng ký</span><span class="en">Department register</span></th>
              <td style="width: 35%">PM-IVI</td>
              <th style="width: 20%"><span class="vi">Ngày đăng ký</span><span class="en">Date register</span></th>
              <td style="width: 20%">${new Date(log.transaction_date).toLocaleDateString('vi-VN')}</td>
            </tr>
            <tr>
              <th rowspan="3"><span class="vi">Mục đích xuất hàng</span><span class="en">Purpose output finish product</span></th>
              <td rowspan="3">${log.purpose || '...........................................'}</td>
              <th><span class="vi">Biển số xe</span><span class="en">Car number</span></th>
              <td></td>
            </tr>
            <tr>
              <th><span class="vi">Tên lái xe</span><span class="en">Driver Name</span></th>
              <td></td>
            </tr>
            <tr>
              <th><span class="vi">Nơi giao hàng (Nhận)</span><span class="en">Delivery place</span></th>
              <td>${log.receiver_company || log.receiver_name || log.related_person || ''}</td>
            </tr>
          </table>

          <div style="text-align: center; font-weight: bold; margin: 10px 0; background-color: #eee; padding: 5px; border: 1px solid #000;">
              Thông tin thành phẩm,NVL / <i style="font-weight: normal; font-size: 12px; color: #4b5563;">Finish good, Material information</i>
          </div>

          <table>
            <thead>
              <tr>
                <th rowspan="2" style="width: 25%;"><span class="vi">Tên hàng hóa/máy móc/..</span><span class="en">Goods, machine</span></th>
                <th colspan="2" style="width: 40%;"><span class="vi">Số lượng</span><span class="en">Quantity</span></th>
                <th rowspan="2" style="width: 15%;"><span class="vi">Số lượng</span><span class="en">Quantity</span></th>
                <th rowspan="2" style="width: 20%;"><span class="vi">Remark</span></th>
              </tr>
              <tr>
                <th style="width: 25%;"><span class="vi">SERI</span></th>
                <th style="width: 15%;"><span class="vi">Đơn vị tính</span><span class="en">Unit</span></th>
              </tr>
            </thead>
            <tbody>
              ${trHtml}
              <tr>
                 <td colspan="3" style="text-align: center; font-weight: bold; background: #fafafa;">Total</td>
                 <td style="font-weight: bold;">${Number(totalQty)}</td>
                 <td style="background: #fafafa;"></td>
              </tr>
            </tbody>
          </table>

          <table class="sign-table">
            <tr>
              <th><span class="vi">Người lập</span><span class="en">(Designer)</span></th>
              <th><span class="vi">Người kiểm tra</span><span class="en">(Checker)</span></th>
              <th><span class="vi">Phê Duyệt</span><span class="en">Approved by</span></th>
            </tr>
            <tr>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </table>

          <table class="final-sign" style="width: 70%; margin-left: 0;">
            <tr>
              <th style="width: 50%;"><span class="vi">BP Bảo vệ</span><span class="en">Security department</span></th>
              <th style="width: 50%;"><span class="vi">LG xác nhận</span><span class="en">(LG confirm & sign)</span></th>
            </tr>
            <tr>
              <td></td>
              <td></td>
            </tr>
          </table>

          <div style="position: fixed; bottom: 10mm; left: 10mm; font-size: 10px; color: #333; font-family: 'Times New Roman', serif;">
            Mã biên bản (Report ID): <b>${log.batch_code || '---'}</b>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
              }, 800);
            };
          </script>
        </body>
      </html>
    `;
        const win = window.open('', '_blank');
        win.document.write(printContent);
        win.document.close();
    };

    const handlePrintLGE = (log) => {
        const batchLogs = log.batch_code ? logs.filter(l => l.batch_code === log.batch_code) : [log];

        let trHtml = '';
        batchLogs.forEach((l, index) => {
            const mãHàngHóa = [l.serial_no].filter(Boolean) || '---';
            trHtml += `
                <tr>
                  <td style="text-align: center;">${index + 1}</td>
                  <td style="text-align: left; padding-left: 5px;">${l.equipment_name}</td>
                  <td style="text-align: center;">${Number(l.quantity)} ${l.unit || 'ea'}</td>
                  <td style="text-align: center;">${mãHàngHóa} ${l.type === 'Scrap' ? `(Scrap: ${Number(l.scrap_weight)}${l.scrap_unit})` : ''}</td>
                </tr>
            `;
        });

        const emptyRowsCount = Math.max(0, 13 - batchLogs.length);
        for (let i = 0; i < emptyRowsCount; i++) {
            trHtml += `<tr><td></td><td></td><td></td><td></td></tr>`;
        }

        const singleFormHtml = (id) => `
            <div class="form-wrapper">
                <div class="form-container">                    
                    <div class="form-header">                        
                        <div class="header-main">
                            <div class="form-id">${id}</div>
                            <div class="title">ĐĂNG KÝ TÀI<br/>SẢN MANG VÀO</div>
                            <div class="subtitle"><i>(Personal Assets Check-in)</i></div>
                        </div>
                        <div class="confirmation-box">
                            <div class="conf-head">XÁC NHẬN <i>(Confirmation)</i></div>
                            <div class="conf-roles">
                                <div class="role-cell">Khách <i>(Visitor)</i></div>
                                <div class="role-cell">Bảo vệ <i>(Guard)</i></div>
                            </div>
                            <div class="sig-space">
                                <div class="sig-space-cell"></div>
                                <div class="sig-space-cell"></div>
                            </div>
                            <div class="sig-labels">
                                <div class="sig-label-cell">Ký tên <i>(Sign)</i></div>
                                <div class="sig-label-cell">Ký tên<i>(Sign)</i></div>
                            </div>
                        </div>
                    </div>

                    <div class="info-row">
                        <div class="dept-box">
                            <div class="dept-box-title">
                                Công ty/Phòng<br/>
                                <i>(Company/Dept)</i>
                            </div>
                            <div class="dept-box-val"></div>
                        </div>                        
                        <div class="personal-info">
                            <div class="info-name">
                                <div class="info-lbl">Tên khách hàng<br/><i>(Name)</i>
                                </div>
                                <div class="info-val"></div>
                            </div>
                            <div class="info-phone">
                                <div class="info-lbl">Số ĐT</br><i>(Phone Num.)</i>
                                </div>
                                <div class="info-val"></div>
                            </div>
                        </div>
                    </div>

                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 7%;">STT</th>
                                <th style="width: 52%;">Tên hàng hoá<br/><i>(Item)</i></th>
                                <th style="width: 15%;">Số lượng<br/><i>(Quantity)</i></th>
                                <th style="width: 25%;">Mã hàng hoá <br/><i>(S/N, P/N, No..)</i></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${trHtml}
                        </tbody>
                    </table>

                    <div class="footer-section">
                        <div class="time-container">
                            <div class="time-title">Ngày giờ mang vào<br/><i>(Time check- in)</i></div>
                            <div class="time-input">
                                20<span class="time-gap"></span>/<span class="time-gap"></span>/<span class="time-gap"></span>-<span class="time-gap"></span>Giờ<span class="time-gap"></span>Phút
                            </div>
                        </div>
                        <div class="time-container">
                            <div class="time-title">Ngày giờ mang ra<br/><i>(Time check-out)</i></div>
                            <div class="time-input">
                                20<span class="time-gap"></span>/<span class="time-gap"></span>/<span class="time-gap"></span>-<span class="time-gap"></span>Giờ<span class="time-gap"></span>Phút
                            </div>
                        </div>
                    </div>

                    <div class="notes-block">
                        <div>※ Vui lòng mang phiếu này đi kèm khi mang hàng ra ngoài.</div>
                        <div class="en"><i>(Please hand in the verification sheet you check out)</i></div>
                        <div>※ Phiếu này chỉ có giá trị sử dụng trong ngày (đến 24h)</div>
                        <div class="en"><i>(Written certificate is available only to 12 P.M in same day)</i></div>
                    </div>
                </div>
                <div class="logo-area">
                    <img src="/lge_logo.png" class="bw-logo" />
                </div>
            </div>
        `;

        const printContent = `
            <html>
            <head>
                <title>Phiếu Đăng Ký Tài Sản Mang Vào LGE</title>
                <style>
                    @page { size: A4 landscape; margin: 10px 35px 0 35px; }
                    * { box-sizing: border-box; }
                    body { font-family: "Cambria", serif; font-size: 15px; margin: 0; display: flex; justify-content: center; background: #fff; gap: 20px; flex-wrap: nowrap; overflow: hidden; }
                    .form-wrapper { width: 47%; display: flex; flex-direction: column; align-items: stretch; break-inside: avoid; page-break-inside: avoid; }
                    .form-container { width: 100%; border: 3px solid #000; display: flex; flex-direction: column; background: #fff; position: relative; }
                    
                    .form-header { display: flex; border-bottom: 1px solid #000; }
                    .form-id { position: absolute; top: 0; left: 0; width: 25px; height: 30px; border-right: 1px solid #000; border-bottom: 1px solid #000; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; }
                    .header-main { position: relative; flex: 0 0 240px; text-align: center; display: flex; flex-direction: column; justify-content: center; padding: 10px 5px; border-right: 1px solid #000; }
                    .header-main .title {font-family: "Calibri", sans-serif; font-size: 32px;  text-decoration: underline; text-decoration-style: double; text-decoration-thickness: 2px; text-underline-offset: 1px; margin-bottom: 0px;  display: inline-block; }
                    .header-main .subtitle { font-weight: bold; }
                    
                    .confirmation-box { flex: 1; display: flex; flex-direction: column; }
                    .conf-head { height: 35px; font-weight: bold; text-align: center; border-bottom: 1px solid #000; padding: 4px; display: flex; align-items: center; justify-content: center; }
                    .conf-roles { display: flex; border-bottom: 1px solid #000; }
                    .role-cell { width: 50%; text-align: center; padding: 2px; }
                    .role-cell:first-child { border-right: 1px solid #000; }
                    .sig-space {flex:1; display: flex; min-height: 50px; }
                    .sig-space-cell { width: 50%; }
                    .sig-space-cell:first-child { border-right: 1px solid #000; }
                    .sig-labels { display: flex; font-size: 8px; border-top: none; font-weight: bold; }
                    .sig-label-cell { width: 50%; text-align: right; padding-right: 5px; padding-bottom: 2px; }
                    .sig-label-cell:first-child { border-right: 1px solid #000; }

                    .info-row { display: flex; border-bottom: 1px solid #000; min-height: 80px; }
                    .dept-box { flex: 0 0 240px; border-right: 1px solid #000; display: flex; flex-direction: row; }
                    .dept-box-title { width: 50%; border-right: 1px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 5px; }
                    .dept-box-val { width: 50%; }
                    .personal-info { flex: 1; display: flex; flex-direction: column; }
                    .info-name, .info-phone { display: flex; flex: 1; border-bottom: 1px solid #000; }
                    .info-phone { border-bottom: none; }
                    .info-lbl { width: 50%; padding: 4px 5px 0px 5px; border-right: 1px solid #000; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
                    .info-val { width: 50%; }

                    .items-table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 5px; font-weight: normal; border-left: none; border-right: none; }
                    .items-table th, .items-table td { border: 1px solid #000; padding: 2px 4px; height: 22px; }
                    .items-table th:first-child, .items-table td:first-child { border-left: none; }
                    .items-table th:last-child, .items-table td:last-child { border-right: none; }
                    .items-table th { background: #fff; font-weight: normal; text-align: center; }

                    .footer-section { display: flex; border: 1px solid #000; margin-top: 5px; margin-left: 40px; margin-right: 40px; }
                    .time-container { flex: 1; border-right: 1px solid #000; display: flex; flex-direction: column; align-items: stretch; }
                    .time-container:last-child { border-right: none; }
                    .time-title { text-align: center; border-bottom: 1px solid #000; padding: 4px; height: 45px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                    .time-input { text-align: center; padding: 8px; height: 60px; display: flex; flex-direction: row; align-items: center; justify-content: center; }
                    .time-gap { display: inline-block; width: 20px; }

                    .notes-block {  line-height: 1.2; margin-left: 45px; margin-right: 45px; }
                    .notes-block .en { font-style: italic; font-weight: normal; }
                    
                    .logo-area { text-align: right; padding-top: 8px; padding-right: 50px; width: 100%; }
                    .logo-area img { height: 35px; scale: 0.8; }
                    .bw-logo { filter: grayscale(100%) contrast(1.2) brightness(0.85); }
                    
                    .vertical-line {
                        position: fixed;
                        left: 50%;
                        top: 0;
                        bottom: 0;
                        width: 0;
                        border-left: 1px dashed #000;
                        z-index: 10;
                    }

                    @media print {
                        body { padding: 0; margin: 0; padding-top: 5mm; }
                        .form-wrapper { width: 47%; }
                        .vertical-line { display: block; }
                    }
                </style>
            </head>
            <body>
                <div class="vertical-line"></div>
                ${singleFormHtml('1')}
                ${singleFormHtml('2')}
                <script>
                    window.onload = function() {
                        setTimeout(() => window.print(), 800);
                    };
                </script>
            </body>
            </html>
        `;
        const win = window.open('', '_blank');
        win.document.write(printContent);
        win.document.close();
    };

    const handleExportCSV = () => {
        if (!logs || logs.length === 0) {
            alert(t('no_data_export'));
            return;
        }

        const csvData = logs.map(log => ({
            'Ngày Giờ': new Date(log.transaction_date).toLocaleString('vi-VN'),
            'Mã Phiếu': log.batch_code || '',
            'Loại Giao Dịch': log.type === 'Import' ? 'NHẬP KHO' : 'XUẤT KHO',
            'Tên Thiết Bị': log.equipment_name || '',
            'Mã Thiết Bị': log.equipment_code || '',
            'Số Lượng': log.quantity || 1,
            'Đơn vị Giao': log.sender_company || '',
            'Người Giao': log.sender_name || '',
            'Bộ phận Giao': log.sender_department || '',
            'Đơn vị Nhận': log.receiver_company || '',
            'Người Nhận': log.receiver_name || '',
            'Bộ phận Nhận': log.receiver_department || '',
            'Người liên quan (Cũ)': log.related_person || '',
            'Account Phụ trách': log.person_in_charge || '',
            'Mục Đích': log.purpose || '',
            'Hạng mục/Phòng ban': log.department || '',
            'Ghi Chú': log.notes || ''
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
        link.setAttribute("download", `Lich_Su_Giao_Dich_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const batchesMap = logs.reduce((acc, log) => {
        const key = log.batch_code || `single-${log.id}`;
        if (!acc[key]) {
            acc[key] = {
                batch_code: log.batch_code,
                transaction_date: log.transaction_date,
                type: log.type,
                person_in_charge: log.person_in_charge,
                related_person: log.related_person,
                purpose: log.purpose,
                department: log.department,
                notes: log.notes,
                items_count: 1,
                evidence_delivery_url: log.evidence_delivery_url,
                evidence_gatepass_url: log.evidence_gatepass_url,
                sample_log: log
            };
        } else {
            acc[key].items_count++;
            if (!acc[key].evidence_delivery_url && log.evidence_delivery_url) acc[key].evidence_delivery_url = log.evidence_delivery_url;
            if (!acc[key].evidence_gatepass_url && log.evidence_gatepass_url) acc[key].evidence_gatepass_url = log.evidence_gatepass_url;
        }
        return acc;
    }, {});
    const batches = Object.values(batchesMap);

    const filteredBatches = batches.filter(b => {
        const s = searchTerm.toLowerCase();
        const matchesBatchInfo = (
            (b.batch_code?.toLowerCase().includes(s)) ||
            (b.sample_log?.sender_name?.toLowerCase().includes(s)) ||
            (b.sample_log?.receiver_name?.toLowerCase().includes(s)) ||
            (b.purpose?.toLowerCase().includes(s)) ||
            (b.notes?.toLowerCase().includes(s)) ||
            (b.sample_log?.related_person?.toLowerCase().includes(s))
        );

        // Kiểm tra xem có thiết bị nào trong Batch này khớp S/N, Mã thiết bị hoặc Tên không
        const batchItems = logs.filter(l => l.batch_code === b.batch_code);
        const matchesAnyItem = batchItems.some(l =>
            l.equipment_name?.toLowerCase().includes(s) ||
            l.equipment_code?.toLowerCase().includes(s) ||
            l.serial_no?.toLowerCase().includes(s) ||
            l.part_no?.toLowerCase().includes(s)
        );

        return matchesBatchInfo || matchesAnyItem;
    });

    const filteredLogs = logs.filter(l => {
        const s = searchTerm.toLowerCase();
        const matchesBatch = filterBatchCode ? l.batch_code === filterBatchCode : true;
        const matchesSearch = (
            (l.equipment_name?.toLowerCase().includes(s)) ||
            (l.equipment_code?.toLowerCase().includes(s)) ||
            (l.serial_no?.toLowerCase().includes(s)) ||
            (l.part_no?.toLowerCase().includes(s)) ||
            (l.batch_code?.toLowerCase().includes(s)) ||
            (l.notes?.toLowerCase().includes(s))
        );
        return matchesBatch && matchesSearch;
    });

    return (
        <div>
            <div className="top-bar">
                <h1 className="page-title">{t('transactions')}</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn" onClick={handleExportCSV}>
                        <Download size={18} /> {t('export_csv')}
                    </button>
                    <button className="btn btn-primary" onClick={() => {
                        setForm({ ...form, type: 'Import' });
                        setScannedItems([]);
                        setShowModal(true);
                    }}>
                        <ArrowDownLeft size={18} /> {t('import')}
                    </button>
                    <button className="btn" style={{ backgroundColor: '#ec4899', color: 'white' }} onClick={() => {
                        setForm({ ...form, type: 'Export' });
                        setScannedItems([]);
                        setShowModal(true);
                    }}>
                        <ArrowUpRight size={18} /> {t('export')}
                    </button>
                    <button className="btn" style={{ backgroundColor: '#64748b', color: 'white' }} onClick={() => {
                        setForm({ ...form, type: 'Scrap' });
                        setScannedItems([]);
                        setShowModal(true);
                    }}>
                        <Trash2 size={18} /> {t('scrap') || 'Xuất phế'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                        type="text"
                        placeholder={t('search_placeholder') || 'Tìm kiếm phiếu, thiết bị...'}
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
                {(searchTerm || filterBatchCode) && (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <button onClick={() => { setSearchTerm(''); setFilterBatchCode(null); }} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>
                            ✕ {t('clear_filters') || 'Xóa lọc'}
                        </button>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', whiteSpace: 'nowrap', borderLeft: '3px solid #3b82f6', paddingLeft: '1rem' }}>
                            📊 {t('results') || 'Kết quả'}: <span style={{ color: '#1e293b', fontSize: '1.1rem' }}>{activeTab === 'batches' ? filteredBatches.length : filteredLogs.length}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="tabs" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveTab('batches')}
                    style={{
                        padding: '0.5rem 1rem', border: 'none', background: activeTab === 'batches' ? '#6366f1' : 'transparent',
                        color: activeTab === 'batches' ? 'white' : '#64748b', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    {t('batches_tab')}
                </button>
                <button
                    onClick={() => setActiveTab('items')}
                    style={{
                        padding: '0.5rem 1rem', border: 'none', background: activeTab === 'items' ? '#6366f1' : 'transparent',
                        color: activeTab === 'items' ? 'white' : '#64748b', borderRadius: '8px', cursor: 'pointer', fontWeight: '600'
                    }}
                >
                    {t('details_tab')}
                </button>
            </div>

            {activeTab === 'batches' && (
                <div className="glass-card">
                    <h3>{t('batches_list')}</h3>
                    <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
                        <table style={{ minWidth: '1200px' }}>
                            <thead>
                                <tr>
                                    <th>{t('transaction_date')}</th>
                                    <th>{t('batch_code')}</th>
                                    <th>{t('import')}/{t('export')}</th>
                                    <th>{t('handover_info')} ({t('sender')})</th>
                                    <th>{t('receive_info')} ({t('receiver')})</th>
                                    <th>{t('purpose')}</th>
                                    <th>{t('quantity')}</th>
                                    <th style={{ textAlign: 'center' }}>{t('evidence')}</th>
                                    <th>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBatches.map(b => (
                                    <tr key={b.batch_code || b.sample_log.id}>
                                        <td>{new Date(b.transaction_date).toLocaleString('vi-VN')}</td>
                                        <td>
                                            {b.batch_code ? (
                                                <strong
                                                    style={{ color: '#10b981', cursor: 'pointer', textDecoration: 'underline' }}
                                                    onClick={() => { setFilterBatchCode(b.batch_code); setActiveTab('items'); }}>
                                                    {b.batch_code}
                                                </strong>
                                            ) : '---'}
                                        </td>
                                        <td>
                                            <span style={{
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '4px',
                                                background: b.type === 'Import' ? '#dcfce7' : (b.type === 'Scrap' ? '#f1f5f9' : '#fee2e2'),
                                                color: b.type === 'Import' ? '#166534' : (b.type === 'Scrap' ? '#475569' : '#991b1b'),
                                                fontWeight: 'bold'
                                            }}>
                                                {b.type === 'Import' ? t('import').toUpperCase() : (b.type === 'Scrap' ? t('scrap').toUpperCase() : t('export').toUpperCase())}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{b.sample_log.sender_name || (b.type === 'Import' ? b.related_person : b.person_in_charge) || '---'}</td>
                                        <td style={{ fontWeight: 600 }}>{b.sample_log.receiver_name || (b.type === 'Import' ? b.person_in_charge : b.related_person) || '---'}</td>
                                        <td>{b.purpose || '---'}</td>
                                        <td><span className="badge" style={{ background: '#f1f5f9', color: '#475569' }}>{b.items_count} {t('items_count')}</span></td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                    <span style={{ fontSize: '9px', color: '#64748b' }}>Handover</span>
                                                    {b.evidence_delivery_url ? (
                                                        <a href={b.evidence_delivery_url} target="_blank" rel="noreferrer" title="Xem ảnh Biên bản" style={{ fontSize: '1.2rem', textDecoration: 'none' }}>📄✅</a>
                                                    ) : (
                                                        <label style={{ cursor: 'pointer', fontSize: '1.2rem' }} title="Upload ảnh Biên bản">
                                                            📷
                                                            <input type="file" style={{ display: 'none' }} onChange={e => handleUploadEvidence(b.batch_code, 'delivery', e.target.files[0])} />
                                                        </label>
                                                    )}
                                                </div>
                                                {b.type === 'Export' && (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                                        <span style={{ fontSize: '9px', color: '#64748b' }}>GatePass</span>
                                                        {b.evidence_gatepass_url ? (
                                                            <a href={b.evidence_gatepass_url} target="_blank" rel="noreferrer" title="Xem ảnh Giấy ra cổng" style={{ fontSize: '1.2rem', textDecoration: 'none' }}>🚚✅</a>
                                                        ) : (
                                                            <label style={{ cursor: 'pointer', fontSize: '1.2rem' }} title="Upload ảnh Giấy ra cổng">
                                                                📷
                                                                <input type="file" style={{ display: 'none' }} onChange={e => handleUploadEvidence(b.batch_code, 'gatepass', e.target.files[0])} />
                                                            </label>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                                                <button className="btn" onClick={() => handlePrint(b.sample_log)}>
                                                    <Printer size={16} /> {t('print_handover')}
                                                </button>
                                                {b.type === 'Export' && (
                                                    <>
                                                        <button className="btn" onClick={() => handlePrintGatePass(b.sample_log)} style={{ backgroundColor: '#eab308', color: 'white', borderColor: '#ca8a04' }}>
                                                            <Printer size={16} /> {t('print_gatepass')}
                                                        </button>
                                                        <button className="btn" onClick={() => handlePrintLGE(b.sample_log)} style={{ backgroundColor: '#be185d', color: 'white', borderColor: '#9d174d' }}>
                                                            <Printer size={16} /> In phiếu LGE
                                                        </button>
                                                    </>
                                                )}
                                                {user?.role === 'admin' && (
                                                    <button className="btn" onClick={() => handleDeleteBatch(b.batch_code)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fecaca' }}>
                                                        <Trash2 size={16} /> {t('delete') || 'Xóa'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'items' && (
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ margin: 0 }}>
                            {t('items_list')} {filterBatchCode ? <span style={{ color: '#ec4899' }}>- {filterBatchCode}</span> : ''}
                        </h3>
                        {filterBatchCode && (
                            <button className="btn" onClick={() => setFilterBatchCode(null)}>
                                <X size={16} /> {t('clear_filter')}
                            </button>
                        )}
                    </div>

                    {filterBatchCode && (
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            {(() => {
                                const b = batches.find(x => x.batch_code === filterBatchCode);
                                if (!b) return null;
                                return (
                                    <>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('transaction_date')}</div>
                                            <div style={{ fontWeight: '600' }}>{new Date(b.transaction_date).toLocaleString('vi-VN')}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('type')}</div>
                                            <span style={{ padding: '0.1rem 0.4rem', borderRadius: '4px', background: b.type === 'Import' ? '#dcfce7' : '#fee2e2', color: b.type === 'Import' ? '#166534' : '#991b1b', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                {b.type === 'Import' ? t('import').toUpperCase() : t('export').toUpperCase()}
                                            </span>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('sender')}</div>
                                            <div style={{ fontWeight: '600' }}>{b.sample_log.sender_name || (b.type === 'Import' ? b.related_person : b.person_in_charge) || '---'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('receiver')}</div>
                                            <div style={{ fontWeight: '600' }}>{b.sample_log.receiver_name || (b.type === 'Import' ? b.person_in_charge : b.related_person) || '---'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('purpose')}</div>
                                            <div style={{ fontWeight: '600' }}>{b.purpose || '---'}</div>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>{t('notes_label')}</div>
                                            <div style={{ fontSize: '0.9rem' }}>{b.sample_log.notes || '---'}</div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                    <div style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
                        <table style={{ minWidth: '1200px' }}>
                            <thead>
                                <tr>
                                    <th style={{ whiteSpace: 'nowrap' }}>{t('transaction_date')}</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>{t('batch_code')}</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>{t('type')}</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>{t('status')}</th>
                                    <th>{t('equipment')}</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>{t('quantity')}</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>{t('sender')}</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>{t('receiver')}</th>
                                    <th>{t('purpose')}</th>
                                    {user?.role === 'admin' && <th>{t('actions')}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => (
                                    <tr key={log.id}>
                                        <td>{new Date(log.transaction_date).toLocaleString('vi-VN')}</td>
                                        <td>
                                            {log.batch_code ? (
                                                <span
                                                    style={{ color: '#10b981', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}
                                                    onClick={() => { setFilterBatchCode(log.batch_code); }}>
                                                    {log.batch_code}
                                                </span>
                                            ) : '---'}
                                        </td>
                                        <td>
                                            <span style={{ color: log.type === 'Import' ? '#166534' : (log.type === 'Scrap' ? '#475569' : '#991b1b'), fontWeight: 'bold' }}>
                                                {log.type === 'Import' ? t('import') : (log.type === 'Scrap' ? t('scrap') : t('export'))}
                                            </span>
                                        </td>
                                        <td>
                                            <span className="badge" style={{ background: log.equipment_status === 'OK' ? '#dcfce7' : '#fee2e2', color: log.equipment_status === 'OK' ? '#166534' : '#991b1b' }}>
                                                {log.equipment_status || 'OK'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: '600' }}>{log.equipment_name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {t('code')}: <span style={{ color: '#1e293b', fontWeight: '500' }}>{log.equipment_code}</span>
                                                {log.serial_no && <span> | S/N: <span style={{ color: '#2563eb', fontWeight: '500' }}>{log.serial_no}</span></span>}
                                                {log.part_no && <span> | P/N: <span style={{ color: '#059669', fontWeight: '500' }}>{log.part_no}</span></span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontWeight: 'bold' }}>{Number(log.quantity)} {log.unit || 'ea'}</span>
                                            {log.type === 'Scrap' && log.scrap_weight > 0 && (
                                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    ({Number(log.scrap_weight)} {log.scrap_unit})
                                                </div>
                                            )}
                                        </td>
                                        <td>{log.sender_name || (log.type === 'Import' ? (log.related_person || '---') : log.person_in_charge)}</td>
                                        <td>{log.receiver_name || (log.type === 'Import' ? log.person_in_charge : (log.related_person || '---'))}</td>
                                        <td>{log.purpose || '---'}</td>
                                        {user?.role === 'admin' && (
                                            <td>
                                                <button onClick={() => handleDeleteLog(log.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content trans-modal-content">
                        <button
                            className="btn"
                            onClick={() => setShowModal(false)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.25rem', color: '#64748b', border: 'none', background: 'transparent' }}
                        >
                            <X size={24} />
                        </button>
                        {/* CỘT TRÁI: Khu vực Scan và Hiển thị */}
                        <div className="trans-modal-col-left">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ScanLine size={24} color={form.type === 'Import' ? '#22c55e' : '#ec4899'} />
                                {form.type === 'Import' ? t('scan_import') : t('scan_export')}
                            </h2>
                            {form.type === 'Export' && (
                                <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <input
                                        type="checkbox"
                                        id="is_internal"
                                        checked={form.is_internal || false}
                                        onChange={e => setForm({ ...form, is_internal: e.target.checked })}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="is_internal" style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#1e293b', cursor: 'pointer' }}>
                                        {lang === 'vi' ? 'XUẤT NỘI BỘ (Internal Export)' : 'INTERNAL EXPORT'}
                                    </label>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        {lang === 'vi' ? '* Không đổi trạng thái At HSE' : '* Keep At HSE status'}
                                    </div>
                                </div>
                            )}
                            <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                {t('scan_instruction')}
                            </p>

                            <form onSubmit={handleScan} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input
                                        ref={scanInputRef}
                                        type="text"
                                        placeholder={lang === 'vi' ? "Quét mã hoặc nhập Tên, S/N, P/N..." : "Scan or enter Name, S/N, P/N..."}
                                        value={scanCode}
                                        onChange={e => setScanCode(e.target.value)}
                                        className="input-field"
                                        style={{ flex: 1, padding: '1rem', fontSize: '1.2rem', borderColor: '#3b82f6', borderWidth: '2px' }}
                                    />
                                    <button type="button" className="btn" onClick={() => setScanning(!scanning)} style={{ backgroundColor: scanning ? '#ef4444' : '#1e293b', color: 'white', padding: '0 1rem' }}>
                                        <Camera size={24} />
                                    </button>
                                </div>
                                <button type="submit" style={{ display: 'none' }}>Scan</button>
                            </form>

                            {scanning && (
                                <div style={{ marginBottom: '1.5rem', borderRadius: '12px', overflow: 'hidden', border: '2px solid #3b82f6', position: 'relative', background: '#000' }}>
                                    <div id="reader" style={{ width: '100%', minHeight: '300px' }}></div>

                                    {/* Overlay Controls */}
                                    <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', zIndex: 10 }}>
                                        {cameraCapabilities?.zoom && (
                                            <div style={{ background: 'rgba(0,0,0,0.6)', padding: '0.75rem', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <Maximize size={20} color="white" />
                                                <input
                                                    type="range"
                                                    min={cameraCapabilities.zoom.min}
                                                    max={cameraCapabilities.zoom.max}
                                                    step={0.1}
                                                    value={zoomValue}
                                                    onChange={handleZoomChange}
                                                    style={{ flex: 1, height: '6px', borderRadius: '3px' }}
                                                />
                                                <span style={{ color: 'white', fontSize: '0.8rem', minWidth: '35px' }}>{zoomValue.toFixed(1)}x</span>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button
                                                type="button"
                                                onClick={toggleTorch}
                                                style={{
                                                    width: '50px', height: '50px', borderRadius: '25px',
                                                    background: isTorchOn ? '#fbbf24' : 'rgba(255,255,255,0.2)',
                                                    border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)', transition: 'all 0.2s'
                                                }}
                                            >
                                                <Zap size={24} color={isTorchOn ? '#000' : '#fff'} fill={isTorchOn ? '#000' : 'none'} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {searchResults.length > 0 && (
                                <div style={{ marginBottom: '1.5rem', border: '1px solid #3b82f6', padding: '1rem', borderRadius: '8px', background: '#eff6ff' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 style={{ color: '#1d4ed8', margin: 0 }}>{t('search_results')} ({searchResults.length}):</h4>
                                        <button className="btn" onClick={() => { setSearchResults([]); setScanCode(''); }} style={{ padding: '0.25rem 0.5rem' }}><X size={16} /></button>
                                    </div>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {searchResults.map(eq => (
                                            <div key={eq.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.75rem', borderRadius: '8px', marginBottom: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                    {eq.image_url ? (
                                                        <img src={eq.image_url} alt="thumb" style={{ width: `48px`, height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e2e8f0' }} />
                                                    ) : (
                                                        <div style={{ width: '48px', height: '48px', borderRadius: '6px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', color: '#94a3b8', border: '1px solid #e2e8f0' }}>No Img</div>
                                                    )
                                                    }
                                                    <div>
                                                        <strong>{eq.name}</strong> <span style={{ color: '#64748b', fontSize: '0.85rem' }}>[{eq.code}]</span>
                                                        <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.25rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <span>P/N: {eq.part_no || '---'} | S/N: {eq.serial_no || '---'}</span>
                                                            <span className="badge" style={{ background: eq.status === 'OK' ? '#dcfce7' : '#fee2e2', color: eq.status === 'OK' ? '#166534' : '#991b1b' }}>{eq.status || 'OK'}</span>
                                                            {eq.is_at_hse ? (
                                                                <span style={{ color: '#059669', fontWeight: 'bold' }}>📍 {t('at_hse')}</span>
                                                            ) : (
                                                                <span style={{ color: '#d97706', fontWeight: 'bold' }}>📍 {t('outside')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div >
                                                <button type="button" className="btn btn-primary" onClick={() => confirmAdd(eq)} style={{ padding: '0.5rem 1rem' }}>
                                                    {t('confirm_add')}
                                                </button>
                                            </div >
                                        ))}
                                    </div >
                                </div >
                            )}

                            <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                <table style={{ margin: 0 }}>
                                    <thead style={{ position: 'sticky', top: 0, background: 'white', zIndex: 1 }}>
                                        <tr>
                                            <th>{t('equipment')} ({scannedItems.length})</th>
                                            <th>{t('old_status')}</th>
                                            <th style={{ width: '80px', textAlign: 'center' }}>{t('quantity')}</th>
                                            <th>{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {scannedItems.length > 0 ? scannedItems.map(item => (
                                            <tr key={item.code} style={{ background: item.is_bulk ? '#fefce8' : 'white' }}>
                                                <td>
                                                    <strong>{item.code}</strong> - {item.name}
                                                    {item.serial_no && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>S/N: {item.serial_no}</div>}
                                                </td>
                                                <td>
                                                    {item.is_bulk || form.type === 'Scrap' ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                <input
                                                                    type="number"
                                                                    step="0.0001"
                                                                    min="0.0001"
                                                                    value={item.transact_quantity}
                                                                    onChange={(e) => handleQuantityChange(item.code, e.target.value)}
                                                                    style={{ width: '80px', padding: '0.2rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                                />
                                                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.unit || item.transact_unit || 'ea'}</span>
                                                            </div>
                                                            {form.type === 'Scrap' && (
                                                                <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <div style={{ fontSize: '0.7rem', color: '#1e293b', fontWeight: 'bold' }}>{t('scrap_weight')}</div>
                                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                                        <input
                                                                            type="number"
                                                                            step="0.0001"
                                                                            placeholder="kg"
                                                                            value={item.scrap_weight}
                                                                            onChange={(e) => handleScrapChange(item.code, 'scrap_weight', parseFloat(e.target.value) || 0)}
                                                                            style={{ width: '60px', padding: '0.2rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                                        />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="unit"
                                                                            value={item.scrap_unit}
                                                                            onChange={(e) => handleScrapChange(item.code, 'scrap_unit', e.target.value)}
                                                                            style={{ width: '40px', padding: '0.2rem', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                            <span className="badge" style={{ background: item.status === 'OK' ? '#dcfce7' : '#fee2e2', color: item.status === 'OK' ? '#166534' : '#991b1b' }}>
                                                                {item.status || 'OK'}
                                                            </span>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: item.is_at_hse ? '#059669' : '#d97706' }}>
                                                                {item.is_at_hse ? t('at_hse') : t('outside')}
                                                            </span>
                                                            {form.type === 'Import' && item.is_calibrated && (
                                                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn"
                                                                        onClick={() => {
                                                                            setCalibItem({
                                                                                code: item.code,
                                                                                name: item.name,
                                                                                serial_no: item.serial_no,
                                                                                last_calibration: item.last_calibration,
                                                                                expiry_date: item.expiry_date
                                                                            });
                                                                            setShowCalibModal(true);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            fontSize: '0.7rem',
                                                                            padding: '4px 8px',
                                                                            background: item.last_calibration ? '#dcfce7' : '#f0fdf4',
                                                                            color: '#166534',
                                                                            border: item.last_calibration ? '1px solid #86efac' : '1px solid #bbf7d0',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            gap: '4px',
                                                                            fontWeight: '600'
                                                                        }}
                                                                    >
                                                                        {item.last_calibration ? '✅ ' : '🛡️ '}
                                                                        {t('update_calibration') || 'Cập nhật HC'}
                                                                    </button>
                                                                    {item.last_calibration && (
                                                                        <div style={{
                                                                            fontSize: '0.65rem',
                                                                            color: '#15803d',
                                                                            background: '#f0fdf4',
                                                                            padding: '4px',
                                                                            borderRadius: '4px',
                                                                            border: '1px dashed #86efac',
                                                                            textAlign: 'center'
                                                                        }}>
                                                                            <div><b>HC:</b> {item.last_calibration}</div>
                                                                            <div><b>Hạn:</b> {item.expiry_date}</div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {item.is_bulk || form.type === 'Scrap' ? (
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Bulk</span>
                                                    ) : (
                                                        <strong>x1</strong>
                                                    )}
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        <button className="btn" title="In lại nhãn đã mất" onClick={() => handlePrintLabel(item)} style={{ color: '#2563eb', padding: '0.25rem 0.5rem' }}>
                                                            <Printer size={16} />
                                                        </button>
                                                        <button className="btn" title="Xóa khỏi danh sách" onClick={() => removeScanned(item.code)} style={{ color: '#ef4444', padding: '0.25rem 0.5rem' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Chưa có thiết bị nào trong danh sách quét</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div >

                        {/* CỘT PHẢI: Thông tin Tờ Phhiếu Gộp */}
                        <div className="trans-modal-col-right">
                            <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                                <ClipboardList size={22} color="#3b82f6" /> {t('details_tab')} {form.type === 'Import' ? t('import') : t('export')}
                            </h3>
                            <form onSubmit={handleBatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                                {/* KHU VỰC NGƯỜI GIAO */}
                                <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', background: form.type === 'Export' ? '#f1f5f9' : 'white' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 style={{ margin: 0, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}><User size={16} /> {t('handover_info')}</h4>
                                        {form.type === 'Import' && (
                                            <select className="input-field" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value="" onChange={e => handleSelectContact(e.target.value, 'sender')}>
                                                <option value="" disabled>{contacts.length === 0 ? `-- ${t('empty_contacts')} --` : `--${t('from_contacts')} --`}</option>
                                                {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company || c.department})</option>)}
                                            </select>
                                        )}
                                        {form.type === 'Export' && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({t('you')})</span>}
                                    </div>
                                    <div className="trans-form-grid">
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}><label>{t('full_name')} / {t('unit')} ({t('required')})</label><input type="text" required value={form.sender_name} onChange={e => setForm({ ...form, sender_name: e.target.value, person_in_charge: form.type === 'Export' ? e.target.value : form.person_in_charge })} className="input-field" style={{ padding: '0.6rem' }} /></div>
                                        <div className="form-group"><label>{t('position')}</label><input type="text" value={form.sender_position} onChange={e => setForm({ ...form, sender_position: e.target.value })} className="input-field" style={{ padding: '0.6rem' }} /></div>
                                        <div className="form-group"><label>{t('department')}</label><input type="text" value={form.sender_department} onChange={e => setForm({ ...form, sender_department: e.target.value })} className="input-field" style={{ padding: '0.6rem' }} /></div>
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}><label>{t('company')}</label><input type="text" value={form.sender_company} onChange={e => setForm({ ...form, sender_company: e.target.value })} className="input-field" style={{ padding: '0.6rem' }} /></div>
                                    </div>
                                </div>

                                {/* KHU VỰC NGƯỜI NHẬN */}
                                <div style={{ border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px', background: form.type === 'Import' ? '#f1f5f9' : 'white' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h4 style={{ margin: 0, color: '#ec4899', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem' }}><UserCheck size={16} /> {t('receive_info')}</h4>
                                        {form.type === 'Export' && (
                                            <select className="input-field" style={{ padding: '0.4rem', fontSize: '0.8rem' }} value="" onChange={e => handleSelectContact(e.target.value, 'receiver')}>
                                                <option value="" disabled>{contacts.length === 0 ? `--${t('empty_contacts')}--` : `--${t('from_contacts')}--`}</option>
                                                {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.company || c.department})</option>)}
                                            </select>
                                        )}
                                        {form.type === 'Import' && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({t('you')})</span>}
                                    </div>
                                    <div className="trans-form-grid">
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}><label>{t('full_name')} / {t('unit')} ({t('required')})</label><input type="text" required value={form.receiver_name} onChange={e => setForm({ ...form, receiver_name: e.target.value, person_in_charge: form.type === 'Import' ? e.target.value : form.person_in_charge })} className="input-field" style={{ padding: '0.6rem' }} /></div>
                                        <div className="form-group"><label>{t('position')}</label><input type="text" value={form.receiver_position} onChange={e => setForm({ ...form, receiver_position: e.target.value })} className="input-field" style={{ padding: '0.6rem' }} /></div>
                                        <div className="form-group"><label>{t('department')}</label><input type="text" value={form.receiver_department} onChange={e => setForm({ ...form, receiver_department: e.target.value })} className="input-field" style={{ padding: '0.6rem' }} /></div>
                                        <div className="form-group" style={{ gridColumn: 'span 2' }}><label>{t('company')}</label><input type="text" value={form.receiver_company} onChange={e => setForm({ ...form, receiver_company: e.target.value })} className="input-field" style={{ padding: '0.6rem' }} /></div>
                                    </div>
                                </div>

                                <div style={{ background: '#fefce8', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fef08a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <input type="checkbox" id="saveContact" checked={saveContact} onChange={e => setSaveContact(e.target.checked)} style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
                                    <label htmlFor="saveContact" style={{ fontSize: '0.9rem', cursor: 'pointer', color: '#854d0e', fontWeight: 600 }}>🌟 {t('save_contact_auto')}</label>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><FileText size={16} /> {t('purpose_label')}</label>
                                    <input type="text" value={form.purpose} onChange={e => setForm({ ...form, purpose: e.target.value })} className="input-field" style={{ width: '100%', padding: '0.875rem', background: 'white' }} placeholder={form.type === 'Import' ? "VD: Mua mới, Trả máy..." : "VD: Sản xuất, Mượn test..."} />
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><FileText size={16} /> {t('notes_label')}</label>
                                    <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field" rows="2" style={{ width: '100%', padding: '0.875rem', background: 'white' }}></textarea>
                                </div>

                                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>{t('items_rows')}:</span>
                                        <strong>{scannedItems.length}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{t('action_label')}:</span>
                                        <strong style={{ color: form.type === 'Import' ? '#22c55e' : '#ec4899' }}>
                                            {form.type === 'Import' ? t('import_to_stock') : t('export_from_stock')}
                                        </strong>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                                    <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowModal(false)}>{t('cancel')}</button>
                                    <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>{t('save_batch')} {form.type === 'Import' ? t('import') : t('export')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
                .form-group label { font-size: 0.8rem; font-weight: 600; color: #64748b; }
                .input-field { padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; font-family: inherit; width: 100%; }
                .badge { padding: 0.25rem 0.625rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; display: inline-block; }
                
                .trans-modal-content {
                    max-width: 1100px;
                    display: flex;
                    gap: 2rem;
                    position: relative;
                    padding: 2rem;
                    padding-top: 3.5rem;
                    max-height: 90vh;
                    overflow-x: hidden;
                    overflow-y: auto;
                }
                .trans-modal-col-left { flex: 2; min-width: 0; }
                .trans-modal-col-right { flex: 1.2; background: #f8fafc; padding: 2rem; border-radius: 12px; display: flex; flex-direction: column; min-width: 0; }
                .trans-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }

                @media (max-width: 768px) {
                    .trans-modal-content {
                        flex-direction: column;
                        padding: 1rem;
                        padding-top: 3.5rem;
                        gap: 1.5rem;
                        width: 100%;
                        max-height: 100vh;
                        border-radius: 0;
                    }
                    .trans-modal-col-left { flex: none; width: 100%; order: 2; overflow-x: auto; }
                    .trans-modal-col-right { flex: none; width: 100%; order: 1; padding: 1rem; }
                    
                    .trans-form-grid { grid-template-columns: 1fr; }
                    
                    .trans-modal-col-right h3 { font-size: 1.1rem; margin-bottom: 1rem!important; }
                    .form-group label { font-size: 0.75rem; }
                    .input-field { padding: 0.6rem; }

                    /* Table adjustment in modal */
                    .trans-modal-col-left table {
                        display: block;
                        width: 100%;
                        overflow-x: auto;
                        -webkit-overflow-scrolling: touch;
                    }
                    .trans-modal-col-left table th, .trans-modal-col-left table td {
                        white-space: nowrap;
                        font-size: 0.85rem;
                        padding: 0.75rem 0.5rem;
                    }
                }

                /* Custom Range Slider */
                input[type=range] {
                    -webkit-appearance: none;
                    background: rgba(255, 255, 255, 0.3);
                }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 18px;
                    width: 18px;
                    border-radius: 50%;
                    background: #fff;
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
            `}</style>

            {showCalibModal && calibItem && (
                <div className="modal-overlay" style={{ zIndex: 1100 }}>
                    <div className="modal-content" style={{ maxWidth: '500px', padding: '2rem' }}>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#166534' }}>
                            <ShieldCheck size={24} /> {t('update_calibration') || 'Cập nhật Hiệu chuẩn'}
                        </h2>
                        <div style={{ margin: '1rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{calibItem.name}</div>
                            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>Mã: {calibItem.code} | S/N: {calibItem.serial_no || '---'}</div>
                        </div>

                        <form onSubmit={handleSaveItemCalibration} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: 'bold', color: '#1e293b' }}>{t('last_calibration_date')}</label>
                                <input
                                    type="date"
                                    value={calibItem.last_calibration || ''}
                                    onChange={e => handleCalibModalChange('last_calibration', e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ fontWeight: 'bold', color: '#1e293b' }}>{t('expiry_date_label')}</label>
                                <input
                                    type="date"
                                    value={calibItem.expiry_date || ''}
                                    onChange={e => handleCalibModalChange('expiry_date', e.target.value)}
                                    className="input-field"
                                    style={{ fontWeight: 'bold', color: '#166534', border: '1px solid #86efac' }}
                                    required
                                />
                                <span style={{ fontSize: '0.75rem', color: '#15803d', fontStyle: 'italic' }}>* Tự động tính +1 năm từ ngày hiệu chuẩn</span>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" style={{ flex: 1 }} onClick={() => setShowCalibModal(false)}>{t('cancel')}</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1, background: '#16a34a' }}>{t('confirm') || 'Xác nhận'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transactions;
