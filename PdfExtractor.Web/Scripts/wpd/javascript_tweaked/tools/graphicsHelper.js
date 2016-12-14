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

wpd.graphicsHelper = (function () {

    // imagePx - relative to original image
    // fillStyle - e.g. "rgb(200,0,0)"
    // label - e.g. "Bar 0"
    function drawPoint(imagePx, fillStyle, label, textStrokeStyle, pointStrokeStyles, radius) {
        textStrokeStyle = textStrokeStyle || "rgb(255, 255, 255)";
        pointStrokeStyles = pointStrokeStyles || {};
        pointStrokeStyles.default =
            pointStrokeStyles.default
            || [{ style: "rgb(255, 255, 255)", width: 1 }];
        pointStrokeStyles.orig = pointStrokeStyles.orig || pointStrokeStyles.default;

        radius = radius || 2;

        var screenPx = wpd.graphicsWidget.screenPx(imagePx.x, imagePx.y),
            ctx = wpd.graphicsWidget.getAllContexts(),
            labelWidth;

        function doDraw(context, point, isOrigDataContext) {
            // Display Data Canvas Layer
            if(label != null) {
                context.font = "15px sans-serif";
                if (!isOrigDataContext) {
                    labelWidth = context.measureText(label).width;
                }
                context.fillStyle = "rgba(255, 255, 255, 0.7)";
                if (!isOrigDataContext) {
                    context.fillRect(point.x - 13, point.y - 8, labelWidth + 5, 35);
                }
                context.fillStyle = fillStyle;
                context.strokeStyle = textStrokeStyle;
                context.lineWidth = 3;
                context.strokeText(label, point.x - 10, point.y + 18);
                context.fillText(label, point.x - 10, point.y + 18);
            }

            var pss = isOrigDataContext
                ? pointStrokeStyles.orig
                : pointStrokeStyles.default;

            var r = radius + pss.reduce(function (a, b) {
                return { width: a.width + b.width };
            }, { width: 0 }).width;

            for (var i = pss.length - 1; i >= 0; i--) {
                var ss = pss[i];
                if (
                    !isOrigDataContext ||
                    (ss.hasOwnProperty('onZoom') && ss.onZoom)) {
                    context.beginPath();
                    context.strokeStyle = ss.style;
                    context.lineWidth = ss.width;
                    context.arc(point.x, point.y, r, 0, 2.0 * Math.PI, true);
                    r -= ss.width;
                    context.stroke();
                }
            }

            context.beginPath();
            context.fillStyle = fillStyle;
            context.arc(point.x, point.y, radius, 0, 2.0 * Math.PI, true);
            context.fill();
        }

        doDraw(ctx.dataCtx, screenPx, false);
        doDraw(ctx.oriDataCtx, imagePx, true);
        

        //// Original Image Data Canvas Layer
        //if(label != null) {
        //    // No translucent background for text here.
        //    ctx.oriDataCtx.font = "15px sans-serif";
        //    ctx.oriDataCtx.fillStyle = fillStyle;
        //    ctx.oriDataCtx.fillText(label, imagePx.x - 10, imagePx.y + 18);
        //}

        //ctx.oriDataCtx.beginPath();
        //ctx.oriDataCtx.fillStyle = fillStyle;
        //ctx.oriDataCtx.strokeStyle = strokeStyle;
        //ctx.oriDataCtx.arc(imagePx.x, imagePx.y, radius, 0, 2.0*Math.PI, true);
        //ctx.oriDataCtx.fill();
        //ctx.oriDataCtx.stroke();
    }

    return {
        drawPoint : drawPoint
    };

})();
