/*
    WebPlotDigitizer - http://arohatgi.info/WebPlotDigitizer

    Copyright 2010-2016 Ankit Rohatgi <ankitrohatgi@hotmail.com>

    This file is part of WebPlotDigitizer.

    WebPlotDigitizer is free software: you can redistribute it and/or modify
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

wpd.BarValue = function () {
    this.npoints = 0;

    this.avgValTop = 0;

    this.avgValBot = 0;

    this.avgX = 0;

    this.append = function(x, valTop, valBot) {
        this.avgX = (this.npoints*this.avgX + x)/(this.npoints + 1.0);
        this.avgValTop = (this.npoints*this.avgValTop + valTop)/(this.npoints + 1.0);
        this.avgValBot = (this.npoints*this.avgValBot + valBot)/(this.npoints + 1.0);
        this.npoints++;
    };

    this.isPointInGroup = function(x, valTop, valBot, del_x, del_val) {
        if(this.npoints === 0) {
            return true;
        }

        if(Math.abs(this.avgX - x) <= del_x && Math.abs(this.avgValTop - valTop) <= del_val && Math.abs(this.avgValBot - valBot) <= del_val) {
            return true;
        }

        return false;
    };
};


wpd.BarExtractionAlgo = function() {

    var delX, delVal;
    
    this.getParamList = function() {
        var axes = wpd.appData.getPlotData().axes,
            orientationAxes = axes.getOrientation().axes;

        if(orientationAxes === 'Y') {
            return [['ΔX', 'Px', 30], ['ΔVal', 'Px', 10]];
        } else {
            return [['ΔY', 'Px', 30], ['ΔVal', 'Px', 10]];
        }
    };

    this.setParam = function (index, val) {
        if (index === 0) {
            delX = parseFloat(val);
        } else if (index === 1) {
            delVal = parseFloat(val);
        }
    };

    this.run = function(plotData) {
        var autoDetector = plotData.getAutoDetector(),
            dataSeries = plotData.getActiveDataSeries(),
            orientation = plotData.axes.getOrientation(),                
            barValueColl = [],
            valTop, valBot, valCount, val,
            px, py,
            width = autoDetector.imageWidth,
            height = autoDetector.imageHeight,
            pixelAdded,
            barValuei,
            bv,
            dataVal,
            pxVal,
         // mkeys,
            topVal,
            botVal,
            
            appendData = function (x, valTop, valBot) {                
                pixelAdded = false;
                for(barValuei = 0; barValuei < barValueColl.length; barValuei++) {
                    bv = barValueColl[barValuei];

                    if(bv.isPointInGroup(x, valTop, valBot, delX, delVal)) {
                        bv.append(x, valTop, valBot);
                        pixelAdded = true;
                        break;
                    }
                }
                if(!pixelAdded) {
                    bv = new wpd.BarValue();
                    bv.append(x, valTop, valBot);
                    barValueColl.push(bv);
                }
            };

        dataSeries.clearAll();

        // Switch directions based on axes orientation and direction of data along that axes:
        // For each direction, look for both top and bottom side of the bar to account for cases where some bars are oriented
        // in the increasing direction, while others are in a decreasing direction
        if(orientation.axes === 'Y') {
            for (px = 0; px < width; px++) {                
                valTop = 0;
                valBot = height - 1;
                valCount = 0;

                for(py = 0; py < height; py++) {
                    if(autoDetector.binaryData[py*width + px]) {
                        valTop = py;
                        valCount++;
                        break;
                    }
                }
                for(py = height-1; py >= 0; py--) {
                    if(autoDetector.binaryData[py*width + px]) {
                        valBot = py;
                        valCount++;
                        break;
                    }
                }
                if(valCount === 2) { // found both top and bottom ends
                    appendData(px, valTop, valBot);
                }
            }
        } else {
            for (py = 0; py < height; py++) {
                valTop = width - 1;
                valBot = 0;
                valCount = 0;

                for(px = width-1; px >= 0; px--) {
                    if(autoDetector.binaryData[py*width + px]) {
                        valTop = px;
                        valCount++;
                        break;
                    }
                }
                for(px = 0; px < width; px++) {
                    if(autoDetector.binaryData[py*width + px]) {
                        valBot = px;
                        valCount++;
                        break;
                    }
                }
                if(valCount === 2) {
                    appendData(py, valTop, valBot);
                }
            }
        }
        
        if(plotData.axes.dataPointsHaveLabels) {
            //mkeys = dataSeries.getMetadataKeys();
            //if(mkeys == null || mkeys[0] !== 'Label') {
            //    dataSeries.setMetadataKeys(['Label']);
            //}
        }

        for(barValuei = 0; barValuei < barValueColl.length; barValuei++) {
            
            bv = barValueColl[barValuei];
            
            if(orientation.axes === 'Y') {
                valTop = plotData.axes.pixelToData(bv.avgX, bv.avgValTop)[0];
                valBot = plotData.axes.pixelToData(bv.avgX, bv.avgValBot)[0];
            } else {
                valTop = plotData.axes.pixelToData(bv.avgValTop, bv.avgX)[0];
                valBot = plotData.axes.pixelToData(bv.avgValBot, bv.avgX)[0];
            }
                
            if(valTop + valBot < 0) {
                val = orientation.direction === 'increasing' ? bv.avgValBot : bv.avgValTop;
            } else {
                val = orientation.direction === 'increasing' ? bv.avgValTop : bv.avgValBot;
            }

            if(plotData.axes.dataPointsHaveLabels) {
               
                if(orientation.axes === 'Y') {
                    dataSeries.addPixel(bv.avgX + 0.5, val + 0.5, ["Bar" + barValuei]);
                } else {
                    dataSeries.addPixel(val + 0.5, bv.avgX + 0.5, ["Bar" + barValuei]);
                }

            } else {

                if(orientation.axes === 'Y') {
                    dataSeries.addPixel(bv.avgX + 0.5, val + 0.5);
                } else {
                    dataSeries.addPixel(val + 0.5, bv.avgX + 0.5);
                }

            }            
        }
    };
};
