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

wpd.utils = (function () {

    var colors = ["red", "green", "blue", "yellow"],
        index = 0;
    var getColor = function () {
        index >= colors.length && (index = 0);
        return colors[index++];
    }

    function notice(content, color) {
        new jBox("Notice",
        {
            content: content,
            offset: {
                y: 50
            },
            autoClose: 2000,
            color: color || getColor(),
            animation: "flip",
            attributes: {
                x: "left",
                y: "top"
            },
            audio: "http://code.jboxcdn.com/audio/bling2",
            volume: 15,
            delayClose: 2000
        });
    }

    function _$(elem) {
        var ret = null;
        if (elem != null) {
            ret = elem instanceof jQuery
                ? elem[0]
                : elem;
        }

        return ret;
    }
    function getElemId(elem) {
        elem = _$(elem);

        if (!elem) {
            elem = "null";

            return elem;
        }
        var info = [elem.tagName];
        if (elem.id) {
            info.push("#", elem.id);
        }
        if (elem.className) {
            info.push(".", elem.className);
        }
        if (info.length === 1) {
            info.push(elem.innerHtml);
        }
        info = info.join('');

        return info;
    }

    function bindMemberFunctions(obj) {
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                var val = obj[prop];
                if (typeof val === 'function') {
                    obj[prop] = val.bind(obj);
                }
            }
        }
    }

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function populateDatasetControl(datasetList) {
        datasetList = _$(datasetList);
        var plotData = wpd.appData.getPlotData(),
            currentDataset = plotData.getActiveDataSeries(), // just to create a dataset if there is none.
            currentIndex = plotData.getActiveDataSeriesIndex(),
            listHtml = [],
            i;

        for (i = 0; i < plotData.dataSeriesColl.length; i++) {
            listHtml.push(
                '<option',
                i === currentIndex ? " selected" : "",
                '>',
                plotData.dataSeriesColl[i].name,
                '</option>'
            );
        }
        datasetList.innerHTML = listHtml.join('');
        //datasetList.selectedIndex = currentIndex;
    }

    function getDevOptions() {
        var options = {}, url = $.url();

        if (url.param('dev-grid')) {
            options.grid = true;
        }
        if (url.param('dev-old-image-extraction')) {
            options.oldImageExtraction = true;
        }

        return options;
    }

    return {
        notice: notice,
        getElemId: getElemId,
        _$: _$,
        bindMemberFunctions: bindMemberFunctions,
        deepClone: deepClone,
        populateDatasetControl: populateDatasetControl,
        getDevOptions: getDevOptions
    };

})();
