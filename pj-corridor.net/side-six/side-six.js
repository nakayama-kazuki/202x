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
	makeSpeaker,
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

export class cCylinderStructure {
	static error = 0.01;
	constructor(in_rowsForCircle, in_colsForLength, in_origin, in_colsDelta, in_offset = -1) {
		this.rowsForCircle = in_rowsForCircle;
		this.colsForLength = in_colsForLength;
		this.origin = in_origin.clone();
		this.colsDelta = in_colsDelta;
		this.rowsAngle = Math.PI * 2 / in_rowsForCircle;
		this.offset = in_offset;
	}
	get rows() {
		return this.rowsForCircle;
	}
	get cols() {
		return this.colsForLength;
	}
	#locationToRow(in_row, in_col) {
		if ((this.offset >= 0) && (in_col % 2 === this.offset)) {
			return in_row + 0.5;
		}
		return in_row;
	}
	locationToPosition(in_row, in_col) {
		const row = this.#locationToRow(in_row, in_col);
		const pos = this.origin.clone();
		pos.x += this.colsDelta * in_col;
		pos.applyAxisAngle(cColony.axes.x, this.rowsAngle * row);
		return pos;
	}
	locationToQuaternion(in_row, in_col) {
		// determine rotation based on geometry and placement
		const row = this.#locationToRow(in_row, in_col);
		return new THREE.Quaternion().setFromAxisAngle(cColony.axes.x, this.rowsAngle * row);
	}
	locationToOverviewPosition(in_row, in_col) {
		const pos = this.locationToPosition(in_row, in_col);
		const x = pos.x;
		const y = 0;
		const z = Math.hypot(pos.y, pos.z) * Math.atan2(pos.z, pos.y);
		return VEC3(x, y, z);
	}
	locationToOverviewQuaternion(in_row, in_col) {
		// in_row and in_col are unused for cylinder, but may be required by other structures
		return new THREE.Quaternion();
	}
	positionToLocation(in_position) {
		const col = Math.round((in_position.x - this.origin.x) / this.colsDelta);
		for (let row = 0; row < this.rows; row++) {
			const pos = this.locationToPosition(row, col);
			if (pos.distanceTo(in_position) < cCylinderStructure.error) {
				return {row : row, col : col};
			}
		}
		console.log('positionToLocation failed : ', in_position);
		throw new Error('');
	}
}

export class cTorusStructure {
	static error = 0.01;
	static #gapRatio = 0.05;
	constructor(
		in_rowsForPoloidal,
		in_colsForToroidal,
		in_majorRadius,
		in_minorRadius,
		in_size,
		in_offset = -1,
		in_center = VEC3(0, 0, 0),
		in_poloidalRotation = 0
	) {
		this.rowsForPoloidal = in_rowsForPoloidal;
		this.colsForToroidal = in_colsForToroidal;
		this.majorRadius = in_majorRadius;
		this.minorRadius = in_minorRadius;
		this.size = in_size;
		this.rowsAngle = Math.PI * 2 / in_rowsForPoloidal;
		this.colsAngle = Math.PI * 2 / in_colsForToroidal;
		this.offset = in_offset;
		this.center = in_center.clone();
		this.poloidalRotation = in_poloidalRotation;
	}
	get rows() {
		return this.rowsForPoloidal;
	}
	get cols() {
		return this.colsForToroidal;
	}
	get gap() {
		return this.size * cTorusStructure.#gapRatio;
	}
	poloidalAngle(in_row) {
		return this.rowsAngle * in_row + this.poloidalRotation;
	}
	positionByPoloidalAngle(in_angle) {
		const pos = this.center.clone();
		pos.y += this.minorRadius * Math.sin(in_angle);
		pos.z += this.minorRadius * Math.cos(in_angle);
		return pos;
	}
	toroidalAngle(in_col) {
		return this.colsAngle * in_col;
	}
	position(in_poloidalAngle, in_toroidalAngle) {
		const radius = this.majorRadius + this.minorRadius * Math.cos(in_poloidalAngle);
		const pos = this.center.clone();
		pos.x += radius * Math.sin(in_toroidalAngle);
		pos.y += this.minorRadius * Math.sin(in_poloidalAngle);
		pos.z += radius * Math.cos(in_toroidalAngle);
		return pos;
	}
	knowledgeByPoloidalAngle(in_angle) {
		const tRadius = this.majorRadius + this.minorRadius * Math.cos(in_angle - this.rowsAngle / 2);
		const bRadius = this.majorRadius + this.minorRadius * Math.cos(in_angle + this.rowsAngle / 2);
		const tWidth = 2 * tRadius * Math.tan(this.colsAngle / 2) - this.gap;
		const bWidth = 2 * bRadius * Math.tan(this.colsAngle / 2) - this.gap;
		const height = 2 * this.minorRadius * Math.tan(this.rowsAngle / 2) - this.gap;
		return {
			tWidth : tWidth,
			bWidth : bWidth,
			height : height,
			rotation : -in_angle + Math.PI / 2
		};
	}
	locationToPoloidalAngle(in_row, in_col) {
		let row = in_row;
		if ((this.offset >= 0) && (in_col % 2 === this.offset)) {
			row += 0.5;
		}
		return this.poloidalAngle(row);
	}
	locationToPosition(in_row, in_col) {
		const poloidalAngle = this.locationToPoloidalAngle(in_row, in_col);
		const toroidalAngle = this.toroidalAngle(in_col);
		return this.position(poloidalAngle, toroidalAngle);
	}
	locationToQuaternion(in_row, in_col) {
		const toroidalAngle = this.toroidalAngle(in_col);
		return new THREE.Quaternion().setFromAxisAngle(VEC3(0, 1, 0), toroidalAngle);
	}
	positionToLocation(in_position) {
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				const pos = this.locationToPosition(row, col);
				if (pos.distanceTo(in_position) < cTorusStructure.error) {
					return {
						row : row,
						col : col
					};
				}
			}
		}
		console.log('positionToLocation failed : ', in_position);
		throw new Error('');
	}
}

export const CHAMFERED_SURFACE_IX = 0;

function regularPolygonVertices(in_n, in_edgeLength, in_rotateAngle = 0) {
	const radius = in_edgeLength / (2 * Math.sin(Math.PI / in_n));
	const unitAngle = 2 * Math.PI / in_n;
	const vertexArr = [];
	for (let i = 0; i < in_n; i++) {
		const angle = unitAngle * i + in_rotateAngle;
		vertexArr.push(new THREE.Vector2(
			radius * Math.cos(angle),
			radius * Math.sin(angle)
		));
	}
	return vertexArr;
}

function chamferedShape(in_vertexArr, in_taper = 0.05) {
	const prevArr = [];
	const nextArr = [];
	for (let i = 0; i < in_vertexArr.length; i++) {
		const prev = (i + in_vertexArr.length - 1) % in_vertexArr.length;
		const next = (i + 1) % in_vertexArr.length;
		prevArr[i] = in_vertexArr[i].clone().lerp(in_vertexArr[prev], in_taper);
		nextArr[i] = in_vertexArr[i].clone().lerp(in_vertexArr[next], in_taper);
	}
	const shape = new THREE.Shape();
	shape.moveTo(nextArr[0].x, nextArr[0].y);
	for (let i = 1; i < in_vertexArr.length; i++) {
		shape.lineTo(prevArr[i].x, prevArr[i].y);
		shape.lineTo(nextArr[i].x, nextArr[i].y);
	}
	shape.lineTo(prevArr[0].x, prevArr[0].y);
	shape.closePath();
	return shape;
}

function chamferedGeometry(in_vertexArr, in_edgeLength, in_innerRatio, in_thickness) {
	/*
		step#1

		     +y
		     |  /
		     | /
		    ###
		 ---#*#---+x
		    /##
		   / |
		  /  |
		 /
		+z = direction to extrude

		step#2

		     +y = outer surface ( as a result of rotated )
		     |
		     |  /
		     | /
		     |##
		 ---#*#---+x
		   ###
		   / |
		  /  |
		 /
		+z
	*/
	const err = 1e-6;
	const taper = 0.05;

	// 1. merged ExtrudeGeometry
	const extrudeSettings = {
		depth : in_thickness,
		bevelEnabled : true,
		bevelThickness : in_edgeLength * taper,
		bevelSize : in_edgeLength * taper,
		bevelOffset : in_edgeLength * taper * -1,
		bevelSegments : 1,
		steps : 1
	};
	const shape = chamferedShape(in_vertexArr, taper);
	const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

	// 2. transform & make two groups (surface + the other)
	const pos = geometry.attributes.position;
	const combinedArr = new Uint16Array(pos.count);
	let headIndex = 0;
	let tailIndex = combinedArr.length;
	for (let t = 0; t < pos.count / 3; t++) {
		const triMap = new Map([
			[3 * t + 0, pos.getZ(3 * t + 0)],
			[3 * t + 1, pos.getZ(3 * t + 1)],
			[3 * t + 2, pos.getZ(3 * t + 2)]
		]);
		let triInSurface = true;
		for (const [ix, z] of triMap) {
			if (z > in_thickness / 2) {
				pos.setX(ix, pos.getX(ix) * in_innerRatio);
				pos.setY(ix, pos.getY(ix) * in_innerRatio);
			}
			if (z > err * -1) {
				triInSurface = false;
			}
		}
		let index;
		if (triInSurface) {
			index = headIndex;
			headIndex += 3;
		} else {
			tailIndex -= 3;
			index = tailIndex;
		}
		Array.from(triMap.keys()).forEach((ix, delta) => combinedArr[index + delta] = ix);
	}
	geometry.setIndex(new THREE.BufferAttribute(combinedArr, 1));
	geometry.clearGroups();
	geometry.addGroup(0, headIndex, CHAMFERED_SURFACE_IX);
	geometry.addGroup(headIndex, combinedArr.length - headIndex, 1);

	// 3. reset
	pos.needsUpdate = true;
	geometry.computeVertexNormals();
	geometry.rotateX(Math.PI / 2);
	return geometry;
}

function createHexmapGeometry(in_size, in_innerRatio, in_thickness) {
	const size = in_size;
	const cornerCnt = 6;
	const edgeLength = in_size / (3 ** 0.5);
	const rotateAngle = 0;
	const vertexArr = regularPolygonVertices(cornerCnt, edgeLength, rotateAngle);
	const geometry = chamferedGeometry(vertexArr, edgeLength, in_innerRatio, in_thickness);
	geometry.userData = {
		size : size,
		cornerCnt : cornerCnt,
		edgeLength : edgeLength,
		rotateAngle : rotateAngle,
		vertexArr : vertexArr.map(v => v.clone()),
		position : geometry.attributes.position.clone(),
		innerRatio : in_innerRatio,
		thickness : in_thickness
	};
	return geometry;
}

export const allSharedHexmapFactory = factoryBuilder((in_size, in_innerRatio, in_thickness) => {
	return createHexmapGeometry(in_size, in_innerRatio, in_thickness);
});

export const angleSharedHexmapFactory = factoryBuilder((in_size, in_innerRatio, in_thickness, in_initialPoloidalAngle) => {
	const geometry = createHexmapGeometry(in_size, in_innerRatio, in_thickness);
	geometry.userData.initialPoloidalAngle = in_initialPoloidalAngle;
	return geometry;
});

function createSquareGeometry(in_size, in_innerRatio, in_thickness) {
	const size = in_size;
	const cornerCnt = 4;
	const edgeLength = in_size;
	const rotateAngle = Math.PI / 4 * -1;
	const vertexArr = regularPolygonVertices(cornerCnt, edgeLength, rotateAngle);
	const geometry = chamferedGeometry(vertexArr, edgeLength, in_innerRatio, in_thickness);
	geometry.userData = {
		size : size,
		cornerCnt : cornerCnt,
		edgeLength : edgeLength,
		rotateAngle : rotateAngle,
		vertexArr : vertexArr.map(v => v.clone()),
		position : geometry.attributes.position.clone(),
		innerRatio : in_innerRatio,
		thickness : in_thickness
	};
	return geometry;
}

export const allSharedSquareFactory = factoryBuilder((in_size, in_innerRatio, in_thickness) => {
	return createSquareGeometry(in_size, in_innerRatio, in_thickness);
});

export const angleSharedSquareFactory = factoryBuilder((in_size, in_innerRatio, in_thickness, in_initialPoloidalAngle) => {
	const geometry = createSquareGeometry(in_size, in_innerRatio, in_thickness);
	geometry.userData.initialPoloidalAngle = in_initialPoloidalAngle;
	return geometry;
});

export function updateChamferedGeometry(in_geometry, in_tWidth, in_bWidth, in_height, in_rotation) {
	const position = in_geometry.attributes.position;
	const requiredArr = ['position', 'vertexArr', 'size'];
	const init = {};
	requiredArr.forEach(in_required => {
		if (in_geometry.userData[in_required] === undefined) {
			throw new Error('not found : ' + in_required);
		}
		init[in_required] = in_geometry.userData[in_required];
	});
	let minInitY = Infinity;
	let maxInitY = -Infinity;
	for (let i = 0; i < init.vertexArr.length; i++) {
		minInitY = Math.min(minInitY, init.vertexArr[i].y);
		maxInitY = Math.max(maxInitY, init.vertexArr[i].y);
	}
	// otateX(Math.PI / 2)
	const minZ = minInitY;
	const maxZ = maxInitY;
	const tRatio = in_tWidth / init.size;
	const bRatio = in_bWidth / init.size;
	const cos = Math.cos(in_rotation);
	const sin = Math.sin(in_rotation);
	for (let i = 0; i < position.count; i++) {
		const x = init.position.getX(i);
		const y = init.position.getY(i);
		const z = init.position.getZ(i);
		const zRatio = (z - minZ) / (maxZ - minZ);
		const wRatio = bRatio + (tRatio - bRatio) * zRatio;
		const newX = x * wRatio;
		const newZ = (z / init.size) * in_height;
		const rotatedY = y * cos - newZ * sin;
		const rotatedZ = y * sin + newZ * cos;
		position.setXYZ(i, newX, rotatedY, rotatedZ);
	}
	position.needsUpdate = true;
	in_geometry.computeVertexNormals();
}

class cPieceSet extends THREE.Object3D {
	set #currPiecesCacheKey(in_key) {
		if (!this.userData.cache) {
			this.userData.cache = {};
		}
		if (!this.userData.cache[in_key]) {
			this.userData.cache[in_key] = {};
		}
		this.userData.cacheKey = in_key;
	}
	get currPiecesCache() {
		if (this.userData.cacheKey) {
			return this.userData.cache[this.userData.cacheKey];
		} else {
			throw new Error('no cacheKey');
		}
	}
	removePieces() {
		const pieces = this.children.slice();
		pieces.forEach(in_piece => {
			this.remove(in_piece);
		});
		this.userData.cacheKey = null;
	}
	activatePiecesCache(in_pieces) {
		this.removePieces();
		const uuids = [];
		in_pieces.forEach(in_piece => {
			uuids.push(in_piece.uuid);
			this.add(in_piece);
		});
		this.#currPiecesCacheKey = pseudoMessageDigest1(uuids);
	}
}

export class cColony extends cPieceSet {
	static error = 0.01;
	static axes = {
		x : VEC3(1, 0, 0),
		y : VEC3(0, 1, 0),
		z : VEC3(0, 0, 1)
	};
	setupPieces(in_pieces, in_structure) {
		this.activatePiecesCache(in_pieces);
		this.currPiecesCache.structure = in_structure;
	}
	locationToPiece(in_row, in_col) {
		const pos = this.currPiecesCache.structure.locationToPosition(in_row, in_col);
		const piece = this.children.find(in_child => XYZ.every(in_xyz => Math.abs(in_child.position[in_xyz] - pos[in_xyz]) < cColony.error));
		if (!piece) {
			console.log('locationToPiece failed : ', in_row, in_col);
			throw new Error('');
		}
		return piece;
	}
	pieceToLocation(in_piece) {
		return this.currPiecesCache.structure.positionToLocation(in_piece.position);
	}
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
	affectedRotatePieces(in_piece, in_axis) {
		if (in_axis.equals(cColony.axes.x)) {
			const col = this.pieceToLocation(in_piece).col;
			return this.children.filter(in_child => this.pieceToLocation(in_child).col === col);
		} else {
			// do not infer logical groups from physical positions when adding other axes.
			throw new Error('unsupported rotation axis');
			/*
			const pieces = [];
			const component = in_piece.position.dot(in_axis);
			this.children.forEach(in_child => {
				if (Math.abs(component - in_child.position.dot(in_axis)) < cColony.error) {
					pieces.push(in_child);
				}
			});
			return pieces;
			*/
		}
	}
	affectedSlidePieces(in_piece, in_sign) {
		const location = this.pieceToLocation(in_piece);
		const affected = [in_piece];
		for (let col = location.col + in_sign; 0 <= col && col < this.currPiecesCache.structure.cols; col += in_sign) {
			const piece = this.children.find(in_child => {
				const childLocation = this.pieceToLocation(in_child);
				return childLocation.row === location.row && childLocation.col === col;
			});
			if (!piece) {
				break;
			}
			affected.push(piece);
		}
		return affected;
	}
	slidableDistance(in_piece, in_sign) {
		const location = this.pieceToLocation(in_piece);
		const nextCol = location.col + in_sign;
		if ((nextCol < 0) || (this.currPiecesCache.structure.cols <= nextCol)) {
			return 0;
		}
		const nextPosition = this.currPiecesCache.structure.locationToPosition(location.row, nextCol);
		return nextPosition.x - in_piece.position.x;
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
			notch = this.currPiecesCache.structure.rowsAngle;
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
		const st = this.currPiecesCache.structure;
		let type, notch, last, delta;
		if (ctx.rotationAxis) {
			type = 'rotate';
			notch = st.rowsAngle;
			last = snapToNotch(ctx.currAmount, notch);
			delta = Math.round(last / st.rowsAngle);
		} else {
			type = 'slide';
			notch = Math.abs(ctx.movableRange.min + ctx.movableRange.max);
			last = snapToNotch(ctx.currAmount, notch);
			delta = Math.round(last / st.colsDelta);
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
