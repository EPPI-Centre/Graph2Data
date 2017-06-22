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

// Data from a series
wpd.DataSeries = (function () {
    return function (dim) {
        var dataPoints = [],
            connections = [],
            selections = [],
            hasMetadata = false
         // mkeys = []
        ;
        this.seriesMetaData = {
            measureFieldData: {
            // model_shamPlusVehicle: {
            //      n: 17 // subjects for this sample
            // },
            // model_npPlusVehicle: {
            //      n: 13 // subjects for this sample
            // },
            // intervention_npPlusVehicle: {
            //      n: 12 // subjects for this sample
            // },
            // intervention_npPlusRx: {
            //      n: 19 // subjects for this sample
            // },
            },
            individualData: null // new wpd.DataSeries()
        };

        this.name = "Default Dataset";

        this.variableNames = ['x', 'y'];

        this.hasMetadata = function () {
            return hasMetadata;
        };

        this.getIndividualMetaData = function () {
            var md = this.seriesMetaData;

            if (!md.individualData) {
                var series = new wpd.DataSeries();
                series.name = this.name + "_individualData";

                md.individualData = {
                    series: series,
                    counts: {}
                };

            }
            return md.individualData;
        };

        this.getMeasureFieldMetaData = function(measureFieldId) {
            var md = this.seriesMetaData;
            var mfmd = md.measureFieldData[measureFieldId];
            return mfmd;
        }

        this.setMeasureFieldMetaData = function (omFields) {
            var md = this.seriesMetaData;
            if (!md.hasOwnProperty('measureFieldData')) {
                md.measureFieldData = {};
            }

            for (var i = 0; i < omFields.length; i++) {
                var mf = omFields[i];
                if (!md.measureFieldData.hasOwnProperty(mf.id)) {
                    md.measureFieldData[mf.id] = { n: 0 };
                }
            }
        }

        this.getPixelMetaDataByKey = function (pixel, metaDataKey) {
            var metaData = null;
            if (pixel.metadata && pixel.metadata.hasOwnProperty(metaDataKey)) {
                metaData = pixel.metadata[metaDataKey];
            }
            return metaData;
        }

        this.addPixel = function(pxi, pyi, mdata) {
            var dlen = dataPoints.length;
            dataPoints[dlen] = {x: pxi, y: pyi, metadata: mdata};
            if (mdata != null) {
                hasMetadata = true;
            }
            return dlen; // index added - Added by Lee
        };

        this.getPixel = function(index) {
            return dataPoints[index];
        };

        this.getPixelCount = function() {
            return dataPoints.length;
        };

        this.setPixelAt = function (index, pxi, pyi) {
            if(index < dataPoints.length) {
                dataPoints[index].x = pxi;
                dataPoints[index].y = pyi;
            }
        };

        this.setMetadataAt = function (index, mdata) {
            if (index < dataPoints.length) {
                dataPoints[index].metadata = mdata;
            }
        };

        this.insertPixel = function(index, pxi, pyi, mdata) {
            dataPoints.splice(index, 0, {x: pxi, y: pyi, metadata: mdata});
        };

        this.removePixelAtIndex = function(index) {
            if(index < dataPoints.length) {
                dataPoints.splice(index, 1);
            }
        };

        this.removeLastPixel = function() {
            var pIndex = dataPoints.length - 1;
            this.removePixelAtIndex(pIndex);
        };

        this.findNearestPixel = function(x, y, threshold) {
            threshold = (threshold == null) ? 50 : parseFloat(threshold);
            var minDist, minIndex = -1,
                i, dist;
            for(i = 0; i < dataPoints.length; i++) {
                dist = Math.sqrt((x - dataPoints[i].x)*(x - dataPoints[i].x) + (y - dataPoints[i].y)*(y - dataPoints[i].y));
                if((minIndex < 0 && dist <= threshold) || (minIndex >= 0 && dist < minDist)) {
                    minIndex = i;
                    minDist = dist;
                }
            }
            return minIndex;
        };

        this.removeNearestPixel = function(x, y, threshold) {
            var minIndex = this.findNearestPixel(x, y, threshold);
            if(minIndex >= 0) {
                this.removePixelAtIndex(minIndex);
            }
        };

        this.clearAll = function() {
            dataPoints = [];
            hasMetadata = false;
         // mkeys = [];
        };

        this.getCount = function() { return dataPoints.length; };

        this.selectPixel = function(index) {
            if(selections.indexOf(index) >= 0) {
                return;
            }
            selections[selections.length] = index;
        };

        this.unselectAll = function () {
            selections = [];
        };

        this.selectNearestPixel = function(x, y, threshold) {
            var minIndex = this.findNearestPixel(x, y, threshold);
            if(minIndex >= 0) {
                this.selectPixel(minIndex);
            }
            return minIndex;
        };

        this.selectNextPixel = function() {
            for(var i = 0; i < selections.length; i++) {
                selections[i] = (selections[i] + 1) % dataPoints.length;
            }
        };

        this.selectPreviousPixel = function() {
            var i, newIndex;
            for(i = 0; i < selections.length; i++) {
                newIndex = selections[i];
                if(newIndex === 0) {
                    newIndex = dataPoints.length - 1;
                } else {
                    newIndex = newIndex - 1;
                }
                selections[i] = newIndex;
            }
        };

        this.getSelectedPixels = function () {
            return selections;
        };
        this.getDataPoints = function() {
            return dataPoints;
        };
    };
})();


