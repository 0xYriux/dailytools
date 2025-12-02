document.addEventListener('DOMContentLoaded', () => {
    // 更新时间
    function updateTime() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const date = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');

        const timeEl = document.getElementById('time');
        if (timeEl) {
            timeEl.textContent = `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
        }
    }

    // 获取 IP
    function fetchIP() {
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => {
                const ipEl = document.getElementById('ip');
                if (ipEl) ipEl.textContent = data.ip;
            })
            .catch(() => {
                const ipEl = document.getElementById('ip');
                if (ipEl) ipEl.textContent = '获取失败';
            });
    }

    // 处理文本框缓存
    const notepad = document.getElementById('notepad');
    const CACHE_KEY = 'notepad_content';

    if (notepad) {
        // 加载缓存内容
        const cachedContent = localStorage.getItem(CACHE_KEY);
        if (cachedContent) {
            notepad.value = cachedContent;
        }

        // 实时保存到缓存
        notepad.addEventListener('input', () => {
            localStorage.setItem(CACHE_KEY, notepad.value);
        });
    }

    /* ---------- 白板功能 (paste -> add element, drag, scale, rotate, persist) ---------- */
    const BOARD_KEY = 'whiteboard_state';
    const board = document.getElementById('whiteboard');

    // element id generator
    const makeId = () => 'el_' + Math.random().toString(36).slice(2, 9);

    // restore existing board items from storage
    function loadBoardState() {
        if (!board) return;
        const raw = localStorage.getItem(BOARD_KEY);
        if (!raw) return;
        try {
            const list = JSON.parse(raw);
            list.forEach(s => createElementFromState(s));
        } catch (err) {
            console.warn('白板恢复失败', err);
        }
    }

    // save current items to storage
    function saveBoardState() {
        if (!board) return;
        const nodes = [...board.querySelectorAll('.board-item')];
        const state = nodes.map(el => {
            return {
                id: el.dataset.id,
                type: el.dataset.type,
                x: Number(el.dataset.x) || 0,
                y: Number(el.dataset.y) || 0,
                scale: Number(el.dataset.scale) || 1,
                rotation: Number(el.dataset.rotation) || 0,
                content: el.dataset.type === 'text' ? el.innerText : el.dataset.src
            };
        });
        localStorage.setItem(BOARD_KEY, JSON.stringify(state));
    }

    // create element in board from saved state or new content
    function createElementFromState(state) {
        if (!board) return;
        const id = state.id || makeId();
        const type = state.type || (state.content && state.content.startsWith('data:') ? 'image' : 'text');

        const el = document.createElement('div');
        el.className = 'board-item ' + type;
        el.dataset.id = id;
        el.dataset.type = type;
        el.dataset.x = state.x || 100;
        el.dataset.y = state.y || 100;
        el.dataset.scale = state.scale || 1;
        el.dataset.rotation = state.rotation || 0;

        // set content
        if (type === 'text') {
            el.innerText = state.content || '文本';
            el.title = '双击编辑文字';
        } else {
            const img = document.createElement('img');
            img.src = state.content || state.src || '';
            el.appendChild(img);
            el.dataset.src = img.src;
        }

        // add controls
        const sHandle = document.createElement('div');
        sHandle.className = 'handle handle-scale';
        const rHandle = document.createElement('div');
        rHandle.className = 'handle handle-rotate';
        el.appendChild(sHandle);
        el.appendChild(rHandle);

        // position + transform
        updateTransform(el);
        board.appendChild(el);

        // attach interactions
        attachElementInteractions(el);
    }

    function updateTransform(el) {
        const x = Number(el.dataset.x) || 0;
        const y = Number(el.dataset.y) || 0;
        const s = Number(el.dataset.scale) || 1;
        const r = Number(el.dataset.rotation) || 0;
        el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;
    }

    // Click -> select; double-click text -> edit
    function selectElement(el) {
        [...board.querySelectorAll('.board-item')].forEach(n => n.classList.remove('selected'));
        if (el) el.classList.add('selected');
    }

    // add drag / scale / rotate logic
    function attachElementInteractions(el) {
        if (!el) return;

        let dragging = false;
        let dragStart = null;

        el.addEventListener('pointerdown', (e) => {
            // ignore if clicking on handles
            if (e.target.classList.contains('handle')) return;
            e.preventDefault();
            el.setPointerCapture(e.pointerId);
            dragging = true;
            dragStart = { px: e.clientX, py: e.clientY, sx: Number(el.dataset.x), sy: Number(el.dataset.y) };
            selectElement(el);
        });

        el.addEventListener('pointermove', (e) => {
            if (!dragging || !dragStart) return;
            const dx = e.clientX - dragStart.px;
            const dy = e.clientY - dragStart.py;
            el.dataset.x = dragStart.sx + dx;
            el.dataset.y = dragStart.sy + dy;
            updateTransform(el);
        });

        el.addEventListener('pointerup', (e) => {
            if (dragging) {
                dragging = false;
                try { el.releasePointerCapture(e.pointerId); } catch {}
                saveBoardState();
            }
        });

        // scale handle
        const scaleHandle = el.querySelector('.handle-scale');
        let scaling = false;
        let scaleInfo = null;
        scaleHandle.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            selectElement(el);
            scaling = true;
            scaleHandle.setPointerCapture(e.pointerId);
            scaleInfo = {
                startX: e.clientX,
                startY: e.clientY,
                startScale: Number(el.dataset.scale) || 1
            };
        });
        scaleHandle.addEventListener('pointermove', (e) => {
            if (!scaling || !scaleInfo) return;
            // simple scale by vertical drag
            const dy = e.clientY - scaleInfo.startY;
            const factor = 1 + dy / 300; // adjust sensitivity
            el.dataset.scale = Math.max(0.1, scaleInfo.startScale * factor);
            updateTransform(el);
        });
        scaleHandle.addEventListener('pointerup', (e) => {
            if (scaling) {
                scaling = false;
                try { scaleHandle.releasePointerCapture(e.pointerId); } catch {}
                saveBoardState();
            }
        });

        // rotate handle
        const rotateHandle = el.querySelector('.handle-rotate');
        let rotating = false;
        let rotateInfo = null;
        rotateHandle.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            e.preventDefault();
            selectElement(el);
            rotating = true;
            rotateHandle.setPointerCapture(e.pointerId);
            const rect = el.getBoundingClientRect();
            rotateInfo = {
                cx: rect.left + rect.width / 2,
                cy: rect.top + rect.height / 2,
                startAngle: Number(el.dataset.rotation) || 0,
                startX: e.clientX,
                startY: e.clientY
            };
        });
        rotateHandle.addEventListener('pointermove', (e) => {
            if (!rotating || !rotateInfo) return;
            const dx = e.clientX - rotateInfo.cx;
            const dy = e.clientY - rotateInfo.cy;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            // offset so pointer position corresponds to rotation
            el.dataset.rotation = Math.round(angle);
            updateTransform(el);
        });
        rotateHandle.addEventListener('pointerup', (e) => {
            if (rotating) {
                rotating = false;
                try { rotateHandle.releasePointerCapture(e.pointerId); } catch {}
                saveBoardState();
            }
        });

        // double click to edit text elements
        if (el.dataset.type === 'text') {
            el.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                el.contentEditable = 'true';
                el.focus();
            });
            el.addEventListener('blur', () => {
                el.contentEditable = 'false';
                saveBoardState();
            });
        }
    }

    // 计算一个不会与主要模块（.container）重叠的默认位置
    function getSafePosition(elW = 200, elH = 120) {
        const margin = 24;
        const wbRect = board.getBoundingClientRect();
        const container = document.querySelector('.container');
        const containerRect = container ? container.getBoundingClientRect() : null;

        const candidates = [
            { x: margin, y: margin }, // top-left
            { x: Math.max(margin, wbRect.width - elW - margin), y: margin }, // top-right
            { x: margin, y: Math.max(margin, wbRect.height - elH - margin) }, // bottom-left
            { x: Math.max(margin, wbRect.width - elW - margin), y: Math.max(margin, wbRect.height - elH - margin) } // bottom-right
        ];

        function intersects(a, b) {
            return !(a.x + a.w < b.left || a.x > b.right || a.y + a.h < b.top || a.y > b.bottom);
        }

        for (const c of candidates) {
            // create rect for candidate in viewport coordinates
            const candRect = { x: c.x, y: c.y, w: elW, h: elH };
            if (!containerRect) return { x: candRect.x, y: candRect.y };
            // convert to comparable rect shape
            const candComparable = { left: candRect.x, right: candRect.x + candRect.w, top: candRect.y, bottom: candRect.y + candRect.h };
            if (!intersects(candComparable, containerRect)) {
                return { x: c.x, y: c.y };
            }
        }
        // 全部候选位置都有交集，退回到左上角（尽量避开）
        return { x: margin, y: margin };
    }

    // add new text element at center or at position
    function addTextToBoard(text, x, y) {
        // 若未传入位置，使用安全位置（尽量不在 .container 区域）
        if (typeof x === 'undefined' || typeof y === 'undefined') {
            const pos = getSafePosition(240, 80);
            x = pos.x;
            y = pos.y;
        }
        const state = {
            id: makeId(),
            type: 'text',
            x: x || (window.innerWidth / 2 - 100),
            y: y || (window.innerHeight / 2 - 40),
            scale: 1,
            rotation: 0,
            content: text || ''
        };
        createElementFromState(state);
        saveBoardState();
    }

    // add new image element
    function addImageToBoard(dataUrl, x, y) {
        // 若未传入位置，使用安全位置（根据图片默认尺寸）
        if (typeof x === 'undefined' || typeof y === 'undefined') {
            const pos = getSafePosition(320, 240);
            x = pos.x;
            y = pos.y;
        }
        const state = {
            id: makeId(),
            type: 'image',
            x: x || (window.innerWidth / 2 - 120),
            y: y || (window.innerHeight / 2 - 80),
            scale: 1,
            rotation: 0,
            content: dataUrl
        };
        createElementFromState(state);
        saveBoardState();
    }

    // paste handler: 图片通过 items 处理，文本使用 getData('text/plain')（同步）以避免重复添加
    document.addEventListener('paste', (ev) => {
        if (!board) return;
        const data = ev.clipboardData || window.clipboardData;
        if (!data) return;

        // 先处理图片（items）
        const items = data.items || [];
        for (const it of items) {
            if (it.kind === 'file' && it.type && it.type.indexOf('image') !== -1) {
                const file = it.getAsFile();
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => { addImageToBoard(e.target.result); };
                    reader.readAsDataURL(file);
                }
            }
        }

        // 再处理文本（使用同步 API，确保只添加一次）
        const txt = (data.getData && data.getData('text/plain')) || '';
        if (txt && txt.trim().length > 0) {
            addTextToBoard(txt);
        }
    });

    // keyboard shortcuts for deletion
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const sel = board.querySelector('.board-item.selected');
            if (sel) {
                sel.remove();
                saveBoardState();
            }
        }
    });

    // focus board so paste works reliably
    if (board) {
        board.addEventListener('click', () => { board.focus(); });
        board.addEventListener('pointerdown', () => { board.focus(); });
        loadBoardState();
    }

    // 初始化
    updateTime();
    setInterval(updateTime, 1000);
    fetchIP();
});
