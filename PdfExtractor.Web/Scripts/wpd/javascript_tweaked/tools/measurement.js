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

wpd.measurementModes = {
    distance: {
        name: 'distance',
        connectivity: 2,
        addButtonId: 'add-pair-button',
        deleteButtonId: 'delete-pair-button',
        sidebarId: 'measure-distances-sidebar',
        init: function() {
            var plotData = wpd.appData.getPlotData();
            if(plotData.distanceMeasurementData == null) {
                plotData.distanceMeasurementData = new wpd.ConnectedPoints(2);
            }
        },
        clear: function() {
            var plotData = wpd.appData.getPlotData();
            plotData.distanceMeasurementData = new wpd.ConnectedPoints(2);
        },
        getData: function() {
            var plotData = wpd.appData.getPlotData();
            return plotData.distanceMeasurementData;
        }
    },
    angle: {
        name: 'angle',
        connectivity: 3,
        addButtonId: 'add-angle-button',
        deleteButtonId: 'delete-angle-button',
        sidebarId: 'measure-angles-sidebar',
        init: function() {
            var plotData = wpd.appData.getPlotData();
            if(plotData.angleMeasurementData == null) {
                plotData.angleMeasurementData = new wpd.ConnectedPoints(3);
            }
        },
        clear: function() {
            var plotData = wpd.appData.getPlotData();
            plotData.angleMeasurementData = new wpd.ConnectedPoints(3);
        },
        getData: function() {
            var plotData = wpd.appData.getPlotData();
            return plotData.angleMeasurementData;
        }
    },
    openPath: {
        name: 'open-path',
        connectivity: -1,
        addButtonId: 'add-open-path-button',
        deleteButtonId: 'delete-open-path-button',
        sidebarId: 'measure-open-path-sidebar',
        init: function() {
            var plotData = wpd.appData.getPlotData();
            if(plotData.openPathMeasurementData == null) {
                plotData.openPathMeasurementData = new wpd.ConnectedPoints();
            }
        },
        clear: function() {
            var plotData = wpd.appData.getPlotData();
            plotData.openPathMeasurementData = new wpd.ConnectedPoints();
        },
        getData: function() {
            var plotData = wpd.appData.getPlotData();
            return plotData.openPathMeasurementData;
        }
    },
    closedPath: {
        name: 'closed-path',
        connectivity: -1,
        addButtonId: 'add-closed-path-button',
        deleteButtonId: 'delete-closed-path-button',
        sidebarId: 'measure-closed-path-sidebar',
        init: function() {
            var plotData = wpd.appData.getPlotData();
            if(plotData.closedPathMeasurementData == null) {
                plotData.closedPathMeasurementData = new wpd.ConnectedPoints();
            }
        },
        clear: function() {
            var plotData = wpd.appData.getPlotData();
            plotData.closedPathMeasurementData = new wpd.ConnectedPoints();
        },
        getData: function() {
            var plotData = wpd.appData.getPlotData();
            return plotData.closedPathMeasurementData;
        }
    }
};

wpd.measurement = (function () {

    var activeMode;

    function start(mode) {
        wpd.graphicsWidget.removeTool();
        wpd.graphicsWidget.resetData();
        mode.init();
        wpd.sidebar.show(mode.sidebarId);
        wpd.graphicsWidget.setTool(new wpd.AddMeasurementTool(mode));
        wpd.graphicsWidget.forceHandlerRepaint();
        activeMode = mode;
    }

    function addItem() {
        wpd.graphicsWidget.setTool(new wpd.AddMeasurementTool(activeMode));
    }

    function deleteItem() {
        wpd.graphicsWidget.setTool(new wpd.DeleteMeasurementTool(activeMode));
    }

    function clearAll() {
        wpd.graphicsWidget.removeTool();
        wpd.graphicsWidget.resetData();
        activeMode.clear();
    }

    return {
        start: start,
        addItem: addItem,
        deleteItem: deleteItem,
        clearAll: clearAll
    };
})();

wpd.AddMeasurementTool = (function () {
    var Tool = function (mode) {
        var ctx = wpd.graphicsWidget.getAllContexts(),
            pointsCaptured = 0,
            isCapturing = true,
            plist = [];

        this.onAttach = function () {
            document.getElementById(mode.addButtonId).classList.add('pressed-button');
            wpd.graphicsWidget.setRepainter(new wpd.MeasurementRepainter(mode));
        };

        this.onRemove = function () {
            document.getElementById(mode.addButtonId).classList.remove('pressed-button');
        };

        this.onKeyDown = function (ev) {
            // move the selected point or switch tools
            if(wpd.keyCodes.isAlphabet(ev.keyCode, 'a')) {
                wpd.graphicsWidget.resetHover();
                wpd.graphicsWidget.setTool(new wpd.AddMeasurementTool(mode));
                return;
            } else if (wpd.keyCodes.isAlphabet(ev.keyCode, 'd')) {
                wpd.graphicsWidget.resetHover();
                wpd.graphicsWidget.setTool(new wpd.DeleteMeasurementTool(mode));
                return;
            } else if ((wpd.keyCodes.isEnter(ev.keyCode) || wpd.keyCodes.isEsc(ev.keyCode)) 
                        && isCapturing === true && mode.connectivity < 0) {
                isCapturing = false;
                mode.getData().addConnection(plist);
                wpd.graphicsWidget.forceHandlerRepaint();
                wpd.graphicsWidget.setTool(new wpd.AdjustMeasurementTool(mode));
                return;
            }
        };


        this.onMouseClick = function (ev, pos, imagePos) {
            if(isCapturing) {

                wpd.graphicsWidget.resetHover();

                plist[pointsCaptured*2] = imagePos.x;
                plist[pointsCaptured*2 + 1] = imagePos.y;
                pointsCaptured = pointsCaptured + 1;

                if(pointsCaptured === mode.connectivity) {
                    isCapturing = false;
                    mode.getData().addConnection(plist);
                    wpd.graphicsWidget.forceHandlerRepaint();
                    wpd.graphicsWidget.setTool(new wpd.AdjustMeasurementTool(mode));
                    return;
                }

                if(pointsCaptured > 1) {
                    // draw line from previous point to current
                    var prevScreenPx = wpd.graphicsWidget.screenPx(plist[(pointsCaptured-2)*2], plist[(pointsCaptured-2)*2 + 1]);
                    ctx.dataCtx.beginPath();
                    ctx.dataCtx.strokeStyle = "rgb(0,0,10)";
                    ctx.dataCtx.moveTo(prevScreenPx.x, prevScreenPx.y);
                    ctx.dataCtx.lineTo(pos.x, pos.y);
                    ctx.dataCtx.stroke();

                    ctx.oriDataCtx.beginPath();
                    ctx.oriDataCtx.strokeStyle = "rgb(0,0,10)";
                    ctx.oriDataCtx.moveTo(plist[(pointsCaptured-2)*2], plist[(pointsCaptured-2)*2 + 1]);
                    ctx.oriDataCtx.lineTo(imagePos.x, imagePos.y);
                    ctx.oriDataCtx.stroke();
                }

                // draw current point
                ctx.dataCtx.beginPath();
                ctx.dataCtx.fillStyle = "rgb(200, 0, 0)";
                ctx.dataCtx.arc(pos.x, pos.y, 3, 0, 2.0*Math.PI, true);
                ctx.dataCtx.fill();

                ctx.oriDataCtx.beginPath();
    	    	ctx.oriDataCtx.fillStyle = "rgb(200,0,0)";
	        	ctx.oriDataCtx.arc(imagePos.x, imagePos.y, 3, 0, 2.0*Math.PI, true);
	    	    ctx.oriDataCtx.fill();

            }
            wpd.graphicsWidget.updateZoomOnEvent(ev); 
        };

        this.onMouseMove = function (ev, pos, imagePos) {
            if(isCapturing && pointsCaptured >= 1) {
                wpd.graphicsWidget.resetHover();
                var prevScreenPx = wpd.graphicsWidget.screenPx(plist[(pointsCaptured-1)*2], plist[(pointsCaptured-1)*2 + 1]);

                ctx.hoverCtx.beginPath();
                ctx.hoverCtx.strokeStyle = "rgb(0,0,0)";
                ctx.hoverCtx.moveTo(prevScreenPx.x, prevScreenPx.y);
                ctx.hoverCtx.lineTo(pos.x, pos.y);
                ctx.hoverCtx.stroke();
            }
        };

    };
    return Tool;
})();

wpd.DeleteMeasurementTool = (function () {
    var Tool = function (mode) {
        var ctx = wpd.graphicsWidget.getAllContexts(),
            plotData = wpd.appData.getPlotData();

        this.onAttach = function () {
            document.getElementById(mode.deleteButtonId).classList.add('pressed-button');
            wpd.graphicsWidget.setRepainter(new wpd.MeasurementRepainter(mode));
        };

        this.onRemove = function () {
            document.getElementById(mode.deleteButtonId).classList.remove('pressed-button');
        };
        
        this.onKeyDown = function (ev) {
            // move the selected point or switch tools
            if(wpd.keyCodes.isAlphabet(ev.keyCode, 'a')) {
                wpd.graphicsWidget.setTool(new wpd.AddMeasurementTool(mode));
                return;
            } else if (wpd.keyCodes.isAlphabet(ev.keyCode, 'd')) {
                wpd.graphicsWidget.setTool(new wpd.DeleteMeasurementTool(mode));
                return;
            }
        };

        this.onMouseClick = function (ev, pos, imagePos) {
            mode.getData().deleteNearestConnection(imagePos.x, imagePos.y);
            wpd.graphicsWidget.setTool(new wpd.AdjustMeasurementTool(mode));
            wpd.graphicsWidget.resetData();
            wpd.graphicsWidget.forceHandlerRepaint();
            wpd.graphicsWidget.updateZoomOnEvent(ev);
        };

    };
    return Tool;
})();

wpd.AdjustMeasurementTool = (function () {
    var Tool = function (mode) {
        this.onAttach = function () {
            wpd.graphicsWidget.setRepainter(new wpd.MeasurementRepainter(mode));
        };

        this.onMouseClick = function (ev, pos, imagePos) {
            // select the nearest point
            mode.getData().selectNearestPoint(imagePos.x, imagePos.y);
            wpd.graphicsWidget.forceHandlerRepaint();
            wpd.graphicsWidget.updateZoomOnEvent(ev);
        };

        this.onKeyDown = function (ev) {
            // move the selected point or switch tools
            if(wpd.keyCodes.isAlphabet(ev.keyCode, 'a')) {
                wpd.graphicsWidget.setTool(new wpd.AddMeasurementTool(mode));
                return;
            } else if (wpd.keyCodes.isAlphabet(ev.keyCode, 'd')) {
                wpd.graphicsWidget.setTool(new wpd.DeleteMeasurementTool(mode));
                return;
            }

            var measurementData = mode.getData(),
                selectedPt = measurementData.getSelectedConnectionAndPoint();

            if(selectedPt.connectionIndex >= 0 && selectedPt.pointIndex >= 0) {

                var stepSize = ev.shiftKey === true ? 5/wpd.graphicsWidget.getZoomRatio() : 0.5/wpd.graphicsWidget.getZoomRatio(),
                    pointPx = measurementData.getPointAt(selectedPt.connectionIndex, selectedPt.pointIndex);

                if(wpd.keyCodes.isUp(ev.keyCode)) {
                    pointPx.y = pointPx.y - stepSize;
                } else if(wpd.keyCodes.isDown(ev.keyCode)) {
                    pointPx.y = pointPx.y + stepSize;
                } else if(wpd.keyCodes.isLeft(ev.keyCode)) {
                    pointPx.x = pointPx.x - stepSize;
                } else if(wpd.keyCodes.isRight(ev.keyCode)) {
                    pointPx.x = pointPx.x + stepSize;
                } else {
                    return;
                }
                
                measurementData.setPointAt(selectedPt.connectionIndex, selectedPt.pointIndex, pointPx.x, pointPx.y);
                wpd.graphicsWidget.forceHandlerRepaint();
                wpd.graphicsWidget.updateZoomToImagePosn(pointPx.x, pointPx.y);
                ev.preventDefault();
                ev.stopPropagation();
            }
        };
    };
    return Tool;
})();

wpd.MeasurementRepainter = (function () {
    var Painter = function (mode) {
        var ctx = wpd.graphicsWidget.getAllContexts(),

            drawLine = function(sx0, sy0, sx1, sy1, ix0, iy0, ix1, iy1) {

                ctx.dataCtx.beginPath();
                ctx.dataCtx.strokeStyle = "rgb(0,0,10)";
                ctx.dataCtx.moveTo(sx0, sy0);
                ctx.dataCtx.lineTo(sx1, sy1);
                ctx.dataCtx.stroke();

                ctx.oriDataCtx.beginPath();
                ctx.oriDataCtx.strokeStyle = "rgb(0,0,10)";
                ctx.oriDataCtx.moveTo(ix0, iy0);
                ctx.oriDataCtx.lineTo(ix1, iy1);
                ctx.oriDataCtx.stroke();

            },

            drawPoint = function(sx, sy, ix, iy, isSelected) {

                ctx.dataCtx.beginPath();
                if(isSelected) {
                    ctx.dataCtx.fillStyle = "rgb(0, 200, 0)";
                } else {
                    ctx.dataCtx.fillStyle = "rgb(200, 0, 0)";
                }
                ctx.dataCtx.arc(sx, sy, 3, 0, 2.0*Math.PI, true);
                ctx.dataCtx.fill();

                ctx.oriDataCtx.beginPath();
                if(isSelected) {
                    ctx.oriDataCtx.fillStyle = "rgb(0,200,0)";
                } else {
                    ctx.oriDataCtx.fillStyle = "rgb(200,0,0)";
                }
                ctx.oriDataCtx.arc(ix, iy, 3, 0, 2.0*Math.PI, true);
                ctx.oriDataCtx.fill();

            },

            drawArc = function(sx, sy, ix, iy, theta1, theta2) {
                ctx.dataCtx.beginPath();
                ctx.dataCtx.strokeStyle = "rgb(0,0,10)";
                ctx.dataCtx.arc(sx, sy, 15, theta1, theta2, true);
                ctx.dataCtx.stroke();

                ctx.oriDataCtx.beginPath();
                ctx.oriDataCtx.strokeStyle = "rgb(0,0,10)";
                ctx.oriDataCtx.arc(ix, iy, 15, theta1, theta2, true);
                ctx.oriDataCtx.stroke();
            },

            drawLabel = function(sx, sy, ix, iy, lab) {
                var labelWidth;
                
                sx = parseInt(sx, 10);
                sy = parseInt(sy, 10);
                ix = parseInt(ix, 10);
                iy = parseInt(iy, 10);

                ctx.dataCtx.font="14px sans-serif";
                labelWidth = ctx.dataCtx.measureText(lab).width;
                ctx.dataCtx.fillStyle = "rgba(255, 255, 255, 0.7)";
                ctx.dataCtx.fillRect(sx - 5, sy - 15, labelWidth + 10, 25);
                ctx.dataCtx.fillStyle = "rgb(200, 0, 0)";
                ctx.dataCtx.fillText(lab, sx, sy);

                ctx.oriDataCtx.font="14px sans-serif";
                labelWidth = ctx.oriDataCtx.measureText(lab).width;
                ctx.oriDataCtx.fillStyle = "rgba(255, 255, 255, 0.7)";
                ctx.oriDataCtx.fillRect(ix - 5, iy - 15, labelWidth + 10, 25);
                ctx.oriDataCtx.fillStyle = "rgb(200, 0, 0)";
                ctx.oriDataCtx.fillText(lab, ix, iy);
            },
            
            drawDistances = function () {
                var distData = wpd.appData.getPlotData().distanceMeasurementData,
                    conn_count = distData.connectionCount(),
                    conni,
                    plist,
                    x0, y0,
                    x1, y1,
                    spx0, spx1,
                    dist,
                    isSelected0, isSelected1,
                    axes = wpd.appData.getPlotData().axes;

                for(conni = 0; conni < conn_count; conni++) {
                    plist = distData.getConnectionAt(conni);
                    x0 = plist[0]; y0 = plist[1]; x1 = plist[2]; y1 = plist[3];
                    isSelected0 = distData.isPointSelected(conni, 0);
                    isSelected1 = distData.isPointSelected(conni, 1);
                    if(wpd.appData.isAligned() === true && axes instanceof wpd.MapAxes) {
                        dist = 'Dist' + conni.toString() + ': ' + axes.pixelToDataDistance(distData.getDistance(conni)).toFixed(2) + ' ' + axes.getUnits();
                    } else {
                        dist = 'Dist' + conni.toString() + ': ' + distData.getDistance(conni).toFixed(2) + ' px';
                    }
                    spx0 = wpd.graphicsWidget.screenPx(x0, y0);
                    spx1 = wpd.graphicsWidget.screenPx(x1, y1);

                    // draw connecting lines:
                    drawLine(spx0.x, spx0.y, spx1.x, spx1.y, x0, y0, x1, y1);
                    
                    // draw data points:
                    drawPoint(spx0.x, spx0.y, x0, y0, isSelected0);
                    drawPoint(spx1.x, spx1.y, x1, y1, isSelected1);
                    
                    // distance label
                    drawLabel(0.5*(spx0.x + spx1.x), 0.5*(spx0.y + spx1.y), 0.5*(x0 + x1), 0.5*(y0 + y1), dist);
                }
            },
            
            drawAngles = function () {
                var angleData = wpd.appData.getPlotData().angleMeasurementData,
                    conn_count = angleData.connectionCount(),
                    conni,
                    plist,
                    x0, y0, x1, y1, x2, y2,
                    spx0, spx1, spx2,
                    theta1, theta2, theta,
                    isSelected0, isSelected1, isSelected2;
                for(conni = 0; conni < conn_count; conni++) {
                    plist = angleData.getConnectionAt(conni);
                    x0 = plist[0]; y0 = plist[1]; x1 = plist[2]; y1 = plist[3]; x2 = plist[4]; y2 = plist[5];
                    isSelected0 = angleData.isPointSelected(conni, 0);
                    isSelected1 = angleData.isPointSelected(conni, 1);
                    isSelected2 = angleData.isPointSelected(conni, 2);
                    theta = 'Theta' + conni.toString() + ': ' + angleData.getAngle(conni).toFixed(2) + '°';
                    theta1 = Math.atan2((y0 - y1), x0 - x1);
                    theta2 = Math.atan2((y2 - y1), x2 - x1);
                    spx0 = wpd.graphicsWidget.screenPx(x0, y0);
                    spx1 = wpd.graphicsWidget.screenPx(x1, y1);
                    spx2 = wpd.graphicsWidget.screenPx(x2, y2);

                    // draw connecting lines:
                    drawLine(spx0.x, spx0.y, spx1.x, spx1.y, x0, y0, x1, y1);
                    drawLine(spx1.x, spx1.y, spx2.x, spx2.y, x1, y1, x2, y2);

                    // draw data points:
                    drawPoint(spx0.x, spx0.y, x0, y0, isSelected0);
                    drawPoint(spx1.x, spx1.y, x1, y1, isSelected1);
                    drawPoint(spx2.x, spx2.y, x2, y2, isSelected2);

                    // draw angle arc:
                    drawArc(spx1.x, spx1.y, x1, y1, theta1, theta2);

                    // angle label
                    drawLabel(spx1.x + 10, spx1.y + 15, x1 + 10, y1 + 15, theta);
                    
                }
            };

        this.painterName = 'measurementRepainter-'+mode.name;

        this.onAttach = function () {
            wpd.graphicsWidget.resetData();
        };

        this.onRedraw = function () {
            if(mode.name === wpd.measurementModes.distance.name) {
                drawDistances();
            } else if(mode.name === wpd.measurementModes.angle.name) {
                drawAngles();
            }
        };

        this.onForcedRedraw = function () {
            wpd.graphicsWidget.resetData();
            this.onRedraw();
        };
    };
    return Painter;
})();
