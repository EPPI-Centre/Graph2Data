/*

The MIT License (MIT)

Copyright (c) 2014 Christer Bystrom

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

A spatial hash. For an explanation, see

http://www.gamedev.net/page/resources/_/technical/game-programming/spatial-hashing-r2697

For computational efficiency, the positions are bit-shifted n times. This means
that they are divided by a factor of power of two. This factor is the
only argument to the constructor.

 */

(function (w) {
	'use strict';

	var DEFAULT_POWER_OF_TWO_X = 5;
	var DEFAULT_POWER_OF_TWO_Y = 5;

	function makeKeysFn(self, shiftX, shiftY) {
		function buildKey (x, y) {
			return "" + x + ":" + y;
		}
		return function (obj, neighbours) {
			neighbours = (neighbours || "0,0,0,0").split(',');
			let a = neighbours[0];
			let b = neighbours[1];
			let c = neighbours[2];
			let d = neighbours[3];

			var sx = obj.x >> shiftX,
				sy = obj.y >> shiftY,
				ex = (obj.x + obj.width ) >> shiftX,
				ey = (obj.y + obj.height) >> shiftY,
				x,
				y,
				info = { 
					keys: [],
					minX: sx,
					minY: sy,
					maxX: ex,
					maxY: ey,
				};
			
			if (a === "*") { sy = self.range.minY; }
			else { sy -= parseInt(a, 10); }
			
			if (b === "*") { sx = self.range.minX; }
			else { sx -= parseInt(b, 10); }

			if (c === "*") { ex = self.range.maxX; }
			else { ex += parseInt(c, 10); }

			if (d === "*") { ey = self.range.maxY; }
			else { ey += parseInt(d, 10); }

			for (y = sy; y <= ey; y++) {
				for (x = sx; x <= ex; x++) {
					info.keys.push(buildKey(x, y));
				}
			}
			return info;
		};
	}

	/**
	 * @param {number} power_of_two - how many times the rects should be shifted
	 *                                when hashing
	 */
	function SpatialHash(shiftX, shiftY) {
		shiftX = shiftX || DEFAULT_POWER_OF_TWO_X;
		shiftY = shiftY || DEFAULT_POWER_OF_TWO_Y;

		this.getKeyInfo = makeKeysFn(this, shiftX, shiftY);
		this.hash = {};
		this.list = [];
		this._lastTotalCleared = 0;
		this.range = {
			minX: Number.MAX_SAFE_INTEGER,
			minY: Number.MAX_SAFE_INTEGER,
			maxX: -1,
			maxY: -1,
		};
	}

	SpatialHash.prototype.clear = function () {
		var key;
		for (key in this.hash) {
			if (this.hash[key].length === 0) {
				delete this.hash[key];
			} else {
				this.hash[key].length = 0;
			}
		}
		this.list.length = 0;
		this.range = {
			minX: Number.MAX_SAFE_INTEGER,
			minY: Number.MAX_SAFE_INTEGER,
			maxX: -1,
			maxY: -1,
		};
	};

	SpatialHash.prototype.getNumBuckets = function () {
		var key,
		count = 0;
		for (key in this.hash) {
			if (this.hash.hasOwnProperty(key)) {
				if (this.hash[key].length > 0) {
					count++;
				}
			}
		}
		return count;

	};

	SpatialHash.prototype.insert = function (obj, rect) {
		var keyInfo = this.getKeyInfo(rect || obj),
		keys = keyInfo.keys,
		key,
		i;
		this.range.minX = Math.min(this.range.minX, keyInfo.minX);
		this.range.minY = Math.min(this.range.minY, keyInfo.minY);
		this.range.maxX = Math.max(this.range.maxX, keyInfo.maxX);
		this.range.maxY = Math.max(this.range.maxY, keyInfo.maxY);
		
		this.list.push(obj);
		for (i = 0; i < keys.length; i++) {
			key = keys[i];
			if (this.hash[key]) {
				this.hash[key].push(obj);
			} else {
				this.hash[key] = [obj];
			}
		}
	};

	SpatialHash.prototype.retrieve = function (obj, rect) {
		var ret = [],
		keys,
		i,
		key;
		if (!obj && !rect) {
			return this.list;
		}
		keys = this.getKeyInfo(rect || obj);
		for (i = 0; i < keys.length; i++) {
			key = keys[i];
			if (this.hash[key]) {
				ret = ret.concat(this.hash[key]);
			}
		}
		return ret;
	};

	/*
	In the figure below, the period incidates the regions intersected by the specified object

	Retrieves objects surrounding this region on four sides, a, b, c and d

	These directions are specified as an array of integers:

	[a]
	[b][.][c]	= "a,b,c,d" where each integer specifies the number of adjacent regions to consider in the speciifed direction
	[d]		a '*' indicates 'all'


	 */
	SpatialHash.prototype.retrieveAdjacent = function (neighbours, obj, rect) {
		var ret = [],
		keys,
		i,
		key;
		if (!obj && !rect) {
			return this.list;
		}
		keys = this.getKeyInfo(rect || obj, neighbours).keys;
		for (i = 0; i < keys.length; i++) {
			key = keys[i];
			if (this.hash[key]) {
				ret = ret.concat(this.hash[key]);
			}
		}
		return ret;
	};

	w.SpatialHash = SpatialHash;
})(this);