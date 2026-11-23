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

const AXES = {
	x : VEC3(1, 0, 0),
	y : VEC3(0, 1, 0),
	z : VEC3(0, 0, 1)
};

class cBaseStructure {
	static #error = 0.01;
	#rowsForCrossSection;
	#colsForLongitudinal;
	constructor(in_rowsForCrossSection, in_colsForLongitudinal, in_offset = -1, in_crossSectionRotation = 0) {
		if (typeof this.locationToPosition !== 'function') {
			throw new Error('locationToPosition() must be implemented by subclass');
		}
		this.rowsAngle = Math.PI * 2 / in_rowsForCrossSection;
		this.offset = in_offset;
		this.crossSectionRotation = in_crossSectionRotation;
		// number of rows arranged around a circular cross-section 
		this.#rowsForCrossSection = in_rowsForCrossSection;
		// number of columns along the shape-dependent longitudinal direction
		this.#colsForLongitudinal = in_colsForLongitudinal;
	}
	locationToSequence(in_row, in_col) {
	    return in_row * this.cols + in_col;
	}
	sequenceToLocation(in_sequence) {
	    return {
	        row : Math.floor(in_sequence / this.cols),
	        col : in_sequence % this.cols
	    };
	}
	get rows() {
		return this.#rowsForCrossSection;
	}
	get cols() {
		return this.#colsForLongitudinal;
	}
	rowAngle(in_row) {
		return this.rowsAngle * in_row + this.crossSectionRotation;
	}
	locationToRowAngle(in_row, in_col) {
		// apply a half-row offset to alternating columns
		const offset = ((this.offset >= 0) && (in_col % 2 === this.offset)) ? 0.5 : 0;
		return this.rowAngle(in_row + offset);
	}
	quaternion(in_axis, in_angle) {
		return new THREE.Quaternion().setFromAxisAngle(in_axis, in_angle);
	}
	positionToLocation(in_position, in_col) {
		// search all columns or a specified column
		const s_col = in_col < 0 ? 0 : in_col;
		const e_col = in_col < 0 ? this.cols : in_col + 1;
		for (let row = 0; row < this.rows; row++) {
			for (let col = s_col; col < e_col; col++) {
				const pos = this.locationToPosition(row, col);
				if (pos.distanceTo(in_position) < cBaseStructure.#error) {
					return {row : row, col : col};
				}
			}
		}
		console.log('positionToLocation failed : ', in_position);
		throw new Error('');
	}
}

export class cCylinderStructure extends cBaseStructure {
	#origin;
	constructor(
		in_rowsForCircle,
		in_colsForLength,
		in_origin,
		in_colsDelta,
		in_offset = -1,
		in_crossSectionRotation = 0
	) {
		super(in_rowsForCircle, in_colsForLength, in_offset, in_crossSectionRotation);
		this.#origin = in_origin.clone();
		this.colsDelta = in_colsDelta;
	}
	getDelta(in_srcPos, in_dstPos) {
		const srcYZ = new THREE.Vector2(in_srcPos.y, in_srcPos.z);
		const dstYZ = new THREE.Vector2(in_dstPos.y, in_dstPos.z);
		return {
			fixedColDelta : srcYZ.distanceTo(dstYZ),
			fixedRowDelta : Math.abs(in_dstPos.x - in_srcPos.x),
			rowDirection : srcYZ.cross(dstYZ) > 0 ? 1 : -1,
			colDirection : in_dstPos.x > in_srcPos.x ? 1 : -1
		};
	}
	locationToPosition(in_row, in_col) {
		const pos = this.#origin.clone();
		pos.x += this.colsDelta * in_col;
		pos.applyAxisAngle(AXES.x, this.locationToRowAngle(in_row, in_col));
		return pos;
	}
	locationToQuaternion(in_row, in_col) {
		// align the tile with the cylinder surface
		return this.quaternion(AXES.x, this.locationToRowAngle(in_row, in_col));
	}
	positionToLocation(in_position) {
		const col = Math.round((in_position.x - this.#origin.x) / this.colsDelta);
		return super.positionToLocation(in_position, col);
	}
	locationToOverviewPosition(in_row, in_col) {
		const pos = this.locationToPosition(in_row, in_col);
		const x = pos.x;
		const y = 0;
		const z = Math.hypot(pos.y, pos.z) * Math.atan2(pos.z, pos.y);
		return VEC3(x, y, z);
	}
}

export class cTorusStructure extends cBaseStructure {
	static #gapRatio = 0.05;
	#size;
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
		super(in_rowsForPoloidal, in_colsForToroidal, in_offset, in_poloidalRotation);
		this.majorRadius = in_majorRadius;
		this.minorRadius = in_minorRadius;
		this.#size = in_size;
		this.colsAngle = Math.PI * 2 / in_colsForToroidal;
		this.center = in_center.clone();
	}
	get gap() {
		return this.#size * cTorusStructure.#gapRatio;
	}
	getDelta(in_srcPos, in_dstPos) {
		const src = in_srcPos.clone().sub(this.center);
		const dst = in_dstPos.clone().sub(this.center);
		const srcToroidalAngle = Math.atan2(src.x, src.z);
		const dstToroidalAngle = Math.atan2(dst.x, dst.z);
		const srcPoloidalAngle = Math.atan2(src.y, Math.hypot(src.x, src.z) - this.majorRadius);
		const dstPoloidalAngle = Math.atan2(dst.y, Math.hypot(dst.x, dst.z) - this.majorRadius);
		const angleDelta = (in_a, in_b) => Math.atan2(Math.sin(in_b - in_a), Math.cos(in_b - in_a));
		const poloidalDelta = angleDelta(srcPoloidalAngle, dstPoloidalAngle);
		const toroidalDelta = angleDelta(srcToroidalAngle, dstToroidalAngle);
		return {
			fixedColDelta : Math.abs(poloidalDelta) * this.minorRadius,
			fixedRowDelta : Math.abs(toroidalDelta) * (this.majorRadius + this.minorRadius * Math.cos(srcPoloidalAngle)),
			rowDirection : Math.sign(poloidalDelta),
			colDirection : Math.sign(toroidalDelta)
		};
	}
	locationToPosition(in_row, in_col) {
		const poloidalAngle = this.locationToRowAngle(in_row, in_col);
		const toroidalAngle = this.toroidalAngle(in_col);
		return this.position(poloidalAngle, toroidalAngle);
	}
	locationToQuaternion(in_row, in_col) {
		return this.quaternion(AXES.y, this.toroidalAngle(in_col));
	}
	positionToLocation(in_position) {
		return super.positionToLocation(in_position, -1);
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
	positionByPoloidalAngle(in_angle) {
		const pos = this.center.clone();
		pos.y += this.minorRadius * Math.sin(in_angle);
		pos.z += this.minorRadius * Math.cos(in_angle);
		return pos;
	}
	poloidalTangent(in_row, in_col) {
		const angle = this.locationToRowAngle(in_row, in_col);
		const toroidalAngle = this.toroidalAngle(in_col);
		return VEC3(
			-Math.sin(angle) * Math.sin(toroidalAngle),
			Math.cos(angle),
			-Math.sin(angle) * Math.cos(toroidalAngle)
		);
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
	const next = [in_tWidth, in_bWidth, in_height, in_rotation];
	const curr = in_geometry.userData.chamferedParams;
	if (curr && next.every((in_v, in_ix) => in_v === curr[in_ix])) {
		return;
	} else {
		in_geometry.userData.chamferedParams = next;
	}
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

/*
	cColony
		|
		+- cCylinderColony
		|	|
		|	+- cCylinderColonyBoard (+ cBoardBehavior)
		|	|
		|	+- cCylinderColonyPuzzle (+ cPuzzleBehavior)
		|
		+- cTorusColony
			|
			+- cTorusColonyBoard (+ cBoardBehavior)
			|
			+- cTorusColonyPuzzle (+ cPuzzleBehavior)
*/

class cColony extends THREE.Object3D {
	static #error = 0.01;
	constructor() {
		super();
		const requiredArr = [
			'move',
			'moveTypeToCtx',
			'moveTypeToAdjustAmount',
			'moveTypeToDuration',
			'moveTypeToNotch',
			'moveTypeToResult'
		];
		requiredArr.forEach(in_method => {
			if (typeof this[in_method] !== 'function') {
				throw new Error(in_method + '() must be implemented by subclass');
			}
		});
	}
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
	setupPieces(in_pieces, in_structure) {
		this.removePieces();
		const uuids = [];
		in_pieces.forEach(in_piece => {
			uuids.push(in_piece.uuid);
			this.add(in_piece);
		});
		this.#currPiecesCacheKey = pseudoMessageDigest1(uuids);
		this.currPiecesCache.structure = in_structure;
	}
	locationToPiece(in_row, in_col) {
		const pos = this.currPiecesCache.structure.locationToPosition(in_row, in_col);
		const piece = this.children.find(in_child => XYZ.every(in_xyz => Math.abs(in_child.position[in_xyz] - pos[in_xyz]) < cColony.#error));
		if (!piece) {
			console.log('locationToPiece failed : ', in_row, in_col);
			throw new Error('');
		}
		return piece;
	}
	pieceToLocation(in_piece) {
		return this.currPiecesCache.structure.positionToLocation(in_piece.position);
	}
	setupAnimationGroup(in_pieces) {
		const group = new THREE.Object3D();
		this.add(group);
		in_pieces.forEach(in_piece => {
			group.attach(in_piece);
			in_piece.userData.tmpCache = {
				position : in_piece.position.clone(),
				rotation : in_piece.rotation.clone(),
				geometry : in_piece.geometry
			};
			in_piece.geometry = in_piece.geometry.clone();
		});
		// group position is (0, 0, 0)
		return group;
	}
	#releaseAnimationGroup(in_group) {
		const copiedPieces = [...in_group.children];
		// map original geometries to their initial locations
		const geometryMap = new Map();
		copiedPieces.forEach(in_piece => {
			const pos = in_piece.userData.tmpCache.position;
			const {row, col} = this.currPiecesCache.structure.positionToLocation(pos);
			geometryMap.set(row + ',' + col, in_piece.userData.tmpCache.geometry);
		});
		copiedPieces.forEach(in_piece => {
			/*
				*** NOTE ***
				"add" follows parent position.
				"attach" keeps world position.
				in addition, both of them internally call "remove" from other object.
			*/
			const {row, col} = this.currPiecesCache.structure.positionToLocation(in_piece.position);
			const geometry = geometryMap.get(row + ',' + col);
			in_piece.geometry.dispose();
			in_piece.geometry = geometry;
			this.attach(in_piece);
			delete in_piece.userData.tmpCache;
		});
		this.remove(in_group);
	}
	affectedFixedColPieces(in_piece) {
		const col = this.pieceToLocation(in_piece).col;
		return this.children.filter(in_child => this.pieceToLocation(in_child).col === col);
	}
	affectedFixedRowPieces(in_piece) {
		const row = this.pieceToLocation(in_piece).row;
		return this.children.filter(in_child => this.pieceToLocation(in_child).row === row);
	}
	#decideMoveType(in_fixedColDelta, in_fixedRowDelta, in_movable) {
		if (in_movable.fixedCol && in_movable.fixedRow) {
			if (in_fixedColDelta > in_fixedRowDelta) {
				return cColony.moveTypes.FIXED_COL;
			} else {
				return cColony.moveTypes.FIXED_ROW;
			}
		}
		if (in_movable.fixedCol) {
			return cColony.moveTypes.FIXED_COL;
		}
		if (in_movable.fixedRow) {
			return cColony.moveTypes.FIXED_ROW;
		}
		return null;
	}
	static moveTypes = {
		FIXED_COL : Symbol(),
		FIXED_ROW : Symbol()
	};
	makeAnimationProgress(in_group, in_moveType, in_startAmount, in_lastAmount, in_callback) {
		const amount = Math.abs(in_lastAmount - in_startAmount);
		const duration = this.moveTypeToDuration(in_moveType, amount);
		const ease = new cEase(in_startAmount, in_lastAmount, duration);
		const progress = () => {
			let ratio;
			if (amount > 0) {
				// currAmount reaches in_lastAmount when the animation completes
				const currAmount = ease.currentEasingIn();
				this.move(in_group, in_moveType, currAmount);
				ratio = Math.abs(currAmount - in_startAmount) / amount; 
			} else {
				ratio = 1.0;
			}
			if (ratio === 1.0) {
				// in this case, progress function should be stopped (in in_callback)
				this.#releaseAnimationGroup(in_group);
			}
			(in_callback)(ratio);
		};
		return progress;
	}
	makeRotateProgress(in_moveType, in_index, in_delta, in_ending_callback) {
		let group;
		switch (in_moveType) {
		case cColony.moveTypes.FIXED_COL :
			group = this.setupAnimationGroup(this.affectedFixedColPieces(this.locationToPiece(0, in_index)));
			break;
		case cColony.moveTypes.FIXED_ROW :
			group = this.setupAnimationGroup(this.affectedFixedRowPieces(this.locationToPiece(in_index, 0)));
			break;
		default :
			throw new Error('unsupported moveType');
		}
		const notch = this.moveTypeToNotch({moveType : in_moveType});
		this.uiDisable();
		return this.makeAnimationProgress(group, in_moveType, 0, notch * in_delta, in_ratio => {
			if (in_ratio < 1) {
				return;
			}
			this.uiEnable();
			(in_ending_callback)();
		});
	}
	static #uiStates  = {
		DISABLED : Symbol(),
		ENABLED : Symbol(),
		DRAGGING : Symbol(),
		MOVING : Symbol(),
		MOMENTUM : Symbol()
	};
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
			this.#releaseAnimationGroup(this.#uiSession.ctx.group);
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
			// type of movement determined by the structure and drag direction
			moveType : null,
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
	uiNotifyDeltaPosition(in_piece, in_posV3, in_posV2, in_movable) {
		const RC = cColony.uiSetDeltaPositionRC;
		if (this.#uiSession.state !== cColony.#uiStates.DRAGGING) {
			console.log('state is not DRAGGING');
			return RC.NOOP;
		}
		const ctx = this.#uiSession.ctx;
		const st = this.currPiecesCache.structure;
		const {fixedColDelta, fixedRowDelta, rowDirection, colDirection} = st.getDelta(ctx.initPosV3, in_posV3);
		const notEnough = (in_threshold => {
			return (in_a, in_b) => {
				return (in_a < in_threshold * in_b) && (in_b < in_threshold * in_a);
			};
		})(1.5);
		if (notEnough(fixedColDelta, fixedRowDelta)) {
			return RC.NOTENOUGH;
		}
		const moveType = this.#decideMoveType(fixedColDelta, fixedRowDelta, in_movable);
		if (moveType === null) {
			return RC.UNMOVABLE;
		}
		const ret = this.moveTypeToCtx(in_piece, moveType, rowDirection, colDirection);
		if (!ret.movable) {
			return RC.UNMOVABLE;
		}
		this.#transition('movable');
		ctx.initDirV2 = in_posV2.clone().sub(ctx.initPosV2);
		ctx.group = this.setupAnimationGroup(ret.pieces);
		ctx.direction = ret.direction;
		ctx.moveType = moveType;
		ctx.movableRange = ret.range;
		return RC.MOVABLE;
	}
	uiUpdatePosition(in_posV2) {
		if (this.#uiSession.state !== cColony.#uiStates.MOVING) {
			return;
		}
		const ctx = this.#uiSession.ctx;
		let amount = in_posV2.distanceTo(ctx.initPosV2) * ctx.direction;
		const reversed = ctx.initDirV2.dot(in_posV2.clone().sub(ctx.initPosV2)) <= 0;
		if (reversed) {
			const thresholdToStopWarp = Math.PI / 8;
			if (Math.abs(ctx.currAmount + amount) < thresholdToStopWarp) {
				amount *= -1;
			}
		}
		amount = this.moveTypeToAdjustAmount(ctx, amount);
		const notch = this.moveTypeToNotch(ctx);
		const prev = snapToNotch(ctx.currAmount, notch);
		const next = snapToNotch(amount, notch);
		this.move(ctx.group, ctx.moveType, amount);
		ctx.currAmount = amount;
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
		const {type, delta, last} = this.moveTypeToResult(ctx);
		const piece = ctx.group.children[0];
		return this.makeAnimationProgress(ctx.group, ctx.moveType, ctx.currAmount, last, (in_ratio) => {
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

class cCylinderColony extends cColony {
	/*
		fixedCol : movement within a logical col, rotation around the X-axis
		fixedRow : movement within a logical row, translation along the X-axis, if possible

		           -z
		            |
		            |
		            |
		            |
		     +------+------+
		 -x -+#############+- +x
		     +------+------+
		            |
		            |
		            |
		            |
		           +z
	*/
	#bobRotation = {};
	setupPieces(in_pieces, in_structure) {
		if (!this.#isCylinderView) {
			throw new Error('setupPieces requires CYLINDERVIEW');
		}
		super.setupPieces(in_pieces, in_structure);
		const cornerCnt = in_pieces[0].geometry.userData.cornerCnt;
		if (cornerCnt === 4) {
			this.#bobRotation.fixedCol = false;
			this.#bobRotation.fixedRow = false;
		} else {
			if (cornerCnt === 6) {
				this.#bobRotation.fixedCol = true;
				this.#bobRotation.fixedRow = true;
			} else {
				throw new Error('invalid cornerCnt : ' + cornerCnt);
			}
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
	moveTypeToCtx(in_piece, in_moveType, in_rowDirection, in_colDirection) {
		const ret = {movable : false, pieces : null, direction : 0, range : null};
		switch (in_moveType) {
		case cColony.moveTypes.FIXED_COL :
			ret.pieces = this.affectedFixedColPieces(in_piece);
			if (ret.pieces.length !== this.children.length) {
				ret.movable = true;
			}
			ret.direction = in_rowDirection;
			break;
		case cColony.moveTypes.FIXED_ROW :
			ret.direction = in_colDirection;
			ret.pieces = this.affectedSlidePieces(in_piece, ret.direction);
			const amount = this.slidableDistance(ret.pieces[ret.pieces.length - 1], ret.direction);
			if (amount !== 0) {
				ret.movable = true;
			}
			ret.range = {min : Math.min(0, amount), max : Math.max(0, amount)};
			break;
		default :
			throw new Error('unsupported moveType');
		}
		return ret;
	}
	moveTypeToAdjustAmount(in_ctx, in_amount) {
		if (in_ctx.moveType === cColony.moveTypes.FIXED_ROW) {
			in_amount *= 250;
			in_amount = Math.max(in_ctx.movableRange.min, Math.min(in_ctx.movableRange.max, in_amount));
		}
		return in_amount;
	}
	moveTypeToDuration(in_moveType, in_amount) {
		switch (in_moveType) {
		case cColony.moveTypes.FIXED_COL :
			return in_amount / (Math.PI / 2) * 500;
		case cColony.moveTypes.FIXED_ROW :
			return 100;
		default :
			throw new Error('unsupported moveType');
		}
	}
	moveTypeToNotch(in_ctx) {
		const st = this.currPiecesCache.structure;
		switch (in_ctx.moveType) {
		case cColony.moveTypes.FIXED_COL :
			return st.rowsAngle;
		case cColony.moveTypes.FIXED_ROW :
			if (in_ctx.movableRange) {
				return Math.abs(in_ctx.movableRange.min + in_ctx.movableRange.max);
			}
			return Math.abs(st.colsDelta);
		default :
			throw new Error('unsupported moveType');
		}
	}
	moveTypeToResult(in_ctx) {
		const st = this.currPiecesCache.structure;
		const notch = this.moveTypeToNotch(in_ctx);
		const last = snapToNotch(in_ctx.currAmount, notch);
		let type, delta;
		switch (in_ctx.moveType) {
		case cColony.moveTypes.FIXED_COL :
			type = 'fixed-col-rotate';
			delta = Math.round(last / notch);
			break;
		case cColony.moveTypes.FIXED_ROW :
			type = 'fixed-row-slide';
			delta = Math.round(last / st.colsDelta);
			break;
		default :
			throw new Error('unsupported moveType');
		}
		return {type, delta, last};
	}
	static #bobPosition(in_group, in_amount, in_period, in_fixedAxes = ['x'], in_bobMax = 1.2) {
		const scalar = (createPeriodicCos(in_period, 1, in_bobMax, true))(in_amount);
		in_group.children.forEach(in_child => {
			const basePos = in_child.userData.tmpCache.position;
			in_child.position.copy(basePos).multiplyScalar(scalar);
			in_fixedAxes.forEach(in_fixedAxis => {
				in_child.position[in_fixedAxis] = basePos[in_fixedAxis];
			});
		});
	}
	move(in_group, in_moveType, in_amount) {
		const st = this.currPiecesCache.structure;
		switch (in_moveType) {
		case cColony.moveTypes.FIXED_COL :
			in_group.rotation.x = in_amount;
			if (this.#bobRotation.fixedCol) {
				cCylinderColony.#bobPosition(in_group, in_amount, st.rowsAngle);
			}
			break;
		case cColony.moveTypes.FIXED_ROW :
			in_group.position.x = in_amount;
			if (this.#bobRotation.fixedRow) {
				cCylinderColony.#bobPosition(in_group, in_amount, Math.abs(st.colsDelta));
			}
			break;
		default :
			throw new Error('unsupported moveType');
		}
	}
	randomMoveTarget(in_moveType) {
		let pieces, amount;
		let maxLoopCount = 100;
		const st = this.currPiecesCache.structure;
		while (true) {
			if (--maxLoopCount === 0) {
				throw new Error('maxLoopCount');
			}
			const piece = this.children[arrRand]();
			switch (in_moveType) {
			case cColony.moveTypes.FIXED_COL :
				pieces = this.affectedFixedColPieces(piece);
				if (pieces.length < this.children.length) {
					const delta = Math.floor(Math.random() * (st.rows - 1)) + 1;
					amount = st.rowsAngle * delta;
					return {pieces, amount};
				}
				break;
			case cColony.moveTypes.FIXED_ROW :
				pieces = this.affectedSlidePieces(piece, +1);
				amount = this.slidableDistance(pieces[pieces.length - 1], +1);
				if (amount !== 0) {
					return {pieces, amount};
				}
				pieces = this.affectedSlidePieces(piece, -1);
				amount = this.slidableDistance(pieces[pieces.length - 1], -1);
				if (amount !== 0) {
					return {pieces, amount};
				}
				break;
			default :
				throw new Error('unsupported moveType');
			}
		}
	}
	static #views  = {
		CYLINDERVIEW : Symbol(),
		TRNSFORMING : Symbol(),
		PLANEVIEW : Symbol()
	};
	static #viewTransitions = {
		[cCylinderColony.#views.CYLINDERVIEW] : {
			toOverview : cCylinderColony.#views.TRNSFORMING
		},
		[cCylinderColony.#views.TRNSFORMING] : {
			toColonyView : cCylinderColony.#views.CYLINDERVIEW,
			toOverview : cCylinderColony.#views.PLANEVIEW
		},
		[cCylinderColony.#views.PLANEVIEW] : {
			toColonyView : cCylinderColony.#views.TRNSFORMING
		}
	};
	#state = cCylinderColony.#views.CYLINDERVIEW;
	#transition(in_action) {
		const state = cCylinderColony.#viewTransitions[this.#state][in_action];
		if (state) {
			this.#state = state;
		} else {
			throw new Error('invalid transition : ' + in_action);
		}
	}
	get isOperatable() {
		return this.#isCylinderView;
	}
	get #isCylinderView() {
		return (this.#state === cCylinderColony.#views.CYLINDERVIEW);
	}
	get #isPlaneView() {
		return (this.#state === cCylinderColony.#views.PLANEVIEW);
	}
	makeSwitchViewProgress(in_c_to_o, in_duration, in_ending_callback) {
		const init = {
			amount : 0,
			position : new Map(),
			quaternion : new Map()
		};
		const last = {
			amount : 1,
			position : new Map(),
			quaternion : new Map()
		};
		this.children.forEach(in_child => {
			init.position.set(in_child, in_child.position.clone());
			init.quaternion.set(in_child, in_child.quaternion.clone());
		});
		let endingProcess;
		if (in_c_to_o) {
			if (this.#isCylinderView) {
				this.uiDisable();
				this.#transition('toOverview');
				const st = this.currPiecesCache.structure;
				this.children.forEach(in_child => {
					const {row, col} = this.pieceToLocation(in_child);
					last.position.set(in_child, st.locationToOverviewPosition(row, col));
					last.quaternion.set(in_child, new THREE.Quaternion());
				});
				endingProcess = () => {
					this.cache = init;
					this.#transition('toOverview');
				}
			} else {
				// do nothing
				return;
			}
		} else {
			if (this.#isPlaneView) {
				this.#transition('toColonyView');
				this.children.forEach(in_child => {
					last.position.set(in_child, this.cache.position.get(in_child));
					last.quaternion.set(in_child, this.cache.quaternion.get(in_child));
				});
				endingProcess = () => {
					delete this.cache;
					this.uiEnable();
					this.#transition('toColonyView');
				};
			} else {
				// do nothing
				return;
			}
		}
		const ease = new cEase(init.amount, last.amount, in_duration);
		const progress = () => {
			const amount = ease.currentEasingOut();
			this.children.forEach(in_child => {
				const p0 = init.position.get(in_child);
				const q0 = init.quaternion.get(in_child);
				const p1 = last.position.get(in_child);
				const q1 = last.quaternion.get(in_child);
				in_child.position.copy(p0).lerp(p1, amount);
				in_child.quaternion.copy(q0).slerp(q1, amount);
				in_child.updateMatrixWorld(true);
			});
			if (amount === last.amount) {
				(endingProcess)();
				(in_ending_callback)();
			}
		}
		return progress;
	}
}

class cTorusColony extends cColony {
	/*
		fixedCol : movement within a logical col, poloidal rotation around the tube centerline
		fixedRow : movement within a logical row, rotation around the Y-axis

		           -z
		            |
		        +---+---+
		        |#######|
		        |#+-+-+#|
		        |#| | |#|
		 -x ----+#+-+-+#+---- +x
		        |#| | |#|
		        |#+-+-+#|
		        |#######|
		        +---+---+
		            |
		           +z
	*/
	#bobRotation = {};
	setupPieces(in_pieces, in_structure) {
		if (!this.#isTorusView) {
			throw new Error('setupPieces requires TORUSVIEW');
		}
		super.setupPieces(in_pieces, in_structure);
		const cornerCnt = in_pieces[0].geometry.userData.cornerCnt;
		if (cornerCnt === 4) {
			this.#bobRotation.fixedCol = false;
			this.#bobRotation.fixedRow = true;
		} else {
			if (cornerCnt === 6) {
				this.#bobRotation.fixedCol = true;
				this.#bobRotation.fixedRow = true;
			} else {
				throw new Error('invalid cornerCnt : ' + cornerCnt);
			}
		}
	}
	moveTypeToCtx(in_piece, in_moveType, in_rowDirection, in_colDirection) {
		const ret = {movable : false, pieces : null, direction : 0, range : null};
		switch (in_moveType) {
		case cColony.moveTypes.FIXED_COL :
			ret.pieces = this.affectedFixedColPieces(in_piece);
			if (ret.pieces.length !== this.children.length) {
				ret.movable = true;
			}
			ret.direction = in_rowDirection;
			break;
		case cColony.moveTypes.FIXED_ROW :
			ret.pieces = this.affectedFixedRowPieces(in_piece);
			if (ret.pieces.length !== this.children.length) {
				ret.movable = true;
			}
			ret.direction = in_colDirection;
			break;
		default :
			throw new Error('unsupported moveType');
		}
		return ret;
	}
	moveTypeToAdjustAmount(in_ctx, in_amount) {
		return in_amount;
	}
	moveTypeToDuration(in_moveType, in_amount) {
		switch (in_moveType) {
		case cColony.moveTypes.FIXED_COL :
		case cColony.moveTypes.FIXED_ROW :
			return in_amount / (Math.PI / 2) * 500;
		default :
			throw new Error('unsupported moveType');
		}
	}
	moveTypeToNotch(in_ctx) {
		const st = this.currPiecesCache.structure;
		switch (in_ctx.moveType) {
		case cColony.moveTypes.FIXED_COL :
			return st.rowsAngle;
		case cColony.moveTypes.FIXED_ROW :
			return st.colsAngle;
		default :
			throw new Error('unsupported moveType');
		}
	}
	moveTypeToResult(in_ctx) {
		const notch = this.moveTypeToNotch(in_ctx);
		const last = snapToNotch(in_ctx.currAmount, notch);
		let type, delta;
		switch (in_ctx.moveType) {
		case cColony.moveTypes.FIXED_COL :
			type = 'fixed-col-rotate';
			delta = Math.round(last / notch);
			break;
		case cColony.moveTypes.FIXED_ROW :
			type = 'fixed-row-rotate';
			delta = Math.round(last / notch);
			break;
		default :
			throw new Error('unsupported moveType');
		}
		return {type, delta, last};
	}
	#movePoloidal(in_group, in_amount) {
		const st = this.currPiecesCache.structure;
		let scalar = 1;
		if (this.#bobRotation.fixedCol) {
			const max = 1.2;
			scalar = (createPeriodicCos(st.rowsAngle, 1, max, true))(in_amount);
		}
		in_group.children.forEach(in_piece => {
			const basePos = in_piece.userData.tmpCache.position;
			const {row, col} = st.positionToLocation(basePos);
			const angle = st.locationToRowAngle(row, col) + in_amount;
			const knowledge = st.knowledgeByPoloidalAngle(angle);
			updateChamferedGeometry(
				in_piece.geometry,
				knowledge.tWidth,
				knowledge.bWidth,
				knowledge.height,
				knowledge.rotation
			);
			//const pos = st.position(angle, st.toroidalAngle(col));
			//const tubeCenter = st.position(0, st.toroidalAngle(col));
			const toroidalAngle = st.toroidalAngle(col);
			const pos = st.position(angle, toroidalAngle);
			const tubeCenter = st.center.clone().add(VEC3(
				st.majorRadius * Math.sin(toroidalAngle),
				0,
				st.majorRadius * Math.cos(toroidalAngle)
			));
			const lifted = tubeCenter.add(pos.clone().sub(tubeCenter).multiplyScalar(scalar));
			in_piece.position.copy(lifted);
		});
	}
	#moveToroidal(in_group, in_amount) {
		in_group.rotation.y = in_amount;
		if (!this.#bobRotation.fixedRow) {
			return;
		}
		const st = this.currPiecesCache.structure;
		const scalar = createPeriodicCos(st.colsAngle, 0, 1, true)(in_amount);
		in_group.children.forEach(in_piece => {
			const basePos = in_piece.userData.tmpCache.position;
			const {row, col} = st.positionToLocation(basePos);
			const angle = st.locationToRowAngle(row, col);
			const toroidalAngle = st.toroidalAngle(col);
			const tubeCenter = st.center.clone().add(VEC3(
				st.majorRadius * Math.sin(toroidalAngle),
				0,
				st.majorRadius * Math.cos(toroidalAngle)
			));
			const bob = 1 + 0.2 * scalar;
			in_piece.position.copy(tubeCenter).add(
				basePos.clone().sub(tubeCenter).multiplyScalar(bob)
			);
			const radius = st.majorRadius + st.minorRadius * Math.cos(angle);
			const outerRadius = st.majorRadius + st.minorRadius;
			const minRatio = radius / outerRadius;
			const shrinkWeight = 0.5;
			const scale = 1 - (1 - minRatio) * scalar * shrinkWeight;
			const geometry = in_piece.geometry;
			const original = in_piece.userData.tmpCache.geometry.attributes.position;
			const current = geometry.attributes.position;
			for (let i = 0; i < current.count; i++) {
				current.setXYZ(
					i,
					original.getX(i) * scale,
					original.getY(i),
					original.getZ(i)
				);
			}
			current.needsUpdate = true;
			geometry.computeVertexNormals();
		});
	}
	move(in_group, in_moveType, in_amount) {
		switch (in_moveType) {
		case cColony.moveTypes.FIXED_COL :
			this.#movePoloidal(in_group, in_amount);
			break;
		case cColony.moveTypes.FIXED_ROW :
			this.#moveToroidal(in_group, in_amount);
			break;
		default :
			throw new Error('unsupported moveType');
		}
	}
	randomMoveTarget(in_moveType) {
		let pieces, amount;
		let maxLoopCount = 100;
		const st = this.currPiecesCache.structure;
		while (true) {
			if (--maxLoopCount === 0) {
				throw new Error('maxLoopCount');
			}
			const piece = this.children[arrRand]();
			switch (in_moveType) {
			case cColony.moveTypes.FIXED_COL :
				pieces = this.affectedFixedColPieces(piece);
				if (pieces.length < this.children.length) {
					const delta = Math.floor(Math.random() * (st.rows - 1)) + 1;
					amount = st.rowsAngle * delta;
					return {pieces, amount};
				}
				break;
			case cColony.moveTypes.FIXED_ROW :
				pieces = this.affectedFixedRowPieces(piece);
				if (pieces.length < this.children.length) {
					const delta = Math.floor(Math.random() * (st.cols - 1)) + 1;
					amount = st.colsAngle * delta;
					return {pieces, amount};
				}
				break;
			default :
				throw new Error('unsupported moveType');
			}
		}
	}
	static #views = {
		TORUSVIEW : Symbol(),
		T_TO_C : Symbol(),
		C_TO_T : Symbol(),
		CYLINDERVIEW : Symbol(),
		C_TO_P : Symbol(),
		P_TO_C : Symbol(),
		PLANEVIEW : Symbol()
	};
	static #viewTransitions = {
		[cTorusColony.#views.TORUSVIEW] : {
			toPlaneView : cTorusColony.#views.T_TO_C
		},
		[cTorusColony.#views.T_TO_C] : {
			toPlaneView : cTorusColony.#views.CYLINDERVIEW
		},
		[cTorusColony.#views.C_TO_T] : {
			toTorusView : cTorusColony.#views.TORUSVIEW
		},
		[cTorusColony.#views.CYLINDERVIEW] : {
			toPlaneView : cTorusColony.#views.C_TO_P,
			toTorusView : cTorusColony.#views.C_TO_T
		},
		[cTorusColony.#views.C_TO_P] : {
			toPlaneView : cTorusColony.#views.PLANEVIEW
		},
		[cTorusColony.#views.P_TO_C] : {
			toTorusView : cTorusColony.#views.CYLINDERVIEW
		},
		[cTorusColony.#views.PLANEVIEW] : {
			toTorusView : cTorusColony.#views.P_TO_C
		}
	};
	#state = cTorusColony.#views.TORUSVIEW;
	#transition(in_action) {
		const state = cTorusColony.#viewTransitions[this.#state][in_action];
		if (state) {
			this.#state = state;
		} else {
			throw new Error('invalid transition : ' + in_action);
		}
	}
	get isOperatable() {
		return this.#isTorusView;
	}
	get #isTorusView() {
		return (this.#state === cTorusColony.#views.TORUSVIEW);
	}
	get #isPlaneView() {
		return (this.#state === cTorusColony.#views.PLANEVIEW);
	}
	#createCylinderPieces() {
		const torus = this.currPiecesCache.structure;
		const rows = torus.rows;
		const cols = torus.cols;
		const radius = torus.minorRadius;
		const conf = {
			mWeight : 0.1,
			tWeight : 0.5
		};
		const circumference = 2 * Math.PI * radius;
		const marginRow = circumference / rows * conf.mWeight;
		const unitSize = circumference / rows - marginRow;
		const unitThick = unitSize * conf.tWeight;
		const source = this.locationToPiece(0, 0);
		const isHex = source.geometry.userData.cornerCnt === 6;
		const marginCol = isHex ? hexColMargin(unitSize / Math.sqrt(3), marginRow) : marginRow;
		const colsDelta = unitSize + marginCol;
		const cylinder = new cCylinderStructure(
			rows,
			cols,
			VEC3(colsDelta * (cols - 1) / 2, radius, 0),
			colsDelta * -1,
			torus.offset,
			torus.crossSectionRotation - Math.PI / 2
		);
		const geometryFactory = isHex ? allSharedHexmapFactory : allSharedSquareFactory;
		const geometry = geometryFactory.create(unitSize, (radius - unitThick) / radius, unitThick);
		const pieces = [];
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < cols; col++) {
				const original = this.locationToPiece(row, col);
				const piece = new THREE.Mesh(geometry, original.material);
				piece.position.copy(cylinder.locationToPosition(row, col));
				piece.quaternion.copy(cylinder.locationToQuaternion(row, col));
				piece.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
				pieces.push(piece);
			}
		}
		return {structure : cylinder, pieces : pieces};
	}
	#setupCylinderMorph() {
		this.cylinder = this.#createCylinderPieces();
		this.restore = new Map();
		this.children.forEach(in_piece => {
			const {row, col} = this.pieceToLocation(in_piece);
			/*
				Tactical rotations change the mapping between pieces and locations,
				so use the current location instead of the children's array order.

				x : const targetPiece = this.cylinder.pieces[index of this.children];
				o : const targetPiece = this.cylinder.pieces[sequence];
            */
			const sequence = this.cylinder.structure.locationToSequence(row, col);
			const targetPiece = this.cylinder.pieces[sequence];
			const original = in_piece.geometry;
			const geometry = original.clone();
			const source = geometry.attributes.position;
			const target = targetPiece.geometry.attributes.position.clone();
			for (let i = 0; i < source.count; i++) {
				const v = VEC3().fromBufferAttribute(source, i);
				v.applyQuaternion(in_piece.quaternion).add(in_piece.position);
				source.setXYZ(i, v.x, v.y, v.z);
				v.fromBufferAttribute(target, i);
				v.applyQuaternion(targetPiece.quaternion).add(targetPiece.position);
				target.setXYZ(i, v.x, v.y, v.z);
			}
			source.needsUpdate = true;
			target.needsUpdate = true;
			geometry.morphAttributes.position = [target];
			geometry.morphTargetsRelative = false;
			this.restore.set(in_piece, {
				geometry : original,
				position : in_piece.position.clone(),
				quaternion : in_piece.quaternion.clone(),
				targetPiece : targetPiece
			});
			in_piece.geometry = geometry;
			in_piece.position.set(0, 0, 0);
			in_piece.quaternion.identity();
			in_piece.updateMorphTargets();
			in_piece.morphTargetInfluences[0] = 0;
		});
	}
	#makeTorusProgress(in_toOverview, in_duration, in_ending_callback) {
		const action = in_toOverview ? 'toPlaneView' : 'toTorusView';
		if (in_toOverview) {
			this.#setupCylinderMorph();
			this.uiDisable();
		} else {
			this.children.forEach(in_piece => {
				const data = this.restore.get(in_piece);
				in_piece.geometry = data.morphGeometry;
				in_piece.position.set(0, 0, 0);
				in_piece.quaternion.identity();
				in_piece.updateMorphTargets();
				in_piece.morphTargetInfluences[0] = 1;
			});
		}
		this.#transition(action);
		const ease = new cEase(0, 1, in_duration);
		let completed = false;
		return () => {
			if (completed) {
				return;
			}
			const amount = ease.currentEasingOut();
			const ratio = in_toOverview ? amount : 1 - amount;
			this.children.forEach(in_piece => {
				in_piece.morphTargetInfluences[0] = ratio;
			});
			if (amount === 1) {
				completed = true;
				this.#transition(action);
				if (in_toOverview) {
					this.children.forEach(in_piece => {
						const data = this.restore.get(in_piece);
						const target = data.targetPiece;
						data.morphGeometry = in_piece.geometry;
						in_piece.geometry = target.geometry;
						in_piece.position.copy(target.position);
						in_piece.quaternion.copy(target.quaternion);
						in_piece.updateMatrixWorld(true);
					});
				} else {
					this.children.forEach(in_piece => {
						const data = this.restore.get(in_piece);
						in_piece.geometry.dispose();
						in_piece.geometry = data.geometry;
						in_piece.position.copy(data.position);
						in_piece.quaternion.copy(data.quaternion);
						in_piece.updateMatrixWorld(true);
					});
					delete this.restore;
					delete this.cylinder;
					this.uiEnable();
				}
				(in_ending_callback)();
			}
		};
	}
	#makePlaneProgress(in_toOverview, in_duration, in_ending_callback) {
		const action = in_toOverview ? 'toPlaneView' : 'toTorusView';
		const init = {
			amount : 0,
			position : new Map(),
			quaternion : new Map()
		};
		const last = {
			amount : 1,
			position : new Map(),
			quaternion : new Map()
		};
		this.children.forEach(in_child => {
			init.position.set(in_child, in_child.position.clone());
			init.quaternion.set(in_child, in_child.quaternion.clone());
		});
		let endingProcess;
		if (in_toOverview) {
			this.#transition(action);
			const st = this.cylinder.structure;
			this.children.forEach(in_child => {
			    const {row, col} = st.positionToLocation(in_child.position);
			    last.position.set(in_child, st.locationToOverviewPosition(row, col));
			    last.quaternion.set(in_child, new THREE.Quaternion().setFromAxisAngle(AXES.y, Math.PI));
			});
			endingProcess = () => {
				this.cache = init;
				this.#transition(action);
			};
		} else {
			this.#transition(action);
			this.children.forEach(in_child => {
				last.position.set(in_child, this.cache.position.get(in_child));
				last.quaternion.set(in_child, this.cache.quaternion.get(in_child));
			});
			endingProcess = () => {
				delete this.cache;
				this.#transition(action);
			};
		}
		const ease = new cEase(init.amount, last.amount, in_duration);
		let completed = false;
		return () => {
			if (completed) {
				return;
			}
			const amount = ease.currentEasingOut();
			this.children.forEach(in_child => {
				const p0 = init.position.get(in_child);
				const q0 = init.quaternion.get(in_child);
				const p1 = last.position.get(in_child);
				const q1 = last.quaternion.get(in_child);
				in_child.position.copy(p0).lerp(p1, amount);
				in_child.quaternion.copy(q0).slerp(q1, amount);
				in_child.updateMatrixWorld(true);
			});
			if (amount === last.amount) {
				completed = true;
				(endingProcess)();
				(in_ending_callback)();
			}
		};
	}
	makeSwitchViewProgress(in_toOverview, in_duration, in_ending_callback) {
		let func1st, func2nd;
		if (in_toOverview) {
			if (this.#isTorusView) {
				func1st = this.#makeTorusProgress;
				func2nd = this.#makePlaneProgress;
			} else {
				return;
			}
		} else {
			if (this.#isPlaneView) {
				func1st = this.#makePlaneProgress;
				func2nd = this.#makeTorusProgress;
			} else {
				return;
			}
		}
		let transforming = true;
		let progress = func1st.call(this, in_toOverview, in_duration, () => {
			progress = func2nd.call(this, in_toOverview, in_duration, () => transforming = false);
		});
		return () => {
			if (transforming) {
				(progress)();
			} else {
				(in_ending_callback)();
			}
		};
	}
}

class cBoardBehavior {
	#colony;
	#pieceToColor;
	constructor(in_colony, in_pieceToColor) {
		this.#colony = in_colony;
		this.#pieceToColor = in_pieceToColor;
	}
	getColorTable() {
		const table = [];
		const st = this.#colony.currPiecesCache.structure;
		for (let row = 0; row < st.rows; row++) {
			table[row] = [];
			for (let col = 0; col < st.cols; col++) {
				const piece = this.#colony.locationToPiece(row, col);
				table[row].push(this.#pieceToColor(piece));
			}
		}
		return table;
	}
	changedPieces(in_table) {
		const changedArr = [];
		for (let row = 0; row < in_table.length; row++) {
			for (let col = 0; col < in_table[row].length; col++) {
				const piece = this.#colony.locationToPiece(row, col);
				const currColor = this.#pieceToColor(piece);
				const nextColor = in_table[row][col];
				if (currColor !== nextColor) {
					changedArr.push({
						piece : piece,
						curr : currColor,
						next : nextColor
					});
				}
			}
		}
		return changedArr;
	}
}

class cPuzzleBehavior {
	#colony;
	#pieceToColor;
	constructor(in_colony, in_pieceToColor) {
		this.#colony = in_colony;
		this.#pieceToColor = in_pieceToColor;
	}
	isComplete() {
		const evaluators = [
			in_piece => this.#colony.pieceToLocation(in_piece).row,
			in_piece => this.#colony.pieceToLocation(in_piece).col
		];
		const results = [];
		evaluators.forEach(in_evaluator => {
			const arr = [...new Set(this.#colony.children.map(in_evaluator))].sort((a, b) => a - b);
			// for all variations
			results.push(arr.every(in_e => {
				let firstColor;
				// for all pieces
				return this.#colony.children.every(in_child => {
					const currentColor = this.#pieceToColor(in_child);
					if (in_e === in_evaluator(in_child)) { 
						if (typeof firstColor === 'undefined') {
							firstColor = currentColor;
						} else {
							if (firstColor === currentColor) {
								return true;
							} else {
								return false;
							}
						}
					}
					return true;
				});
			}));
		});
		return results.some(in_result => in_result);
	}
	initialize() {
		const cache = this.#colony.currPiecesCache;
		if (!cache.initialized) {
			cache.completeCallback = null;
			cache.operationCount = 0;
			cache.shuffled = false;
			cache.lastRandomMoveType = null;
			cache.initialized = true;
		}
	}
	registerCompleteCallback(in_callback) {
		this.#colony.currPiecesCache.completeCallback = in_callback;
	}
	removeCompleteCallback() {
		this.#colony.currPiecesCache.completeCallback = null;
	}
	getScore() {
		const max = 100;
		return Math.max(Math.ceil((max - this.#colony.currPiecesCache.operationCount) / 10) * 10, 0);
	}
	onRelease(in_ending_callback, in_changed) {
		const cache = this.#colony.currPiecesCache;
		(in_ending_callback)(in_changed);
		if (cache.shuffled) {
			cache.operationCount++;
			if (cache.completeCallback && this.isComplete()) {
				(cache.completeCallback)(cache.operationCount);
			}
		}
	}
	makeRandomAnimationProgress(in_callback) {
		const cache = this.#colony.currPiecesCache;
		let moveType;
		if (cache.lastRandomMoveType === cColony.moveTypes.FIXED_COL) {
			moveType = cColony.moveTypes.FIXED_ROW;
		} else {
			moveType = cColony.moveTypes.FIXED_COL;
		}
		const {pieces, amount} = this.#colony.randomMoveTarget(moveType);
		const group = this.#colony.setupAnimationGroup(pieces);
		cache.lastRandomMoveType = moveType;
		cache.shuffled = true;
		return this.#colony.makeAnimationProgress(group, moveType, 0, amount, in_callback);
	}
}

function delegate(in_self, in_class, in_pieceToColor) {
	const delegateObject = new in_class(in_self, in_pieceToColor);
	const propArr = Object.getOwnPropertyNames(in_class.prototype);
	const delegateArr = propArr.filter(in_name => {
		if (in_name === 'constructor') {
			return false;
		} else {
			return (typeof in_class.prototype[in_name] === 'function');
		}
	});
	delegateArr.forEach(in_method => {
		if (in_method in in_self) {
			throw new Error('delegate method collision : ' + in_method);
		}
		in_self[in_method] = (...in_args) => delegateObject[in_method](...in_args);
	});
}

export class cCylinderColonyBoard extends cCylinderColony {
	constructor(in_pieceToColor) {
		super();
		delegate(this, cBoardBehavior, in_pieceToColor);
	}
	slidableDistance(in_piece, in_sign) {
		// can not slide in cCylinderColonyBoard
		return 0;
	}
}

export class cCylinderColonyPuzzle extends cCylinderColony {
	constructor(in_pieceToColor) {
		super();
		delegate(this, cPuzzleBehavior, in_pieceToColor);
	}
	setupPieces(in_pieces, in_structure) {
		super.setupPieces(in_pieces, in_structure);
		this.initialize();
	}
	uiRelease(in_ending_callback) {
		return super.uiRelease(in_changed => this.onRelease(in_ending_callback, in_changed));
	}
}

export class cTorusColonyBoard extends cTorusColony {
	constructor(in_pieceToColor) {
		super();
		delegate(this, cBoardBehavior, in_pieceToColor);
	}
}

export class cTorusColonyPuzzle extends cTorusColony {
	constructor(in_pieceToColor) {
		super();
		delegate(this, cPuzzleBehavior, in_pieceToColor);
	}
	setupPieces(in_pieces, in_structure) {
		super.setupPieces(in_pieces, in_structure);
		this.initialize();
	}
	uiRelease(in_ending_callback) {
		return super.uiRelease(in_changed => this.onRelease(in_ending_callback, in_changed));
	}
}

export function hexColMargin(in_edgeLength, in_rowMargin) {
	return 2 * in_rowMargin / Math.sqrt(3) - (3 - Math.sqrt(3)) / 4 * in_edgeLength;
}
