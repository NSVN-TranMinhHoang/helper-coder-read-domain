// ==UserScript==
// @name         Domain Helper Translation v5
// @namespace    https://docs.scriptcat.org/
// @version      0.1.2
// @description  Japanese -> Vietnamese helper with advanced dictionary management
// @downloadURL  https://nsvn-tranminhhoang.github.io/helper-coder-read-domain/translate/domain-helper.user.js
// @updateURL    https://nsvn-tranminhhoang.github.io/helper-coder-read-domain/translate/domain-helper.user.js
// @author       You
// @match        http://192.168.50.14:81/*
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'jp-helper-dictionary';
    const SETTINGS_KEY = 'jp-helper-settings';
    const CONFIG = {
        targetSelector: '#index-files li',
        processedClass: 'jp-helper-processed'
    };

    let alwaysShowVietnamese = false;
    let DICTIONARY = loadDictionary();

    init();

    function init() {
        injectCss();
        createMainPanel();
        createToggleButton();
        createEditorTooltip();
        createClassInfoPanel();
        observeDom();
    }

    // =============================
    // STORAGE & SETTINGS
    // =============================

    function loadDictionary() {
        try {
            const localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return {
                ...(localData || {})
            };
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    function saveDictionary() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DICTIONARY));
        window.top.dispatchEvent(new CustomEvent('jp-helper-dictionary-updated'));
    }

    function loadSettings() {
        try {
            return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {
                showTooltipOnHover: true,
                autoShowVietnamese: false,
                fontSize: 12,
                theme: 'light'
            };
        } catch (e) {
            return e;
        }
    }

    function saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    // =============================
    // DOM OBSERVATION
    // =============================

    function observeDom() {
        const observer = new MutationObserver(() => {
            processItems();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        processItems();
    }

    function processItems() {
        const items = document.querySelectorAll(
            `${CONFIG.targetSelector}:not(.${CONFIG.processedClass})`
        );

        items.forEach(($item) => {
            $item.classList.add(CONFIG.processedClass);
            const japaneseText = getJapaneseText($item);
            if (!japaneseText) {
                return;
            }
            const vietnameseText = DICTIONARY[japaneseText]?.alias;
            if (vietnameseText) {
                applyTooltip($item, vietnameseText);
                renderVietnamese($item, vietnameseText);
            }
            bindEvents($item, japaneseText);
        });
    }

    function getJapaneseText($item) {
        return normalizeText(
            [...$item.childNodes]
                .filter(node => node.nodeType === Node.TEXT_NODE)
                .map(node => node.textContent)
                .join('')
        );
    }

    function bindEvents($item, japaneseText) {
        $item.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openEditorTooltip(e, $item, japaneseText);
        });
    }

    function applyTooltip($item, text) {
        $item.setAttribute('data-tooltip', text);
    }

    function renderVietnamese($item, text) {
        let $vi = $item.querySelector('.jp-helper-vi');
        if (!$vi) {
            $vi = document.createElement('div');
            $vi.className = 'jp-helper-vi';
            $item.appendChild($vi);
        }

        $vi.textContent = text;
    }

    function removeVietnamese($item) {
        $item.removeAttribute('data-tooltip');
        const $vi = $item.querySelector('.jp-helper-vi');
        if ($vi) {
            $vi.remove();
        }
    }

    // =============================
    // MAIN PANEL - DICTIONARY MANAGER
    // =============================

    function createMainPanel() {
        const $panel = document.createElement('div');
        $panel.id = 'jp-helper-main-panel';
        $panel.classList.add('hidden');
        $panel.innerHTML = `
            <div class="jp-helper-panel-header">
                <h2>📚 Dictionary Manager</h2>
                <button class="jp-helper-close-btn" title="Đóng">✕</button>
            </div>

            <div class="jp-helper-panel-toolbar">
                <div class="jp-helper-search-box">
                    <input type="text" class="jp-helper-search-input"  placeholder="Tìm kiếm từ điển...">
                    <span class="jp-helper-search-icon">🔍</span>
                </div>

                <div class="jp-helper-toolbar-buttons">
                    <button class="jp-helper-btn-icon" title="Thêm mới" data-action="add">
                        ➕ Thêm
                    </button>
                    <button class="jp-helper-btn-icon" title="Xuất" data-action="export">
                        💾 Xuất
                    </button>
                    <button class="jp-helper-btn-icon" title="Nhập" data-action="import">
                        📥 Nhập
                    </button>
                    <button class="jp-helper-btn-icon" title="Cài đặt" data-action="settings">
                        ⚙️ Cài đặt
                    </button>
                </div>
            </div>

            <div class="jp-helper-panel-stats">
                <span>Total: <strong class="jp-helper-stat-count">0</strong></span>
                <span>|</span>
                <span>Search: <strong class="jp-helper-stat-search">0</strong></span>
            </div>

            <div class="jp-helper-panel-list">
                <!-- Items will be generated here -->
            </div>
        `;

        document.body.appendChild($panel);

        // Event listeners
        setupPanelEvents($panel);
    }

    function setupPanelEvents($panel) {
        const $closeBtn = $panel.querySelector('.jp-helper-close-btn');
        const $searchInput = $panel.querySelector('.jp-helper-search-input');
        const $toolbarButtons = $panel.querySelectorAll('[data-action]');

        $closeBtn.addEventListener('click', () => {
            $panel.classList.toggle('hidden');
        });
        $searchInput.addEventListener('input', (e) => {
            filterDictionary(e.target.value, $panel);
        });

        $toolbarButtons.forEach($btn => {
            $btn.addEventListener('click', () => {
                const action = $btn.dataset.action;
                handleToolbarAction(action, $panel);
            });
        });

        renderDictionaryList($panel);
    }

    function createClassInfoPanel() {
        const indexFiles = document.querySelector('#index-files');
        if (!indexFiles) {
            return;
        }

        const $container = document.createElement('div');
        $container.id = 'jp-helper-class-info-panel';
        $container.className = 'jp-helper-class-info-panel';
        $container.innerHTML = `
            <div class="jp-helper-class-info-header">
                <div>
                    <strong>Thông tin class / alias</strong>
                    <div class="jp-helper-class-info-description">Tìm và cập nhật alias, attribute, method.</div>
                </div>
                <button type="button" id="jp-helper-class-info-toggle">Hiện</button>
            </div>
            <div id="jp-helper-class-info-body" class="hidden">
                <div class="jp-helper-class-info-search">
                    <input type="text" id="jp-helper-class-info-search" placeholder="Tìm theo tiếng Nhật hoặc alias...">
                </div>
                <div class="jp-helper-class-info-detail" id="jp-helper-class-info-detail">
                    <div class="jp-helper-class-info-empty">Tìm kiếm để hiện chi tiết class</div>
                </div>
            </div>
        `;

        indexFiles.insertAdjacentElement('afterend', $container);

        const $toggle = $container.querySelector('#jp-helper-class-info-toggle');
        const $search = $container.querySelector('#jp-helper-class-info-search');
        const $body = $container.querySelector('#jp-helper-class-info-body');

        $toggle.addEventListener('click', () => {
            // const isHidden = $container.classList.toggle('hidden');
            const isHidden = $body.classList.toggle('hidden')
            $toggle.textContent = isHidden ? 'Hiện' : 'Ẩn';
        });

        $search.addEventListener('input', () => {
            // console.log($search.value);
            renderClassInfoDetailForSearch($search.value);
        });

        renderClassInfoDetailForSearch('');
    }

    function getClassInfoEntries(filter = '') {
        const query = normalizeText(filter).toLowerCase();
        if (!query) return null;
        DICTIONARY = loadDictionary()
        const result = Object.entries(DICTIONARY).find(([jp, value]) => {
            if (!value || typeof value !== 'object') {
                return false;
            }

            // Tạo hàm phụ xóa khoảng trắng và chuyển chữ thường để so sánh khớp hoàn toàn
            const clean = (text) => normalizeText(text || '').replace(/\s+/g, '').toLowerCase();

            const alias = clean(value.alias);
            const name = clean(value.name || jp);
            const jpClean = clean(jp);

            // 1. Kiểm tra khớp hoàn toàn ở thông tin Class gốc
            if (query === jpClean || query === alias ||  query === name) {
                return true;
            }
            return false;
        });
        return result || null;
    }

    function renderClassInfoDetailForSearch(filter = '') {
        const $detail = document.getElementById('jp-helper-class-info-detail');
        if (!$detail) return;

        const entry = getClassInfoEntries(filter);
        console.log(entry)
        if (!entry) {
            $detail.innerHTML = '<div class="jp-helper-class-info-empty">Không tìm thấy class phù hợp</div>';
            return;
        }
        renderClassInfoDetail(entry[0]);
    }

    function renderClassInfoDetail(japaneseText) {
        const value = DICTIONARY[japaneseText];
        const $detail = document.getElementById('jp-helper-class-info-detail');
        if (!$detail || !value || typeof value !== 'object') return;

        const classAlias = escapeHtml(value.alias || '');
        const attributes = value.attributes || [];
        const methods = value.methods || [];

        $detail.innerHTML = `
            <div class="jp-helper-class-info-detail-header">
                <div><strong>Class:</strong> ${escapeHtml(japaneseText)}</div>
            </div>
            <div class="jp-helper-class-info-form-group">
                <label>Alias: <b style="font-size: 16px">  ${classAlias}</b></label>
            </div>
            <div class="jp-helper-class-info-section">
                <div class="jp-helper-class-info-section-title">Attributes</div>
                <div class="jp-helper-class-info-rows" id="jp-helper-class-info-attributes">
                    ${attributes.length ? attributes.map((attr, index) => `
                        <div class="jp-helper-class-info-row">
                            <div class="jp-helper-class-info-row-title">${escapeHtml(attr.name)}</div>
                            <input type="text" class="jp-helper-class-info-attr-alias" data-index="${index}" placeholder="Alias" value="${escapeHtml(attr.alias || '')}">
                        <!--   <input type="text" class="jp-helper-class-info-attr-type" data-index="${index}" placeholder="TypeObject" value="${escapeHtml(attr.typeObject || '')}">    -->
                        </div>
                    `).join('') : '<div class="jp-helper-class-info-empty-row">Không có attribute</div>'}
                </div>
            </div>
            <div class="jp-helper-class-info-section">
                <div class="jp-helper-class-info-section-title">Methods</div>
                <div class="jp-helper-class-info-rows" id="jp-helper-class-info-methods">
                    ${methods.length ? methods.map((method, index) => `
                        <div class="jp-helper-class-info-row">
                            <div class="jp-helper-class-info-row-title">${escapeHtml(method.name)}</div>
                            <input type="text" class="jp-helper-class-info-method-alias" data-index="${index}" placeholder="Alias" value="${escapeHtml(method.alias || '')}">
                        </div>
                    `).join('') : '<div class="jp-helper-class-info-empty-row">Không có method</div>'}
                </div>
            </div>
            <div class="jp-helper-class-info-actions">
                <button type="button" id="jp-helper-class-info-save">Lưu</button>
            </div>
        `;

        document.getElementById('jp-helper-class-info-save').addEventListener('click', () => {
            saveClassInfo(japaneseText);
        });
    }

    function saveClassInfo(japaneseText) {
        const value = DICTIONARY[japaneseText];
        if (!value || typeof value !== 'object') return;

        const attrInputs = document.querySelectorAll('.jp-helper-class-info-attr-alias');
        const attrTypeInputs = document.querySelectorAll('.jp-helper-class-info-attr-type');
        attrInputs.forEach(($input) => {
            const index = Number($input.dataset.index);
            const attr = value.attributes[index];
            if (attr) {
                attr.alias = normalizeText($input.value);
            }
        });
        attrTypeInputs.forEach(($input) => {
            const index = Number($input.dataset.index);
            const attr = value.attributes[index];
            if (attr) {
                attr.typeObject = normalizeText($input.value);
            }
        });

        const methodInputs = document.querySelectorAll('.jp-helper-class-info-method-alias');
        methodInputs.forEach(($input) => {
            const index = Number($input.dataset.index);
            const method = value.methods[index];
            if (method) {
                method.alias = normalizeText($input.value);
            }
        });
        console.log(value)

        saveDictionary();
        renderClassInfoDetailForSearch(document.getElementById('jp-helper-class-info-search').value);
        renderDictionaryList(document.querySelector('#jp-helper-main-panel'), document.querySelector('#jp-helper-main-panel .jp-helper-search-input')?.value || '');
        showNotification('Đã lưu thông tin class!');
    }

    function renderDictionaryList($panel, filter = '') {
        const $listContainer = $panel.querySelector('.jp-helper-panel-list');
        $listContainer.innerHTML = '';

        const $statCount = $panel.querySelector('.jp-helper-stat-count');
        const $statSearch = $panel.querySelector('.jp-helper-stat-search');

        const entries = Object.entries(DICTIONARY);
        const filteredEntries = entries.filter(([jp, objClass]) =>
            jp.toLowerCase().includes(filter.toLowerCase()) ||
            objClass?.alias?.toLowerCase().includes(filter.toLowerCase())
        );

        $statCount.textContent = entries.length;
        $statSearch.textContent = filteredEntries.length;

        if (filteredEntries.length === 0) {
            $listContainer.innerHTML = '<div class="jp-helper-no-result">Không có kết quả</div>';
            return;
        }

        filteredEntries.forEach(([jp, objClass]) => {
            if (typeof objClass === 'string') return;
            const $item = createDictionaryListItem(jp, objClass?.alias, $panel);
            $listContainer.appendChild($item);
        });
    }

    function createDictionaryListItem(jp, vi, $panel) {
        const $item = document.createElement('div');
        $item.className = 'jp-helper-list-item';
        $item.innerHTML = `
            <div class="jp-helper-list-item-content">
                <div class="jp-helper-list-item-jp">${escapeHtml(jp)}</div>
                <div class="jp-helper-list-item-vi">${escapeHtml(vi)}</div>
            </div>
            <div class="jp-helper-list-item-actions">
                <button class="jp-helper-list-btn edit" title="Sửa">✏️</button>
                <button class="jp-helper-list-btn copy" title="Sao chép">📋</button>
                <button class="jp-helper-list-btn delete" title="Xóa">🗑️</button>
            </div>
        `;

        const $editBtn = $item.querySelector('.edit');
        const $copyBtn = $item.querySelector('.copy');
        const $deleteBtn = $item.querySelector('.delete');

        $editBtn.addEventListener('click', () => {
            openEditDialog(jp, vi, $panel);
        });

        $copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(`${jp} → ${vi}`);
            showNotification('Đã sao chép!');
        });

        $deleteBtn.addEventListener('click', () => {
            if (confirm(`Xóa: ${jp}?`)) {
                delete DICTIONARY[jp];
                saveDictionary();
                renderDictionaryList($panel);
                updatePageItems();
            }
        });

        return $item;
    }

    function filterDictionary(query, $panel) {
        renderDictionaryList($panel, query);
    }

    function handleToolbarAction(action, $panel) {
        switch (action) {
            case 'add':
                openEditDialog('', '', $panel, true);
                break;
            case 'export':
                exportDictionary();
                break;
            case 'import':
                importDictionary($panel);
                break;
            case 'settings':
                openSettingsDialog($panel);
                break;
        }
    }

    // =============================
    // EDIT DIALOG
    // =============================

    function openEditDialog(japaneseText, vietnameseText, $panel, isNew = false) {
        const $dialog = document.createElement('div');
        $dialog.className = 'jp-helper-dialog-overlay';
        $dialog.innerHTML = `
            <div class="jp-helper-dialog">
                <div class="jp-helper-dialog-header">
                    <h3>${isNew ? '➕ Thêm mục mới' : '✏️ Chỉnh sửa'}</h3>
                    <button class="jp-helper-dialog-close">✕</button>
                </div>

                <div class="jp-helper-dialog-body">
                    <div class="jp-helper-form-group">
                        <label>Tiếng Nhật:</label>
                        <input 
                            type="text" 
                            class="jp-helper-input-jp" 
                            value="${escapeHtml(japaneseText)}"
                            ${!isNew ? 'readonly' : ''}
                            placeholder="Text tiếng Nhật..."
                        >
                    </div>

                    <div class="jp-helper-form-group">
                        <label>Tiếng Việt:</label>
                        <textarea 
                            class="jp-helper-input-vi" 
                            placeholder="Bản dịch tiếng Việt..."
                        >${escapeHtml(vietnameseText)}</textarea>
                    </div>

                    <div class="jp-helper-form-info">
                        <p>💡 Bạn có thể nhập nhiều dòng cho bản dịch</p>
                    </div>
                </div>

                <div class="jp-helper-dialog-actions">
                    <button class="jp-helper-btn-primary save">💾 Lưu</button>
                    <button class="jp-helper-btn-secondary cancel">Hủy</button>
                </div>
            </div>
        `;

        document.body.appendChild($dialog);

        const $inputJp = $dialog.querySelector('.jp-helper-input-jp');
        const $inputVi = $dialog.querySelector('.jp-helper-input-vi');
        const $closeBtn = $dialog.querySelector('.jp-helper-dialog-close');
        const $saveBtn = $dialog.querySelector('.save');
        const $cancelBtn = $dialog.querySelector('.cancel');

        $dialog.addEventListener('click', (e) => {
            if (e.target === $dialog) {
                $dialog.remove();
            }
        });

        setTimeout(() => {
            $inputVi.focus();
        });

        $closeBtn.addEventListener('click', () => $dialog.remove());
        $cancelBtn.addEventListener('click', () => $dialog.remove());

        $saveBtn.addEventListener('click', () => {
            const newJp = normalizeText($inputJp.value);
            const newVi = normalizeText($inputVi.value);

            if (!newJp || !newVi) {
                alert('Vui lòng điền đầy đủ thông tin');
                return;
            }

            if (isNew && DICTIONARY[newJp]) {
                alert('Mục này đã tồn tại!');
                return;
            }

            if (!isNew && newJp !== japaneseText) {
                delete DICTIONARY[japaneseText];
            }

            DICTIONARY[newJp] = newVi;
            saveDictionary();

            $dialog.remove();
            renderDictionaryList($panel);
            updatePageItems();
            showNotification('Đã lưu thành công!');
        });
    }

    // =============================
    // SETTINGS DIALOG
    // =============================

    function openSettingsDialog($panel) {
        const settings = loadSettings();

        const $dialog = document.createElement('div');
        $dialog.className = 'jp-helper-dialog-overlay';
        $dialog.innerHTML = `
            <div class="jp-helper-dialog">
                <div class="jp-helper-dialog-header">
                    <h3>⚙️ Cài đặt</h3>
                    <button class="jp-helper-dialog-close">✕</button>
                </div>

                <div class="jp-helper-dialog-body">
                    <div class="jp-helper-form-group">
                        <label class="jp-helper-checkbox">
                            <input 
                                type="checkbox" 
                                class="setting-tooltip"
                                ${settings.showTooltipOnHover ? 'checked' : ''}
                            >
                            Hiển thị tooltip khi hover
                        </label>
                    </div>

                    <div class="jp-helper-form-group">
                        <label class="jp-helper-checkbox">
                            <input 
                                type="checkbox" 
                                class="setting-auto-show"
                                ${settings.autoShowVietnamese ? 'checked' : ''}
                            >
                            Tự động hiển thị tiếng Việt
                        </label>
                    </div>

                    <div class="jp-helper-form-group">
                        <label>Kích thước font (px):</label>
                        <input 
                            type="number" 
                            class="setting-fontsize"
                            value="${settings.fontSize}"
                            min="10"
                            max="18"
                        >
                    </div>

                    <div class="jp-helper-form-group">
                        <label>Giao diện:</label>
                        <select class="setting-theme">
                            <option value="light" ${settings.theme === 'light' ? 'selected' : ''}>Sáng</option>
                            <option value="dark" ${settings.theme === 'dark' ? 'selected' : ''}>Tối</option>
                        </select>
                    </div>

                    <hr style="margin: 15px 0; border: none; border-top: 1px solid #ddd;">

                    <div class="jp-helper-settings-actions">
                        <button class="jp-helper-settings-btn reset">🔄 Đặt lại mặc định</button>
                        <button class="jp-helper-settings-btn clear-storage">🗑️ Xóa tất cả dữ liệu</button>
                    </div>
                </div>

                <div class="jp-helper-dialog-actions">
                    <button class="jp-helper-btn-primary save">💾 Lưu</button>
                    <button class="jp-helper-btn-secondary cancel">Hủy</button>
                </div>
            </div>
        `;

        document.body.appendChild($dialog);

        const $closeBtn = $dialog.querySelector('.jp-helper-dialog-close');
        const $saveBtn = $dialog.querySelector('.save');
        const $cancelBtn = $dialog.querySelector('.cancel');
        const $resetBtn = $dialog.querySelector('.reset');
        const $clearBtn = $dialog.querySelector('.clear-storage');

        $dialog.addEventListener('click', (e) => {
            if (e.target === $dialog) {
                $dialog.remove();
            }
        });

        $closeBtn.addEventListener('click', () => $dialog.remove());
        $cancelBtn.addEventListener('click', () => $dialog.remove());

        $saveBtn.addEventListener('click', () => {
            const newSettings = {
                showTooltipOnHover: $dialog.querySelector('.setting-tooltip').checked,
                autoShowVietnamese: $dialog.querySelector('.setting-auto-show').checked,
                fontSize: parseInt($dialog.querySelector('.setting-fontsize').value),
                theme: $dialog.querySelector('.setting-theme').value
            };

            saveSettings(newSettings);
            $dialog.remove();
            showNotification('Cài đặt đã lưu!');
        });

        $resetBtn.addEventListener('click', () => {
            if (confirm('Đặt lại dictionary về mặc định?')) {
                DICTIONARY = {};
                saveDictionary();
                renderDictionaryList($panel);
                updatePageItems();
                $dialog.remove();
                showNotification('Đã đặt lại mặc định!');
            }
        });

        $clearBtn.addEventListener('click', () => {
            if (confirm('Xóa tất cả dữ liệu? Hành động này không thể hoàn tác!')) {
                localStorage.removeItem(STORAGE_KEY);
                DICTIONARY = {};
                $dialog.remove();
                showNotification('Đã xóa tất cả dữ liệu!');
            }
        });
    }

    // =============================
    // EXPORT / IMPORT
    // =============================

    function exportDictionary() {
        const dataStr = JSON.stringify(DICTIONARY, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `jp-helper-dict-${new Date().getTime()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('Đã xuất dictionary!');
    }

    function isObject(value) {
        return value && typeof value === "object" && !Array.isArray(value);
    }

    function isEmpty(value) {
        if (value === null || value === undefined) {
            return true;
        }
        if (typeof value === "string" && value.trim() === "") {
            return true;
        }
        if (Array.isArray(value) && value.length === 0) {
            return true;
        }
        if (isObject(value) && Object.keys(value).length === 0) {
            return true;
        }
        return false;
    }

    function importDictionary($panel) {
        const mergeArray = (oldArr = [], newArr = []) => {
            const oldMap = Object.fromEntries( oldArr.map(item => [item.name, item]) );
            const newMap = Object.fromEntries(newArr.map(item => [item.name, item]));
            const names = [ ...new Set([...Object.keys(oldMap), ...Object.keys(newMap),]),];
            return names.map(name => {
                const oldItem = oldMap[name] || {};
                const newItem = newMap[name] || {};
                return mergeObject(oldItem, newItem);
            });
        }

        const mergeObject = (oldObj = {}, newObj = {}) => {
            const result = { ...oldObj };
            for (const key of Object.keys(newObj)) {
                const oldValue = oldObj[key];
                const newValue = newObj[key];
                if (Array.isArray(oldValue) && Array.isArray(newValue)) {
                    result[key] = mergeArray(oldValue, newValue);
                    continue;
                }
                if (isObject(oldValue) && isObject(newValue)) {
                    result[key] = mergeObject(oldValue, newValue);
                    continue;
                }
                if (isEmpty(newValue)) {
                    result[key] = oldValue;
                    continue;
                }
                result[key] = newValue;
            }
            return result;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);
                    DICTIONARY = mergeObject(DICTIONARY, imported);
                    saveDictionary();
                    renderDictionaryList($panel);
                    updatePageItems();
                    showNotification('Đã nhập dictionary!');
                } catch (err) {
                    console.error('File không hợp lệ: ' + err);
                }
            };
            reader.readAsText(file);
        });

        input.click();
    }

    // =============================
    // EDITOR TOOLTIP (Right-click)
    // =============================

    function createEditorTooltip() {

        if (document.getElementById('jp-helper-editor')) {
            return;
        }

        const $editor = document.createElement('div');

        $editor.id = 'jp-helper-editor';

        $editor.innerHTML = `
            <div class="jp-helper-editor-title"> 🖱️ Dịch nhanh </div>
            <div class="jp-helper-editor-jp"></div>
            <textarea class="jp-helper-editor-input" placeholder="Nhập tiếng Việt..."></textarea>

            <div class="jp-helper-editor-actions">
                <button type="button" class="jp-helper-btn save">💾 Lưu lại</button>
                <button type="button" class="jp-helper-btn delete">🗑️ Xóa</button>
                <button type="button" class="jp-helper-btn cancel">Hủy</button>
            </div>
        `;

        document.body.appendChild($editor);
        const $input = $editor.querySelector('.jp-helper-editor-input');
        const $save = $editor.querySelector('.save');
        const $delete = $editor.querySelector('.delete');
        const $cancel = $editor.querySelector('.cancel');

        $save.addEventListener('click', () => {
            console.log('Lưu từ điển...', $editor.dataset.japanese, $input.value);

            const japaneseText = normalizeText($editor.dataset.japanese || '');

            const vietnameseText = normalizeText($input.value);

            if (!japaneseText || !vietnameseText) {
                return;
            }

            if (!DICTIONARY[japaneseText] || typeof DICTIONARY[japaneseText] !== 'object') {
                // Khởi tạo mới hoàn toàn dưới dạng object
                DICTIONARY[japaneseText] = {
                    alias: vietnameseText,
                    name: japaneseText,
                };
            } else {
                DICTIONARY[japaneseText] = {
                    ...DICTIONARY[japaneseText],
                    alias: vietnameseText
                };

            }
            saveDictionary();

            updatePageItems();

            closeEditorTooltip();

            showNotification('Đã lưu!');
        });

        $delete.addEventListener('click', () => {

            const japaneseText = normalizeText(
                $editor.dataset.japanese || ''
            );

            if (!japaneseText) {
                return;
            }

            delete DICTIONARY[japaneseText];
            saveDictionary();
            updatePageItems();
            closeEditorTooltip();
            showNotification('Đã xóa!');
        });

        $cancel.addEventListener('click', () => {
            closeEditorTooltip();
        });

        $editor.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        document.addEventListener('click', (e) => {

            const target = e.target instanceof Element
                ? e.target
                : e.target.parentElement;

            if (!$editor.contains(target)) {
                closeEditorTooltip();
            }
        });
    }

    function openEditorTooltip(e, $item, japaneseText) {

        const $editor = document.getElementById('jp-helper-editor');
        const $jp = $editor.querySelector('.jp-helper-editor-jp');
        const $input = $editor.querySelector('.jp-helper-editor-input');

        $editor.dataset.japanese = japaneseText;
        $jp.textContent = japaneseText;
        $input.value = DICTIONARY[japaneseText]?.alias || '';

        $editor.style.left = `${e.pageX + 12}px`;
        $editor.style.top = `${e.pageY + 12}px`;
        $editor.classList.add('show');

        setTimeout(() => {
            $input.focus();
        });
    }

    function closeEditorTooltip() {
        const $editor = document.getElementById('jp-helper-editor');
        $editor.classList.remove('show');
        delete $editor.dataset.japanese;
    }

    // =============================
    // TOGGLE BUTTON
    // =============================

    function createToggleButton() {
        const $button = document.createElement('button');
        $button.className = 'jp-helper-toggle';
        $button.textContent = 'VI';
        $button.title = 'Hiện/ẩn tiếng Việt (click) | Quản lý từ điển (double-click)';

        let clickCount = 0;
        let clickTimeout;

        $button.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 1) {
                clickTimeout = setTimeout(() => {
                    // Single click
                    alwaysShowVietnamese = !alwaysShowVietnamese;
                    document.body.classList.toggle('jp-helper-show-all', alwaysShowVietnamese);
                    $button.classList.toggle('active', alwaysShowVietnamese);
                    clickCount = 0;
                }, 300);
            } else if (clickCount === 2) {
                // Double click
                clearTimeout(clickTimeout);
                toggleMainPanel();
                clickCount = 0;
            }
        });

        $button.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            navigator.clipboard.writeText(JSON.stringify(DICTIONARY, null, 2));
            showNotification('Đã copy dictionary!');
        });

        document.body.appendChild($button);
    }

    function toggleMainPanel() {
        const $panel = document.getElementById('jp-helper-main-panel');
        if ($panel) {
            $panel.classList.toggle('hidden');
        }
    }

    // =============================
    // UTILITIES
    // =============================

    function normalizeText(text) {
        return (text || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, (m) => map[m]);
    }

    function showNotification(message) {
        const $notif = document.createElement('div');
        $notif.className = 'jp-helper-notification';
        $notif.textContent = message;
        document.body.appendChild($notif);

        setTimeout(() => {
            $notif.classList.add('show');
        }, 10);

        setTimeout(() => {
            $notif.classList.remove('show');
            setTimeout(() => {
                $notif.remove();
            }, 300);
        }, 2000);
    }

    function updatePageItems() {
        const items = document.querySelectorAll(`.${CONFIG.processedClass}`);
        items.forEach($item => {
            const japaneseText = getJapaneseText($item);
            if (japaneseText) {
                const vietnameseText = DICTIONARY[japaneseText]?.alias;
                if (vietnameseText) {
                    applyTooltip($item, vietnameseText);
                    renderVietnamese($item, vietnameseText);
                } else {
                    removeVietnamese($item);
                }
            }
        });
    }

    // =============================
    // CSS INJECTION
    // =============================

    function injectCss() {
        GM_addStyle(`
            /* ===== MAIN PANEL ===== */
            #jp-helper-main-panel {
                position: fixed;
                right: 40px;
                bottom: 26px;
                z-index: 999998;
                width: 420px;
                max-height: 50vh;
                border-radius: 16px;
                background: white;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                display: flex;
                flex-direction: column;
                animation: slideIn 0.3s ease-out;
            }

            #jp-helper-main-panel.hidden {
                display: none;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .jp-helper-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;

                padding: 6px;
                border-bottom: 1px solid #e0e0e0;

                background: linear-gradient(135deg, #1976d2, #42a5f5);
                color: white;
                border-radius: 16px 16px 0 0;
            }

            .jp-helper-panel-header h2 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }

            .jp-helper-close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            }

            .jp-helper-close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
            }

            /* Panel Toolbar */
            .jp-helper-panel-toolbar {
                padding: 12px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
                flex-direction: column;
            }

            .jp-helper-search-box {
                flex: 1 1 0;
                position: relative;
                min-width: 0;
            }

            .jp-helper-search-input {
                width: 100%;
                min-width: 0;
                padding: 8px 12px 8px 32px;
                border: 1px solid #d0d0d0;
                border-radius: 8px;
                font-size: 13px;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
            }

            .jp-helper-search-input:focus {
                border-color: #1976d2;
                box-shadow: 0 0 0 2px rgba(25, 118, 210, 0.1);
            }

            .jp-helper-search-icon {
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                pointer-events: none;
                font-size: 14px;
            }

            .jp-helper-toolbar-buttons {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
            }

            .jp-helper-btn-icon {
                padding: 6px 12px;
                background: #f0f0f0;
                border: 1px solid #d0d0d0;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s;
            }

            .jp-helper-btn-icon:hover {
                background: #1976d2;
                color: white;
                border-color: #1976d2;
            }

            /* Panel Stats */
            .jp-helper-panel-stats {
                padding: 8px 12px;
                font-size: 12px;
                color: #666;
                border-bottom: 1px solid #f0f0f0;
            }

            /* Panel List */
            .jp-helper-panel-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }

            .jp-helper-panel-list::-webkit-scrollbar {
                width: 6px;
            }

            .jp-helper-panel-list::-webkit-scrollbar-track {
                background: #f1f1f1;
                border-radius: 3px;
            }

            .jp-helper-panel-list::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }

            .jp-helper-panel-list::-webkit-scrollbar-thumb:hover {
                background: #a8a8a8;
            }

            .jp-helper-list-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px;
                margin-bottom: 8px;
                border-radius: 8px;
                background: #f8f8f8;
                border: 1px solid #e8e8e8;
                transition: all 0.2s;
            }

            .jp-helper-list-item:hover {
                background: #f0f0f0;
                border-color: #1976d2;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .jp-helper-list-item-content {
                flex: 1;
                min-width: 0;
            }

            .jp-helper-list-item-jp {
                font-weight: 600;
                font-size: 12px;
                color: #333;
                word-break: break-word;
                margin-bottom: 4px;
            }

            .jp-helper-list-item-vi {
                font-size: 14px;
                color: #666;
                word-break: break-word;
            }

            .jp-helper-list-item-actions {
                display: flex;
                gap: 4px;
                margin-left: 8px;
            }

            .jp-helper-list-btn {
                background: none;
                border: none;
                cursor: pointer;
                font-size: 16px;
                padding: 4px;
                transition: transform 0.2s;
            }

            .jp-helper-list-btn:hover {
                transform: scale(1.2);
            }

            .jp-helper-no-result {
                text-align: center;
                padding: 20px;
                color: #999;
                font-size: 14px;
            }

            /* Dialog */
            .jp-helper-dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 1000000;

                display: flex;
                align-items: center;
                justify-content: center;

                animation: fadeIn 0.2s ease-out;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .jp-helper-dialog {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;

                animation: slideUp 0.3s ease-out;
            }

            @keyframes slideUp {
                from {
                    transform: translateY(30px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
            .jp-helper-dialog-header {
                padding: 16px;
                border-bottom: 1px solid #e0e0e0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .jp-helper-dialog-header h3 {
                margin: 0;
                font-size: 16px;
                color: #1976d2;
            }
            .jp-helper-dialog-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
                padding: 0;
                width: 32px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .jp-helper-dialog-close:hover {
                color: #333;
            }
            .jp-helper-dialog-body {
                padding: 20px;
            }
            .jp-helper-form-group {
                margin-bottom: 16px;
            }
            .jp-helper-form-group label {
                display: block;
                margin-bottom: 6px;
                font-weight: 500;
                font-size: 13px;
                color: #333;
            }
            .jp-helper-form-group input[type="text"],
            .jp-helper-form-group textarea,
            .jp-helper-form-group input[type="number"],
            .jp-helper-form-group select {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #d0d7de;
                border-radius: 6px;
                font-size: 13px;
                font-family: inherit;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
            }
            .jp-helper-form-group textarea {
                resize: vertical;
                min-height: 100px;
            }
            .jp-helper-form-group input[type="text"]:focus,
            .jp-helper-form-group textarea:focus,
            .jp-helper-form-group input[type="number"]:focus,
            .jp-helper-form-group select:focus {
                border-color: #1976d2;
                box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
            }
            .jp-helper-checkbox {
                display: flex;
                align-items: center;
                cursor: pointer;
                font-weight: normal;
                margin-bottom: 0;
            }
            .jp-helper-checkbox input[type="checkbox"] {
                width: 16px;
                height: 16px;
                margin-right: 8px;
                cursor: pointer;
            }
            .jp-helper-form-info {
                background: #e3f2fd;
                border-left: 3px solid #1976d2;
                padding: 10px 12px;
                border-radius: 4px;
                font-size: 12px;
                color: #1565c0;
                margin-top: 12px;
            }
            .jp-helper-form-info p {
                margin: 0;
            }
            .jp-helper-settings-actions {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .jp-helper-settings-btn {
                padding: 10px 12px;
                background: #f5f5f5;
                border: 1px solid #d0d0d0;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.2s;
            }
            .jp-helper-settings-btn:hover {
                background: #efefef;
                border-color: #999;
            }
            .jp-helper-dialog-actions {
                padding: 16px;
                border-top: 1px solid #e0e0e0;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            .jp-helper-btn-primary {
                background: #1976d2;
                color: white;
                border: none;
            }
            .jp-helper-btn-primary:hover {
                background: #1565c0;
            }
            .jp-helper-btn-secondary {
                background: #f0f0f0;
                color: #333;
                border: 1px solid #d0d0d0;
            }
            .jp-helper-btn-secondary:hover {
                background: #e8e8e8;
            }
            .jp-helper-btn-primary,
            .jp-helper-btn-secondary {
                padding: 10px 16px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.2s;
            }

            /* Toggle Button */
            .jp-helper-toggle {
                position: fixed;
                right: 4px;
                bottom: 6px;
                z-index: 999999;
                width: 40px;
                height: 40px;
                border: none;
                border-radius: 50%;
                cursor: pointer;
                background: linear-gradient(135deg, #1976d2, #42a5f5);
                color: white;
                font-size: 18px;
                font-weight: bold;
                box-shadow: 0 8px 24px rgba(25, 118, 210, 0.35);
                transition: all 0.15s;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .jp-helper-toggle:hover {
                transform: scale(1.1);
                box-shadow: 0 12px 32px rgba(25, 118, 210, 0.45);
            }
            .jp-helper-toggle.active {
                background: linear-gradient(135deg, #2e7d32, #66bb6a);
            }
            /* Editor Tooltip */
            #jp-helper-editor {
                position: fixed;
                z-index: 1000000;
                width: 340px;
                padding: 16px;
                border-radius: 16px;
                background: white;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
                opacity: 0;
                pointer-events: none;
                transform: translateY(8px) scale(0.98);
                transition: all 0.15s;
            }
            #jp-helper-editor.show {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(0) scale(1);
            }
            .jp-helper-editor-title {
                font-size: 14px;
                font-weight: 700;
                margin-bottom: 10px;
                color: #1976d2;
            }
            .jp-helper-editor-jp {
                padding: 10px 12px;
                border-radius: 8px;
                background: #f5f7fa;
                font-size: 12px;
                line-height: 1.5;
                margin-bottom: 12px;
                word-break: break-word;
            }
            .jp-helper-editor-input {
                width: 100%;
                min-height: 80px;
                padding: 10px 12px;
                border: 1px solid #d0d7de;
                border-radius: 8px;
                outline: none;
                font-size: 12px;
                line-height: 1.5;
                resize: vertical;
                box-sizing: border-box;
            }
            .jp-helper-editor-input:focus {
                border-color: #1976d2;
                box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.12);
            }
            .jp-helper-editor-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }
            .jp-helper-editor-actions .jp-helper-btn {
                flex: 1;
                border: none;
                border-radius: 6px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 600;
                transition: all 0.15s;
            }
            .jp-helper-editor-actions .jp-helper-btn.save {
                background: #1976d2;
                color: white;
            }
            .jp-helper-editor-actions .jp-helper-btn.save:hover {
                background: #1565c0;
            }
            .jp-helper-editor-actions .jp-helper-btn.delete {
                background: #ef5350;
                color: white;
            }
            .jp-helper-editor-actions .jp-helper-btn.delete:hover {
                background: #e53935;
            }
            .jp-helper-editor-actions .jp-helper-btn.cancel {
                background: #eceff1;
                color: #37474f;
            }
            .jp-helper-editor-actions .jp-helper-btn.cancel:hover {
                background: #d0dce1;
            }
            /* Notification */
            .jp-helper-notification {
                position: fixed;
                bottom: 100px;
                right: 20px;
                z-index: 999999;
                background: #323232;
                color: white;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 13px;
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            }
            .jp-helper-notification.show {
                opacity: 1;
                transform: translateY(0);
            }
            /* Process Items */
            .jp-helper-processed {
                position: relative;
            }
            .jp-helper-processed::after {
                content: attr(data-tooltip);
                position: absolute;
                left: calc(100% + 10px);
                top: 50%;
                transform: translateY(-50%) translateX(4px);
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.15s, transform 0.15s;
                z-index: 999999;
                padding: 8px 12px;
                border-radius: 10px;
                background: linear-gradient(135deg, rgba(30, 30, 30, 0.96), rgba(50, 50, 50, 0.96));
                color: white;
                font-size: 12px;
                line-height: 1.5;
                white-space: nowrap;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
                backdrop-filter: blur(4px);
            }
            .jp-helper-processed:hover::after {
                opacity: 1;
                transform: translateY(-50%) translateX(0);
            }
            .jp-helper-vi {
                display: none;
                margin-top: 4px;
                margin-left: 12px;
                padding: 6px 10px;
                border-left: 3px solid #1976d2;
                border-radius: 6px;
                background: #eef6ff;
                color: #1976d2;
                font-size: 12px;
                line-height: 1.5;
            }
            body.jp-helper-show-all .jp-helper-vi {
                display: block;
            }
            /* Class info panel */
            #body #index {
                postion: relative;
            }

            #jp-helper-class-info-panel {
                margin: 16px 0;
                padding: 12px;
                border-radius: 14px;
                background: #ffffff;
                border: 1px solid #dde4ea;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.06);
                max-width: 100%;
                position: absolute;
                bottom: 2px;
            }
            #jp-helper-class-info-panel::-webkit-scrollbar {
                width: 4px;
            }
            #jp-helper-class-info-panel.hidden {
                display: none;
            }

            .jp-helper-class-info-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 12px;
            
            }
            .jp-helper-class-info-description {
                color: #556674;
                font-size: 13px;
                margin-top: 4px;
            }
            #jp-helper-class-info-toggle {
                padding: 8px 14px;
                border-radius: 8px;
                border: 1px solid #d0d7de;
                background: #f5f7fa;
                cursor: pointer;
                font-size: 13px;
            }
            #jp-helper-class-info-body {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-top: 10px;
            }
            .jp-helper-class-info-search input {
                width: 100%;
                padding: 10px 12px;
                border-radius: 10px;
                border: 1px solid #cfd8dd;
                font-size: 13px;
                outline: none;
                box-sizing: border-box;
            }
            .jp-helper-class-info-layout {
                display: grid;
                grid-template-columns: 280px 1fr;
                gap: 16px;
            }
            .jp-helper-class-info-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-height: 420px;
                overflow-y: auto;
                padding-right: 4px;
            }
            .jp-helper-class-info-item {
                width: 100%;
                text-align: left;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 12px;
                background: #fafbfc;
                color: #24313f;
                cursor: pointer;
                transition: background 0.2s, border-color 0.2s;
            }
            .jp-helper-class-info-item:hover {
                background: #eef3f7;
                border-color: #c0d1db;
            }
            .jp-helper-class-info-item-title {
                font-weight: 600;
                margin-bottom: 4px;
                font-size: 14px;
            }
            .jp-helper-class-info-item-subtitle {
                font-size: 13px;
                color: #6b7a88;
            }
            .jp-helper-class-info-detail {
                min-height: 400px;
                max-height: 400px;
                width: 290px;
                overflow-y: auto;
                padding: 14px 6px;
                border: 1px solid #e2e8f0;
                border-radius: 12px;
                background: #fbfdff;
            }
            .jp-helper-class-info-empty {
                color: #6b7a88;
                font-size: 13px;
            }
            .jp-helper-class-info-form-group {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 12px;
            }
            .jp-helper-class-info-form-group label {
                font-size: 13px;
                color: #344250;
            }
            .jp-helper-class-info-form-group input {
                width: 100%;
                padding: 10px 12px;
                border-radius: 10px;
                border: 1px solid #cfd8dd;
                font-size: 13px;
                outline: none;
                box-sizing: border-box;
            }
            .jp-helper-class-info-section {
                margin-bottom: 14px;
            }
            .jp-helper-class-info-section-title {
                font-weight: 600;
                margin-bottom: 10px;
                color: #ff1744;
                font-size: 14px;

            }
            .jp-helper-class-info-rows {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .jp-helper-class-info-row {
                display: grid;
                grid-template-columns: 1fr 1.2fr;
                gap: 10px;
                align-items: center;
            }
            .jp-helper-class-info-row-title {
                font-size: 11px;
                color: #1f2a37;
                font-weight: 600;
            }
            .jp-helper-class-info-row input {
                width: 100%;
                padding: 10px 12px;
                border-radius: 10px;
                border: 1px solid #cfd8dd;
                font-size: 10px;
                outline: none;
                box-sizing: border-box;
            }
            .jp-helper-class-info-empty-row {
                color: #6b7a88;
                font-size: 13px;
            }
            .jp-helper-class-info-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            .jp-helper-class-info-actions button {
                padding: 10px 16px;
                border-radius: 10px;
                border: none;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
            }
            #jp-helper-class-info-save {
                background: #1976d2;
                color: white;
            }
        `);
    }

})();
