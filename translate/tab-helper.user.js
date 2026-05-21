// ==UserScript==
// @name         Domain Helper Tab v5
// @namespace    https://docs.scriptcat.org/
// @version      0.1.3
// @description  Japanese -> Vietnamese helper for tab content (lightweight)
// @downloadURL  https://nsvn-tranminhhoang.github.io/helper-coder-read-domain/translate/tab-helper.user.js
// @updateURL    https://nsvn-tranminhhoang.github.io/helper-coder-read-domain/translate/tab-helper.user.js
// @author       You
// @match        http://192.168.50.14:81/*
// @grant        GM_addStyle
// @noframes
// ==/UserScript==

(function () {
    'use strict';
    const STORAGE_KEY = 'jp-helper-dictionary';
    let DICTIONARY = loadDictionary();
    let frameDocument = null;
    let observer = null;

    window.top.addEventListener('jp-helper-dictionary-updated', () => {
        DICTIONARY = loadDictionary();
        if (frameDocument) {
            processTabs(frameDocument);
        }
    });

    start();

    function loadDictionary() {
        try {
            const localData = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return localData || {};
        } catch (e) {
            console.error(e);
            return {};
        }
    }

    async function start() {
        while (true) {
                        console.log('[Tab Helper] Looking for frame...');

            try {
                const browserIframe = document.querySelector('#browser');
                if (!browserIframe) {
                    await sleep(500);
                    continue;
                }

                const browserWindow = browserIframe.contentWindow;
                if (!browserWindow) {
                    await sleep(500);
                    continue;
                }

                const frTabsWindow = browserWindow.frames['frTabs'];
                if (!frTabsWindow) {
                    await sleep(500);
                    continue;
                }

                const doc = frTabsWindow.document;
                if (!doc || !doc.body) {
                    await sleep(500);
                    continue;
                }

                const links = doc.querySelectorAll('a');
                // console.log('[Tab Helper] found', links.length, 'links');

                if (links.length > 0) {
                    frameDocument = doc;
                    injectStyle(doc);
                    processTabs(doc);
                    observe(doc);
                    console.log('[Tab Helper] READY');
                    break;
                }
            } catch (e) {
                console.error(e);
            }

            await sleep(500);
        }
    }

    function processTabs(doc) {
        if (!doc) {
            return;
        }
        if (observer) {
            observer.disconnect();
        }

        const links = doc.querySelectorAll('a[target="frSheet"]');

        links.forEach(($a) => {
            const jp = normalizeText($a.textContent);
            if(jp === '修正履歴') {
                return;
            }

            if ($a.dataset.jpReady !== '1') {
                $a.dataset.jpReady = '1';
                $a.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const jp = normalizeText($a.textContent);
                    openEditorTooltip(e, $a, jp);
                });
            }

            const objClass = DICTIONARY[jp] ?? {};
            const vi = objClass.alias;
            const existed =
                $a.nextElementSibling &&
                $a.nextElementSibling.classList.contains('jp-vi-label')
                    ? $a.nextElementSibling
                    : null;

            if (vi) {
                if (existed) {
                    if (existed.textContent !== ` (${vi})`) {
                        existed.textContent = ` (${vi})`;
                    }
                } else {
                    const $vi = doc.createElement('span');
                    $vi.className = 'jp-vi-label';
                    $vi.textContent = ` (${vi})`;
                    $a.insertAdjacentElement('afterend', $vi);
                }
            } else if (existed) {
                existed.remove();
            }
        });

        if (observer) {
            observer.observe(doc.body, {
                childList: true,
                subtree: true
            });
        }
    }

    function observe(doc) {
        observer = new MutationObserver(() => {
            processTabs(doc);
        });

        observer.observe(doc.body, {
            childList: true,
            subtree: true
        });
    }

    function openEditorTooltip(e, $item, japaneseText) {
        const $editor = document.getElementById('jp-helper-editor');
        if (!$editor) {
            return;
        }

        const $jp = $editor.querySelector('.jp-helper-editor-jp');
        const $input = $editor.querySelector('.jp-helper-editor-input');

        $jp.textContent = japaneseText;
        $editor.dataset.japanese = japaneseText;
        $input.value = DICTIONARY[japaneseText]?.alias || '';

        const x = e.clientX + 240;
        const y = e.clientY + 60;
        $editor.style.left = `${x}px`;
        $editor.style.bottom = `${y}px`;
        $editor.style.top = 'auto';

        $editor.classList.add('show');
        $input.focus();
    }

    function injectStyle(doc) {
        if (doc.getElementById('jp-style')) {
            return;
        }

        const style = doc.createElement('style');
        style.id = 'jp-style';
        style.textContent = `
            .jp-vi-label {
                margin-left: 4px;
                color: #800020;
                font-size: 13px;
                font-weight: bold;
                opacity: 0.9;
            }
            a[target="frSheet"] {
                display: inline-block;
            }
            a.jp-ready {
                transition: all 0.15s;
            }
            a.jp-ready:hover {
                color: #1565c0 !important;
            }
            a.jp-ready:hover .jp-vi-label {
                color: #e53935;
            }
        `;
        doc.head.appendChild(style);
    }

    function normalizeText(text) {
        return (text || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
})();