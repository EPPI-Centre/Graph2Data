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

// Plot information
wpd.PlotData = (function () {
    var PlotData = function() {

        var activeSeriesIndex = 0,
            autoDetector = new wpd.AutoDetector();
        
        this.topColors = null;
        this.axes = null;
        this.dataSeriesColl = [];
        this.gridData = null;
        this.calibration = null;
        this.metaSeries = {
            //groupNames: {
            //    series: new wpd.DataSeries(),
            //    text: [],
            //    visible: false
            //}
        };

        this.angleMeasurementData = null;
        this.distanceMeasurementData = null;
        this.openPathMeasurementData = null;
        this.closedPathMeasurementData = null;
        this.backupImageData = null;
        this.showPoints = true;

        this.toggleShowPoints = function() {
            this.showPoints = !this.showPoints;
            var msg = "Toggled display of points " + (this.showPoints ? "ON" : "OFF");
         // console.log(msg);
            wpd.utils.notice(msg, this.showPoints ? "green" : "red");
        };

        this.getActiveDataSeries = function () {
            var activeSeries = null;

            for (var prop in this.metaSeries) {
                if (this.metaSeries.hasOwnProperty(prop)) {
                    var ms = this.metaSeries[prop];
                    if (ms.visible) {
                        activeSeries = ms.series;
                        break;
                    }
                }
            }
            if (!activeSeries) {
                if (this.dataSeriesColl[activeSeriesIndex] == null) {
                    this.dataSeriesColl[activeSeriesIndex] = new wpd.DataSeries();
                }
                activeSeries = this.dataSeriesColl[activeSeriesIndex];
            }

            return activeSeries;
        };

        this.getDataSeriesCount = function() {
            return this.dataSeriesColl.length;
        };

        this.setActiveDataSeriesIndex = function(index) {
            activeSeriesIndex = index;
        };

        this.getActiveDataSeriesIndex = function() {
            return activeSeriesIndex;
        };

        this.getAutoDetector = function() {
            return autoDetector;
        };

        this.getDataSeriesNames = function() {
            var rtnVal = [];
            for(var i = 0; i < this.dataSeriesColl.length; i++) {
                rtnVal[i] = this.dataSeriesColl[i].name;
            }
            return rtnVal;
        };

        this.forEachSeries = function (callback) {
            for (var s = 0; s < this.dataSeriesColl.length; s++) {
                var series = this.dataSeriesColl[s];
                if (callback(s, series)) {
                    break;
                }
            }
        }

        this.ensureSeriesCount = function (seriesCount) { //, dataPointCount) {
            var plotData = wpd.appData.getPlotData(),
                count = plotData.dataSeriesColl.length;

            if (plotData.dataSeriesColl.length > 0 && plotData.dataSeriesColl[0].name === 'Default Dataset') {
                plotData.dataSeriesColl[0].name = 'Series 1';
            }
            if (count > seriesCount) {
                // remove excess series
                plotData.dataSeriesColl.splice(seriesCount, count);
            } else {
                // add additional series
                for (var i = count + 1; i <= seriesCount; i++) {
                    var series = new wpd.DataSeries();
                    series.name = 'Series ' + i;
                    plotData.dataSeriesColl.push(series);
                }
            }
        }

        this.setMeasureFieldMetaData = function (omFields) {
            this.forEachSeries(function (idx, series) {
                series.setMeasureFieldMetaData(omFields);
            });
        }

        this.reset = function () {
            this.axes = null;
            this.angleMeasurementData = null;
            this.distanceMeasurementData = null;
            this.openPathMeasurementData = null;
            this.closedPathMeasurementData = null;
            this.dataSeriesColl = [];
            this.gridData = null;
            this.calibration = null;
            this.backupImageData = null;
            this.showPoints = true;
            this.metaSeries = {
                groupNames: {
                    series: new wpd.DataSeries(),
                    text: [],
                    visible: false
                }
            };
            activeSeriesIndex = 0;
            autoDetector = new wpd.AutoDetector();
        };

        this.getDataPoint = function(pixel) {
            var dataValue = this.axes.pixelToData(pixel.x, pixel.y);
            return dataValue;
        };
    };

    return PlotData;
})();


