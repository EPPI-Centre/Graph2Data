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
wpd.dataMask = (function () {

    function grabMask() {
        // Mask is just a list of pixels with the yellow color in the data layer
        var ctx = wpd.graphicsWidget.getAllContexts(),
            imageSize = wpd.graphicsWidget.getImageSize(),
            maskDataPx = ctx.oriDataCtx.getImageData(0, 0, imageSize.width, imageSize.height),
            maskData = [],
            i,
            mi = 0,
            autoDetector = wpd.appData.getPlotData().getAutoDetector();
        for(i = 0; i < maskDataPx.data.length; i+=4) {
            if (maskDataPx.data[i] === 255 && maskDataPx.data[i+1] === 255 && maskDataPx.data[i+2] === 0) {
                maskData[mi] = i/4; mi++;
            }
        }
        autoDetector.mask = maskData;
    }

    function markBox() {
        var tool = new wpd.BoxMaskTool();
        wpd.graphicsWidget.setTool(tool);
    }

    function markPen() {
        var tool = new wpd.PenMaskTool();
        wpd.graphicsWidget.setTool(tool);
    }

    function eraseMarks() {
        var tool = new wpd.EraseMaskTool();
        wpd.graphicsWidget.setTool(tool);
    }

    function viewMask() {
        var tool = new wpd.ViewMaskTool();
        wpd.graphicsWidget.setTool(tool);
    }

    function clearMask() {
        wpd.graphicsWidget.resetData();
        grabMask();
    }

    return {
        grabMask: grabMask,
        markBox: markBox,
        markPen: markPen,
        eraseMarks: eraseMarks,
        viewMask: viewMask,
        clearMask: clearMask
    };
})();

wpd.BoxMaskTool = (function () {
    var Tool = function () {
        var isDrawing = false,
            topImageCorner,
            topScreenCorner,
            ctx = wpd.graphicsWidget.getAllContexts(),
            moveTimer,
            screen_pos,

            mouseMoveHandler = function() {
                wpd.graphicsWidget.resetHover();
                ctx.hoverCtx.strokeStyle = "rgb(0,0,0)";
    		ctx.hoverCtx.strokeRect(topScreenCorner.x, topScreenCorner.y, screen_pos.x - topScreenCorner.x, screen_pos.y - topScreenCorner.y);
            },
            
            mouseUpHandler = function (ev, pos, imagePos) {
                if(isDrawing === false) {
                    return;
                }
                clearTimeout(moveTimer);
                isDrawing = false;
                wpd.graphicsWidget.resetHover();
                ctx.dataCtx.fillStyle = "rgba(255,255,0,1)";
                ctx.dataCtx.fillRect(topScreenCorner.x, topScreenCorner.y, pos.x-topScreenCorner.x, pos.y-topScreenCorner.y);
                ctx.oriDataCtx.fillStyle = "rgba(255,255,0,1)";
                ctx.oriDataCtx.fillRect(topImageCorner.x, topImageCorner.y, imagePos.x - topImageCorner.x, imagePos.y - topImageCorner.y);
            },
            
            mouseOutPos = null,
            mouseOutImagePos = null;

        this.onAttach = function () {
            wpd.graphicsWidget.setRepainter(new wpd.MaskPainter());
            document.getElementById('box-mask').classList.add('pressed-button');
            document.getElementById('view-mask').classList.add('pressed-button');
        };

        this.onMouseDown = function(ev, pos, imagePos) {
            if(isDrawing === true) return;
            isDrawing = true;
            topImageCorner = imagePos;
            topScreenCorner = pos;
        };

        this.onMouseMove = function(ev, pos, imagePos) {
            if(isDrawing === false) return;
            screen_pos = pos;
            clearTimeout(moveTimer);
            moveTimer = setTimeout(mouseMoveHandler, 2);
        };

        this.onMouseOut = function (ev, pos, imagePos) {
            if(isDrawing === true) {
                clearTimeout(moveTimer);
                mouseOutPos = pos;
                mouseOutImagePos = imagePos;
            }
        };

        this.onDocumentMouseUp = function(ev, pos, imagePos) {
            if (mouseOutPos != null && mouseOutImagePos != null) {
                mouseUpHandler(ev, mouseOutPos, mouseOutImagePos);
            } else {
                mouseUpHandler(ev, pos, imagePos);
            }
            mouseOutPos = null;
            mouseOutImagePos = null;
        };

        this.onMouseUp = function(ev, pos, imagePos) {
            mouseUpHandler(ev, pos, imagePos);
        };

        this.onRemove = function () {
            document.getElementById('box-mask').classList.remove('pressed-button');
            document.getElementById('view-mask').classList.remove('pressed-button');
            wpd.dataMask.grabMask();
        };
    };
    return Tool;
})();

wpd.PenMaskTool = (function () {
    var Tool = function () {
        var strokeWidth,
            ctx = wpd.graphicsWidget.getAllContexts(),
            isDrawing = false,
            moveTimer,
            screen_pos, image_pos,
            mouseMoveHandler = function() {
                ctx.dataCtx.strokeStyle = "rgba(255,255,0,1)";
        	ctx.dataCtx.lineTo(screen_pos.x,screen_pos.y);
                ctx.dataCtx.stroke();

                ctx.oriDataCtx.strokeStyle = "rgba(255,255,0,1)";
        	ctx.oriDataCtx.lineTo(image_pos.x,image_pos.y);
                ctx.oriDataCtx.stroke();
            };

        this.onAttach = function () {
            wpd.graphicsWidget.setRepainter(new wpd.MaskPainter());
            document.getElementById('pen-mask').classList.add('pressed-button');
            document.getElementById('view-mask').classList.add('pressed-button');
            wpd.toolbar.show('paintToolbar');
        };

        this.onMouseDown = function(ev, pos, imagePos) {
            if(isDrawing === true) return;
            var lwidth = parseInt(document.getElementById('paintThickness').value, 10);
            isDrawing = true;
            ctx.dataCtx.strokeStyle = "rgba(255,255,0,1)";
            ctx.dataCtx.lineWidth = lwidth*wpd.graphicsWidget.getZoomRatio();
	    ctx.dataCtx.beginPath();
            ctx.dataCtx.moveTo(pos.x,pos.y);

            ctx.oriDataCtx.strokeStyle = "rgba(255,255,0,1)";
            ctx.oriDataCtx.lineWidth = lwidth;
	    ctx.oriDataCtx.beginPath();
            ctx.oriDataCtx.moveTo(imagePos.x,imagePos.y);
        };

        this.onMouseMove = function(ev, pos, imagePos) {
            if(isDrawing === false) return;
            screen_pos = pos;
            image_pos = imagePos;
            clearTimeout(moveTimer);
            moveTimer = setTimeout(mouseMoveHandler, 2);
        };

        this.onMouseUp = function(ev, pos, imagePos) {
            clearTimeout(moveTimer);
            ctx.dataCtx.closePath();
            ctx.dataCtx.lineWidth = 1;
            ctx.oriDataCtx.closePath();
            ctx.oriDataCtx.lineWidth = 1;
            isDrawing = false;
        };
        
        this.onMouseOut = function(ev, pos, imagePos) {
            this.onMouseUp(ev, pos, imagePos);
        };

        this.onRemove = function() {
            document.getElementById('pen-mask').classList.remove('pressed-button');
            document.getElementById('view-mask').classList.remove('pressed-button');
            wpd.dataMask.grabMask();
            wpd.toolbar.clear();
        };

    };
    return Tool;
})();

wpd.EraseMaskTool = (function () {
    var Tool = function() {
        var strokeWidth,
            ctx = wpd.graphicsWidget.getAllContexts(),
            isDrawing = false,
            moveTimer,
            screen_pos, image_pos,
            mouseMoveHandler = function() {

                ctx.dataCtx.globalCompositeOperation = "destination-out";
                ctx.oriDataCtx.globalCompositeOperation = "destination-out";
                
                ctx.dataCtx.strokeStyle = "rgba(255,255,0,1)";
                ctx.dataCtx.lineTo(screen_pos.x,screen_pos.y);
                ctx.dataCtx.stroke();
                
                ctx.oriDataCtx.strokeStyle = "rgba(255,255,0,1)";
                ctx.oriDataCtx.lineTo(image_pos.x,image_pos.y);
                ctx.oriDataCtx.stroke();
            };

        this.onAttach = function() {
             wpd.graphicsWidget.setRepainter(new wpd.MaskPainter());
             document.getElementById('erase-mask').classList.add('pressed-button');
             document.getElementById('view-mask').classList.add('pressed-button');
             wpd.toolbar.show('eraseToolbar');
        };

        this.onMouseDown = function(ev, pos, imagePos) {
            if(isDrawing === true) return;
            var lwidth = parseInt(document.getElementById('eraseThickness').value, 10);
            isDrawing = true;
            ctx.dataCtx.globalCompositeOperation = "destination-out";
            ctx.oriDataCtx.globalCompositeOperation = "destination-out";

            ctx.dataCtx.strokeStyle = "rgba(0,0,0,1)";
            ctx.dataCtx.lineWidth = lwidth*wpd.graphicsWidget.getZoomRatio();
            ctx.dataCtx.beginPath();
            ctx.dataCtx.moveTo(pos.x,pos.y);

            ctx.oriDataCtx.strokeStyle = "rgba(0,0,0,1)";
            ctx.oriDataCtx.lineWidth = lwidth;
            ctx.oriDataCtx.beginPath();
            ctx.oriDataCtx.moveTo(imagePos.x,imagePos.y);
        };

        this.onMouseMove = function(ev, pos, imagePos) {
            if(isDrawing === false) return;
            screen_pos = pos;
            image_pos = imagePos;
            clearTimeout(moveTimer);
            moveTimer = setTimeout(mouseMoveHandler, 2);
        };

        this.onMouseOut = function(ev, pos, imagePos) {
            this.onMouseUp(ev, pos, imagePos);
        };

        this.onMouseUp = function(ev, pos, imagePos) {
            clearTimeout(moveTimer);
            ctx.dataCtx.closePath();
            ctx.dataCtx.lineWidth = 1;
            ctx.oriDataCtx.closePath();
            ctx.oriDataCtx.lineWidth = 1;

            ctx.dataCtx.globalCompositeOperation = "source-over";
            ctx.oriDataCtx.globalCompositeOperation = "source-over";

            isDrawing = false;
        };

        this.onRemove = function() {
            document.getElementById('erase-mask').classList.remove('pressed-button');
            document.getElementById('view-mask').classList.remove('pressed-button');
            wpd.dataMask.grabMask();
            wpd.toolbar.clear();
        };
       
    };
    return Tool;
})();

wpd.ViewMaskTool = (function() {

    var Tool = function() {

        this.onAttach = function () {
            wpd.graphicsWidget.setRepainter(new wpd.MaskPainter());
            document.getElementById('view-mask').classList.add('pressed-button');
        };

        this.onRemove = function () {
            document.getElementById('view-mask').classList.remove('pressed-button');
            wpd.dataMask.grabMask();
        };
    };

    return Tool;
})();

wpd.MaskPainter = (function() {
    var Painter = function () {

        var ctx = wpd.graphicsWidget.getAllContexts(),
            autoDetector = wpd.appData.getPlotData().getAutoDetector(),
            painter = function () {
                if(autoDetector.mask == null || autoDetector.mask.length === 0) {
                    return;
                }
                var maski, img_index,
                    imageSize = wpd.graphicsWidget.getImageSize();
                    imgData = ctx.oriDataCtx.getImageData(0, 0, imageSize.width, imageSize.height);

                for(maski = 0; maski < autoDetector.mask.length; maski++) {
                    img_index = autoDetector.mask[maski];
                    imgData.data[img_index*4] = 255;
                    imgData.data[img_index*4+1] = 255;
                    imgData.data[img_index*4+2] = 0;
                    imgData.data[img_index*4+3] = 255;
                }

                ctx.oriDataCtx.putImageData(imgData, 0, 0);
                wpd.graphicsWidget.copyImageDataLayerToScreen();
            };

        this.painterName = 'dataMaskPainter';

        this.onRedraw = function () {
            wpd.dataMask.grabMask();
            painter();
        };

        this.onAttach = function () {
            wpd.graphicsWidget.resetData();
            painter();
        };
    };
    return Painter;
})();
