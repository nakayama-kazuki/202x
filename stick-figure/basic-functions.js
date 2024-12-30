import * as THREE from 'three';
import * as UTILS from 'utils';

/*
	(1) utilities
*/

export async function getVersion(in_version_file) {
	try {
		const response = await fetch(in_version_file);
		if (response.ok) {
			return await response.text();
		} else {
			throw new Error('4xx or 5xx Error');
		}
	} catch (in_err) {
		throw new Error('SOP Error etc');
	}
}

function _parseParam(in_url = location.href) {
	const req = new URL(in_url);
	const parsed = {
		q : {},
		h : []
	};
	req.searchParams.forEach((value, key) => {
		parsed.q[key] = value;
	});
	if (req.hash) {
		const hashValues = req.hash.substring(1).split('#');
	}
	return parsed;
}

export function getParam(in_name) {
	const parsed = _parseParam();
	if (in_name in parsed.q) {
		const value = parsed.q[in_name];
		const checkNum = parseInt(value, 10);
		if (checkNum.toString() === value) {
			return checkNum;
		} else {
			return value;
		}
	}
	if (in_name in parsed.h) {
		return true;
	}
	return false;
}

export const DEBUG = getParam('debug') !== false;

export function randomString(in_length = 5) {
	return Math.floor(Math.random() * (10 ** in_length)).toString(16).padStart(in_length, '0');
}

function _convertUnit(in_u1_value, in_u1_from, in_u1_to, in_u2_from, in_u2_to) {
	return in_u2_from + ((in_u1_value - in_u1_from) / (in_u1_to - in_u1_from)) * (in_u2_to - in_u2_from);
}

/*

const testSets = [
	[+0.1,  0, +1,   0, +10, +1],
	[+0.1, +1,  0,   0, +10, +9],
	[+0.1,  0, +1, +10,   0, +9],
	[+0.1, +1,  0, +10,   0, +1],
	[-0.1,  0, -1,   0, +10, +1],
	[-0.1, -1,  0,   0, +10, +9],
	[-0.1,  0, -1, +10,   0, +9],
	[-0.1, -1,  0, +10,   0, +1],
	[+0.1,  0, +1,   0, -10, -1],
	[+0.1, +1,  0,   0, -10, -9],
	[+0.1,  0, +1, -10,   0, -9],
	[+0.1, +1,  0, -10,   0, -1],
	[-0.1,  0, -1,   0, -10, -1],
	[-0.1, -1,  0,   0, -10, -9],
	[-0.1,  0, -1, -10,   0, -9],
	[-0.1, -1,  0, -10,   0, -1]
];

testSets.forEach(test => {
	if (_convertUnit(test[0], test[1], test[2], test[3], test[4]) !== test[5]) {
		console.log('failed');
	}
});

*/

function _snapToNotch(in_value, in_notch) {
	let notch = in_notch / 2;
	let abs = Math.abs(in_value);
	let cnt = Math.floor(abs / notch);
	if (cnt % 2 === 1) {
		cnt += 1;
	}
	if (abs === 0) {
		return 0;
	} else {
		return notch * cnt * (in_value / abs);
	}
}

export function snapToPI(in_value) {
	/*
		{in : Math.PI / 2 - delta, expected : 0},
		{in : Math.PI / 2 + delta, expected : Math.PI}
	*/
	return _snapToNotch(in_value, Math.PI);
}

export function snapTo05PI(in_value) {
	/*
		{in : Math.PI / 4 - delta, expected : 0},
		{in : Math.PI / 4 + delta, expected : Math.PI / 2}
	*/
	return _snapToNotch(in_value, Math.PI / 2);
}

function createPeriodicFunction(in_period, in_min, in_max, in_trigonometric, in_flip) {
	const amplitude = (in_max - in_min) / 2 * (in_flip ? -1 : +1);
	const offset = (in_max + in_min) / 2;
	return in_rad => {
		return offset + amplitude * (in_trigonometric)((2 * Math.PI / in_period) * in_rad);
	};
}

export function createPeriodicSin(in_period, in_min, in_max, in_flip = false) {
	return createPeriodicFunction(in_period, in_min, in_max, Math.sin, in_flip);
}

export function createPeriodicCos(in_period, in_min, in_max, in_flip = false) {
	return createPeriodicFunction(in_period, in_min, in_max, Math.cos, in_flip);
}

function _nearlyEqual(in_a, in_b, in_error = 0.01) {
	const diff = Math.abs(in_a - in_b);
	const comp = Math.max(Math.abs(in_a), Math.abs(in_b));
	// scale-adjusted error
	return diff < comp * in_error;
}

export function pseudoMessageDigest1(in_array) {
	let hash = 0;
	in_array.sort().forEach(in_entry => {
		for (let i = 0; i < in_entry.length; i++) {
			hash = (hash << 5) - hash + in_entry.charCodeAt(i);
			hash |= 0;
		}
	});
	return hash >>> 0;
}

export function pseudoMessageDigest2(in_string) {
	return pseudoMessageDigest1([in_string]);
}

export function beep(in_amplitude = 2000) {
	const frequency = 5000;
	const duration = 0.01
	const sampleRate = 44100;
	const numChannels = 1;
	const numSamples = sampleRate * duration;
	const bytesPerSample = 2;
	const blockAlign = numChannels * bytesPerSample;
	const byteRate = sampleRate * blockAlign;
	const dataSize = numSamples * blockAlign;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);
	// RIFF identifier
	view.setUint32(0, 0x52494646, false);
	// RIFF chunk length
	view.setUint32(4, 36 + dataSize, true);
	// RIFF type
	view.setUint32(8, 0x57415645, false);
	// Format chunk identifier
	view.setUint32(12, 0x666d7420, false);
	// Format chunk length
	view.setUint32(16, 16, true);
	// Sample format (raw)
	view.setUint16(20, 1, true);
	// Channel count
	view.setUint16(22, numChannels, true);
	// Sample rate
	view.setUint32(24, sampleRate, true);
	// Byte rate
	view.setUint32(28, byteRate, true);
	// Block align
	view.setUint16(32, blockAlign, true);
	// Bits per sample
	view.setUint16(34, bytesPerSample * 8, true);
	// Data chunk identifier
	view.setUint32(36, 0x64617461, false);
	// Data chunk length
	view.setUint32(40, dataSize, true);
	// generate base64
	for (let i = 0; i < numSamples; i++) {
		const sample = in_amplitude * Math.sin(2 * Math.PI * frequency * (i / sampleRate));
		view.setInt16(44 + i * bytesPerSample, sample, true);
	}
	const uint8Array = new Uint8Array(buffer);
	const binaryString = String.fromCharCode(...uint8Array);
	return new Audio('data:audio/wav;base64,' + btoa(binaryString));
}

export const isEmulated = Symbol();

function _emulateTouchEvent(in_elem) {
	const eventMapper = [
		{
			src : 'touchstart',
			dst : 'mousedown'
		},
		{
			src : 'touchmove',
			dst : 'mousemove'
		},
		{
			src : 'touchleave',
			dst : 'mouseleave'
		},
		{
			src : 'touchend',
			dst : 'mouseup'
		}
	];
	let lastDistance = null;
	function createAltWheelEv(in_ev) {
		const t1 = in_ev.touches[0];
		const t2 = in_ev.touches[1];
		const currentDistance = Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));
		if (lastDistance === null) {
			lastDistance = currentDistance;
			return null;
		}
		const speed = 2;
		const delta = (lastDistance - currentDistance) * speed;
		lastDistance = currentDistance;
		return new WheelEvent('wheel', {
			deltaY : delta,
			clientX : (t1.clientX + t2.clientX) / 2,
			clientY : (t1.clientY + t2.clientY) / 2,
			ctrlKey : in_ev.ctrlKey,
			altKey : in_ev.altKey,
			shiftKey : in_ev.shiftKey,
			metaKey : in_ev.metaKey
		});
	}
	function createAltMouseEv(in_type, in_ev) {
		return new MouseEvent(in_type, {
			bubbles : true,
			cancelable : true,
			view : window,
			screenX : in_ev.changedTouches[0].screenX,
			screenY : in_ev.changedTouches[0].screenY,
			clientX : in_ev.changedTouches[0].clientX,
			clientY : in_ev.changedTouches[0].clientY,
			ctrlKey : in_ev.ctrlKey,
			altKey : in_ev.altKey,
			shiftKey : in_ev.shiftKey,
			metaKey : in_ev.metaKey,
			button : 0,
			relatedTarget : null
		});
	}
	eventMapper.forEach(in_pair => {
		in_elem.addEventListener(in_pair.src, in_ev => {
			in_ev.preventDefault();
			in_ev.stopPropagation();
			let alternative = null;
			if (in_ev.touches.length > 1) {
				if ((in_ev.touches.length === 2) && (in_pair.src === 'touchmove')) {
					alternative = createAltWheelEv(in_ev);
				} else {
					lastDistance = null;
				}
			} else {
				alternative = createAltMouseEv(in_pair.dst, in_ev);
			}
			if (alternative) {
				alternative[isEmulated] = true;
				in_ev.target.dispatchEvent(alternative);
			}
		});
	});
}

const _MOUSEMOVE_IGNORE = 5.0;
const _MOUSEMOVE_AMPLIFIER = 2.5;

function _timingController(in_callback, in_params = {}) {
	const cache = {
		x : Infinity,
		y : Infinity,
		time : 0,
		call : 0,
		skip : 0
	};
	const defaultParams = {
		interval : -1,
		delta : -1,
		and : true
	};
	const params = {};
	for (const [key, value] of Object.entries(defaultParams)) {
		params[key] = in_params.hasOwnProperty(key) ? in_params[key] : value;
	}
	const checkInterval = (in_now) => {
		if (params.interval < 0) {
			return true;
		}
		return (in_now - cache.time) > params.interval;
	};
	const checkDelta = in_ev => {
		if (params.delta < 0) {
			return true;
		}
		return ((in_ev.clientX - cache.x) ** 2 + (in_ev.clientY - cache.y) ** 2) ** 0.5 > params.delta;
	};
	return in_ev => {
		let now = Date.now();
		let executable;
		if (params.and) {
			executable = checkInterval(now) && checkDelta(in_ev);
		} else {
			executable = checkInterval(now) || checkDelta(in_ev);
		}
		cache.call++;
		if (executable) {
			(in_callback)(in_ev);
			cache.x = in_ev.clientX;
			cache.y = in_ev.clientY;
			cache.time = now;
		} else {
			cache.skip++;
			if (!DEBUG) {
				return;
			}
			if (cache.call % 100 === 0) {
				console.log('skip (%) : ', cache.skip / cache.call);
				cache.call = 0;
				cache.skip = 0;
			}
		}
	};
}

export function throttling(in_callback, in_interval) {
	return _timingController(in_callback, {
		interval : in_interval
	});
}

export function thresholding(in_callback, in_delta = _MOUSEMOVE_IGNORE) {
	const allowSmallMove = 500;
	return _timingController(in_callback, {
		interval : allowSmallMove,
		delta : in_delta,
		and : false
	});
}

export const debouncing = (() => {
	const timerIds = {};
	return (in_callback, in_interval, in_group = Symbol()) => {
		return in_ev => {
			if (timerIds.hasOwnProperty(in_group)) {
				window.clearTimeout(timerIds[in_group]);
			}
			timerIds[in_group] = window.setTimeout(() => {
				(in_callback)(in_ev);
				delete timerIds[in_group];
			}, in_interval);
		}
	};
})();

export function nonReentrantAsync(in_async) {
	let executable = true;
	return async () => {
		if (!executable) {
			return;
		}
		executable = false;
		await (in_async)();
		executable = true;
	};
}

export class cEase {
	constructor(in_from, in_to, in_duration) {
		this.from = in_from;
		this.to = in_to;
		this.duration = in_duration;
		this.start = Date.now();
	}
	#currentEasing(in_quad) {
		const elapsed = Date.now() - this.start;
		if (elapsed > this.duration) {
			return this.to;
		} else {
			return this.from + (this.to - this.from) * (in_quad)(elapsed / this.duration);
		}
	}
	currentEasingLinear() {
		return this.#currentEasing(t => t);
	}
	currentEasingIn() {
		return this.#currentEasing(t => t * t);
	}
	currentEasingOut() {
		return this.#currentEasing(t => t * (2 - t));
	}
}

/*
	*** NOTE ***
	when the app uses position of the mesh to find overlapping etc,
	need to ignore very small error.
*/

export class cApproximateMap extends Map {
	// to use this class, key should be numeric
	constructor(in_error) {
		super();
		this.error = in_error;
	}
	#sortedKeys = null;
	#approximateKey(in_key) {
		for (const registeredKey of this.keys()) {
			if (Math.abs(registeredKey - in_key) < this.error) {
				return registeredKey;
			}
		}
		return in_key;
	}
	sortedKey(in_index) {
		if (!this.#sortedKeys) {
			this.#sortedKeys = Array.from(this.keys()).sort((a, b) => a - b);
		}
		return this.#sortedKeys[in_index];
	}
	get(in_key) {
		return super.get(this.#approximateKey(in_key));
	}
	set(in_key, in_value) {
		this.#sortedKeys = null;
		return super.set(this.#approximateKey(in_key), in_value);
	}
	delete(in_key) {
		this.#sortedKeys = null;
		return super.delete(this.#approximateKey(in_key));
	}
}

export class cApproximateSet extends Set {
	constructor(in_error) {
		super();
		this.error = in_error;
	}
	#approximateValue(in_value) {
		for (let item of this) {
			if (Math.abs(item - in_value) < this.error) {
				return item;
			}
		}
		return in_value;
	}
	add(in_value) {
		return super.add(this.#approximateValue(in_value));
	}
	has(in_value) {
		return super.has(this.#approximateValue(in_value));
	}
	delete(in_value) {
		return super.delete(this.#approximateValue(in_value));
	}
}

export class cCyclicMap extends Map {
	get #keysArray() {
		return Array.from(this.keys());
	}
	#deltaItemByOrder(in_order, in_delta) {
		const length = this.#keysArray.length;
		const deltaIndex = (in_order + in_delta + length) % length;
		const deltaKey = this.#keysArray[deltaIndex];
		return {
			k : deltaKey,
			v : this.get(deltaKey)
		};
	}
	nextItemByOrder(in_order) {
		return this.#deltaItemByOrder(in_order, +1);
	}
	currItemByOrder(in_order) {
		return this.#deltaItemByOrder(in_order, 0);
	}
	prevItemByOrder(in_order) {
		return this.#deltaItemByOrder(in_order, -1);
	}
	#deltaItemByKey(in_key, in_delta) {
		const index = this.#keysArray.indexOf(in_key);
		if (index === -1) {
			return null;
		} else {
			return this.#deltaItemByOrder(index, in_delta);
		}
	}
	nextItemByKey(in_key) {
		return this.#deltaItemByKey(in_key, +1);
	}
	prevItemByKey(in_key) {
		return this.#deltaItemByKey(in_key, -1);
	}
}

export class cCyclicValues extends Array {
	#currIndex;
	constructor(...args) {
		super(...args);
		this.#currIndex = 0;
	}
	get #nextIndex() {
		return (this.#currIndex + 1) % this.length;
	}
	#increment() {
		this.#currIndex = this.#nextIndex;
	}
	currValue() {
		return this[this.#currIndex];
	}
	nextValue() {
		return this[this.#nextIndex];
	}
	incrementedValue() {
		this.#increment();
		return this.currValue();
	}
}

export const arrRand = Symbol();

Array.prototype[arrRand] = function() {
	return this[Math.floor(Math.random() * this.length)];
};

export const forEachCombination = Symbol();

Array.prototype[forEachCombination] = function(in_n, in_callback) {
	const combine = (in_args, in_start, in_decrement) => {
		if (in_decrement === 0) {
			return (in_callback)(...in_args);
		} else {
			for (let i = in_start; i <= this.length - in_decrement; i++) {
				in_args.push(this[i]);
				if (combine(in_args, i + 1, in_decrement - 1)) {
					return true;
				} else {
					in_args.pop();
				}
			}
		}
		return false;
	}
	return (combine)([], 0, in_n);
};

export const clipArea = Symbol();

HTMLCanvasElement.prototype[clipArea] = function(in_margin, in_callback) {
	const w = this.width;
	const h = this.height;
	let ctx = this.getContext('2d');
	if (!ctx) {
		/*
			*** NOTE ***
			sometimes can't get 2D context ( ex. Three.js ).
			so, to get it, copy bitmap to alternative canvas.
		*/
		const alternative = document.createElement('canvas');
		alternative.width = w;
		alternative.height = h;
		ctx = alternative.getContext('2d');
		ctx.drawImage(this, 0, 0);
	}
	const rgba = (ctx.getImageData(0, 0, w, h)).data;
	let l = Number.POSITIVE_INFINITY;
	let t = Number.POSITIVE_INFINITY;
	let r = Number.NEGATIVE_INFINITY;
	let b = Number.NEGATIVE_INFINITY;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const pt = (y * w + x) * 4;
			if (!(in_callback)(rgba[pt + 0], rgba[pt + 1], rgba[pt + 2], rgba[pt + 3])) {
				continue;
			}
			if (x < l) {
				l = x;
			}
			if (y < t) {
				t = y;
			}
			if (x > r) {
				r = x;
			}
			if (y > b) {
				b = y;
			}
		}
	}
	l = Math.max(l - in_margin, 0);
	t = Math.max(t - in_margin, 0);
	r = Math.min(r + in_margin, w - 1);
	b = Math.min(b + in_margin, h - 1);
	return {
		l : l,
		t : t,
		r : r,
		b : b,
		w : r - l + 1,
		h : b - t + 1
	};
};

export const clipClearArea = Symbol();

HTMLCanvasElement.prototype[clipClearArea] = function(in_margin) {
	return this[clipArea](in_margin, (in_r, in_g, in_b, in_a) => {
		return (in_a > 0);
	});
}

export const fillRoundRect = Symbol();

CanvasRenderingContext2D.prototype[fillRoundRect] = function(x, y, w, h, r) {
	this.beginPath();
	this.moveTo(x + r, y);
	this.lineTo(x + w - r, y);
	this.arc(x + w - r, y + r, r, Math.PI * (3 / 2), 0, false);
	this.lineTo(x + w, y + h - r);
	this.arc(x + w - r, y + h - r, r, 0, Math.PI * (1 / 2), false);
	this.lineTo(x + r, y + h);
	this.arc(x + r, y + h - r, r, Math.PI * (1 / 2), Math.PI, false);
	this.lineTo(x, y + r);
	this.arc(x + r, y + r, r, Math.PI, Math.PI * (3 / 2), false);
	this.closePath();
	this.fill();
}

/*
	(2) utilities related to Three.js
*/

export const XYZ = ['x', 'y', 'z'];

const _ROTATE = (in_obj, in_vec3) => {
	XYZ.forEach(in_xyz => {
		// for THREE.Object3D, THREE.Geometry
		const rotateAxis = 'rotate' + in_xyz.toUpperCase();
		in_obj[rotateAxis](in_vec3[in_xyz]);
	});
};

export const VEC3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

export const DIRECTION = {
	XP : VEC3(+1, 0, 0),
	XN : VEC3(-1, 0, 0),
	YP : VEC3(0, +1, 0),
	YN : VEC3(0, -1, 0),
	ZP : VEC3(0, 0, +1),
	ZN : VEC3(0, 0, -1)
}

class _cNDCVector2 extends THREE.Vector2 {
	#aspect;
	constructor(in_x, in_y, in_w, in_h) {
		const src_rect = {
			l : 0,
			t : 0,
			r : in_w,
			b : in_h
		};
		const dst_rect = {
			l : -1,
			t : -1,
			r : 1,
			b : 1
		};
		super(
			_convertUnit(in_x, src_rect.l, src_rect.r, dst_rect.l, dst_rect.r),
			_convertUnit(in_y, src_rect.t, src_rect.b, dst_rect.t, dst_rect.b)
		);
		// finally, dst_rect.t and dst_rect.b should be inverted
		this.y *= -1;
		this.#aspect = in_w / in_h;
	}
	/*
		*** NOTE ***
		when you use NDC for calculating delta of user interaction like mousemove,
		it will be affected by screen (canvas) size.
		so, you can use this method for the purpose.
	*/
	toAbs(in_amplifier = 1) {
		/*
			*** NOTE ***
			this.clone() can't be used here.
			at first, this code couldn't work because of it.
			https://github.com/mrdoob/three.js/blob/master/src/math/Vector2.js
			in addition, both _cNDCVector2 and Vector2 instances are basically operable at the same time
		*/
		const ndc = new THREE.Vector2(this.x, this.y);
		ndc.x *= this.#aspect;
		return ndc.multiplyScalar(in_amplifier);
	}
}

export function ndcFromEvent(in_ev) {
	const elem = in_ev.currentTarget
	return new _cNDCVector2(
		in_ev.clientX - elem.offsetLeft,
		in_ev.clientY - elem.offsetTop,
		elem.offsetWidth,
		elem.offsetHeight
	);
}

export function ndcToAbs(in_ndc) {
	return in_ndc.toAbs(_MOUSEMOVE_AMPLIFIER);
}

export class cBoxCollection {
	#boxes = [];
	constructor(in_objArr = []) {
		this.max = VEC3(Infinity * -1, Infinity * -1, Infinity * -1);
		this.min = VEC3(Infinity * +1, Infinity * +1, Infinity * +1);
		in_objArr.forEach(in_obj => {
			const box = (new THREE.Box3()).setFromObject(in_obj)
			this.addBox(box);
			XYZ.forEach(in_xyz => {
				this.max[in_xyz] = this.max[in_xyz] > box.max[in_xyz] ? this.max[in_xyz] : box.max[in_xyz];
				this.min[in_xyz] = this.min[in_xyz] < box.min[in_xyz] ? this.min[in_xyz] : box.min[in_xyz];
			});
		});
	}
	addBox(in_box) {
		this.#boxes.push(in_box);
	}
	containsPoint(in_vec3) {
		for (const box of this.#boxes) {
			if (box.containsPoint(in_vec3)) {
				return true;
			}
		}
		return false;
	}
	getContainedPoints() {
		const points = [];
		for (const box of this.#boxes) {
			const min = box.min;
			const max = box.max;
			points.push(VEC3(
				(max.x - min.x) / 2 + min.x,
				(max.y - min.y) / 2 + min.y,
				(max.z - min.z) / 2 + min.z
			));
		}
		return points;
	}
}

export const getWorldVec3 = Symbol();

THREE.Object3D.prototype[getWorldVec3] = function(in_vec3) {
	return in_vec3.clone().applyQuaternion(this.getWorldQuaternion(new THREE.Quaternion()));
}

export const getWorldUp = Symbol();

THREE.Object3D.prototype[getWorldUp] = function() {
	return this[getWorldVec3](DIRECTION.YP);
}

export const instanceInAncestor = Symbol();

THREE.Object3D.prototype[instanceInAncestor] = function(in_class) {
	const recurse = (in_current) => {
		if (in_current instanceof in_class) {
			return in_current;
		} else {
			if (in_current.parent) {
				return recurse(in_current.parent);
			} else {
				return null;
			}
		}
	};
	return (recurse)(this);
}

export const lookAtWithoutRotation = Symbol();

THREE.Object3D.prototype[lookAtWithoutRotation] = function(in_dstV3, in_prjV3 = null) {
	const updateParents = true;
	const updateChildren = false;
	this.updateWorldMatrix(updateParents, updateChildren);
	const worldPosition = (VEC3()).setFromMatrixPosition(this.matrixWorld);
	const up = this[getWorldUp]();
	const eye = in_dstV3.clone();
	if (in_prjV3) {
		up.projectOnPlane(in_prjV3).normalize();
		eye.sub(worldPosition).projectOnPlane(in_prjV3).add(worldPosition);
	}
	const localMatrix = (new THREE.Matrix4()).lookAt(eye, worldPosition, up);
	this.quaternion.setFromRotationMatrix(localMatrix);
	if (this.parent) {
		localMatrix.extractRotation(this.parent.matrixWorld);
		const parentQuat = (new THREE.Quaternion()).setFromRotationMatrix(localMatrix);
		this.quaternion.premultiply(parentQuat.invert());
	}
}

export function safeMergeGeometry(in_arr, in_dispose = true) {
	const merged = UTILS.mergeGeometries(in_arr);
	if (in_dispose) {
		in_arr.forEach(in_geo => in_geo.dispose());
	}
	return merged;
}

export function makeTrapezoidGeometryParts(in_txLen, in_tzLen, in_bxLen, in_bzLen, in_yLen, in_rad = 0) {
	const parts = [];
	/*
		|
		+- geometry
		|	|
		|	+- userData.isSurface : true / false
		|	|
		|	+- userData.groupName : 'top' / 'bottom' / 'middle'
		|
		+- geometry
		|
		+- ...
	*/
	const DEG90 = Math.PI * 1 / 2;
	const setGroupName = (in_vertices) => {
		if (in_vertices.every(vertex => vertex.y > 0)) {
			return 'top';
		}
		if (in_vertices.every(vertex => vertex.y < 0)) {
			return 'bottom';
		}
		return 'middle';
	};
	/*
			 (+)
			  |
			  0-----1
			 /|    /|
			3-----2 |
			| |   | |
		   -|-4---|-5---(+)
			|/|   |/
			7-----6
		   /  |
		 (+)
	*/
	const baseVertices = {
		v0 : VEC3(in_txLen / 2 * -1, in_yLen / 2 * +1, in_tzLen / 2 * -1),
		v1 : VEC3(in_txLen / 2 * +1, in_yLen / 2 * +1, in_tzLen / 2 * -1),
		v2 : VEC3(in_txLen / 2 * +1, in_yLen / 2 * +1, in_tzLen / 2 * +1),
		v3 : VEC3(in_txLen / 2 * -1, in_yLen / 2 * +1, in_tzLen / 2 * +1),
		v4 : VEC3(in_bxLen / 2 * -1, in_yLen / 2 * -1, in_bzLen / 2 * -1),
		v5 : VEC3(in_bxLen / 2 * +1, in_yLen / 2 * -1, in_bzLen / 2 * -1),
		v6 : VEC3(in_bxLen / 2 * +1, in_yLen / 2 * -1, in_bzLen / 2 * +1),
		v7 : VEC3(in_bxLen / 2 * -1, in_yLen / 2 * -1, in_bzLen / 2 * +1)
	};
	/*
		1. Surface (BufferGeometry)
			even you can also make surface using PlaneGeometry,
			it is a little complicated to decide position before rotation.
	*/
	const surfaceMap = new Map([
		[DIRECTION.XP, [baseVertices.v1, baseVertices.v2, baseVertices.v6, baseVertices.v5]],
		[DIRECTION.XN, [baseVertices.v0, baseVertices.v4, baseVertices.v7, baseVertices.v3]],
		[DIRECTION.YP, [baseVertices.v3, baseVertices.v2, baseVertices.v1, baseVertices.v0]],
		[DIRECTION.YN, [baseVertices.v6, baseVertices.v7, baseVertices.v4, baseVertices.v5]],
		[DIRECTION.ZP, [baseVertices.v7, baseVertices.v6, baseVertices.v2, baseVertices.v3]],
		[DIRECTION.ZN, [baseVertices.v5, baseVertices.v4, baseVertices.v0, baseVertices.v1]]
	]);
	const translatedSurfaceMap = new Map();
	const equal = (in_vec, ...in_vecArr) => in_vecArr.some(vec => in_vec.equals(vec));
	surfaceMap.forEach((in_val, in_key) => {
		let translate;
		if (equal(in_key, DIRECTION.YP, DIRECTION.YN)) {
			// top or bottom
			translate = in_key.clone().multiplyScalar(in_rad);
		} else {
			const normal = VEC3();
			in_val[forEachCombination](3, (a, b, c) => {
				let v1 = (VEC3()).subVectors(a, b);
				let v2 = (VEC3()).subVectors(b, c);
				if ((v1.lengthSq() > 0) && (v2.lengthSq() > 0)) {
					normal.crossVectors(v1, v2);
					if (normal.lengthSq() > 0) {
						normal.normalize();
						return true;
					}
				}
				return false;
			});
			translate = normal.multiplyScalar(in_rad);
		}
		const vertices = [];
		in_val.forEach(in_vertex => {
			vertices.push(in_vertex.clone().add(translate));
		});
		translatedSurfaceMap.set(in_key, vertices);
	});
	for (const vertices of translatedSurfaceMap.values()) {
		const uniqueFilter = (in_vertices) => {
			const unique = [];
			in_vertices.forEach(in_vertex => {
				if (unique.some(in_v => in_v.equals(in_vertex))) {
					return;
				}
				unique.push(in_vertex);
			});
		    return unique;
		};
		const unique = uniqueFilter(vertices);
		if (unique.length < 3) {
			continue;
		}
		const geometry = new THREE.BufferGeometry();
		const flat = [];
		unique.forEach(in_vec3 => {
			flat.push(in_vec3.x, in_vec3.y, in_vec3.z);
		});
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(flat, 3));
		let ix, uv;
		if (unique.length === 3) {
			ix = [0, 1, 2];
			uv = [0, 0, 1, 0, 0.5, 1];
		} else {
			ix = [0, 1, 2, 0, 2, 3];
			uv = [0, 0, 1, 0, 1, 1, 0, 1];
		}
		geometry.setIndex(ix);
		geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(uv), 2));
		geometry.computeVertexNormals();
		geometry.userData.isSurface = true;
		geometry.userData.groupName = setGroupName(vertices);
		parts.push(geometry);
	}
	/*
		2. Edge (CylinderGeometry)
			2.1. Edge for top & bottom surface (applying rotation by prepared setting)
			2.2. Edge for sloped side surface (applying rotation automatically)
	*/
	const makeEdgeCylinder = (in_height, in_start, in_theta) => {
		const defaultRadialSegments = 32;
		const defaultHeightSegments = 1;
		const openEnded = true;
		return new THREE.CylinderGeometry(
			in_rad,
			in_rad,
			in_height,
			defaultRadialSegments,
			defaultHeightSegments,
			openEnded,
			in_start,
			in_theta
		);
	};
	const centroid = (in_vecArr) => {
		const ret = VEC3();
		in_vecArr.forEach(in_vector => {
			ret.add(in_vector);
		});
		return ret.divideScalar(in_vecArr.length);
	};
	const theta = (a, b) => Math.atan(Math.abs(a - b) / 2 / in_yLen) * (a > b ? +1 : -1);
	const thetaX = theta(in_txLen, in_bxLen);
	const thetaZ = theta(in_tzLen, in_bzLen);
	const edgeConfigSet1 = [
		/*
			E : Edge (Vector3 x2)
			R : Rotation from Vector3(0, 1, 0)
			P : Parameter for THREE.CylinderGeometry
		*/
		{E : [baseVertices.v2, baseVertices.v3], R : VEC3(0, 0, DEG90 * -1), P : [DEG90 * 3, DEG90 + thetaZ]},
		{E : [baseVertices.v3, baseVertices.v0], R : VEC3(DEG90 * +1, 0, 0), P : [DEG90 * 2, DEG90 + thetaX]},
		{E : [baseVertices.v0, baseVertices.v1], R : VEC3(0, 0, DEG90 * +1), P : [DEG90 * 1, DEG90 + thetaZ]},
		{E : [baseVertices.v1, baseVertices.v2], R : VEC3(DEG90 * -1, 0, 0), P : [DEG90 * 0, DEG90 + thetaX]},
		{E : [baseVertices.v6, baseVertices.v7], R : VEC3(0, 0, DEG90 * +1), P : [DEG90 * 3, DEG90 - thetaZ]},
		{E : [baseVertices.v7, baseVertices.v4], R : VEC3(DEG90 * -1, 0, 0), P : [DEG90 * 2, DEG90 - thetaX]},
		{E : [baseVertices.v4, baseVertices.v5], R : VEC3(0, 0, DEG90 * -1), P : [DEG90 * 1, DEG90 - thetaZ]},
		{E : [baseVertices.v5, baseVertices.v6], R : VEC3(DEG90 * +1, 0, 0), P : [DEG90 * 0, DEG90 - thetaX]}
	];
	const edgeConfigSet2 = [
		{E : [baseVertices.v3, baseVertices.v7], P : [DEG90 * 3, DEG90]},
		{E : [baseVertices.v0, baseVertices.v4], P : [DEG90 * 2, DEG90]},
		{E : [baseVertices.v1, baseVertices.v5], P : [DEG90 * 1, DEG90]},
		{E : [baseVertices.v2, baseVertices.v6], P : [DEG90 * 0, DEG90]}
	];
	edgeConfigSet1.forEach(in_conf => {
		const length = in_conf.E[0].distanceTo(in_conf.E[1]);
		if (length === 0) {
			return;
		}
		const geometry = makeEdgeCylinder(length, in_conf.P[0], in_conf.P[1]);
		_ROTATE(geometry, in_conf.R);
		geometry.translate(centroid(in_conf.E));
		geometry.userData.isSurface = false;
		geometry.userData.groupName = setGroupName(in_conf.E);
		parts.push(geometry);
	});
	const vertical = VEC3(0, 1, 0);
	edgeConfigSet2.forEach(in_conf => {
		const length = in_conf.E[0].distanceTo(in_conf.E[1]);
		const geometry = makeEdgeCylinder(length, in_conf.P[0], in_conf.P[1]);
		/*
			at first, I mistook it for the opposite direction.
			( in_conf.E[0] --> in_conf.E[1] )
			because of it, parameter of theta couldn't be stable.
		*/
		const slope = in_conf.E[0].clone().sub(in_conf.E[1]).normalize();
		const quaternion = new THREE.Quaternion();
		quaternion.setFromUnitVectors(vertical, slope);
		geometry.applyQuaternion(quaternion);
		geometry.translate(centroid(in_conf.E));
		geometry.userData.isSurface = false;
		geometry.userData.groupName = setGroupName(in_conf.E);
		parts.push(geometry);
	});
	/*
		3. Corner (SphereGeometry)
	*/
	const makeCornerSphere = (in_phi_start, in_theta_start, in_theta) => {
		const error = 0.01;
		const widthSegments = 32;
		const heightSegments = 16;
		return new THREE.SphereGeometry(
			in_rad,
			widthSegments,
			heightSegments,
			in_phi_start - error,
			DEG90 + error * 2,
			in_theta_start - error,
			in_theta + error * 2
		);
	};
	const uTheta = (in_txLen > in_bxLen) || (in_tzLen > in_bzLen) ? DEG90 * 2 : DEG90 * 1;
	const bTheta = (in_txLen < in_bxLen) || (in_tzLen < in_bzLen) ? DEG90 * 2 : DEG90 * 1;
	const cornerConfigSet = [
		/*
			C : Corner (Vector3 x1)
			P : Parameter for THREE.SphereGeometry
		*/
		{C : baseVertices.v0, P : [DEG90 * 3, 0, uTheta]},
		{C : baseVertices.v1, P : [DEG90 * 2, 0, uTheta]},
		{C : baseVertices.v2, P : [DEG90 * 1, 0, uTheta]},
		{C : baseVertices.v3, P : [DEG90 * 0, 0, uTheta]},
		{C : baseVertices.v4, P : [DEG90 * 3, DEG90 * 2 - bTheta, bTheta]},
		{C : baseVertices.v5, P : [DEG90 * 2, DEG90 * 2 - bTheta, bTheta]},
		{C : baseVertices.v6, P : [DEG90 * 1, DEG90 * 2 - bTheta, bTheta]},
		{C : baseVertices.v7, P : [DEG90 * 0, DEG90 * 2 - bTheta, bTheta]}
	];
	cornerConfigSet.forEach(in_conf => {
		const geometry = makeCornerSphere(...in_conf.P);
		geometry.translate(in_conf.C);
		geometry.userData.isSurface = false;
		geometry.userData.groupName = setGroupName([in_conf.C]);
		parts.push(geometry);
	});
	return parts;
}

export function trapezoidGeometryUtil(in_txLen, in_tzLen, in_bxLen, in_bzLen, in_yLen, in_rad = 0) {
	const parts = makeTrapezoidGeometryParts(in_txLen, in_tzLen, in_bxLen, in_bzLen, in_yLen, in_rad);
	// assume order of groups ( BufferGeometry x6, other geometries ... )
	const groups = [];
	let edgeGroup = 0;
	parts.forEach(in_part => {
		if (in_part.userData.isSurface) {
			groups.push(in_part.index.count);
		} else {
			edgeGroup += in_part.index.count;
		}
	});
	groups.push(edgeGroup);
	const merged = safeMergeGeometry(parts);
	let start = 0;
	for (let i = 0; i < groups.length; i++) {
		merged.addGroup(start, groups[i], i);
		start += groups[i];
	}
	return merged;
}

export function roundBoxGeometry(in_xLen, in_yLen, in_zLen, in_rad) {
	return trapezoidGeometryUtil(in_xLen, in_zLen, in_xLen, in_zLen, in_yLen, in_rad);
}

export function roundRegularBoxGeometry(in_len, in_rad) {
	return trapezoidGeometryUtil(in_len, in_len, in_len, in_len, in_len, in_rad);
}

export function roundTrapezoidGeometry(in_tLen, in_bLen, in_height, in_rad) {
	return trapezoidGeometryUtil(in_tLen, 0, in_bLen, 0, in_height, in_rad);
}

export function capsuleConfigure(in_rad_t, in_rad_b, in_h) {
	/*
	                  +-(rad_t)-+
		             /|         |
		            / |         |
		           /  |         | in_h
		          /   |         |
		         /    |         |
		theta : +-----+-(rad_b)-+
	*/
	const ratio = (in_rad_b - in_rad_t) / in_h;
	const atan = Math.atan(1 / ratio);
	return {
		/*
			when in_rad_t < in_rad_b, atan will be "+"
			when in_rad_t = in_rad_b, atan will be "Math.PI / 2"
			when in_rad_t > in_rad_b, atan will be "-"
		*/
		theta : atan > 0 ? atan : Math.PI + atan,
		/*
			when in_rad_t < in_rad_b, delta will be "+"
			when in_rad_t = in_rad_b, delta will be "0"
			when in_rad_t > in_rad_b, delta will be "-"
		*/
		delta : {
			t : in_rad_t * ratio,
			b : in_rad_b * ratio
		},
		/*
			radius (real radius) will be always "+"
		*/
		radius : {
			t : (in_rad_t ** 2 + (in_rad_t * ratio) ** 2) ** 0.5,
			b : (in_rad_b ** 2 + (in_rad_b * ratio) ** 2) ** 0.5
		},
	};
}

/*

console.log(capsuleConfigure(10, 11, 50));
//theta: 1.5507989928...
console.log(capsuleConfigure(10, 10, 50));
//theta: 1.5707963267...
console.log(capsuleConfigure(11, 10, 50));
//theta: 1.5907936607...

*/

export function customCapsuleGeometry(in_rad_t, in_rad_b, in_h, in_rSeg = 32, in_hSeg = 1) {
	const conf = capsuleConfigure(in_rad_t, in_rad_b, in_h);
	const sphereParams = [32, 16, 0, Math.PI * 2];
	const parts = [];
	// top
	parts.push(new THREE.SphereGeometry(conf.radius.t, ...sphereParams, 0, conf.theta));
	parts[parts.length - 1].translate(0, conf.delta.t * -1 + in_h / 2, 0);
	// bottom
	parts.push(new THREE.SphereGeometry(conf.radius.b, ...sphereParams, conf.theta, Math.PI - conf.theta));
	parts[parts.length - 1].translate(0, conf.delta.b * -1 - in_h / 2, 0);
	// middle
	parts.push(new THREE.CylinderGeometry(in_rad_t, in_rad_b, in_h, in_rSeg, in_hSeg, true));
	return safeMergeGeometry(parts);
}

/*
	(3) cSphericalWorld

	|
	+-- Scene
	|
	+-- WebGLRenderer
	|
	+-- Object3D ( to control camera )
		|
		+- PerspectiveCamera
*/

export class cSphericalWorld {
	#scene = null;
	#renderer = null;
	#centerBall = null;
	#zoomMin = Number.NEGATIVE_INFINITY;
	#zoomMax = Number.POSITIVE_INFINITY;
	#userObjects = new Set();
	#animationHooks = new Set();
	constructor(in_radius) {
		// scene
		this.#scene = new THREE.Scene();
		if (DEBUG) {
			this.#scene.background = new THREE.Color(0xFFFFFF);
		}
		// renderer
		this.#renderer = new THREE.WebGLRenderer({alpha : true, antialias : true});
		this.#renderer.setPixelRatio(window.devicePixelRatio);
		// camera
		const camera = new THREE.PerspectiveCamera();
		camera.fov = 45;
		camera.near = 1;
		camera.far = in_radius * 2;
		camera.position.copy(VEC3(0, 0, 1).multiplyScalar(in_radius));
		camera.lookAt(VEC3(0, 0, 0));
		if (DEBUG) {
			camera.layers.enableAll();
		}
		this.#centerBall = new THREE.Object3D();
		this.#centerBall.add(camera);
		// light
		const lightColor = 0xFFFFFF;
		const intensity = 1;
		const noLimit = 0;
		const noDecay = 0;
		const light = new THREE.PointLight(lightColor, intensity, noLimit, noDecay);
		light.position.copy(VEC3(0, 1, 1).multiplyScalar(in_radius));
		this.#centerBall.add(light);
		this.add(new THREE.AmbientLight(lightColor), true);
		// other
		this.resize(this.canvas.width, this.canvas.height);
		this.#setupEventHandler();
		_emulateTouchEvent(this.canvas);
	}
	#setupEventHandler() {
		const events = (() => {
			let vecPrev = null;
			const start = in_ev => {
				const ndc = ndcFromEvent(in_ev);
				if (this.intersectPositive(ndc).length > 0) {
					return;
				}
				vecPrev = ndcToAbs(ndc);
			};
			const update = thresholding(in_ev => {
				if (!vecPrev) {
					return;
				}
				const vecNext = ndcToAbs(ndcFromEvent(in_ev));
				// the direction of moveView() is the opposite side against toward mousemove.
				const vecDelta = vecPrev.sub(vecNext);
				this.moveView(vecDelta.x, vecDelta.y);
				vecPrev = vecNext;
			});
			const stop = in_ev => {
				vecPrev = null;
			};
			const zoom = in_ev => {
				const distance = this.#camera.position.length() + in_ev.deltaY;
				if ((this.#zoomMax < distance) && (distance < this.#zoomMin)) {
					this.#setZoom(distance);
				}
			};
			return {
				'mousedown' : start,
				'mousemove' : update,
				'mouseleave' : stop,
				'mouseout' : stop,
				'mouseup' : stop,
				'wheel' : zoom
			};
		})();
		for (let [name, func] of Object.entries(events)) {
			this.canvas.addEventListener(name, func.bind(this));
		}
	}
	get canvas() {
		return this.#renderer.domElement;
	}
	get #camera() {
		return this.#centerBall.children.find(in_child => in_child instanceof THREE.Camera);
	}
	getLookAt() {
		return this.#camera.position.clone().negate();
	}
	moveView(in_world_dx, in_world_dy) {
		// event-x ++ : world-x ++ : camera-rotate-y ++ : object-rotate-y -- : object-view-x ++
		this.#centerBall.rotateY(in_world_dx * +1);
		// event-y -- : world-y ++ : camera-rotate-x -- : object-rotate-x ++ : object-view-y --
		this.#centerBall.rotateX(in_world_dy * -1);
	}
	#setZoom(in_distance) {
		this.#camera.position.normalize().multiplyScalar(in_distance);
	}
	#intersectObjects(in_ndc, in_direction, in_layer) {
		const raycaster = new THREE.Raycaster();
		raycaster.layers.set(in_layer);
		// camera ---[ raycast ]---> object
		raycaster.setFromCamera(in_ndc, this.#camera);
		const intersects = raycaster.intersectObjects(this.#scene.children);
		if (in_direction || (intersects.length === 0)) {
			return intersects;
		}
		// camera ---> object ( intersects[0].point ) ---[ raycaster.ray.direction ]---> opposit
		const opposit = (intersects[0].point.clone()).add(raycaster.ray.direction.multiplyScalar(this.#camera.far));
		// camera ---> object <---[ raycast again ]--- opposit
		raycaster.set(opposit, (raycaster.ray.direction.clone()).negate());
		return raycaster.intersectObjects(this.#scene.children);
	}
	intersectPositive(in_ndc, in_layer = 0) {
		return this.#intersectObjects(in_ndc, true, in_layer);
	}
	intersectNegative(in_ndc, in_layer = 0) {
		return this.#intersectObjects(in_ndc, false, in_layer);
	}
	copyCameraPosition() {
		return this.#camera.getWorldPosition(VEC3());
	}
	#easing(in_initValue, in_stopValue, in_duration, in_progressCallback, in_method) {
		return new Promise(resolve => {
			if (_nearlyEqual(in_initValue, in_stopValue)) {
				(in_progressCallback)(in_stopValue);
				// to the next then in the chain
				(resolve)();
				return;
			}
			const ease = new cEase(in_initValue, in_stopValue, in_duration);
			const hook = () => {
				let currValue;
				switch (in_method) {
				case 10 :
					currValue = ease.currentEasingIn();
					break;
				case 20 :
					currValue = ease.currentEasingOut();
					break;
				case 30 :
				default :
					currValue = ease.currentEasingLinear();
					break;
				}
				if (currValue === in_stopValue) {
					this.removeAnimationHook(hook);
					(in_progressCallback)(in_stopValue);
					// to the next then in the chain
					(resolve)();
				} else {
					(in_progressCallback)(currValue);
				}
			};
			this.addAnimationHook(hook);
		});
	}
	easeIn(in_initValue, in_stopValue, in_duration, in_progressCallback) {
		return this.#easing(in_initValue, in_stopValue, in_duration, in_progressCallback, 10);
	}
	easeOut(in_initValue, in_stopValue, in_duration, in_progressCallback) {
		return this.#easing(in_initValue, in_stopValue, in_duration, in_progressCallback, 20);
	}
	easeLinear(in_initValue, in_stopValue, in_duration, in_progressCallback) {
		return this.#easing(in_initValue, in_stopValue, in_duration, in_progressCallback, 30);
	}
	addAnimationHook(in_hook) {
		this.#animationHooks.add(in_hook);
	}
	removeAnimationHook(in_hook) {
		this.#animationHooks.delete(in_hook);
	}
	motionZoom1(in_initDistance, in_stopDistance, in_duration) {
		return this.easeOut(in_initDistance, in_stopDistance, in_duration, in_currDistance => {
			this.#setZoom(in_currDistance);
		});
	}
	motionZoom2(in_stopDistance, in_duration) {
		return this.motionZoom1(this.#camera.position.length(), in_stopDistance, in_duration);
	}
	motionKnock(in_duration = 100) {
		const currentDistance = this.#camera.position.length();
		return this.motionZoom1(currentDistance * 1.1, currentDistance, in_duration);
	}
	motionDefaultView(in_duration = 2000) {
		const targetQuat = new THREE.Quaternion();
		const targetRad = this.#centerBall.quaternion.angleTo(targetQuat);
		return this.easeIn(0, targetRad, in_duration, in_currRad => {
			this.#centerBall.quaternion.rotateTowards(targetQuat, in_currRad);
		});
	}
	motionFog(in_color, in_initFogged, in_stopFogged, in_duration = 500) {
		return new Promise(resolve => {
			if (this.#scene.fog) {
				// to the next then in the chain
				(resolve)();
				return;
			}
			const distance = this.#camera.position.length();
			const margin = 100;
			const radius = this.#getUserObjectRadius() + margin;
			const initNear = _convertUnit(in_initFogged, 0, 100, distance + radius, distance - radius * 3);
			const stopNear = _convertUnit(in_stopFogged, 0, 100, distance + radius, distance - radius * 3);
			this.#scene.fog = new THREE.Fog(in_color, initNear, initNear + radius * 2);
			this.easeLinear(initNear, stopNear, in_duration, in_currNear => {
				this.#scene.fog.near = in_currNear;
				this.#scene.fog.far = in_currNear + radius * 2;
			}).then(() => {
				this.#scene.fog = null;
				// to the next then in the chain
				(resolve)();
			});
		});
	}
	startRotation(in_vec3) {
		if (this.stopRotation) {
			return;
		}
		const rotation = () => {
			_ROTATE(this.#centerBall, in_vec3);
		};
		this.addAnimationHook(rotation);
		this.stopRotation = () => {
			this.removeAnimationHook(rotation);
			delete this.stopRotation;
		};
	}
	resize(in_w, in_h) {
		this.#renderer.setSize(in_w, in_h);
		this.#camera.aspect = in_w / in_h;
		this.#camera.updateProjectionMatrix();
	}
	#getUserObjectRadius() {
		let max = Number.NEGATIVE_INFINITY;
		this.#userObjects.forEach(in_obj => {
			const box = new THREE.Box3();
			in_obj.traverse(in_descendant => {
				if (in_descendant.visible && in_descendant.geometry) {
					in_descendant.geometry.computeBoundingBox();
					const descendantBox = in_descendant.geometry.boundingBox.clone();
					descendantBox.applyMatrix4(in_descendant.matrixWorld);
					box.union(descendantBox);
				}
			});
			const sphere = new THREE.Sphere();
			box.getBoundingSphere(sphere);
			max = Math.max(max, sphere.radius);
		});
		return max;
	}
	#updateZoomParams() {
		let delayed = 1000;
		const update = () => {
			const radius = this.#getUserObjectRadius();
			if (radius < 0) {
				// don't have visible object
				delayed *= 2;
				window.setTimeout(update, delayed);
			} else {
				this.#zoomMin = this.#camera.far - radius;
				this.#zoomMax = radius
			}
		};
		(update)();
	}
	add(in_added, in_isSystemObject = false) {
		this.#scene.add(in_added);
		if (in_isSystemObject) {
			return;
		}
		this.#userObjects.add(in_added);
		this.#updateZoomParams();
	}
	remove(in_removed, in_isSystemObject = false) {
		/*
			*** NOTE ***
			as remove is idempotent,
			children will be removed safety.
		*/
		this.#scene.remove(in_removed);
		if (in_isSystemObject) {
			return;
		}
		this.#userObjects.delete(in_removed);
		this.#updateZoomParams();
	}
	render() {
		this.#renderer.render(this.#scene, this.#camera);
	}
	start() {
		this.add(this.#centerBall, true);
		this.#renderer.setAnimationLoop(() => {
			this.render();
			this.#animationHooks.forEach(in_hook => {
				(in_hook)();
			});
		});
	}
}
