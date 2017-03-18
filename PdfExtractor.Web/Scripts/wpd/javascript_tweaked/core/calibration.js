/*
    WebPlotDigitizer - http://arohatgi.info/WebPlotdigitizer

    Copyright 2010-2016 Ankit Rohatgi <ankitrohatgi@hotmail.com>

    This file is part of WebPlotDigitizer.

    WebPlotDIgitizer is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    WebPlotDigitizer is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with WebPlotDigitizer.  If not, see <http://www.gnu.org/licenses/>.


*/

var wpd = wpd || {};

// calibration info
wpd.Calibration = (function () {

    var Calib = function(dim) {
        //// Pixel information
        //var px = [],
        //    py = [],

        //    // Data information
        //    dimensions = dim == null ? 2 : dim,
        //    dp = [],
        //    selections = [];

        this.labels = [];

        var state = {
            // Pixel information
            px: [],
            py: [],

            // Data information
            dimensions: dim == null ? 2 : dim,
            dp: [],
            selections: []
        };

        this.getMemento = function () {
            return {
                state: state
            };
        };

        this.applyMemento = function (memento) {
            state = memento.state;
        };




        this.getCount = function () { return state.px.length; };
        this.getDimensions = function () { return state.dimensions; };
        this.addPoint = function(pxi, pyi, dxi, dyi, dzi) {
            var plen = state.px.length, dlen = state.dp.length;
            state.px[plen] = pxi;
            state.py[plen] = pyi;
            state.dp[dlen] = dxi; state.dp[dlen + 1] = dyi;
            if (state.dimensions === 3) {
                state.dp[dlen + 2] = dzi;
            }
        };

        this.getPoint = function(index) {
            if (index < 0 || index >= state.px.length) return null;

            return {
                px: state.px[index],
                py: state.py[index],
                dx: state.dp[state.dimensions * index],
                dy: state.dp[state.dimensions * index + 1],
                dz: state.dimensions === 2 ? null : state.dp[state.dimensions * index + 2]
            };
        };

        this.changePointPx = function(index, npx, npy) {
            if (index < 0 || index >= state.px.length) {
                return;
            }
            state.px[index] = npx;
            state.py[index] = npy;
        };

        this.setDataAt = function(index, dxi, dyi, dzi) {
            if (index < 0 || index >= state.px.length) return;
            state.dp[state.dimensions * index] = dxi;
            state.dp[state.dimensions * index + 1] = dyi;
            if (state.dimensions === 3) {
                state.dp[state.dimensions * index + 2] = dzi;
            }
        };

        this.findNearestPoint = function(x, y, threshold) {
            threshold = (threshold == null) ? 50 : parseFloat(threshold);
            var minDist, minIndex = -1,
                i, dist;
            for (i = 0; i < state.px.length; i++) {
                dist = Math.sqrt((x - state.px[i]) * (x - state.px[i]) + (y - state.py[i]) * (y - state.py[i]));
                if((minIndex < 0 && dist <= threshold) || (minIndex >= 0 && dist < minDist)) {
                    minIndex = i;
                    minDist = dist;
                }
            }
            return minIndex;
        };


        this.selectPoint = function(index) {
            if (state.selections.indexOf(index) < 0) {
                state.selections[state.selections.length] = index;
            }
        };

        this.selectNearestPoint = function (x, y, threshold) {
            var minIndex = this.findNearestPoint(x, y, threshold);
            if (minIndex >= 0) {
                this.selectPoint(minIndex);
            }
        };

        this.getSelectedPoints = function () {
            return state.selections;
        };

        this.unselectAll = function() {
            state.selections = [];
        };

        this.isPointSelected = function(index) {
            return state.selections.indexOf(index) >= 0;
        };

        this.dump = function() {
            console.log(state.px);
            console.log(state.py);
            console.log(state.dp);
        };
    };
    return Calib;
})();
