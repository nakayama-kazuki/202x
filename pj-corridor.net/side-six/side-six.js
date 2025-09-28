import * as THREE from 'three';
import * as UTILS from 'utils';
import {
	getResource,
	postResource,
	getParam,
	DEBUG,
	COLOR,
	randomString,
	snapToNotch,
	snapToPI,
	snapTo05PI,
	createPeriodicSin,
	createPeriodicCos,
	pseudoMessageDigest1,
	pseudoMessageDigest2,
	beep,
	isEmulated,
	throttling,
	thresholding,
	debouncing,
	nonReentrantAsync,
	autoTransition,
	startDialog,
	factoryBuilder,
	arrRand,
	arrTrim,
	cEase,
	cApproximateMap,
	cApproximateSet,
	cCyclicMap,
	cCyclicValues,
	forEachCombination,
	cChart,
	clipArea,
	clipClearArea,
	fillRoundRect,
	XYZ,
	VEC3,
	DIRECTION,
	ndcFromEvent,
	ndcToAbs,
	getWorldVec3,
	getWorldUp,
	instanceInAncestor,
	lookAtWithoutRotation,
	safeMergeGeometry,
	makeTrapezoidGeometryParts,
	trapezoidGeometryUtil,
	roundBoxGeometry,
	roundRegularBoxGeometry,
	roundTrapezoidGeometry,
	capsuleConfigure,
	customCapsuleGeometry,
	cSphericalWorld
} from 'basic';

class cColonyCore extends THREE.Object3D {
	set #settingKey(in_value) {
		if (!this.userData.settingPerPieces) {
			this.userData.settingPerPieces = {};
		}
		if (!this.userData.settingPerPieces[in_value]) {
			this.userData.settingPerPieces[in_value] = {};
		}
		this.userData.currentSettingKey = in_value;
	}
	get settingVal() {
		if (this.userData.currentSettingKey) {
			return this.userData.settingPerPieces[this.userData.currentSettingKey];
		} else {
			throw new Error('no currentSettingKey');
		}
	}
	removePieces() {
		const pieces = this.children.slice();
		pieces.forEach(in_piece => {
			this.remove(in_piece);
		});
		this.userData.currentSettingKey = null;
	}
	setupAllPieces(in_pieces) {
		this.removePieces();
		const uuids = [];
		const posCntOnSameX = new Map();
		in_pieces.forEach(in_piece => {
			uuids.push(in_piece.uuid);
			this.add(in_piece);
			// how many pieces are at position x ?
			const x = in_piece.position.x;
			if (posCntOnSameX.has(x)) {
				posCntOnSameX.set(x, posCntOnSameX.get(x) + 1);
			} else {
				posCntOnSameX.set(x, 1);
			}
		});
		this.#settingKey = pseudoMessageDigest1(uuids);
		// information related to structure
		this.settingVal.rowsForCircle = Math.max(...Array.from(posCntOnSameX.values()));
		this.settingVal.colsForLength = Array.from(posCntOnSameX.keys()).length;
		this.settingVal.origin = in_pieces[0].position.clone();
		const sorted = [...posCntOnSameX.keys()].sort((in_e1, in_e2) => in_e1 - in_e2);
		this.settingVal.unitDelta = sorted[1] - sorted[0];
		this.settingVal.unitAngle = Math.PI * 2 / this.settingVal.rowsForCircle;
	}
}

export class cColony extends cColonyCore {
	static error = 0.01;
	static axes = {
		x : VEC3(1, 0, 0),
		y : VEC3(0, 1, 0),
		z : VEC3(0, 0, 1)
	};
	static axisComponent(in_axis, in_match = true) {
		const props = Object.keys(cColony.axes).filter(in_key => {
			const equal = cColony.axes[in_key].equals(in_axis);
			return in_match ? equal : !equal;
		});
		if (props.length > 1) {
			return props;
		} else {
			return props[0];
		}
	}
	approximateChildren(in_callback, in_order = 1) {
		const xSet = new cApproximateSet(cColony.error);
		this.children.forEach(in_child => xSet.add(in_callback(in_child)));
		return Array.from(xSet).sort((in_e1, in_e2) => (in_e1 - in_e2) * in_order);
	}
	setupGroup(in_pieces) {
		const group = new THREE.Object3D();
		this.add(group);
		in_pieces.forEach(in_piece => {
			group.attach(in_piece);
			// tmpCache may be used for customizing animations
			in_piece.userData.tmpCache = {
				position : in_piece.position.clone(),
				rotation : in_piece.rotation.clone()
			};
		});
		// group position is (0, 0, 0)
		return group;
	}
	#releaseGroup(in_group) {
		const copiedPieces = [...in_group.children];
		copiedPieces.forEach(in_piece => {
			/*
				*** NOTE ***
				"add" follows parent position.
				"attach" keeps world position.
				in addition, both of them internally call "remove" from other object.
			*/
			this.attach(in_piece);
			delete in_piece.userData.tmpCache;
		});
		this.remove(in_group);
	}
	// public because of customizing
	affectedRotatePieces(in_piece, in_axis) {
		const pieces = [];
		const component = in_piece.position.dot(in_axis);
		this.children.forEach(in_child => {
			if (Math.abs(component - in_child.position.dot(in_axis)) < cColony.error) {
				pieces.push(in_child);
			}
		});
		return pieces;
	}
	affectedSlidePieces(in_piece, in_sign) {
		const pieces = [];
		const y = in_piece.position.dot(cColony.axes.y);
		const z = in_piece.position.dot(cColony.axes.z);
		this.children.forEach(in_child => {
			const pos = in_child.position;
			if ((Math.abs(y - pos.y) < cColony.error) && (Math.abs(z - pos.z) < cColony.error)) {
				pieces.push(in_child);
			}
		});
		const currSide = (in_sign > 0) ? 'max' : 'min';
		const nextSide = (in_sign > 0) ? 'min' : 'max';
		pieces.sort((in_e1, in_e2) => (in_e1.position.x - in_e2.position.x) * in_sign);
		const getEdgeX = (in_object, in_edge) => {
			const box = new THREE.Box3();
			box.setFromObject(in_object);
			return box[in_edge].x;
		};
		let started = false;
		let edge = getEdgeX(in_piece, currSide);
		const affected = [in_piece];
		pieces.forEach(in_sorted => {
			if (started) {
				// find the adjacent piece
				if (Math.abs(edge - getEdgeX(in_sorted, nextSide)) < cColony.error) {
					affected.push(in_sorted);
					edge = getEdgeX(in_sorted, currSide);
				}
			} else {
				if (in_sorted === in_piece) {
					started = true;
				}
			}
		});
		// for in_sign direction, there is not piece next to the last element
		return affected;
	}
	slidableDistance(in_piece, in_sign) {
		const xArr = this.approximateChildren(in_obj => in_obj.position.x, in_sign);
		for (let i = 0; i < xArr.length - 1; i++) {
			if (Math.abs(xArr[i] - in_piece.position.x) < cColony.error) {
				return xArr[i + 1] - in_piece.position.x;
			}
		}
		return 0;
	}
	// public because of customizing
	rotate(in_group, in_axis, in_rad) {
		in_group.rotation[cColony.axisComponent(in_axis)] = in_rad;
	}
	makeAnimationProgress(in_group, in_axis, in_startAmount, in_finalAmount, in_callback) {
		const amount = Math.abs(in_finalAmount - in_startAmount);
		let duration;
		if (in_axis) {
			duration = amount / (Math.PI / 2) * 500;
		} else {
			duration = 100;
		}
		const ease = new cEase(in_startAmount, in_finalAmount, duration);
		const progress = () => {
			const currAmount = ease.currentEasingIn();
			if (in_axis) {
				this.rotate(in_group, in_axis, currAmount);
			} else {
				in_group.position.x = currAmount;
			}
			let ratio = Math.abs(currAmount - in_startAmount) / amount;
			if (currAmount === in_finalAmount) {
				this.#releaseGroup(in_group);
				// in this case, progress function should be stopped (in in_callback)
				ratio = 1.0;
			}
			(in_callback)(ratio);
		};
		return progress;
	}
	static #uiStates  = {
		DISABLED : Symbol(),
		ENABLED : Symbol(),
		DRAGGING : Symbol(),
		MOVING : Symbol(),
		MOMENTUM : Symbol()
	}
	/*
		ENABLED <-------------------+
		|                           |
		+-[disable]-----+           |
		|               |           |
		|   DISABLED <--+           |
		|   |                       |
		|   +-[enable]--------------+
		|                           |
		+-[drag]--------+           |
		                |           |
		    DRAGGING <--+           |
		    |                       |
		    +-[release]-------------+
		    |                       |
		    +-[movable]-----+       |
		                    |       |
		        MOVING <----+       |
		        |                   |
		        +-[release]-----+   |
		                        |   |
		            MOMENTUM <--+   |
		            |               |
		            +-[stop]--------+
	*/
	static #uiTransitions = {
		[cColony.#uiStates.DISABLED]: {
			enable : cColony.#uiStates.ENABLED
		},
		[cColony.#uiStates.ENABLED]: {
			disable : cColony.#uiStates.DISABLED,
			drag : cColony.#uiStates.DRAGGING
		},
		[cColony.#uiStates.DRAGGING]: {
			release : cColony.#uiStates.ENABLED,
			movable : cColony.#uiStates.MOVING
		},
		[cColony.#uiStates.MOVING]: {
			release : cColony.#uiStates.MOMENTUM
		},
		[cColony.#uiStates.MOMENTUM]: {
			stop : cColony.#uiStates.ENABLED
		}
	};
	#uiSession = {
		state : cColony.#uiStates.ENABLED,
		ctx : {}
	};
	#transition(in_action) {
		const newState = cColony.#uiTransitions[this.#uiSession.state]?.[in_action];
		if (newState) {
			this.#uiSession.state = newState;
		} else {
			throw new Error('invalid transition : ' + in_action);
		}
	}
	uiEnable() {
		if (this.#uiSession.state !== cColony.#uiStates.DISABLED) {
			console.log('state is not DISABLED');
			return;
		}
		this.#transition('enable');
	}
	uiDisable() {
		if (this.#uiSession.state !== cColony.#uiStates.ENABLED) {
			console.log('state is not ENABLED');
			return;
		}
		this.#transition('disable');
	}
	#uiInitSession() {
		if (this.#uiSession.ctx.group) {
			this.#releaseGroup(this.#uiSession.ctx.group);
		}
		this.#uiSession.ctx = {};
	}
	uiSetInitPosition(in_posV3, in_posV2) {
		if (this.#uiSession.state !== cColony.#uiStates.ENABLED) {
			console.log('state is not ENABLED');
			return;
		}
		this.#uiSession.ctx = {
			// intersection with a object
			initPosV3 : in_posV3,
			// abs value generated from NDC (Normalized Device Coordinates)
			initPosV2 : in_posV2,
			// vector from initPosV2
			initDirV2 : null,
			// target objects for animation
			group : null,
			// current value which will be updated during animation
			currAmount : 0,
			// sign which show the direction for animation
			direction : 0,
			// rotating animation uses this axis
			rotationAxis : null,
			// array of [min, max]
			movableRange : null,
		};
		this.#transition('drag');
	}
	uiIsDragging() {
		return (this.#uiSession.state === cColony.#uiStates.DRAGGING);
	}
	uiIsMoving() {
		return (this.#uiSession.state === cColony.#uiStates.MOVING);
	}
	static uiSetDeltaPositionRC = {
		NOOP : Symbol(),
		// as delta is not enough, need to call uiNotifyDeltaPosition again
		NOTENOUGH : Symbol(),
		// though delta is enough, can't make group
		UNMOVABLE : Symbol(),
		// as delta is enough, can call uiUpdatePosition
		MOVABLE : Symbol()
	};
	uiNotifyDeltaPosition(in_piece, in_posV3, in_posV2) {
		const RC = cColony.uiSetDeltaPositionRC;
		if (this.#uiSession.state !== cColony.#uiStates.DRAGGING) {
			console.log('state is not DRAGGING');
			return RC.NOOP;
		}
		const ctx = this.#uiSession.ctx;
		const srcYZ = new THREE.Vector2(ctx.initPosV3.y, ctx.initPosV3.z);
		const dstYZ = new THREE.Vector2(in_posV3.y, in_posV3.z);
		const rotateDelta = srcYZ.distanceTo(dstYZ);
		const movingDelta = Math.abs(in_posV3.x - ctx.initPosV3.x);
		const notEnough = (in_threshold => {
			return (in_a, in_b) => {
				return (in_a < in_threshold * in_b) && (in_b < in_threshold * in_a);
			};
		})(1.5);
		if (notEnough(rotateDelta, movingDelta)) {
			return RC.NOTENOUGH;
		}
		let pieces, direction, axis, range;
		if (rotateDelta > movingDelta) {
			pieces = this.affectedRotatePieces(in_piece, cColony.axes.x);
			if (pieces.length < this.children.length) {
				direction = srcYZ.cross(dstYZ) > 0 ? 1 : -1;
				axis = cColony.axes.x;
				range = null;
			} else {
				return RC.UNMOVABLE;
			}
		} else {
			direction = Math.sign(in_posV3.x - ctx.initPosV3.x);
			pieces = this.affectedSlidePieces(in_piece, direction);
			const amount = this.slidableDistance(pieces[pieces.length - 1], direction);
			if (amount !== 0) {
				axis = null;
				range = {min : Math.min(0, amount), max : Math.max(0, amount)};
			} else {
				return RC.UNMOVABLE;
			}
		}
		this.#transition('movable');
		ctx.initDirV2 = in_posV2.clone().sub(ctx.initPosV2);
		ctx.group = this.setupGroup(pieces);
		ctx.direction = direction;
		ctx.rotationAxis = axis;
		ctx.movableRange = range;
		return RC.MOVABLE;
	}
	uiUpdatePosition(in_posV2) {
		if (this.#uiSession.state !== cColony.#uiStates.MOVING) {
			return;
		}
		const ctx = this.#uiSession.ctx;
		const currentDirV2 = in_posV2.clone().sub(ctx.initPosV2);
		let prev, next;
		let amount, notch;
		if (ctx.rotationAxis) {
			amount = in_posV2.distanceTo(ctx.initPosV2) * ctx.direction;
			if (ctx.initDirV2.dot(currentDirV2) > 0) {
				// currentDirV2 & initDirV2 --> SAME direction
				amount *= +1;
			} else {
				// currentDirV2 & initDirV2 --> OPPOSITE direction
				const thresholdToStopWarp = Math.PI / 8;
				if (Math.abs(ctx.currAmount + amount) < thresholdToStopWarp) {
					amount *= -1;
				}
			}
			this.rotate(ctx.group, ctx.rotationAxis, amount);
			notch = this.settingVal.unitAngle;
		} else {
			amount = in_posV2.distanceTo(ctx.initPosV2) * ctx.direction * 250;
			if (amount < ctx.movableRange.min) {
				amount = ctx.movableRange.min;
			}
			if (amount > ctx.movableRange.max) {
				amount = ctx.movableRange.max;
			}
			ctx.group.position.x = amount;
			notch = Math.abs(ctx.movableRange.min + ctx.movableRange.max);
		}
		prev = snapToNotch(ctx.currAmount, notch);
		next = snapToNotch(amount, notch);
		ctx.currAmount = amount;
		// over the top
		return (prev !== next);
	}
	uiRelease(in_ending_callback) {
		if (this.#uiSession.state === cColony.#uiStates.DRAGGING) {
			this.#uiInitSession();
			this.#transition('release');
			return null;
		}
		if (this.#uiSession.state !== cColony.#uiStates.MOVING) {
			return null;
		}
		this.#transition('release');
		const ctx = this.#uiSession.ctx;
		let type, notch, last, delta;
		if (ctx.rotationAxis) {
			type = 'rotate';
			notch = this.settingVal.unitAngle;
			last = snapToNotch(ctx.currAmount, notch);
			delta = Math.round(last / this.settingVal.unitAngle);
		} else {
			type = 'slide';
			notch = Math.abs(ctx.movableRange.min + ctx.movableRange.max);
			last = snapToNotch(ctx.currAmount, notch);
			delta = Math.round(last / this.settingVal.unitDelta);
		}
		const piece = ctx.group.children[0];
		return this.makeAnimationProgress(ctx.group, ctx.rotationAxis, ctx.currAmount, last, (in_ratio) => {
			if (in_ratio < 1) {
				return;
			}
			let changed;
			if (last === 0) {
				changed = null;
			} else {
				changed = {type, delta, piece};
			}
			this.#uiInitSession();
			this.#transition('stop');
			(in_ending_callback)(changed);
		});
	}
}
