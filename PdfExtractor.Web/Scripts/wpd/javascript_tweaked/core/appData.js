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
// maintain and manage current state of the application
wpd.appData = (function () {
    var isAligned = false,
        plotData;

    function reset() {
        if (wpd._config.wpdPlotMemento) {
            wpd.appData.setMemento(wpd._config.wpdPlotMemento);
        } else {
            isAligned = false;
            plotData = null;
        }
    }

    function getPlotData() {
        if(plotData == null) {
            plotData = new wpd.PlotData();
        }
        return plotData;
    }
    
    function setMemento(memento) {
        //memento = memento || {};
        //memento.plotData = memento.plotData || new wpd.PlotData();
        //memento.isAligned = memento.isAligned || false;

        //plotData = memento.plotData;
        //isAligned = memento.isAligned;

        //wpd.graphicsWidget.forceHandlerRepaint();
        //wpd.autoExtraction.updateDatasetControl();
        //wpd.acquireData.updateDatasetControl();
        //wpd.dataPointCounter.setCount();

        wpd.alignAxes.applyMemento(memento.alignAxes);
    }

    function getMemento() {
        //if (plotData == null) {
        //    plotData = new wpd.PlotData();
        //}
        //return { plotData: plotData, isAligned: isAligned };

        return {
            alignAxes: wpd.alignAxes.getMemento()
        };
    }

    function isAlignedFn(is_aligned) {
        if(is_aligned != null) {
            isAligned = is_aligned;
        }
        return isAligned;
    }

    function plotLoaded(imageData) {
        getPlotData().topColors = wpd.colorAnalyzer.getTopColors(imageData);
    }

    return {
        isAligned: isAlignedFn,
        getPlotData: getPlotData,

        getMemento: getMemento,
        setMemento: setMemento,

        reset: reset,
        plotLoaded: plotLoaded
    };
})();
