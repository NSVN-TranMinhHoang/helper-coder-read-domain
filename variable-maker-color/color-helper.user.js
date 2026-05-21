// ==UserScript==
// @name         Variable Maker Color v2 (Fixed)
// @namespace    https://docs.scriptcat.org/
// @version      0.2.1
// @description  Fixed: Variable detection, $.field underline, no nested spans
// @downloadURL  https://nsvn-tranminhhoang.github.io/helper-coder-read-domain/variable-maker-color/color-helper.user.js
// @updateURL    https://nsvn-tranminhhoang.github.io/helper-coder-read-domain/variable-maker-color/color-helper.user.js
// @author       You
// @match        http://192.168.50.14:81/*
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

(function () {
    'use strict';
    let indexColor = 0;
    let doc = null;
    let currentTable = null;
    let STORAGE_KEY = 'jp-helper-dictionary';

    function normalize(text = "") {
        return text.replace(/\s+/g, " ").trim();
    }
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    function getSheetDocument() {
        const browserIframe = document.querySelector("#browser");

        if (!browserIframe) {
            return null;
        }

        const browserWindow = browserIframe.contentWindow;

        if (!browserWindow) {
            return null;
        }

        const frSheet = browserWindow.frames["frSheet"];

        if (!frSheet) {
            return null;
        }

        const docSheet = frSheet.document;

        if (!docSheet || !docSheet.body) {
            return null;
        }

        return docSheet;
    }

    function observeSheet(docSheet) {
        const observer = new MutationObserver(() => {
            const table = docSheet.querySelector("table");
            /*
              table replaced
            */
            if (table && table !== currentTable) {
                console.log("[Parser] table changed");
                currentTable = table;
                run();
            }
        });

        observer.observe(docSheet.body, {
            childList: true,
            subtree: true,
        });

        // console.log("[Parser] observing sheet");
    }

    start();

    async function start() {
        let observedDoc = null;
        while (true) {
            try {
                const docSheet = getSheetDocument();

                if (!docSheet) {
                    await sleep(500);
                    continue;
                }
                doc = docSheet;
                /*
                  iframe replaced
                */
                if (docSheet !== observedDoc) {
                    observedDoc = docSheet;
                    // console.log("[Parser] iframe changed");
                    observeSheet(docSheet);
                }

                const table = docSheet.querySelector("table");

                if (table && table !== currentTable) {
                    currentTable = table;
                    // console.log("[Parser] first parse");
                    run();
                    // break;
                }

                await sleep(500);
            } catch (e) {
                console.error(e);

                await sleep(1000);
            }
        }
    }




    // Lưu trữ color mapping toàn cục để sử dụng lại
    const globalColorMap = {};

    function randomColor() {
        const colors = [
            // 1. Nhóm màu cơ bản tươi sáng
            "#ff1744", // Đỏ tươi sặc sỡ
            "#00cc66", // Xanh lá cây tươi
            "#0070f3", // Xanh dương đồ họa

            // 2. Nhóm màu ấm rực rỡ
            "#ff6d00", // Cam nguyên bản
            "#9c27b0", // Tím hoa cà
            "#00b0ff", // Xanh ngọc biển

            // 3. Nhóm dải màu ngọt ngào
            "#e91e63", // Hồng cánh sen đậm
            "#2979ff", // Xanh điện tử
            "#00bfa5", // Xanh ngọc lục bảo tươi

            // 4. Nhóm màu sáng có độ bão hòa cao
            "#ffaa00", // Vàng đậm
            "#ff007f", // Hồng neon đậm
            "#76ff03", // Xanh chanh siêu sáng

            // 5. Nhóm bổ sung
            "#651fff", // Tím điện sẫm nhẹ
            "#ff3d00", // Đỏ cam
            "#00e5ff", // Xanh cyan sáng
            "#d500f9"  // Tím hồng sặc sỡ
        ];

        return colors[indexColor++ % colors.length];
    }

    function getOrCreateColor(name) {
        if (!globalColorMap[name]) {
            globalColorMap[name] = randomColor();
        }
        return globalColorMap[name];
    }

    function escapeRegExp(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    function extractClassType() {
        const tds = [...doc.querySelectorAll("td")];

        for (const td of tds) {
            const text = normalize(td.innerText);

            if (
                text &&
                !text.startsWith("■") &&
                !text.startsWith("[") &&
                td.colSpan >= 4
            ) {
                return text;
            }
        }

        return "UnknownClass";
    }

    function extractClassName() {
        const tds = [...doc.querySelectorAll("td")];

        const texts = tds
            .map((td) => normalize(td.innerText))
            .filter(Boolean);
        return texts[1] || "UnknownClass";
    }

    function detectScope(text) {
        if (text.includes("■Private")) return "Private";
        if (text.includes("■Public")) return "Public";
        if (text.includes("■Static")) return "Static";
        if (text.includes("■Require")) return "Require";
        if (text.includes("■責務")) return "Check";

        return null;
    }

    /**
     * Phát hiện nếu đó là section Attribute
     * Tìm các dòng có "■属性" hoặc "Attribute"
     */
    function detectAttributeSection(text) {
        return text.includes("■属性") || text.includes("Attribute");
    }

    /**
     * FIX #1: Trích xuất các biến ($...) đúng cách
     * 
     * Trường hợp:
     * 1. $評価タスク = ... (biến local)
     * 2. $.評価タスクNO == ... (biến loop)
     * 3. $表示制御一覧 (biến output)
     * 
     * Không lấy những phần như: 担当者, 表示制御 nếu không có $
     */
    function extractVariables(text) {
        // Match:
        // $name hoặc $.name
        // Loại bỏ ký tự không phải: chữ, số, _, kanji, hiragana, katakana
        const matches = text.match(/\$\.?[a-zA-Z0-9_\u30a0-\u30ff\u3040-\u309f\u4e00-\u9fff]+/g) || [];
        return [...new Set(matches)];
    }

    /**
     * Trích xuất các thuộc tính (@...)
     * Thuộc tính bắt đầu bằng @
     */
    function extractAttributes(text) {
        const matches = (text.match(/@[a-zA-Z0-9_\u30a0-\u30ff\u3040-\u309f\u4e00-\u9fff]+/g) || [])
            .filter(match => !['@required', '@require'].includes(match.toLowerCase()));
        return [...new Set(matches)];
    }

    function isMethodHeaderRow(element) {
        const text = normalize(element.innerText);
        if (element.children.length > 0) {
            return false;
        }
        return /^\[(.*?)\]/.test(text) && !/\[.*?Exception\]/i.test(text); // && !/[\(\)]/.test(text)
    }

    /**
     * FIX #3: Tô màu cho các biến trong element
     * Cách: Replace từ dài nhất trước, tránh nested spans
     */
    function colorizeVariables(element, variableColors) {
        let html = element.innerHTML;

        // Sắp xếp từ dài nhất trước để tránh vấn đề partial match
        const variables = Object.keys(variableColors)
            .sort((a, b) => b.length - a.length);

        for (const variable of variables) {
            const color = variableColors[variable];
            const escaped = escapeRegExp(variable);

            // REGEX: Chỉ replace nếu không nằm trong tag HTML
            // (?![^<]*>) : Không nằm trong tag HTML
            // Negative lookahead: Không phải là ký tự chữ/số/kanji
            const regex = new RegExp(
                `${escaped}(?![^<]*>)(?![a-zA-Z0-9_\\u30a0-\\u30ff\\u3040-\\u309f\\u4e00-\\u9fff])`,
                "g"
            );

            // FIX #2: Kiểm tra xem variable có phải $.field không
            let style = `color:${color};font-weight:bold`;
            if (variable.startsWith("$.")) {
                // $.field → gạch chân thay vì màu
                style = `color:${color};font-weight:bold;text-decoration:underline;text-decoration-style:dashed`;
            }

            html = html.replace(
                regex,
                `<span class="variable" style="${style}">${variable}</span>`
            );
        }

        element.innerHTML = html;
    }

    function colorizeTableAttributes(element, attrName, color) {
        let html = element.innerHTML;
        const bgColor = hexToRgba(color, 0.2);
        const escaped = escapeRegExp(attrName);

        // REGEX THÔNG MINH:
        // (?![^<]*>) : Chặn thay thế các thuộc tính bên trong thẻ HTML (như class, id)
        // (?![a-zA-Z0-9_\u30a0-\u30ff\u3040-\u309f\u4e00-\u9fff]) : Chặn nếu ký tự tiếp theo vẫn là chữ tiếng Nhật/Anh/Số (Chống nuốt chữ)
        // Chặn bọc đè: Không cho phép khớp nếu từ khóa đã nằm sẵn trong cấu trúc span có màu
        const regex = new RegExp(
            `${escaped}(?![^<]*>)(?![a-zA-Z0-9_\\u30a0-\\u30ff\\u3040-\\u309f\\u4e00-\\u9fff])`,
            "g"
        );

        html = html.replace(
            regex,
            `<span class="attribute" style="background-color:${bgColor};color:${color};font-weight:bold;padding:2px 4px;border-radius:3px">${attrName}</span>`
        );
        element.innerHTML = html;
    }

    /**
     * Tô màu nền cho các thuộc tính trong element
     */
    function colorizeAttributes(element, attributeColors) {
        let html = element.innerHTML;

        const attributes = Object.keys(attributeColors)
            .sort((a, b) => b.length - a.length);

        for (const attribute of attributes) {
            const color = attributeColors[attribute];
            // Tạo rgba từ hex để có background nhẹ hơn
            const bgColor = hexToRgba(color, 0.2);

            const escaped = escapeRegExp(attribute);

            const regex = new RegExp(
                `${escaped}(?![^<]*>)(?![a-zA-Z0-9_\\u30a0-\\u30ff\\u3040-\\u309f\\u4e00-\\u9fff])`,
                "g"
            );

            html = html.replace(
                regex,
                `<span style="background-color:${bgColor};color:${color};font-weight:bold;padding:2px 4px;border-radius:3px">${attribute}</span>`
            );
        }

        element.innerHTML = html;
    }

    /**
     * Chuyển Hex sang RGBA
     */
    function hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Parse Input/Output section của method
     */
    function parseInputOutput(rows, startIndex, method) {
        const variableColors = {};
        const attributeColors = {};

        let currentIoType = null;

        for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            const rowText = normalize(row.innerText);

            /* Stop nếu gặp method tiếp theo */
            if (i !== startIndex && isMethodHeaderRow(row)) {
                break;
            }

            const tds = [...row.querySelectorAll("td")];
            const texts = tds.map((td) => normalize(td.innerText))
                .filter(Boolean);

            /* Phát hiện input/output section */
            const hasInput = texts.some((t) => t.toLowerCase() === "input");
            const hasOutput = texts.some((t) => t.toLowerCase() === "output");

            if (hasInput) {
                currentIoType = "input";
            }
            if (hasOutput) {
                currentIoType = "output";
            }

            /* Phát hiện pseudo code (thường bắt đầu logic) */
            const isPseudoCode = rowText.includes("$") || rowText.includes("return") || rowText.includes("if ");

            if (isPseudoCode) {
                currentIoType = null;
            }

            /* Parse variable row trong input/output section */
            if (currentIoType) {
                const filtered = texts.filter(
                    (t) => t.toLowerCase() !== "input" &&
                        t.toLowerCase() !== "output" &&
                        t !== "Name" &&
                        t !== "Type"
                );

                if (filtered.length >= 2) {
                    const variableName = filtered[0];

                    const targetInOut = currentIoType === "input" ? method.inputs : method.outputs;

                    if (!targetInOut.some(v => v.name === variableName)) {
                        targetInOut.push({ name: variableName, color: getOrCreateColor(variableName), alias: null, typeObject: null });
                    }

                    if (!variableColors[variableName]) {
                        variableColors[variableName] = getOrCreateColor(variableName);
                    }
                }
            }

            /* FIX #1: Trích xuất local variables đúng cách */
            const localVars = extractVariables(rowText);

            for (const variable of localVars) {
                const isExist = method.localVariables.some(v => v.name === variable);
                if (!isExist) {
                    method.localVariables.push({ name: variable, color: getOrCreateColor(variable), alias: null, typeObject: null });
                }
                if (!variableColors[variable]) {
                    variableColors[variable] = getOrCreateColor(variable);
                }
            }

            /* Trích xuất và tô màu attributes */
            const attributes = extractAttributes(rowText);

            for (const attribute of attributes) {
                const isExist = method.attributes.some(a => a.name === attribute);
                if (!isExist) {
                    method.attributes.push({ name: attribute, color: getOrCreateColor(attribute), alias: null, typeObject: null });
                }

                if (!attributeColors[attribute]) {
                    attributeColors[attribute] = getOrCreateColor(attribute);
                }
            }

            /* Tô màu các phần tử */
            tds.forEach((td) => {
                if (!normalize(td.innerText)) return;

                colorizeVariables(td, variableColors);
                colorizeAttributes(td, attributeColors);
            });
        }
    }

    /**
     * Trích xuất attributes từ section ■属性/Attribute
     */
    function parseAttributeSection(rows, startIndex, classInfo) {
        const attributes = [];
        const attributeColors = {};

        for (let i = startIndex; i < rows.length; i++) {
            const row = rows[i];
            const rowText = normalize(row.innerText);

            /* Dừng nếu gặp section khác (■...) hoặc method ([...]) */
            if ((i !== startIndex && rowText.startsWith("■")) || isMethodHeaderRow(row)) {
                break;
            }

            const tds = [...row.querySelectorAll("td")];
            const texts = tds.map((td) => normalize(td.innerText))
                .filter(Boolean);

            /* Skip header rows (Name, Type, etc) */
            if (texts.some(t => t === "Name" || t === "Type")) {
                continue;
            }

            /* Parse attribute row */
            if (texts.length >= 2) {
                const attributeName = texts[0];

                if (attributeName && !attributeName.includes("■") && !attributeName.includes("[")) {
                    attributes.push({
                        name: attributeName,
                        alias: null,
                        type: texts[1] || "",
                        isFinal: texts[2] || "",
                        description: texts[3] || ""
                    });

                    /* Tạo color mapping cho attribute */
                    const colorName = "@" + attributeName;
                    attributeColors[colorName] = getOrCreateColor(colorName);

                    /* Tô màu nền cho attribute trong HTML */
                    tds.forEach((td) => {
                        if (!normalize(td.innerText)) return;
                        colorizeTableAttributes(td, attributeName, attributeColors[colorName]);
                    });
                }
            }
        }

        classInfo.attributes = attributes;
        classInfo.attributeColors = attributeColors;

        return attributes;
    }

    /**
     * Parse toàn bộ document
     * Trả về thông tin class và methods
     */
    function parseDocument() {
        const rows = [...doc.querySelectorAll("tr")];
        const classType = extractClassType();
        const className = extractClassName();
        console.log("CLASS:", className);

        let currentScope = "Unknown";
        const methods = [];
        let classInfo = {
            name: className,
            alias: null,
            type: classType,
            attributes: [],
            methods: [],
            attributeColors: {}
        };

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const rowText = normalize(row.innerText);

            /* Phát hiện attribute section */
            if (detectAttributeSection(rowText)) {
                parseAttributeSection(rows, i + 1, classInfo);
                continue;
            }

            /* Phát hiện scope (Public, Private, etc) */
            const scope = detectScope(rowText);
            if (scope) {
                currentScope = scope;
                continue;
            }

            const tds = [...row.querySelectorAll("td")];

            for (const td of tds) {
                const text = normalize(td.innerText);

                /* Phát hiện method */
                const isMethod = isMethodHeaderRow(td);
                if (!isMethod) continue;

                const method = {
                    name: text,
                    scope: currentScope,
                    inputs: [],
                    outputs: [],
                    localVariables: [],
                    attributes: []
                };

                parseInputOutput(rows, i + 1, method);
                if (method.scope === "Check") continue;
                methods.push(method);
                classInfo.methods.push(method);

                /* Log ra console */
                // console.group(`METHOD: ${method.name}`);
                // console.log("Scope:", method.scope);
                // console.log("Inputs:", method.inputs);
                // console.log("Outputs:", method.outputs);
                // console.log("Local Variables:", method.localVariables);
                // console.log("Attributes Used:", method.attributes);
                // console.groupEnd();
            }
        }

        return classInfo;
    }


    /**
     * Hàm chính - chạy parser
     */
    function run() {
        const classInfo = parseDocument();
        settingAlisa(classInfo);
        return classInfo;
    }

    function settingAlisa(classInfo) {
        updateClass(classInfo);
    }

    function loadDictionary() {
        try {
            const localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return localData || {};
        } catch (e) {
            console.error(e);
            return {};
        }
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

    function updateClass(classInfo) {
        let DICTIONARY = loadDictionary();
        let old = DICTIONARY[classInfo.name] || {};

        // Hàm phụ siêu ngắn để gộp mảng object (inputs, outputs, localVariables,...) dựa vào thuộc tính 'name'
        const mergeArray = (oldArr = [], newArr = []) => {
            const oldMap = Object.fromEntries(
                oldArr.map(item => [item.name, item])
            );

            const newMap = Object.fromEntries(
                newArr.map(item => [item.name, item])
            );

            const names = [
                ...new Set([...Object.keys(oldMap), ...Object.keys(newMap),]),
            ];

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

        let merged = mergeObject(old, classInfo);
        console.log(merged);

        DICTIONARY[classInfo.name] = merged;
        saveDictionary(DICTIONARY);
    }

    function saveDictionary(DICTIONARY) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DICTIONARY));
    }

}());