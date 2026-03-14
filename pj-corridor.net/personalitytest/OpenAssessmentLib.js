
async function _sha256hex(in_text) {
	const encoded = new TextEncoder().encode(in_text);
	const buff = await crypto.subtle.digest('SHA-256', encoded);
	return Array.from(new Uint8Array(buff)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function queryHashIs(in_param, in_hash) {
	const params = new URLSearchParams(location.search);
	const raw = params.get(in_param);
	if (!raw) {
		return false;
	}
	const hashed = await _sha256hex(raw);
	return (hashed === in_hash);
}

export class i18n {
	static #defaultCode = 'en';
	static #supportCode = {
		en : 'English',
		ja : 'Japanese',
		fr : 'French',
		de : 'German',
		es : 'Spanish',
		pt : 'Portuguese',
		hi : 'Hindi',
		ko : 'Korean',
		zh : 'Chinese'
	};
	static #browserCode = i18n.#defaultCode;
	static {
		const raw = navigator.languages?.[0] || navigator.language || i18n.#defaultCode;
		const lang = raw.toLowerCase();
		for (const code of Object.keys(i18n.#supportCode)) {
			if (lang.startsWith(code)) {
				i18n.#browserCode = code;
				break;
			}
		}
		// const testCode = 'en';
		// i18n.#browserCode = testCode;
	}
	static get browserLanguage() {
		return i18n.#supportCode[i18n.#browserCode];
	}
	static #fnv1a32(in_text) {
		let h = 0x811c9dc5;
		for (let i = 0; i < in_text.length; i++) {
			h ^= in_text.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return (h >>> 0).toString(16);
	}
	static #mapping = Object.create(null);
	static text(in_hash, in_denyConflict = true) {
		if (Object.hasOwn(in_hash, i18n.#defaultCode)) {
			if (Object.hasOwn(in_hash, i18n.#browserCode)) {
				const key = i18n.#fnv1a32(in_hash[i18n.#browserCode]);
				if (Object.hasOwn(i18n.#mapping, key)) {
					if ((i18n.#mapping[key] !== in_hash[i18n.#defaultCode]) && in_denyConflict) {
						throw new Error(key + ' already exist');
					}
				}
				i18n.#mapping[key] = in_hash[i18n.#defaultCode];
				return in_hash[i18n.#browserCode];
			} else {
				return in_hash[i18n.#defaultCode];
			}
		} else {
			throw new Error(i18n.#defaultCode + ' is required.');
		}
	}
	static defaultLangText(in_text) {
		const key = i18n.#fnv1a32(in_text);
		if (Object.hasOwn(i18n.#mapping, key)) {
			return i18n.#mapping[key];
		} else {
			return in_text;
		}
	}
}

export class cControl {
	static UNSELECTED = -1;
	static #el(in_className = '') {
		const elem = document.createElement('div');
		elem.className = this.name;
		if (in_className) {
			elem.classList.add(in_className);
		}
		return elem;
	}
	static #disabledClassName = 'cDisabled'
	#elems = {
		root : cControl.#el('cControlRoot'),
		lCaption : cControl.#el('cLCaption'),
		input : cControl.#el('cControlInput'),
		rCaption : cControl.#el('cRCaption'),
	};
	#state = {
		optionArr : [],
		currIx : 0,
		enable : true
	};
	#hooks = {
		transition : (
			event,
			input,
			currIx
		) => {},
		render : (
			input,
			currIx
		) => {}
	};
	/*
		root
		|
		+- lCaption
		|
		+- input
		|
		+- rCaption
	*/
	constructor({
		lCaption = '',
		rCaption = '',
		optionArr = [],
		initIx = 0,
		transition = null,
		render = null
	} = {}) {
		this.#state.optionArr = [...optionArr];
		this.#state.currIx = initIx;
		this.#hooks.transition = transition;
		this.#hooks.render = render;
		if (lCaption) {
			this.#elems.lCaption.textContent = lCaption;
			this.#elems.root.appendChild(this.#elems.lCaption);
		}
		this.#elems.root.appendChild(this.#elems.input);
		if (rCaption) {
			this.#elems.rCaption.textContent = rCaption;
			this.#elems.root.appendChild(this.#elems.rCaption);
		}
		this.#elems.input.addEventListener('click', in_ev => {
			if (!this.#state.enable) {
				return;
			}
			const nextIx = this.#hooks.transition(in_ev, this.#elems.input, this.currIx);
			if (nextIx !== this.#state.currIx) {
				this.#state.currIx = nextIx;
				this.#update();
				this.#emitChanged();
			}
		});
		this.#update();
	}
	get domElem() {
		return this.#elems.root;
	}
	get currIx() {
		return this.#state.currIx;
	}
	get currOption() {
		return this.#state.optionArr[this.currIx];
	}
	setIx(in_nextIx, in_silent = false) {
		this.#state.currIx = in_nextIx;
		this.#update();
		if (!in_silent) {
			this.#emitChanged();
		}
	}
	setOption(in_nextOption, in_silent = false) {
		const nextIx = this.#state.optionArr.indexOf(in_nextOption);
		if (nextIx === -1) {
			throw new Error('invalid option : ' + in_nextOption);
		}
		this.setIx(nextIx, in_silent);
	}
	enable() {
		this.#state.enable = true;
		this.#elems.root.classList.remove(cControl.#disabledClassName);
	}
	disable() {
		this.#state.enable = false;
		this.#elems.root.classList.add(cControl.#disabledClassName);
	}
	#update() {
		this.#hooks.render(this.#elems.input, this.#state.currIx);
	}
	#emitChanged() {
		const ev = new CustomEvent('controlChanged', {
			bubbles : true,
			detail : {
				ix : this.currIx,
				option : this.currOption,
				control : this
			}
		});
		this.#elems.root.dispatchEvent(ev);
	}
}

export class cCard {
	static #el(in_className = '') {
		const elem = document.createElement('div');
		elem.className = this.name;
		if (in_className) {
			elem.classList.add(in_className);
		}
		return elem;
	}
	#elems = {
		root : cCard.#el('cCardRoot'),
		desc : cCard.#el('cCardDesc'),
		body : cCard.#el('cCardBody')
	};
	#controlArr = [];
	#transition = () => {};
	/*
		root
		|
		+- desc
		|
		+- body
			|
			+- cControl[0]
			|
			+- cControl[1]
			|
			+- ...
	*/
	constructor({
		description = '',
		controlArr = [],
		transition = null
	} = {}) {
		this.#controlArr = [...controlArr];
		this.#transition = transition;
		if (description) {
			this.#elems.desc.textContent = description;
			this.#elems.root.appendChild(this.#elems.desc);
		}
		this.#elems.root.appendChild(this.#elems.body);
		this.#controlArr.forEach(in_ctrl => {
			this.#elems.body.appendChild(in_ctrl.domElem);
			in_ctrl.domElem.addEventListener('controlChanged', in_ev => {
				if (this.#transition(in_ev.detail, this.#controlArr)) {
					this.#emitCompleted();
				}
			});
		});
	}
	get domElem() {
		return this.#elems.root;
	}
	get currIxArr() {
		const ixArr = [];
		this.#controlArr.forEach(in_control => {
			ixArr.push(in_control.currIx);
		});
		return ixArr;
	}
	get currOptionArr() {
		const optionArr = [];
		this.#controlArr.forEach(in_control => {
			optionArr.push(in_control.currOption);
		});
		return optionArr;
	}
	reset(in_unselected = -1) {
		this.#controlArr.forEach(in_ctrl => {
			in_ctrl.setIx(in_unselected, true);
		});
	}
	enable() {
		this.#controlArr.forEach(in_ctrl => in_ctrl.enable());
	}
	disable() {
		this.#controlArr.forEach(in_ctrl => in_ctrl.disable());
	}
	#emitCompleted() {
		const ev = new CustomEvent('cardCompleted', {
			bubbles : true,
			detail : {
				ixArr : this.currIxArr,
				optionArr : this.currOptionArr,
				control : this
			}
		});
		this.#elems.root.dispatchEvent(ev);
	}
}

export class cState {
	static #rand = () => crypto.randomUUID();
	static DONE = cState.#rand();
	static SKIP = cState.#rand();
	static BACK = cState.#rand();
	static #UI = Object.freeze({
		STAGE1ST : cState.#rand(),
		INVOKING : cState.#rand(),
		STAGE2ND : cState.#rand()
	});
	#domMap = new Map();
	static #TRANSITIONS = {
		[cState.#UI.STAGE1ST] : {
			[cState.DONE] : cState.#UI.INVOKING,
			[cState.SKIP] : cState.#UI.STAGE2ND
		},
		[cState.#UI.INVOKING] : {
			[cState.DONE] : cState.#UI.STAGE2ND
		},
		[cState.#UI.STAGE2ND] : {
			[cState.BACK] : cState.#UI.STAGE1ST
		}
	};
	#curr = null;
	constructor(in_domMapping = {}) {
		for (const key of Object.keys(cState.#UI)) {
			if (!Object.hasOwn(in_domMapping, key)) {
				throw new Error('there is not required key : ' + key);
			}
			this.#domMap.set(cState.#UI[key], in_domMapping[key]);
		}
		this.#curr = cState.#UI.STAGE1ST;
		this.#apply();
	}
	#apply() {
		const css = {};
		for (const key of Object.keys(cState.#UI)) {
			css[key] = this.#domMap.get(cState.#UI[key]).style;
		}
		switch (this.#curr) {
		case cState.#UI.STAGE1ST:
			css.STAGE1ST.display = '';
			css.STAGE1ST.opacity = '';
			css.STAGE1ST.pointerEvents = '';
			css.STAGE2ND.display = 'none';
			css.INVOKING.display = 'none';
			break;
		case cState.#UI.INVOKING:
			css.STAGE1ST.display = '';
			css.STAGE1ST.opacity = '0.5';
			css.STAGE1ST.pointerEvents = 'none'; 
			css.STAGE2ND.display = 'none';
			css.INVOKING.display = '';
			css.INVOKING.position = 'absolute';
			css.INVOKING.left = '50%';
			css.INVOKING.top = '50%';
			css.INVOKING.transform = 'translate(-50%, -50%)';
			break;
		case cState.#UI.STAGE2ND:
			css.STAGE1ST.display = 'none';
			css.STAGE2ND.display = '';
			css.INVOKING.display = 'none';
			break;
		}
	}
	transition(in_action) {
		const next = cState.#TRANSITIONS[this.#curr]?.[in_action];
		if (!next) {
			throw new Error('invalid transition : ' + in_action);
		}
		this.#curr = next;
		this.#apply();
	}
}

export class cLLM {
	static #mapping = {
		'localhost' : 'https://localhost/python/',
		'127.0.0.1' : 'https://127.0.0.1/python/',
		'pj-corridor.net' : 'https://api.pj-corridor.net/personalitytest/lambda/'
	};
	static #entry = '';
	static refreshChallenge() {
		if (Object.hasOwn(cLLM.#mapping, location.hostname)) {
			cLLM.#entry = cLLM.#mapping[location.hostname];
			// set-cookie
			const img = new Image();
			img.src = cLLM.#entry + 'challenge?t=' + Date.now();
		} else {
			throw new Error('hostname is not supported');
		}
	}
	static async invoke(in_payload) {
		//console.log(in_payload);
		if (!cLLM.#entry) {
			throw new Error('not activated');
		}
		try {
			const response = await fetch(cLLM.#entry + 'generate', {
				method : 'POST',
				headers : {'Content-Type' : 'application/json'},
				credentials : 'include',
				body : JSON.stringify(in_payload)
			});
			if (!response.ok) {
				return null;
			}
			return await response.json();
		} catch (err) {
			return null;
		}
	}
}
