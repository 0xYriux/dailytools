document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
	// ===== 配置常量 =====
	const CONFIG = {
		CACHE_KEY: 'notepad_content',
		HEIGHT_KEY: 'notepad_height',
		BOARD_KEY: 'whiteboard_state',
		THEME_KEY: 'pref_theme_dark',
		MARGIN: 4,
		PUSH_MARGIN: 6
	};

	// ===== DOM 元素缓存 =====
	const DOM = {
		board: document.getElementById('whiteboard'),
		notepad: document.getElementById('notepad'),
		themeToggle: document.getElementById('themeToggle'),
		container: document.querySelector('.container'),
		timeEl: document.getElementById('time'),
		ipEl: document.getElementById('ip')
	};

	// ===== 工具函数 =====
	const Utils = {
		makeId: () => 'el_' + Math.random().toString(36).slice(2, 9),
		
		rectsIntersect(a, b) {
			return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
		},

		getLocalStorage(key, fallback = null) {
			try {
				return localStorage.getItem(key) ?? fallback;
			} catch {
				return fallback;
			}
		},

		setLocalStorage(key, value) {
			try {
				localStorage.setItem(key, value);
			} catch {}
		}
	};

	// ===== 白板元素管理 =====
	const BoardElement = {
		updateTransform(el) {
			const x = Number(el.dataset.x) || 0;
			const y = Number(el.dataset.y) || 0;
			const s = Number(el.dataset.scale) || 1;
			const r = Number(el.dataset.rotation) || 0;
			el.style.transform = `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`;
			// 更新把手的逆向缩放，使其保持固定大小
			const handles = el.querySelectorAll('.handle');
			handles.forEach(h => {
				h.style.setProperty('--handle-scale', 1 / s);
			});
		},

		selectElement(el) {
			[...DOM.board.querySelectorAll('.board-item')].forEach(n => n.classList.remove('selected'));
			if (el) el.classList.add('selected');
		},

		createHandles(el) {
			const scaleHandle = document.createElement('div');
			scaleHandle.className = 'handle handle-scale';
			const rotateHandle = document.createElement('div');
			rotateHandle.className = 'handle handle-rotate';
			el.appendChild(scaleHandle);
			el.appendChild(rotateHandle);
		},

		createFromState(state) {
			if (!DOM.board) return;
			const id = state.id || Utils.makeId();
			const type = state.type || (state.content?.startsWith('data:') ? 'image' : 'text');

			const el = document.createElement('div');
			el.className = `board-item ${type}`;
			el.dataset.id = id;
			el.dataset.type = type;
			el.dataset.x = state.x || 100;
			el.dataset.y = state.y || 100;
			el.dataset.scale = state.scale || 1;
			el.dataset.rotation = state.rotation || 0;

			if (type === 'text') {
				el.innerText = state.content || '文本';
				el.title = '双击编辑文字';
			} else {
				const img = document.createElement('img');
				img.src = state.content || state.src || '';
				el.appendChild(img);
				el.dataset.src = img.src;
			}

			this.createHandles(el);
			this.updateTransform(el);
			DOM.board.appendChild(el);
			ElementInteraction.attach(el);
			Constraint.applyAll(el);
		}
	};

	// ===== 约束和边界检查 =====
	const Constraint = {
		applyAll(el) {
			this.constrainToViewport(el);
			this.constrainAgainstContainer(el);
		},

		constrainToViewport(el) {
			if (!DOM.board || !el) return;
			const vw = window.innerWidth;
			const vh = window.innerHeight;

			BoardElement.updateTransform(el);
			let rect = el.getBoundingClientRect();

			// 确保元素完全在视口内：左边界、上边界、右边界、下边界都要在屏幕内
			let dx = 0, dy = 0;
			if (rect.left < CONFIG.MARGIN) dx = CONFIG.MARGIN - rect.left;
			if (rect.top < CONFIG.MARGIN) dy = CONFIG.MARGIN - rect.top;
			if (rect.right > vw - CONFIG.MARGIN) dx = (vw - CONFIG.MARGIN) - rect.right;
			if (rect.bottom > vh - CONFIG.MARGIN) dy = (vh - CONFIG.MARGIN) - rect.bottom;

			if (dx || dy) {
				el.dataset.x = (Number(el.dataset.x) || 0) + dx;
				el.dataset.y = (Number(el.dataset.y) || 0) + dy;
				BoardElement.updateTransform(el);
				// 再次检查，防止多方向约束冲突
				rect = el.getBoundingClientRect();
				dx = 0, dy = 0;
				if (rect.left < CONFIG.MARGIN) dx = CONFIG.MARGIN - rect.left;
				if (rect.top < CONFIG.MARGIN) dy = CONFIG.MARGIN - rect.top;
				if (rect.right > vw - CONFIG.MARGIN) dx = (vw - CONFIG.MARGIN) - rect.right;
				if (rect.bottom > vh - CONFIG.MARGIN) dy = (vh - CONFIG.MARGIN) - rect.bottom;

				if (dx || dy) {
					el.dataset.x = (Number(el.dataset.x) || 0) + dx;
					el.dataset.y = (Number(el.dataset.y) || 0) + dy;
					BoardElement.updateTransform(el);
				}
			}
		},

		constrainAgainstContainer(el) {
			if (!DOM.board || !el || !DOM.container) return;

			BoardElement.updateTransform(el);
			const elRect = el.getBoundingClientRect();
			const containerRect = DOM.container.getBoundingClientRect();

			if (!Utils.rectsIntersect(elRect, containerRect)) return;

			const elCenterX = elRect.left + elRect.width / 2;
			const elCenterY = elRect.top + elRect.height / 2;
			const containerCenterX = containerRect.left + containerRect.width / 2;
			const containerCenterY = containerRect.top + containerRect.height / 2;

			const dx = elCenterX - containerCenterX;
			const dy = elCenterY - containerCenterY;
			const angle = Math.atan2(dy, dx);
			const absAngle = Math.abs(angle);

			const currX = Number(el.dataset.x) || 0;
			const currY = Number(el.dataset.y) || 0;
			const cHW = containerRect.width / 2;
			const cHH = containerRect.height / 2;
			const eHW = elRect.width / 2;
			const eHH = elRect.height / 2;

			if (absAngle < Math.PI / 4) {
				const pushDist = (cHW + eHW) - Math.abs(dx);
				el.dataset.x = currX + pushDist + CONFIG.PUSH_MARGIN;
			} else if (absAngle < 3 * Math.PI / 4) {
				const pushDist = (cHH + eHH) - Math.abs(dy);
				el.dataset.y = dy > 0 ? currY + pushDist + CONFIG.PUSH_MARGIN : currY - pushDist - CONFIG.PUSH_MARGIN;
			} else {
				const pushDist = (cHW + eHW) - Math.abs(dx);
				el.dataset.x = currX - pushDist - CONFIG.PUSH_MARGIN;
			}

			BoardElement.updateTransform(el);
		}
	};

	// ===== 元素交互 =====
	const ElementInteraction = {
		attach(el) {
			this.attachDrag(el);
			this.attachScale(el);
			this.attachRotate(el);
			this.attachTextEdit(el);
		},

		attachDrag(el) {
			let dragging = false, dragStart = null;

			el.addEventListener('pointerdown', (e) => {
				if (e.target.classList.contains('handle')) return;
				e.preventDefault();
				el.setPointerCapture(e.pointerId);
				dragging = true;
				dragStart = { px: e.clientX, py: e.clientY, sx: Number(el.dataset.x), sy: Number(el.dataset.y) };
				BoardElement.selectElement(el);
			});

			el.addEventListener('pointermove', (e) => {
				if (!dragging || !dragStart) return;
				el.dataset.x = dragStart.sx + (e.clientX - dragStart.px);
				el.dataset.y = dragStart.sy + (e.clientY - dragStart.py);
				BoardElement.updateTransform(el);
				// 拖动过程中实时约束到视口内
				Constraint.constrainToViewport(el);
				Constraint.constrainAgainstContainer(el);
			});

			el.addEventListener('pointerup', (e) => {
				if (dragging) {
					dragging = false;
					try { el.releasePointerCapture(e.pointerId); } catch {}
					Constraint.applyAll(el);
					BoardState.save();
				}
			});
		},

		attachScale(el) {
			const handle = el.querySelector('.handle-scale');
			let scaling = false, scaleInfo = null;

			handle.addEventListener('pointerdown', (e) => {
				e.stopPropagation();
				e.preventDefault();
				BoardElement.selectElement(el);
				scaling = true;
				handle.setPointerCapture(e.pointerId);
				scaleInfo = { startY: e.clientY, startScale: Number(el.dataset.scale) || 1 };
			});

			handle.addEventListener('pointermove', (e) => {
				if (!scaling || !scaleInfo) return;
				el.dataset.scale = Math.max(0.1, scaleInfo.startScale + (e.clientY - scaleInfo.startY) / 300);
				BoardElement.updateTransform(el);
				Constraint.constrainToViewport(el);
				Constraint.constrainAgainstContainer(el);
			});

			handle.addEventListener('pointerup', (e) => {
				if (scaling) {
					scaling = false;
					try { handle.releasePointerCapture(e.pointerId); } catch {}
					Constraint.applyAll(el);
					BoardState.save();
				}
			});
		},

		attachRotate(el) {
			const handle = el.querySelector('.handle-rotate');
			let rotating = false, rotateInfo = null;

			handle.addEventListener('pointerdown', (e) => {
				e.stopPropagation();
				e.preventDefault();
				BoardElement.selectElement(el);
				rotating = true;
				handle.setPointerCapture(e.pointerId);
				const rect = el.getBoundingClientRect();
				rotateInfo = {
					cx: rect.left + rect.width / 2,
					cy: rect.top + rect.height / 2,
					startX: e.clientX,
					startY: e.clientY,
					startRotation: Number(el.dataset.rotation) || 0
				};
			});

			handle.addEventListener('pointermove', (e) => {
				if (!rotating || !rotateInfo) return;
				const currentAngle = Math.atan2(e.clientY - rotateInfo.cy, e.clientX - rotateInfo.cx) * (180 / Math.PI);
				const startAngle = Math.atan2(rotateInfo.startY - rotateInfo.cy, rotateInfo.startX - rotateInfo.cx) * (180 / Math.PI);
				const deltaAngle = currentAngle - startAngle;
				el.dataset.rotation = Math.round(rotateInfo.startRotation + deltaAngle);
				BoardElement.updateTransform(el);
				Constraint.constrainToViewport(el);
				Constraint.constrainAgainstContainer(el);
			});

			handle.addEventListener('pointerup', (e) => {
				if (rotating) {
					rotating = false;
					try { handle.releasePointerCapture(e.pointerId); } catch {}
					Constraint.applyAll(el);
					BoardState.save();
				}
			});
		},

		attachTextEdit(el) {
			if (el.dataset.type !== 'text') return;

			el.addEventListener('dblclick', (e) => {
				e.stopPropagation();
				el.contentEditable = 'true';
				el.focus();
			});

			el.addEventListener('blur', () => {
				el.contentEditable = 'false';
				BoardState.save();
			});
		}
	};

	// ===== 白板状态管理 =====
	const BoardState = {
		save() {
			if (!DOM.board) return;
			const items = [...DOM.board.querySelectorAll('.board-item')].map(el => ({
				id: el.dataset.id,
				type: el.dataset.type,
				x: Number(el.dataset.x) || 0,
				y: Number(el.dataset.y) || 0,
				scale: Number(el.dataset.scale) || 1,
				rotation: Number(el.dataset.rotation) || 0,
				content: el.dataset.type === 'text' ? el.innerText : el.dataset.src
			}));
			Utils.setLocalStorage(CONFIG.BOARD_KEY, JSON.stringify(items));
		},

		load() {
			if (!DOM.board) return;
			const raw = Utils.getLocalStorage(CONFIG.BOARD_KEY);
			if (!raw) return;
			try {
				JSON.parse(raw).forEach(s => BoardElement.createFromState(s));
			} catch (err) {
				console.warn('白板恢复失败', err);
			}
		},

		getSafePosition(w = 200, h = 120) {
			const margin = CONFIG.MARGIN;
			const candidates = [
				{ x: margin, y: margin },
				{ x: Math.max(margin, window.innerWidth - w - margin), y: margin },
				{ x: margin, y: Math.max(margin, window.innerHeight - h - margin) },
				{ x: Math.max(margin, window.innerWidth - w - margin), y: Math.max(margin, window.innerHeight - h - margin) }
			];

			for (const c of candidates) {
				const candRect = { x: c.x, y: c.y, w, h };
				if (!DOM.container) return c;
				const containerRect = DOM.container.getBoundingClientRect();
				const candComparable = { left: c.x, right: c.x + w, top: c.y, bottom: c.y + h };
				if (!Utils.rectsIntersect(candComparable, containerRect)) return c;
			}
			return { x: margin, y: margin };
		},

		// 检查位置是否可用（不与容器重叠）
		isPositionValid(x, y, w = 200, h = 120) {
			if (x === null || y === null || x === undefined || y === undefined) return false;
			if (!DOM.container) return true;
			
			const containerRect = DOM.container.getBoundingClientRect();
			const boardRect = DOM.board.getBoundingClientRect();
			
			// 将相对于白板的坐标转换为屏幕坐标
			const screenX = boardRect.left + x;
			const screenY = boardRect.top + y;
			
			const itemRect = {
				left: screenX,
				right: screenX + w,
				top: screenY,
				bottom: screenY + h
			};
			
			return !Utils.rectsIntersect(itemRect, containerRect);
		},

		addText(text, x, y, rotation = 0) {
			if (!DOM.board) return;
			const defaultW = 240, defaultH = 80;
			
			// 如果位置无效或未提供，使用默认位置
			if (!this.isPositionValid(x, y, defaultW, defaultH)) {
				const pos = this.getSafePosition(defaultW, defaultH);
				x = pos.x;
				y = pos.y;
			}
			
			BoardElement.createFromState({ id: Utils.makeId(), type: 'text', x, y, scale: 1, rotation: rotation || 0, content: text || '' });
			this.save();
		},

		addImage(dataUrl, x, y, rotation = 0) {
			if (!DOM.board) return;
			const defaultW = 320, defaultH = 240;
			
			// 如果位置无效或未提供，使用默认位置
			if (!this.isPositionValid(x, y, defaultW, defaultH)) {
				const pos = this.getSafePosition(defaultW, defaultH);
				x = pos.x;
				y = pos.y;
			}
			
			BoardElement.createFromState({ id: Utils.makeId(), type: 'image', x, y, scale: 1, rotation: rotation || 0, content: dataUrl });
			this.save();
		}
	};

	// ===== 笔记框处理 =====
	const Notepad = {
		init() {
			if (!DOM.notepad) return;

			const content = Utils.getLocalStorage(CONFIG.CACHE_KEY);
			if (content) DOM.notepad.value = content;

			const height = Utils.getLocalStorage(CONFIG.HEIGHT_KEY);
			if (height) DOM.notepad.style.height = height + 'px';

			DOM.notepad.addEventListener('input', () => {
				Utils.setLocalStorage(CONFIG.CACHE_KEY, DOM.notepad.value);
			});

			DOM.notepad.addEventListener('mouseup', () => {
				Utils.setLocalStorage(CONFIG.HEIGHT_KEY, DOM.notepad.offsetHeight);
			});

			try {
				const ro = new ResizeObserver(() => {
					Utils.setLocalStorage(CONFIG.HEIGHT_KEY, DOM.notepad.offsetHeight);
				});
				ro.observe(DOM.notepad);
			} catch {}

			DOM.notepad.addEventListener('focus', () => BoardElement.selectElement(null));
			DOM.notepad.addEventListener('click', (e) => {
				e.stopPropagation();
				BoardElement.selectElement(null);
			});
		}
	};

	// ===== 粘贴处理 =====
	const PasteHandler = {
		lastMouseX: null,
		lastMouseY: null,

		attach() {
			document.addEventListener('paste', (ev) => this.handle(ev));
			// 跟踪鼠标位置，用于粘贴时定位
			document.addEventListener('mousemove', (e) => {
				this.lastMouseX = e.clientX;
				this.lastMouseY = e.clientY;
			});
		},

		handle(ev) {
			if (!DOM.board) return;
			const data = ev.clipboardData || window.clipboardData;
			if (!data) return;

			// 获取当前鼠标位置（相对于白板的坐标）
			let pasteX = null, pasteY = null;
			if (this.lastMouseX !== null && this.lastMouseY !== null) {
				const boardRect = DOM.board.getBoundingClientRect();
				pasteX = this.lastMouseX - boardRect.left;
				pasteY = this.lastMouseY - boardRect.top;
			}

			// 生成随机旋转角度（-10 到 10 度）
			const randomRotation = Math.floor(Math.random() * 21) - 10; // -10 到 10

			let handled = false;
			const items = data.items || [];

			for (const it of items) {
				if (it.kind === 'file' && it.type?.indexOf('image') !== -1) {
					const file = it.getAsFile();
					if (file) {
						handled = true;
						const reader = new FileReader();
						reader.onload = (e) => BoardState.addImage(e.target.result, pasteX, pasteY, randomRotation);
						reader.readAsDataURL(file);
					}
				}
			}

			if (!handled) {
				const txt = (data.getData && data.getData('text/plain')) || '';
				if (txt?.trim()) BoardState.addText(txt, pasteX, pasteY, randomRotation);
			}
		}
	};

	// ===== 键盘快捷键 =====
	const Keyboard = {
		init() {
			document.addEventListener('keydown', (e) => {
				const active = document.activeElement;
				const isEditing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
				if (isEditing) return;

				if (e.key === 'Delete' || e.key === 'Backspace') {
					const sel = DOM.board?.querySelector('.board-item.selected');
					if (sel) {
						sel.remove();
						BoardState.save();
					}
				}
			});
		}
	};

	// ===== 时间和 IP =====
	const TimeIP = {
		updateTime() {
			const now = new Date();
			const year = now.getFullYear();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const date = String(now.getDate()).padStart(2, '0');
			const hours = String(now.getHours()).padStart(2, '0');
			const minutes = String(now.getMinutes()).padStart(2, '0');
			const seconds = String(now.getSeconds()).padStart(2, '0');

			if (DOM.timeEl) DOM.timeEl.textContent = `${year}-${month}-${date} ${hours}:${minutes}:${seconds}`;
		},

		fetchIP() {
			fetch('https://api.ipify.org?format=json')
				.then(res => res.json())
				.then(data => {
					if (DOM.ipEl) DOM.ipEl.textContent = data.ip;
				})
				.catch(() => {
					if (DOM.ipEl) DOM.ipEl.textContent = '获取失败';
				});
		},

		init() {
			this.updateTime();
			setInterval(() => this.updateTime(), 1000);
			this.fetchIP();
		}
	};

	// ===== 主题管理 =====
	const Theme = {
		apply(isDark) {
			if (isDark) document.body.classList.add('dark-mode');
			else document.body.classList.remove('dark-mode');
			if (DOM.themeToggle) DOM.themeToggle.textContent = isDark ? '🌙' : '☀️';
		},

		init() {
			const isDark = Utils.getLocalStorage(CONFIG.THEME_KEY) === '1';
			this.apply(isDark);
		},

		setup() {
			if (!DOM.themeToggle) return;
			const newBtn = DOM.themeToggle.cloneNode(true);
			DOM.themeToggle.parentNode.replaceChild(newBtn, DOM.themeToggle);
			newBtn.addEventListener('click', (e) => {
				e.preventDefault();
				e.stopPropagation();
				const isDark = !document.body.classList.contains('dark-mode');
				this.apply(isDark);
				Utils.setLocalStorage(CONFIG.THEME_KEY, isDark ? '1' : '0');
			});
		}
	};

	// ===== 白板事件 =====
	const BoardEvents = {
		init() {
			if (!DOM.board) return;

			DOM.board.addEventListener('click', (e) => {
				DOM.board.focus();
				if (e.target === DOM.board) BoardElement.selectElement(null);
			});

			DOM.board.addEventListener('pointerdown', () => DOM.board.focus());

			window.addEventListener('resize', () => {
				[...DOM.board.querySelectorAll('.board-item')].forEach(el => Constraint.applyAll(el));
			});

			window.addEventListener('storage', (e) => {
				if (e.key === CONFIG.THEME_KEY) Theme.apply(e.newValue === '1');
			});
		}
	};

	// ===== 初始化应用 =====
	Notepad.init();
	Theme.init();
	Theme.setup();
	PasteHandler.attach();
	Keyboard.init();
	TimeIP.init();
	BoardEvents.init();
	BoardState.load();
}
