import * as THREE from 'three';
import * as UTILS from 'utils';
import {
	getVersion,
	getParam,
	DEBUG,
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
	factoryBuilder,
	arrRand,
	arrTrim,
	cEase,
	cApproximateMap,
	cApproximateSet,
	cCyclicMap,
	cCyclicValues,
	forEachCombination,
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

export class cRubiksCube extends THREE.Object3D {
	static error = 0.01;
	static #axes = {
		x : VEC3(1, 0, 0),
		y : VEC3(0, 1, 0),
		z : VEC3(0, 0, 1)
	};
	static axisComponent(in_axis, in_match = true) {
		const props = Object.keys(cRubiksCube.#axes).filter(in_key => {
			const equal = cRubiksCube.#axes[in_key].equals(in_axis);
			return in_match ? equal : !equal;
		});
		if (props.length > 1) {
			return props;
		} else {
			return props[0];
		}
	}
	get #settingVal() {
		if (this.userData.currentSettingKey) {
			return this.userData.settingPerPieces[this.userData.currentSettingKey];
		} else {
			throw new Error('no currentSettingKey');
		}
	}
	set #settingKey(in_value) {
		if (!this.userData.settingPerPieces) {
			this.userData.settingPerPieces = {};
		}
		if (!this.userData.settingPerPieces[in_value]) {
			this.userData.settingPerPieces[in_value] = {};
		}
		this.userData.currentSettingKey = in_value;
	}
	removePieces() {
		const pieces = this.children.slice();
		pieces.forEach(in_piece => {
			this.remove(in_piece);
		});
		this.userData.currentSettingKey = null;
	}
	addPieces(in_pieces) {
		this.removePieces();
		const uuids = [];
		in_pieces.forEach(in_piece => {
			uuids.push(in_piece.uuid);
			this.add(in_piece);
		});
		this.#settingKey = pseudoMessageDigest1(uuids);
		if (!this.#settingVal.initialized) {
			this.#settingVal.completeCallback = null;
			this.#settingVal.shuffleCount = 0;
			this.#settingVal.shuffled = false;
			this.#settingVal.initialized = true;
		}
	}
	getScore() {
		const max = 100;
		return Math.max(Math.ceil((max - this.#settingVal.shuffleCount) / 10) * 10, 0);
	}
	#isSurface(in_piece, in_surface, in_scale = 1000) {
		const far = VEC3();
		XYZ.forEach(in_xyz => {
			if (in_surface[in_xyz] === 0) {
				far[in_xyz] = in_piece.position[in_xyz];
			} else {
				far[in_xyz] = in_surface[in_xyz] * in_scale;
			}
		});
		const raycaster = new THREE.Raycaster(far, in_surface.clone().negate());
		const intersects = raycaster.intersectObjects(this.children, false);
		return (intersects[0].object === in_piece);
	}
	static #getColor(in_piece, in_targetV3) {
		const matrix = (new THREE.Matrix4()).makeRotationFromQuaternion(in_piece.quaternion);
		const invertV3 = in_targetV3.clone().applyMatrix4(matrix.invert());
		const error = 0.001;
		for (let i = 0; i < Object.values(DIRECTION).length; i++) {
			const surfaceV3 = Object.values(DIRECTION)[i];
			if (XYZ.every(in_xyz => Math.abs(invertV3[in_xyz] - surfaceV3[in_xyz]) < error)) {
				return in_piece.material[i].color.getHex();
			}
		}
		return -1;
	}
	#isComplete() {
		return Object.values(DIRECTION).every(in_direction => {
			let sameColor = -1;
			return this.children.every(in_piece => {
				if (!this.#isSurface(in_piece, in_direction)) {
					return true;
				}
				const color = cRubiksCube.#getColor(in_piece, in_direction);
				if (sameColor < 0) {
					sameColor = color;
					return true;
				}
				if (sameColor === color) {
					return true;
				} else {
					return false;
				}
			});
		});
	}
	#setupGroup(in_pieces) {
		const buffer = new THREE.Box3();
		const unionBox = new THREE.Box3();
		in_pieces.forEach(in_piece => {
			unionBox.union(buffer.setFromObject(in_piece));
		});
		/*
			*** NOTE ***
			property of rotation will be changed in uiUpdatePosition().
			at that time, it will be decided based on position of group.
			though position was fixed to (0, 0, 0) before,
			center of the box is used now.
		*/
		const group = new THREE.Object3D();
		this.add(group);
		group.position.copy(unionBox.getCenter(VEC3()));
		in_pieces.forEach(in_piece => {
			group.attach(in_piece);
			// tmpCache may be used for customizing animations
			in_piece.userData.tmpCache = {
				position : in_piece.position.clone(),
				rotation : in_piece.rotation.clone()
			};
		});
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
	affectedPieces(in_piece, in_axis) {
		const pieces = [];
		const component = in_piece.position.dot(in_axis);
		this.children.forEach(in_child => {
			if (Math.abs(component - in_child.position.dot(in_axis)) < cRubiksCube.error) {
				pieces.push(in_child);
			}
		});
		return pieces;
	}
	static #rotatableAngle(in_group, in_axis) {
		const aabb = new THREE.Box3();
		const objBoxes = [];
		in_group.children.forEach(in_object => {
			const box = (new THREE.Box3()).setFromObject(in_object);
			aabb.union(box);
			objBoxes.push(box);
		});
		// 1. divide aabb into 8 areas from center
		const center = aabb.getCenter(VEC3());
		const range = {};
		const error = 0.01;
		XYZ.forEach(in_xyz => {
			range[in_xyz] = [
				{
					min : -Infinity,
					max : center[in_xyz] - error
				},
				{
					min : center[in_xyz] + error,
					max : +Infinity
				}
			];
		});
		const areaBoxes = [];
		range.x.forEach(in_x => {
			range.y.forEach(in_y => {
				range.z.forEach(in_z => {
					areaBoxes.push(new THREE.Box3(
						VEC3(in_x.min, in_y.min, in_z.min),
						VEC3(in_x.max, in_y.max, in_z.max)
					));
				});
			});
		});
		// 2. assign objBoxes into 8 areas
		const intersectBoxes = [];
		areaBoxes.forEach(in_area => {
			const boxes = [];
			objBoxes.forEach(in_box => {
				const box = in_area.clone().intersect(in_box);
				if (box.isEmpty()) {
					return;
				}
				boxes.push(box);
			});
			intersectBoxes.push(boxes);
		});
		// 3. compute area
		const [a1, a2] = cRubiksCube.axisComponent(in_axis, false);
		const areas = [];
		intersectBoxes.forEach(in_boxes => {
			if (in_boxes[0].getCenter(VEC3()).dot(in_axis) <= center.dot(in_axis)) {
				return;
			}
			let area = 0;
			in_boxes.forEach(in_box => {
				const size = in_box.getSize(VEC3());
				area += size[a1] * size[a2];
			});
			areas.push(area);
		});
		// 4. check angle
		const allEqual = (...in_args) => {
			// error has already been declared
			return in_args.every(in_arg => Math.abs(in_arg - in_args[0]) < error);
		};
		if (allEqual(areas[0], areas[1], areas[2], areas[3])) {
			return Math.PI / 2;
		} else {
			if (allEqual(areas[0] + areas[1], areas[2] + areas[3])) {
				return Math.PI;
			} else {
				return Math.PI * 2;
			}
		}
	}
	// public because of customizing
	rotate(in_group, in_axis, in_rad) {
		in_group.rotation[cRubiksCube.axisComponent(in_axis)] = in_rad;
	}
	#makeRotationProgress(in_group, in_axis, in_start_rad, in_final_rad, in_callback) {
		const distance = Math.abs(in_final_rad - in_start_rad);
		const duration = distance / (Math.PI / 2) * 500;
		const ease = new cEase(in_start_rad, in_final_rad, duration);
		const progress = () => {
			const currRad = ease.currentEasingIn();
			this.rotate(in_group, in_axis, currRad);
			let ratio = Math.abs(currRad - in_start_rad) / distance;
			if (currRad === in_final_rad) {
				this.#releaseGroup(in_group);
				this.#settingVal.shuffled = true;
				// this progress function should be stopped in callback
				ratio = 1.0;
			}
			(in_callback)(ratio);
		};
		return progress;
	}
	makeRandomRotationProgress(in_callback) {
		let axis;
		let pieces;
		let maxLoopCount = 100;
		while (true) {
			if (--maxLoopCount === 0) {
				throw new Error('maxLoopCount'); 
			}
			const _piece = (this.children)[arrRand]();
			axis = (Object.values(cRubiksCube.#axes))[arrRand]();
			pieces = this.affectedPieces(_piece, axis);
			if (pieces.length < this.children.length) {
				break;
			}
		}
		const group = this.#setupGroup(pieces);
		const angle = cRubiksCube.#rotatableAngle(group, axis);
		return this.#makeRotationProgress(group, axis, 0, angle, in_callback);
	}
	registerCompleteCallback(in_callback) {
		this.#settingVal.completeCallback = in_callback;
	}
	removeCompleteCallback() {
		this.#settingVal.completeCallback = null;
	}
	static #detectMovingDirection(in_dstV3, in_srcV3, in_surfaceV3) {
		const vec3 = VEC3().subVectors(in_dstV3, in_srcV3);
		const ret = {
			errorAngle : Infinity,
			rotationAxis : null
		};
		Object.values(DIRECTION).forEach(in_direction => {
			if (in_direction.dot(in_surfaceV3) !== 0) {
				// in_direction which is not the same as in_surfaceV3 will be taken for rotation
				return;
			}
			const angle = vec3.angleTo(in_direction);
			if (angle < ret.errorAngle) {
				ret.errorAngle = angle;
				// rotationAxis is perpendicular to both in_surfaceV3 and in_direction
				ret.rotationAxis = VEC3().crossVectors(in_surfaceV3, in_direction);
			}
		});
		return ret;
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
		[cRubiksCube.#uiStates.DISABLED]: {
			enable : cRubiksCube.#uiStates.ENABLED
		},
		[cRubiksCube.#uiStates.ENABLED]: {
			disable : cRubiksCube.#uiStates.DISABLED,
			drag : cRubiksCube.#uiStates.DRAGGING
		},
		[cRubiksCube.#uiStates.DRAGGING]: {
			release : cRubiksCube.#uiStates.ENABLED,
			movable : cRubiksCube.#uiStates.MOVING
		},
		[cRubiksCube.#uiStates.MOVING]: {
			release : cRubiksCube.#uiStates.MOMENTUM
		},
		[cRubiksCube.#uiStates.MOMENTUM]: {
			stop : cRubiksCube.#uiStates.ENABLED
		}
	};
	#uiSession = {
		state : cRubiksCube.#uiStates.ENABLED,
		ctx : {}
	};
	#transition(in_action) {
		const newState = cRubiksCube.#uiTransitions[this.#uiSession.state]?.[in_action];
		if (newState) {
			this.#uiSession.state = newState;
		} else {
			throw new Error('invalid transition : ' + in_action);
		}
	}
	uiEnable() {
		if (this.#uiSession.state !== cRubiksCube.#uiStates.DISABLED) {
			console.log('state is not DISABLED');
			return;
		}
		this.#transition('enable');
	}
	uiDisable() {
		if (this.#uiSession.state !== cRubiksCube.#uiStates.ENABLED) {
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
	uiSetInitPosition(in_surfaceV3, in_posV3, in_posV2) {
		if (this.#uiSession.state !== cRubiksCube.#uiStates.ENABLED) {
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
			// the surface (one of 6 kinds of vectors) with which user interacts
			surfaceV3 : in_surfaceV3,
			// currAmount will be snapped using this function
			amountSnap : null
		};
		this.#transition('drag');
	}
	uiIsDragging() {
		return (this.#uiSession.state === cRubiksCube.#uiStates.DRAGGING);
	}
	uiIsMoving() {
		return (this.#uiSession.state === cRubiksCube.#uiStates.MOVING);
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
		const RC = cRubiksCube.uiSetDeltaPositionRC;
		if (this.#uiSession.state !== cRubiksCube.#uiStates.DRAGGING) {
			console.log('state is not DRAGGING');
			return RC.NOOP;
		}
		const ctx = this.#uiSession.ctx;
		const moving = cRubiksCube.#detectMovingDirection(in_posV3, ctx.initPosV3, ctx.surfaceV3);
		const angle22_5 = Math.PI / 8;
		if (moving.errorAngle > angle22_5) {
			return RC.NOTENOUGH;
		}
		// component for affectedPieces should be "1"
		const axis = moving.rotationAxis.clone().multiply(moving.rotationAxis);
		const pieces = this.affectedPieces(in_piece, axis);
		if (pieces.length < this.children.length) {
			this.#transition('movable');
			ctx.group = this.#setupGroup(pieces);
			// use Vector3(1, 1, 1) to extruct +1 or -1
			ctx.direction = moving.rotationAxis.dot(VEC3(1, 1, 1));
			ctx.rotationAxis = axis;
			// angle should be Math.PI or Math.PI / 2
			if (cRubiksCube.#rotatableAngle(ctx.group, ctx.rotationAxis) === Math.PI) {
				ctx.amountSnap = snapToPI;
			} else {
				ctx.amountSnap = snapTo05PI;
			}
			ctx.initDirV2 = in_posV2.clone().sub(ctx.initPosV2);
			return RC.MOVABLE;
		} else {
			return RC.UNMOVABLE;
		}
	}
	uiUpdatePosition(in_posV2) {
		if (this.#uiSession.state !== cRubiksCube.#uiStates.MOVING) {
			return;
		}
		const ctx = this.#uiSession.ctx;
		const currentDirV2 = in_posV2.clone().sub(ctx.initPosV2);
		let rad = in_posV2.distanceTo(ctx.initPosV2) * ctx.direction;
		if (ctx.amountSnap === snapToPI) {
			rad *= 2;
		}
		if (ctx.initDirV2.dot(currentDirV2) > 0) {
			// currentDirV2 & initDirV2 --> SAME direction
			rad *= +1;
		} else {
			// currentDirV2 & initDirV2 --> OPPOSITE direction
			const thresholdToStopWarp = Math.PI / 8;
			if (Math.abs(ctx.currAmount + rad) < thresholdToStopWarp) {
				rad *= -1;
			}
		}
		/*
			*** NOTE ***
			if using rotateOnAxis() several times, small errors will be expanded.
			if making group every time too, the same issue will happen.
		*/
		this.rotate(ctx.group, ctx.rotationAxis, rad);
		const overTheTop = ((ctx.amountSnap)(rad) != (ctx.amountSnap)(ctx.currAmount));
		ctx.currAmount = rad;
		// if true, caller may show some effects.
		return overTheTop;
	}
	uiRelease(in_ending_callback) {
		if (this.#uiSession.state === cRubiksCube.#uiStates.DRAGGING) {
			this.#uiInitSession();
			this.#transition('release');
			return null;
		}
		if (this.#uiSession.state !== cRubiksCube.#uiStates.MOVING) {
			return null;
		}
		this.#transition('release');
		const ctx = this.#uiSession.ctx;
		const startRad = ctx.currAmount;
		const finalRad = (ctx.amountSnap)(ctx.currAmount);
		return this.#makeRotationProgress(ctx.group, ctx.rotationAxis, startRad, finalRad, in_ratio => {
			if (in_ratio < 1) {
				return;
			}
			this.#uiInitSession();
			this.#transition('stop');
			(in_ending_callback)();
			if (!this.#settingVal.shuffled) {
				// when without shuffled, do nothing
				return;
			}
			this.#settingVal.shuffleCount++;
			if (this.#settingVal.completeCallback && this.#isComplete()) {
				(this.#settingVal.completeCallback)(this.#settingVal.shuffleCount);
			}
		});
	}
}
