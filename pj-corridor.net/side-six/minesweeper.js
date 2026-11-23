class cMinesweeperModel {
	static #rotateArray(in_array, in_shiftCnt, in_shiftRight = true) {
		const len = in_array.length;
		let shiftCnt = ((in_shiftCnt % len) + len) % len;
		if (in_shiftRight) {
			// reverse
			shiftCnt = (len - shiftCnt) % len;
		}
		return in_array.slice(shiftCnt).concat(in_array.slice(0, shiftCnt));
	}
	static #dirStyle = {
		square : {
			onehand : {
				regular : [
					[-1, -1],
					[-1,  0],
					[-1, +1],
					[ 0, -1],
					[ 0, +1],
					[+1, -1],
					[+1,  0],
					[+1, +1]
				],
				offset : [
					[-1, -1],
					[-1,  0],
					[-1, +1],
					[ 0, -1],
					[ 0, +1],
					[+1, -1],
					[+1,  0],
					[+1, +1]
				]
			},
			pair : new Map([
				[  0, [1, 6]],
				[ 45, [2, 5]],
				[ 90, [3, 4]],
				[135, [0, 7]]
			])
		},
		hexPointyTopped : {
			onehand : {
				/*
					@@
					@+@
					@@
				*/
				regular : [
					[-1, -1],
					[-1,  0],
					[ 0, +1],
					[+1,  0],
					[+1, -1],
					[ 0, -1]
				],
				/*
					 @@
					@+@
					 @@
				*/
				offset : [
					[-1,  0],
					[-1, +1],
					[ 0, +1],
					[+1, +1],
					[+1,  0],
					[ 0, -1]
				]
			},
			pair : new Map([
				[ 30, [1, 4]],
				[ 90, [2, 5]],
				[150, [0, 3]]
			])
		},
		hexFlatTopped : {
			onehand : {
				/*
					@@@
					@+@
					 @
				*/
				regular : [
					[-1, -1],
					[-1,  0],
					[-1, +1],
					[ 0, +1],
					[+1,  0],
					[ 0, -1]
				],
				/*
					 @
					@+@
					@@@
				*/
				offset : [
					[ 0, -1],
					[-1,  0],
					[ 0, +1],
					[+1, +1],
					[+1,  0],
					[+1, -1]
				]
			},
			pair : new Map([
				[  0, [1, 4]],
				[ 60, [2, 5]],
				[120, [0, 3]]
			])
		}
	};
	#itemArr = [];
	#conf = null;
	get #gameIsOver() {
		return this.#itemArr.filter(in_item => in_item.opened && in_item.isBomb).length > 0;
	}
	constructor(in_sizeRow, in_sizeCol, in_bomb, in_options = {}) {
		const options = {
			dmz : 0,
			edgeRow : true,
			edgeCol : true,
			format : 'square',
			offset : 1
		};
		Object.keys(options).forEach(in_prop => {
			if (in_options.hasOwnProperty(in_prop)) {
				options[in_prop] = in_options[in_prop];
			}
		});
		if (cMinesweeperModel.#dirStyle.hasOwnProperty(options.format)) {
			if (!options.edgeRow && (in_sizeRow % 2 === 1) && (options.format === 'hexPointyTopped')) {
				throw new Error('invalid rows (' + in_sizeRow + ') for row-loop of ' + options.format);
			}
			if (!options.edgeCol && (in_sizeCol % 2 === 1) && (options.format === 'hexFlatTopped')) {
				throw new Error('invalid cols (' + in_sizeCol + ') for col-loop of ' + options.format);
			}
		} else {
			throw new Error('invalid input');
		}
		const dirStyle = cMinesweeperModel.#dirStyle[options.format];
		this.#conf = {
			row : {
				size : in_sizeRow,
				edge : options.edgeRow
			},
			col : {
				size : in_sizeCol,
				edge : options.edgeCol
			},
			bomb : {
				count : in_bomb,
				mapped : false
			},
			dirStyle : dirStyle,
			// square can accommodate any offset
			offset : (options.offset % 2),
			rotatable : {
				fixedCol : !options.edgeRow && dirStyle.pair.has(0),
				fixedRow : !options.edgeCol && dirStyle.pair.has(90)
			}
		};
		this.#initItemArr();
		if (options.dmz > 0) {
			// DMZ means an already opened area which hides the hint (number of bombs) around it
			for (let ix = 0; ix < options.dmz; ix++) {
				this.#itemArr[ix].opened = true;
				this.#itemArr[ix].hidden = true;
			}
			this.#itemArr.sort(() => Math.random() - 0.5);
		}
	}
	#initItemArr() {
		const len = this.#conf.row.size * this.#conf.col.size;
		for (let ix = 0; ix < len; ix++) {
			this.#itemArr[ix] = {
				opened : false,
				isBomb : false,
				hidden : false,
				riskCnt : -1
			};
		}
	}
	#updateRiskCnt() {
		for (let ix = 0; ix < this.#itemArr.length; ix++) {
			const ixArr = this.#aroundIndexes(ix);
			this.#itemArr[ix].riskCnt = ixArr.filter(in_ix => this.#itemArr[in_ix].isBomb).length;
		}
	}
	#indexToPos(in_ix) {
		return {
			row : Math.floor(in_ix / this.#conf.col.size),
			col : in_ix % this.#conf.col.size
		};
	}
	#posToIndex(in_row, in_col) {
		return in_row * this.#conf.col.size + in_col;
	}
	#setItemByIndex(in_ix, in_item) {
		this.#itemArr[in_ix] = in_item;
	}
	#setItemByPos(in_row, in_col, in_item) {
		this.#setItemByIndex(this.#posToIndex(in_row, in_col), in_item);
	}
	#getItemByIndex(in_ix) {
		return this.#itemArr[in_ix];
	}
	#getItemByPos(in_row, in_col) {
		return this.#getItemByIndex(this.#posToIndex(in_row, in_col));
	}
	#getDirections(in_row, in_col) {
		const dirStyle = this.#conf.dirStyle;
		let useOffset = false;
		if (dirStyle.pair.get(0)) {
			// square or hexFlatTopped
			useOffset = (in_col % 2 === this.#conf.offset);
		} else {
			// hexPointyTopped
			useOffset = (in_row % 2 === this.#conf.offset);
		}
		if (useOffset) {
			return dirStyle.onehand.offset;
		} else {
			return dirStyle.onehand.regular;
		}
	}
	#aroundIndexes(in_ix) {
		const pos = this.#indexToPos(in_ix);
		return this.aroundPositions(pos.row, pos.col).map(([in_r, in_c]) => this.#posToIndex(in_r, in_c));
	}
	aroundPositions(in_row, in_col) {
		const directions = this.#getDirections(in_row, in_col);
		const aroundPos = [];
		const sizeRow = this.#conf.row.size;
		const sizeCol = this.#conf.col.size;
		directions.forEach(([in_dr, in_dc]) => {
			let row = in_row + in_dr;
			let col = in_col + in_dc;
			if ((row < 0) || (sizeRow -1 < row)) {
				if (this.#conf.row.edge) {
					return;
				} else {
					row = (sizeRow + row) % sizeRow;
				}
			}
			if ((col < 0) || (sizeCol -1 < col)) {
				if (this.#conf.col.edge) {
					return;
				} else {
					col = (sizeCol + col) % sizeCol;
				}
			}
			aroundPos.push([row, col]);
		});
		return aroundPos;
	}
	#rotateItems(in_indexes, in_rightShiftCnt) {
		const initialItems = in_indexes.map(in_ix => this.#getItemByIndex(in_ix));
		const rotatedItems = cMinesweeperModel.#rotateArray(initialItems, in_rightShiftCnt);
		rotatedItems.forEach((in_item, in_order) => this.#setItemByIndex(in_indexes[in_order], in_item));
	}
	#rotateSameRowItems(in_fixedRow, in_deltaCol) {
		if (!this.#conf.rotatable.fixedRow) {
			return false;
		}
		const indexes = [];
		for (let col = 0; col < this.#conf.col.size; col++) {
			indexes.push(this.#posToIndex(in_fixedRow, col));
		}
		this.#rotateItems(indexes, in_deltaCol);
		this.#updateRiskCnt();
		return true;
	}
	#rotateSameColItems(in_fixedCol, in_deltaRow) {
		if (!this.#conf.rotatable.fixedCol) {
			return false;
		}
		const indexes = [];
		for (let row = 0; row < this.#conf.row.size; row++) {
			indexes.push(this.#posToIndex(row, in_fixedCol));
		}
		this.#rotateItems(indexes, in_deltaRow);
		this.#updateRiskCnt();
		return true;
	}
	#delayedResetBombs() {
		const closedArr = this.#itemArr.filter(in_item => !in_item.opened);
		for (let ix = 0; ix < this.#conf.bomb.count; ix++) {
			closedArr[ix].isBomb = true;
		}
		closedArr.sort(() => Math.random() - 0.5);
		for (let ix = 0; ix < this.#itemArr.length; ix++) {
			if (this.#itemArr[ix].opened) {
				continue;
			}
			this.#itemArr[ix] = closedArr.pop();
		}
		this.#updateRiskCnt();
	}
	static RC = {
		CANNOT : Symbol(),
		SUCCESS : Symbol(),
		EXPLODED : Symbol(),
		COMPLETED : Symbol()
	};
	#openIndex(in_ix) {
		const item = this.#getItemByIndex(in_ix);
		if (item.opened) {
			return cMinesweeperModel.RC.CANNOT;
		}
		item.opened = true;
		if (item.isBomb) {
			return cMinesweeperModel.RC.EXPLODED;
		}
		return cMinesweeperModel.RC.SUCCESS;
	}
	#cascadeOpenIndex(in_ix) {
		let cnt = 0;
		const item = this.#getItemByIndex(in_ix);
		if (item.riskCnt > 0) {
			return cnt;
		}
		const ixArr = this.#aroundIndexes(in_ix);
		ixArr.forEach(in_around_ix => {
			const around_item = this.#getItemByIndex(in_around_ix);
			if (around_item.opened) {
				return;
			}
			this.#openIndex(in_around_ix);
			cnt = 1 + this.#cascadeOpenIndex(in_around_ix);
		});
		return cnt;
	}
	openPos(in_row, in_col) {
		if (this.#gameIsOver) {
			return cMinesweeperModel.RC.CANNOT;
		}
		const ix = this.#posToIndex(in_row, in_col);
		const rc = this.#openIndex(ix);
		if (rc !== cMinesweeperModel.RC.SUCCESS) {
			return rc;
		}
		if (!this.#conf.bomb.mapped) {
			this.#delayedResetBombs();
			this.#conf.bomb.mapped = true;
		}
		this.#cascadeOpenIndex(ix);
		const openedCount = this.#itemArr.reduce((in_acc, in_cur) => in_acc + (in_cur.opened ? 1 : 0), 0);
		if (this.#itemArr.length === (openedCount + this.#conf.bomb.count)) {
			return cMinesweeperModel.RC.COMPLETED;
		} else {
			return rc;
		}
	}
	rotate(in_fixedCol, in_deltaRow)  {
		if (this.#gameIsOver) {
			return cMinesweeperModel.RC.CANNOT;
		}
		if (this.#rotateSameColItems(in_fixedCol, in_deltaRow)) {
			return cMinesweeperModel.RC.SUCCESS;
		} else {
			return cMinesweeperModel.RC.CANNOT;
		}
	}
	rotatableFixedCol() {
		return this.#conf.rotatable.fixedCol;
	}
	rotatableFixedRow() {
		return this.#conf.rotatable.fixedRow;
	}
	static BOMBED = Symbol();
	static CLOSED = Symbol();
	static DMZ = Symbol();
	getOverTable() {
		if (!this.#gameIsOver) {
			return;
		}
		const table = [];
		for (let ix = 0; ix < this.#itemArr.length; ix++) {
			const pos = this.#indexToPos(ix);
			if (!table[pos.row]) {
				table[pos.row] = [];
			}
			const item = this.#getItemByIndex(ix);
			if (item.isBomb) {
				table[pos.row][pos.col] = cMinesweeperModel.BOMBED;
			} else {
				if (item.hidden) {
					table[pos.row][pos.col] = cMinesweeperModel.DMZ;
				} else {
					table[pos.row][pos.col] = item.riskCnt;
				}
			}
		}
		return table;
	}
	getRiskTable() {
		const table = [];
		for (let ix = 0; ix < this.#itemArr.length; ix++) {
			const pos = this.#indexToPos(ix);
			if (!table[pos.row]) {
				table[pos.row] = [];
			}
			const item = this.#getItemByIndex(ix);
			if (item.opened) {
				if (item.hidden) {
					table[pos.row][pos.col] = cMinesweeperModel.DMZ;
				} else {
					table[pos.row][pos.col] = item.riskCnt;
				}
			} else {
				table[pos.row][pos.col] = cMinesweeperModel.CLOSED;
			}
		}
		return table;
	}
	_snapshot(in_infoTable = null) {
		const rightMargin = 10;
		const cellSize = 20;
		const cellMargin = 5;
		const gray = in_value => 'rgb(' + in_value + ',' + in_value + ',' + in_value + ')';
		for (let row = 0; row < this.#conf.row.size; row++) {
			for (let col = 0; col < this.#conf.col.size; col++) {
				const item = this.#getItemByPos(row, col);
				let bgcolor, text;
				if (item.opened) {
					text = item.riskCnt;
					bgcolor = gray(255 - item.riskCnt * 10);
				} else {
					text = '+';
					bgcolor = gray(20);
				}
				const id = '_' + row + 'x' + col;
				let cell = document.getElementById(id);
				if (cell) {
					cell.textContent = text;
					cell.style.backgroundColor = bgcolor;
					if (in_infoTable && !item.opened) {
						cell.onmouseenter = () => console.log(in_infoTable[row][col]);
					} else {
						cell.onmouseenter = () => {};
					}
					continue;
				} else {
					cell = document.createElement('DIV');
					cell.textContent = text;
					cell.id = id;
					cell.addEventListener('click', in_ev => {
						const rc = this.openPos(row, col);
						switch (rc) {
						case cMinesweeperModel.RC.EXPLODED :
							console.log('died');
							break;
						case cMinesweeperModel.RC.COMPLETED :
							console.log('you win');
							break;
						default :
							this._snapshot();
							break;
						}
					});
				}
				let l = rightMargin + (cellSize + cellMargin) * col;
				let t = rightMargin + (cellSize + cellMargin) * row;
				const pair = this.#conf.dirStyle.pair;
				if (pair.has(90) && !pair.has(0)) {
					l += (row % 2 === this.#conf.offset ? (cellSize + cellMargin) / 2 : 0);
				}
				if (!pair.has(90) && pair.has(0)) {
					t += (col % 2 === this.#conf.offset ? (cellSize + cellMargin) / 2 : 0);
				}
				Object.assign(cell.style, {
					width : cellSize + 'px',
					height : cellSize + 'px',
					backgroundColor : bgcolor,
					border : '1px solid black',
					position : 'absolute',
					left : l + 'px',
					top : t + 'px'
				});
				document.body.appendChild(cell);
			}
		}
	}
}

// this class shoud not know private information of cMinesweeperModel
export class cMinesweeper extends cMinesweeperModel {
	#setting;
	constructor(in_sizeRow, in_sizeCol, in_bomb, in_options = {}) {
		super(in_sizeRow, in_sizeCol, in_bomb, in_options);
		this.#setting = {
			rows : in_sizeRow,
			cols : in_sizeCol,
			bomb : in_bomb
		};
	}
	#filledTable(in_value) {
		return Array.from({length : this.#setting.rows}, () => Array(this.#setting.cols).fill(in_value));
	}
	static UNPROVEN = Symbol();
	#getProvenTable(in_tblRisk) {
		const tblSafe = this.#filledTable(false);
		const tblBomb = this.#filledTable(false);
		let canStillProve = true;
		while (canStillProve) {
			canStillProve = false;
			for (let row = 0; row < this.#setting.rows; row++) {
				for (let col = 0; col < this.#setting.cols; col++) {
					if ((in_tblRisk[row][col] === cMinesweeper.CLOSED) || (in_tblRisk[row][col] === cMinesweeper.DMZ)) {
						continue;
					}
					const neighbors = this.aroundPositions(row, col);
					let neighborBombCnt = 0;
					const unprovenNeighbors = [];
					for (const [nrow, ncol] of neighbors) {
						if (tblBomb[nrow][ncol]) {
							neighborBombCnt++;
							continue;
						}
						if ((in_tblRisk[nrow][ncol] === cMinesweeper.CLOSED) && !tblSafe[nrow][ncol]) {
							unprovenNeighbors.push([nrow, ncol]);
						}
					}
					const restRiskCnt = in_tblRisk[row][col] - neighborBombCnt;
					if (restRiskCnt === 0) {
						for (const [nrow, ncol] of unprovenNeighbors) {
							if (!tblSafe[nrow][ncol]) {
								tblSafe[nrow][ncol] = true;
								canStillProve = true;
							}
						}
						continue;
					}
					if (restRiskCnt === unprovenNeighbors.length) {
						for (const [nrow, ncol] of unprovenNeighbors) {
							if (!tblBomb[nrow][ncol]) {
								tblBomb[nrow][ncol] = true;
								canStillProve = true;
							}
						}
						continue;
					}
				}
			}
		}
		const table = this.#filledTable(cMinesweeper.UNPROVEN);
		for (let row = 0; row < this.#setting.rows; row++) {
			for (let col = 0; col < this.#setting.cols; col++) {
				if (in_tblRisk[row][col] !== cMinesweeper.CLOSED) {
					table[row][col] = 0;
					continue;
				}
				if (tblSafe[row][col]) {
					table[row][col] = 0;
					continue;
				}
				if (tblBomb[row][col]) {
					table[row][col] = 1;
					continue;
				}
			}
		}
		return table;
	}
	#getRatioTable(in_tblRisk, in_tblProven) {
		const table = this.#filledTable(0);
		const total = {
			bomb : 0,
			rest : this.#setting.rows * this.#setting.cols
		};
		/*
			(1) make unprovenArr

			|
			+- opened
			|	|
			|	+- normal
			|	|	|
			|	|	+- proven (= 0) @in_tblProven
			|	|		& count of neighbor bombs @in_tblRisk 
			|	|
			|	+- dmz
			|		|
			|		+- proven (= 0) @in_tblProven
			|
			+- closed
				|
				+- proven (= 0, 1) @in_tblProven
				|
				+- unproven @in_tblProven <--- this !!
		*/
		const unprovenArr = [];
		for (let row = 0; row < this.#setting.rows; row++) {
			for (let col = 0; col < this.#setting.cols; col++) {
				if (in_tblProven[row][col] === cMinesweeper.UNPROVEN) {
					unprovenArr.push([row, col]);
				} else {
					// proven
					table[row][col] = in_tblProven[row][col];
					total.bomb += in_tblProven[row][col];
					total.rest--;
					continue;
				}
			}
		}
		/*
			(2) analyze unproven risk using in_tblRisk

			unproven
			|
			+- neighbor1 = closed
			|
			+- neighbor2 = opened (dmz)
			|
			+- neighbor3 = opened (with risk score)
			|	|
			|	+- nextNeighbor1 = UNPROVEN <--- unprovenCnt++
			|	|
			|	+- nextNeighbor2 = PROVEN = 1 <--- provenBombCnt++
			|	|
			|	+- nextNeighbor3 = PROVEN = 0
			|	|
			|	+- ...
			|
			+- ...
		*/
		const baseRatio = (this.#setting.bomb - total.bomb) / total.rest;
		for (const [upRow, upCol] of unprovenArr) {
			// find position which shows the biggest risk for unproven (upRow, upCol)
			const neighbors = this.aroundPositions(upRow, upCol);
			let rRow, rCol, maxRatio = 0;
			const countTblProven = (in_arr, in_v) => in_arr.filter(([in_r, in_c]) => in_tblProven[in_r][in_c] === in_v).length;
			neighbors.forEach(([in_row, in_col]) => {
				if ((in_tblRisk[in_row][in_col] === cMinesweeper.CLOSED) || (in_tblRisk[in_row][in_col] === cMinesweeper.DMZ)) {
					return;
				}
				const nextNeighbors = this.aroundPositions(in_row, in_col);
				const provenBombCnt = countTblProven(nextNeighbors, 1);
				const unprovenCnt = countTblProven(nextNeighbors, cMinesweeper.UNPROVEN);
				const ratio = (in_tblRisk[in_row][in_col] - provenBombCnt) / unprovenCnt;
				if (ratio > maxRatio) {
					rRow = in_row;
					rCol = in_col;
					maxRatio = ratio;
				}
			});
			if (maxRatio === 0) {
				table[upRow][upCol] = baseRatio;
			} else {
				table[upRow][upCol] = maxRatio;
			}
		}
		return table;
	}
	open(in_row, in_col) {
		const tblRisk = this.getRiskTable(); 
		const tblProven = this.#getProvenTable(tblRisk);
		const tblRatio = this.#getRatioTable(tblRisk, tblProven);
		let hasSafe = false;
		FIND_SAFE :
		for (let row = 0; row < this.#setting.rows; row++) {
			for (let col = 0; col < this.#setting.cols; col++) {
				if (tblRisk[row][col] !== cMinesweeper.CLOSED) {
					continue;
				}
				if (tblRatio[row][col] === 0) {
					hasSafe = true;
					break FIND_SAFE;
				}
			}
		}
		const rc = this.openPos(in_row, in_col);
		return {
			rc : rc,
			ratio : tblRatio[in_row][in_col],
			hasSafe : hasSafe
		};
	}
	_snapshot() {
		const tblRisk = this.getRiskTable(); 
		const tblProven = this.#getProvenTable(tblRisk);
		const tblRatio = this.#getRatioTable(tblRisk, tblProven);
		super._snapshot(tblRatio);
	}
}
