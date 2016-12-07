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

Array.prototype.pushArray = function (ar) {
    ar = ar || [];
    for (var i = 0, len = ar.length; i < len; ++i) {
        this.push(ar[i]);
    }
};

wpd.acquireMeanVarianceData = (function () {
    var tool;
    function load() {
        if (!wpd.appData.isAligned()) {
            wpd.messagePopup.show(wpd.gettext('acquire-data'), wpd.gettext('acquire-data-calibration'));
        } else {
            showSidebar();
            wpd.dataPointCounter.setCount();
            wpd.graphicsWidget.removeTool();
            wpd.graphicsWidget.setRepainter(new wpd.DataPointsRepainter());

            tool = new wpd.acquireMeanVarianceData.MeanVarianceSelectionTool();
            wpd.graphicsWidget.setTool(tool);
        }
    }

    //function editLabels() {
    //    wpd.graphicsWidget.setTool(new wpd.EditLabelsTool());
    //}

    function meanVarianceSelection() {
        // var tool = new wpd.acquireMeanVarianceData.MeanVarianceSelectionTool();
        // wpd.graphicsWidget.setTool(tool);
        tool.setMode(tool.modes.createPoints);
    }

    function adjustPoints() {
        // wpd.graphicsWidget.setTool(new wpd.acquireMeanVarianceData.AdjustDataPointTool());
        tool.setMode(tool.modes.adjustPoints);
    }

    function deletePoints() {
        //var tool = new wpd.acquireMeanVarianceData.DeleteDataPointTool();
        //wpd.graphicsWidget.setTool(tool);
        tool.setMode(tool.modes.deletePoints);
    }

    function confirmedClearAll() {
        wpd.appData.getPlotData().getActiveDataSeries().clearAll();
     // wpd.graphicsWidget.removeTool();
        wpd.graphicsWidget.resetData();
     // wpd.dataPointCounter.setCount();
     // wpd.graphicsWidget.removeRepainter();
        tool.buildTable();
    }

    function clearAll() {
        if (wpd.appData.getPlotData().getActiveDataSeries().getCount() <= 0) {
            return;
        }
        wpd.okCancelPopup.show(
            wpd.gettext('clear-data-points'),
            wpd.getTextParams('clear-data-points-text-params', { title: wpd.appData.getPlotData().getActiveDataSeries().name }),
            confirmedClearAll,
            function() {
                tool.buildTable();
            }
        );
    }

    function undo() {
        wpd.appData.getPlotData().getActiveDataSeries().removeLastPixel();
        wpd.graphicsWidget.resetData();
        wpd.graphicsWidget.forceHandlerRepaint();
        wpd.dataPointCounter.setCount();
    }

    function showSidebar() {
        wpd.sidebar.show('meanVarianceSidebar');
        updateDatasetControl();
        updateControlVisibility();
        wpd.dataPointCounter.setCount();
    }

    function updateControlVisibility() {
        var axes = wpd.appData.getPlotData().axes,
            $editLabelsBtn = document.getElementById('edit-data-labels');
        if (axes instanceof wpd.BarAxes) {
            $editLabelsBtn.style.display = 'inline-block';
        } else {
            $editLabelsBtn.style.display = 'none';
        }
    }

    function updateDatasetControl() {
        var plotData = wpd.appData.getPlotData(),
            currentDataset = plotData.getActiveDataSeries(), // just to create a dataset if there is none.
            currentIndex = plotData.getActiveDataSeriesIndex(),
            $datasetList = document.getElementById('manual-sidebar-dataset-list'),
            listHTML = '',
            i;
        for (i = 0; i < plotData.dataSeriesColl.length; i++) {
            listHTML += '<option>' + plotData.dataSeriesColl[i].name + '</option>';
        }
        $datasetList.innerHTML = listHTML;
        $datasetList.selectedIndex = currentIndex;
    }

    function changeDataset($datasetList) {
        var index = $datasetList.selectedIndex;
        wpd.appData.getPlotData().setActiveDataSeriesIndex(index);
        wpd.graphicsWidget.forceHandlerRepaint();
        wpd.dataPointCounter.setCount();
    }

    var toolKeyMap = {
        d: deletePoints,
        a: meanVarianceSelection,
        s: adjustPoints,
        //e: editLabels
    };

    function switchToolOnKeyPress(alphaKey) {
        if (toolKeyMap.hasOwnProperty(alphaKey)) {
            var fun = toolKeyMap[alphaKey];
            if (typeof fun === 'function') {
                fun();
            }
        }
    }

    function isToolSwitchKey(keyCode) {
        var char = wpd.keyCodes.getAlphabet(keyCode);
        var keyMapped = toolKeyMap.hasOwnProperty(char);

        return keyMapped;
    }

    return {
        load: load,
        meanVarianceSelection: meanVarianceSelection,
        adjustPoints: adjustPoints,
        deletePoints: deletePoints,
        clearAll: clearAll,
        undo: undo,
        showSidebar: showSidebar,
        switchToolOnKeyPress: switchToolOnKeyPress,
        isToolSwitchKey: isToolSwitchKey,
        updateDatasetControl: updateDatasetControl,
        changeDataset: changeDataset,
        // editLabels: editLabels
    };
})();

wpd.acquireMeanVarianceData.MeanVarianceSelectionTool = (function () {
    var Tool = function () {
        var self = this;
        var plotData = wpd.appData.getPlotData();
        var $button = $('#mean-variance-select-button');
        var $locked = $('#mean-variance-dataSeriesLocked');

        var $outcomeMeasureList = $('#outcome-measure');
        var $dataStructureList = $('#mean-variance-data-structure');
        var $includeIndividuals = $('#include-individuals');

        var $dataPointCountEditWrapper = $('#mean-variance-dataPointCount-wrapper');
        var $dataPointCountEdit = $('#mean-variance-dataPointCount');
        var $dataSeriesCountEdit = $('#mean-variance-dataSeriesCount');
        var $formContainerHost = $('#mean-variance-formContainerHost');
        var $formContainer = $('#mean-variance-formContainer');
        var $detachFormContainerTrigger = $('#mean-variance-formContainerDetachTrigger');
        var $nestedFormContainer = $('#mean-variance-nestedFormContainer');

        var dataStructures = null,
            outcomeMeasures = null,
            subTableSpecs,
            curOutcomeMeasure,
            nestedSeries = null;

            //nestedSeries = {
            //    belongsTo: // the data series,
            //};

        var dataPopupTitle = "Data extraction", nestedDataPopupTitle = "Subject&nbsp;Data&nbsp;Points";
        var dataPopup = null, nestedDataPopup = null;
        var dataPopupVisible = null, nestedDataPopupVisible = null;

        function getIncludeIndividuals() {
            return $includeIndividuals.is(":checked");
        }

        function showDataPopup() {
            if (!dataPopup) {
                dataPopup = new jBox('Modal', {
                    content: $formContainer,
                    title: dataPopupTitle,
                    closeOnEsc: true,
                    closeButton: 'box',
                    closeOnClick: 'overlay',
                    draggable: "title",
                    overlay: false,
                    pointer: true,
                    position: wpd._config.userSettings.documents[0].dataEntryPopupPosition,
                    onOpen: function () {
                        $formContainerHost.addClass('detached');
                        dataPopupVisible = true;
                    },
                    onClose: function () {
                        if (nestedDataPopupVisible) {
                            hideNestedDataPopup();
                        }
                        dataPopupVisible = false;
                        dataPopup = null;
                        $formContainerHost.append($formContainer).removeClass('detached');
                        var pos = this.wrapper.position();
                        wpd._config.userSettings.documents[0].dataEntryPopupPosition = {
                            x: pos.left,
                            y: pos.top
                        };
                        wpd._config.flushSettings(wpd._config.userSettings);
                    },
                    onPosition: function () {
                        // console.log("onPosition!");
                    },
                    onDragEnd: function () {
                        // console.log("onDragEnd!");
                    },
                    maxHeight: 500,
                    maxWidth: 800,
                    zIndex: 10001
                });
            }
            dataPopup.open();
        }
        function showNestedDataPopup() {
            if (!nestedDataPopup) {
                nestedDataPopup = new jBox('Modal', {
                    content: $nestedFormContainer,
                    title: nestedDataPopupTitle,
                    closeOnEsc: true,
                    closeButton: 'box',
                    closeOnClick: 'overlay',
                    draggable: "title",
                    overlay: false,
                    pointer: true,
                    position: wpd._config.userSettings.documents[0].nestedDataEntryPopupPosition,
                    onOpen: function () {
                        nestedDataPopupVisible = true;
                    },
                    onClose: function () {
                        nestedDataPopup = null;
                        nestedDataPopupVisible = false;
                        $formContainerHost.append($nestedFormContainer);
                        var pos = this.wrapper.position();
                        wpd._config.userSettings.documents[0].nestedDataEntryPopupPosition = {
                            x: pos.left,
                            y: pos.top
                        };
                        wpd._config.flushSettings(wpd._config.userSettings);
                    },
                    onPosition: function () {
                        // console.log("onPosition!");
                    },
                    onDragEnd: function () {
                        // console.log("onDragEnd!");
                    },
                    maxHeight: 150000,
                    maxWidth: 300,
                    zIndex: 10002
                });
            }
            nestedDataPopup.open();
        }
        function hideNestedDataPopup() {
            if (nestedDataPopup) {
                nestedDataPopup.close();
            }
        }

     // var $activeCell = null, $activeNestedCell = null;
        var _$activeCell = null, _$activeNestedCell = null;

        function getActiveCell() {
            return _$activeCell;
        }
        function getActiveNestedCell() {
            return _$activeNestedCell;
        }
        function setActiveCell($cell) {
            console.log([
                "activeCell: '",
                wpd.utils.getElemId(_$activeCell),
                "' -> '",
                wpd.utils.getElemId($cell),
                "' [activeNestedCell: '",
                wpd.utils.getElemId(_$activeNestedCell),
                "']."
            ].join(''));

            _$activeCell = $cell;
            return $cell;
        }
        function setActiveNestedCell($cell) {
            console.log([
                "activeNestedCell: '",
                wpd.utils.getElemId(_$activeNestedCell),
                "' -> '",
                wpd.utils.getElemId($cell),
                "' [activeCell: '",
                wpd.utils.getElemId(_$activeCell),
                "']."
            ].join(''));


            _$activeNestedCell = $cell;
            return $cell;
        }
        var dataPointCount, dataSeriesCount;

        $detachFormContainerTrigger.on({
            click: function () {
                showDataPopup();
                var activeCell = getActiveCell();
                if (activeCell) {
                    var info = getInfo(activeCell);
                    if (info.isSubjectDataPoints) {
                        showNestedDataPopup();
                    }
                }
            }
        });

        this.modes = {
            // modes
            createPoints: "createPoints",
            adjustPoints: "adjustPoints",
            deletePoints: "deletePoints",

            // modifier modes
            selectGroupNames: "selectGroupNames",
            selectSubjectDataPoints: "selectSubjectDataPoints"
        };

        function configureOutcomeMeasures() {
            outcomeMeasures = [{
                id: 'simple-table-capture',
                text: "Simple TableCapture",
                fields: []
            }, {
                id: 'model-experiment',
                text: "Model Characterising",
                fields: [{
                    id: "model_shamPlusVehicle",
                    text: "Sham + Vehicle",
                    isControl: true,
                    css: "model-control"
                }, {
                    id: "model_npPlusVehicle",
                    text: "NP + Vehicle",
                    isControl: false,
                    css: "model-data"
                }]
            }, {
                id: 'intervention-experiment',
                text: "Intervention Testing",
                fields: [
                    {
                        id: "intervention_npPlusVehicle",
                        text: "NP + Vehicle",
                        isControl: true,
                        css: "intervention-control"
                    }, {
                        id: "intervention_npPlusRx",
                        text: "NP + Rx",
                        isControl: false,
                        css: "intervention-data"
                    }
                ]
            }];

            forEachOutcomeMeasure(function(index, om) {
                om.hasFields = (om.fields && om.fields.length > 0);
            });
        }

        function forEachOutcomeMeasure(callback) {
            for (var i = 0; i < outcomeMeasures.length; i++) {
                var om = outcomeMeasures[i];
                if (callback(i, om)) {
                    break;
                }
            }
        }
        function forEachDataStructure(callback) {
            for (var i = 0; i < dataStructures.length; i++) {
                var ds = dataStructures[i];
                if (callback(i, ds)) {
                    break;
                }
            }
        }
        function forEachSubTableSpecField(callback) {
            for (var i = 0; i < subTableSpecs.fields.length; i++) {
                var stsf = subTableSpecs.fields[i];
                if (callback(i, stsf)) {
                    break;
                }
            }
        }

        function configureDataStructures() {
            dataStructures = [
                {
                    id: 'mean-and-standard-error',
                    text: "Mean and Standard Error (SEM)",
                    dataPoints: [{
                        name: "Mean",
                        abbrev: "Mean",
                        css: "mean",
                        isReferencePoint: true
                    }, {
                        name: "Standard Error (upper)",
                        abbrev: "SEM",
                        css: "variance"
                    }]
                }, {
                    id: 'mean-and-standard-deviation',
                    text: "Mean and Standard Deviation (SD)",
                    dataPoints: [{
                        name: "Mean",
                        abbrev: "Mean",
                        css: "mean",
                        isReferencePoint: true
                    }, {
                        name: "Standard Deviation (upper)",
                        abbrev: "SD",
                        css: "variance"
                    }]
                }, {
                    id: 'mean-and-confidence-interval-95',
                    text: "Mean and 95% CI",
                    dataPoints: [{
                        name: "Mean",
                        abbrev: "Mean",
                        css: "mean",
                        isReferencePoint: true
                    }, {
                        name: "95% Confidence range (upper)",
                        abbrev: "CI95",
                        css: "variance"
                    }, {
                            name: "Lower Quartile",
                            abbrev: "Q1",
                                css: "variance"
                    }, {
                            name: "Upper Quartile",
                            abbrev: "Q3",
                            css: "variance"
                        }]
                }, {
                    id: 'mean-and-confidence-interval-99',
                    text: "Mean and 99% CI",
                    varianceAbbrev: "CI99",
                    dataPoints: [{
                        name: "Mean",
                        abbrev: "Mean",
                        css: "mean",
                        isReferencePoint: true
                    }, {
                        name: "99% Confidence range (upper)",
                        abbrev: "CI99",
                        css: "variance"
                    }, {
                        name: "Lower Quartile",
                        abbrev: "Q1",
                        css: "variance"
                    }, {
                        name: "Upper Quartile",
                        abbrev: "Q3",
                        css: "variance"
                    }]
                }, {
                    id: 'median-and-confidence-interval-95',
                    text: "Median and 95% CI",
                    dataPoints: [{
                        name: "Median",
                        abbrev: "Median",
                        css: "mean",
                        isReferencePoint: true
                    }, {
                        name: "95% Confidence range (upper)",
                        abbrev: "CI95",
                        css: "variance"
                    }, {
                        name: "Lower Quartile",
                        abbrev: "Q1",
                        css: "variance"
                    }, {
                        name: "Upper Quartile",
                        abbrev: "Q3",
                        css: "variance"
                    }]
                }, {
                    id: 'median-and-confidence-interval-99',
                    text: "Median and 99% CI",
                    varianceAbbrev: "CI99",
                    dataPoints: [{
                        name: "Median",
                        abbrev: "Median",
                        css: "mean",
                        isReferencePoint: true
                    }, {
                        name: "99% Confidence range (upper)",
                        abbrev: "CI99",
                        css: "variance"
                    }, {
                        name: "Lower Quartile",
                        abbrev: "Q1",
                        css: "variance"
                    }, {
                        name: "Upper Quartile",
                        abbrev: "Q3",
                        css: "variance"
                    }]
                }, {
                    id: 'median-and-interquartile-range',
                    text: "Median and Interquartile Range",
                    dataPoints: [{
                        name: "Median",
                        abbrev: "Median",
                        css: "mean",
                        isReferencePoint: true
                    }, {
                        name: "Lower Quartile",
                        abbrev: "Q1",
                        css: "variance"
                    }, {
                        name: "Upper Quartile",
                        abbrev: "Q3",
                        css: "variance"
                    }]
                }, {
                    id: 'box-and-whisker',
                    text: "Box and whisker plot",
                    dataPoints: [{
                        name: "Median",
                        abbrev: "Median",
                        css: "mean",
                        isReferencePoint: true
                    }, {
                        name: "Lower Quartile",
                        abbrev: "Q1",
                        css: "variance"
                    }, {
                        name: "Uper Quartile",
                        abbrev: "Q3",
                        css: "variance"
                    }, {
                        name: "Lower",
                        abbrev: "Lower",
                        css: "variance"
                    }, {
                        name: "Upper",
                        abbrev: "Upper",
                        css: "variance"
                    }]
                }
            ];

            forEachDataStructure(function(key, ds) {
                ds.dataPoints.splice(0, 0,
                {
                    name: "Subjects in sample",
                    abbrev: "n",
                    isManualEntry: true,
                    css: "subject-count"
                });

                function getDependentFieldsSelector() {
                    var dsc = {};
                    var df = [];
                    for (var i = 0; i < ds.dataPoints.length; i++) {
                        var dp = ds.dataPoints[i];
                        if (!dp.isReferencePoint && !dp.isManualEntry) {
                            dsc[dp.css] = true;
                        }
                    }
                    for (var prop in dsc) {
                        if (dsc.hasOwnProperty(prop)) {
                            df.push("." + prop);
                        }
                    }
                    return df.join(',');
                }

                ds.manualEntryFieldIndex = getManualEntryFieldIndexForDataStructure(ds);
                ds.refPointFieldIndex = getReferencePointFieldIndexForDataStructure(ds);
                ds.dependentFieldsSelector = getDependentFieldsSelector();
            });
        }

        function configureSubTableSpecs() {
            subTableSpecs = { 
                fields: [{
                    title: "Value",
                    css: 'value'
                }, {
                    title: "Count",
                    css: "count",
                    isManualEntry: true
                }]
                // , manualEntryFieldIndex = ?? // generated 
            };

            forEachSubTableSpecField(function(idx, stsf) {
                if (stsf.isManualEntry) {
                    subTableSpecs.manualEntryFieldIndex = idx;
                    return true;
                }
            });
        }

        function getReferencePointFieldIndexForDataStructure(ds) {
            var index = null;

            for (var i = 0; i < ds.dataPoints.length; i++) {
                if (ds.dataPoints[i].isReferencePoint) {
                    index = i;
                    break;
                }
            }
            return index;
        }

        function getManualEntryFieldIndexForDataStructure(ds) {
            var index = null;

            for (var i = 0; i < ds.dataPoints.length; i++) {
                if (ds.dataPoints[i].isManualEntry) {
                    index = i;
                    break;
                }
            }
            return index;
        }

        function populateOutcomeMeasures() {
            $outcomeMeasureList.html("");

            forEachOutcomeMeasure(function(index, om) {
                $outcomeMeasureList.append([
                    "<option id='",
                    om.id,
                    "'>",
                    om.text,
                    "</option>"
                ].join(''));
            });
        }
        function populateDataStructures() {
            $dataStructureList.html("");

            forEachDataStructure(function(index, ds) {
                $dataStructureList.append([
                    "<option id='",
                    ds.id,
                    "'>",
                    ds.text,
                    "</option>"
                ].join(''));
            });
        }

        configureOutcomeMeasures();
        populateOutcomeMeasures();

        configureDataStructures();
        populateDataStructures();

        configureSubTableSpecs();

        // TODO: Be clearer about which things should be done within OnAttach
        $outcomeMeasureList.change();

        this.getOutcomeMeasure = function () {
            var outcomeMeasure = null;
            var option = $outcomeMeasureList.find(':selected')[0];

            forEachOutcomeMeasure(function (index, om) {
                if (option.id === om.id) {
                    outcomeMeasure = om;
                    return true;
                }
            });

            return outcomeMeasure;
        };

        this.getDataStructure = function () {
            var dso = null;
            var option = $dataStructureList.find(':selected')[0];
            var includeIndividuals = getIncludeIndividuals();

            forEachDataStructure(function (index, ds) {
                if (option.id === ds.id) {
                    dso = {
                        dataStructure: ds,
                        includeIndividuals: includeIndividuals,
                        index: index
                    };
                    return true;
                }
            });

            return dso;
        };

        var modeStack = [this.modes.createPoints];
        var modifierMode = null;

        this.pushMode = function (newMode) {
            var oldMode = this.getMode();

            modeStack.push(newMode);
            
            this._applyModeTransition(oldMode, newMode);
            this._showMode();
        };

        this.popMode = function() {
            if (modeStack.length > 1) {
                var oldMode = this.getMode();
                modeStack.splice(-1, 1);
                var newMode = this.getMode();

                this._applyModeTransition(oldMode, newMode);
                this._showMode();
            }
        };

        this.getModifierMode = function() {
            return modifierMode;
        };

        this.setModifierMode = function (newModifier) {
            if (modifierMode !== newModifier) {
                var oldModifier = modifierMode;
                modifierMode = newModifier;

                this._applyModifierModeTransition(oldModifier, newModifier);
                this._showMode();
            }
        };

        this._applyModifierModeTransition = function(oldModifier, newModifier) {
            if (oldModifier !== newModifier) {
                plotData.metaSeries.groupNames.visible = newModifier === this.modes.selectGroupNames;

                wpd.graphicsWidget.forceHandlerRepaint();
                //wpd.graphicsWidget.updateZoomOnEvent(ev);   need the event ev
            }
        };

        this.clearModifierMode = function() {
            var oldModifier = modifierMode;
            modifierMode = null;

            this._applyModifierModeTransition(oldModifier, modifierMode);
            this._showMode();
        };

        this.getMode = function() {
            return modeStack[modeStack.length - 1];
        };

        this.setMode = function (newMode) {
            var curMode = this.getMode();
            if (curMode !== newMode) {
                var oldMode = curMode;
                modeStack = [newMode];

                this._applyModeTransition(oldMode, newMode);
                this._showMode();
            }
        };

        this._showMode = function() {
            var allModeButtons = $('.mean-variance-selection-mode');
            var newModeButton = $('.mean-variance-selection-mode.' +this.getMode());
            var modifierModeInfo = $('#modifier-mode-info');

            allModeButtons.removeClass('pressed-button');
            newModeButton.addClass('pressed-button');
            var mm = this.getModifierMode();
            modifierModeInfo.html(mm ? mm : "");
        };

        this._applyModeTransition = function(oldMode, newMode) {
            if (newMode === this.modes.adjustPoints) {
                wpd.toolbar.show('adjustDataPointsToolbar');
            }
            else if (oldMode === this.modes.adjustPoints) {
                wpd.toolbar.clear();
            }
        };

        function getDependentCells($cell, info) {
            info = info || getInfo($cell);
            var dependentSiblings =
                $cell
                .closest('tr')
                .find(info.dataStructure.dependentFieldsSelector);

            return dependentSiblings;
        }

        function getInfo($edit) {
            var dataInfo = $edit.data('dataInfo');
            var info = {
                dataStructure: dataStructures[$edit.attr('data-structure')],
                dataSeries: $edit.attr('data-series'),
                dataMeasure: $edit.attr('data-measure'),
                dataPoint: $edit.attr('data-point'), // within ds.dataPoints[]

             // isGroupName: $edit.hasClass('group-name'),
                isSeriesName: $edit.hasClass('series-name'),
                isMean: $edit.hasClass('mean'),
                isVariance: $edit.hasClass('variance'),
                isSubjectCount: $edit.hasClass('subject-count'),
                isSubjectDataPoints: $edit.hasClass('subject-data-points'),
                isSubjectDataPointsValue: $edit.hasClass('value'),
                isSubjectDataPointsCount: $edit.hasClass('count'),
                dataIndex: dataInfo ? dataInfo.dataIndex : null,
                tabIndex: $edit.attr('tabindex')
            };
            info.dataSeries = (
                info.isMean ||
                info.isVariance ||
                info.isSubjectDataPoints ||
                info.isSubjectCount
            )
                ? $edit.attr('data-series')
                : null;

            info.dump = function(msg) {
                //var text = [];

                //for (var prop in info) {
                //    if (info.hasOwnProperty(prop)) {
                //        text.push(prop + ": " + info[prop])
                //    }
                //}

                //text = text.join('');

                var text = JSON.stringify(info);

                console.log(msg + "--------" + text);
            };

            return info;
        };
        function dataSeriesNameChangedHandler(seriesIndex, series) {
            var seriesTitleEdit = $([
                "#mean-variance-formContainer input.series-name[data-series='",
                seriesIndex,
                "']"
            ].join(''));
            seriesTitleEdit.val(series.name);
        }

        this.attachedToDom = false;

        this.onAttach = function () {
            if (this.attachedToDom) {
                return;
            }

            $(wpd._config.appContainerElem).on({
                click: function(e) {
                    
                },
                keydown: function(e) {
                    if (wpd.keyCodes.isAlphabet(e.keyCode, 't')) {
                        self.onKeyDown(e);
                    }
                }
            });

            this.attachedToDom = true;
            wpd.dataSeriesManagement.addNameChangeHandler(dataSeriesNameChangedHandler);
            $button.addClass('pressed-button');
            wpd.graphicsWidget.setRepainter(new wpd.DataPointsRepainter());

            $outcomeMeasureList.on('change', outcomeMeasureChanged);
            $dataStructureList.on('change', dataStructureChanged);
            $includeIndividuals.on('change', includeIndividualsChanged);

            $dataPointCountEdit.on('change', dataPointCountChanged);
            $dataSeriesCountEdit.on('change', dataSeriesCountChanged);

            var lockable = [
                $outcomeMeasureList,
                $dataStructureList,
                $includeIndividuals,
                $dataPointCountEdit,
                $dataSeriesCountEdit
            ];
        
            $locked.on({
                change: function (e) {
                    if ($(this).is(':checked')) {
                        $.each(lockable, function(idx, $elem) {
                            //$elem.addClass('disabled');
                            $elem.attr('disabled', 'disabled');
                        });
                    } else {
                        $.each(lockable, function (idx, $elem) {
                            //$elem.removeClass('disabled');
                            $elem.removeAttr('disabled');
                        });
                    }
                }
            });

            $nestedFormContainer.on({
                focus: function(e) {
                    var edit = $(this);
                    // var info = getInfo(edit);
                    var activeNestedCell = getActiveNestedCell();

                    if (activeNestedCell) {
                        activeNestedCell.removeClass('focused');
                    }
                    activeNestedCell = setActiveNestedCell(edit);
                    var activeRow = activeNestedCell.closest('tr');
                    var currentSeries = "current-series";

                    activeRow.closest('table').find('tr').removeClass(currentSeries);
                    activeRow.addClass(currentSeries);

                    edit.addClass('focused');
                },
                change: function(e) {
                    var $edit = $(this);
                    var info = getInfo($edit);

                    if (info.isSubjectDataPointsCount) {
                        var outerSeries = plotData.getActiveDataSeries();
                        var imd = outerSeries.getIndividualMetaData();
                        var counts = imd.counts;
                        var subjectCount = $edit.val();
                        counts[info.dataPoint]= subjectCount;
                    }
                }
            }, '.value,.count');

            $formContainer.on({
                focus: function (e) {
                    var edit = $(this);
                    var info = getInfo(edit);
                    var activeCell = getActiveCell();

                    if (activeCell) {
                        activeCell.removeClass('focused');
                    }
                    activeCell = setActiveCell(edit);
                    var activeRow = activeCell.closest('tr');
                    var currentSeries = "current-series";

                    activeRow.closest('table').find('tr').removeClass(currentSeries);
                    activeRow.addClass(currentSeries);

                    if (info.isGroupName) {
                        self.setModifierMode(self.modes.selectGroupNames);
                    } else {
                        if (self.getModifierMode() === self.modes.selectGroupNames) {
                            self.clearModifierMode();
                        }

                        var ourSeries = activeCell.closest('tr').attr('data-series');
                        $("tr[data-series='" + ourSeries + "'").addClass(currentSeries);
                    }
                    edit.addClass('focused');

                    if (info.isMean || info.isVariance || info.isGroupName || info.isSubjectDataPoints || info.isSubjectCount) {
                        if (info.isMean || info.isVariance || info.isSubjectDataPoints || info.isSubjectCount) {
                            plotData.setActiveDataSeriesIndex(info.dataSeries);
                        }

                        if (info.isSubjectDataPoints) {
                            self.setModifierMode(self.modes.selectSubjectDataPoints);
                            self.buildNestedTable();
                            if (dataPopupVisible && !nestedDataPopupVisible) {
                                showNestedDataPopup();
                            }
                        } else {
                            if (self.getModifierMode() === self.modes.selectSubjectDataPoints) {
                                self.clearModifierMode();
                            }
                            hideNestedDataPopup();

                            var dataSeries = plotData.getActiveDataSeries();
                            dataSeries.unselectAll();
                            if (info.dataIndex != null) {
                                dataSeries.selectPixel(info.dataIndex);
                                var selectedPoint = dataSeries.getPixel(info.dataIndex);
                                if (selectedPoint) {
                                    wpd.graphicsWidget.resetData();
                                    wpd.graphicsWidget.forceHandlerRepaint();
                                    wpd.graphicsWidget.updateZoomToImagePosn(selectedPoint.x, selectedPoint.y);
                                }
                            }
                            else {
                                // wpd.graphicsWidget.forceHandlerRepaint();
                            }
                            wpd.graphicsWidget.forceHandlerRepaint();
                        }
                    }
                    //info.dump("focus - ");
                },
                blur: function (e) {
                },
                keydown: function (e) {
                    var edit = $(this);
                    var info = getInfo(edit);

                    var isBarChart = plotData.axes.dataPointsHaveLabels;
                    var handleSpecialKeys = !info.isSeriesName
                     // !info.isGroupName
                    //   || !isBarChart
                    ;

                    if (handleSpecialKeys && (
                        wpd.keyCodes.isUp(e.keyCode) ||
                        wpd.keyCodes.isDown(e.keyCode) ||
                        wpd.keyCodes.isLeft(e.keyCode) ||
                        wpd.keyCodes.isRight(e.keyCode) ||
                        wpd.keyCodes.isAlphabet(e.keyCode, 'q') ||
                        wpd.keyCodes.isAlphabet(e.keyCode, 'w') ||
                        wpd.keyCodes.isAlphabet(e.keyCode, 't') ||
                        wpd.acquireMeanVarianceData.isToolSwitchKey(e.keyCode)
                    )) {
                        e.preventDefault();
                        self.onKeyDown(e);
                    }
                    if (info.isMean) {
                    } else if (info.isVariance) {
                    }

                    //info.dump("keydown - ");
                },
                change: function (e) {
                    var $edit = $(this);
                    var info = getInfo($edit);
                    if (info.isGroupName) {
                        var groupNames = plotData.metaSeries.groupNames;
                        var label = $edit.val();
                        groupNames.text[info.dataPoint] = label;
                        $edit.attr('title', label);
                    }
                    else if (info.isSubjectCount) {
                        // Store the 'n' value!
                        var series = plotData.getActiveDataSeries();
                        var measureFieldId = curOutcomeMeasure.fields[info.dataMeasure].id;
                        var mfmd = series.getMeasureFieldMetaData(measureFieldId);
                        var nValue = parseInt($edit.val(), 10);
                        mfmd.n = nValue;
                    }
                }
            }, '.series-name,.mean,.variance,.subject-count,.subject-data-points');

            $formContainer.on({
                change: function (e) {
                    var $edit = $(this);
                    var seriesIndex = $edit.attr('data-series');
                    plotData.setActiveDataSeriesIndex(seriesIndex);
                    var series = plotData.getActiveDataSeries();
                    series.name = $edit.val();
                }
            }, '.series-name');

            $outcomeMeasureList.change();
            $dataPointCountEdit.val('2').change();
            $dataSeriesCountEdit.val('4').change();
            showDataPopup();
        };


        function getDataIndex(
            measureIndex,
            dataPointIndex,
            dataStructure
        ) {
            var di = null;
            var ds = dataStructure;
            var dp = ds.dataPoints[dataPointIndex];
            
            if (!dp.isManualEntry) {
                var pointCount = ds.dataPoints.length;
                di =
                    measureIndex * (pointCount - 1) +   // (1)
                    (
                     // dataPointIndex < ds.refPointFieldIndex // TODO: is this correct? should it be the manualEntry field-index? 
                        dataPointIndex < ds.manualEntryFieldIndex // <--- TODO: like this
                            ? dataPointIndex
                            : dataPointIndex - 1        // (1)
                    ); // ignore 'n' column - there's no associcated point
            }

            // Notes:
           //   (1) -1 relates the the single manualEntry dataPoint

            return di;
        }

        function getNestedDataIndex(
            rowIndex,
            stsIndex,
            subTableSpecs
        ) {
            var di = null;

            var stsf = subTableSpecs.fields[stsIndex];
            var stsFieldCount = subTableSpecs.fields.length;

            // pretend manualEntry has data for the purposes of finding its index
            var pretend = true;

            if (!stsf.isManualEntry || pretend) {
                di =
                    rowIndex * (stsFieldCount - 1) +   // (1)
                    (
                        stsIndex < subTableSpecs.manualEntryFieldIndex
                            ? stsIndex
                            : stsIndex - 1    // (1)
                    ); // ignore 'count' column - there's no associcated point
            }

            // Notes:
            //  (1) -1 relates to the single manualEntry subTableSpec

            return di;
        }

        this.buildNestedTable = function () {
            // call this to show the nested table in a popup:
            //  nestedDataPopup.open();

         // var plotData = wpd.appData.getPlotData();
            var outerSeries = plotData.getActiveDataSeries();
            var imd = outerSeries.getIndividualMetaData();
            var individualSeries = imd.series;
            var individualCounts = imd.counts;
            var pointCount = individualSeries.getPixelCount();
            var iterationCount = pointCount + 1;
            var cellSize = 5;
            var p, cellContents, di;

            var html = [
                "<table>",
                    "<thead>",
                        "<tr>",
                            "<th>#</th>"
            ];
            forEachSubTableSpecField(function(s, stsf) {
                html.push("<th>", stsf.title, "</th>");
            });
            html.push(
                    "</tr>",
                    "</thead>",
                    "<tbody>"
            );
            var tabIndex = this.buildTableNextTabIndex;

            for (p = 0; p < iterationCount; p++) {
                html.push(
                    "<tr>",
                        "<td>",
                            (p+1),
                        "</td>"
                );
                forEachSubTableSpecField(function (idx, stsf) {
                    di = getNestedDataIndex(p, idx, subTableSpecs);

                    if (!stsf.isManualEntry) {
                        if (di < pointCount) {
                            cellContents = getNormalizedDataValueY(plotData.getDataPoint(individualSeries.getPixel(di)));
                        } else {
                            cellContents = "";
                        }
                    } else {
                        //if (!individualCounts.hasOwnProperty(di)) {
                        //    individualCounts[di] = 1; // default to "1" ?;
                        //}
                        if (individualCounts.hasOwnProperty(di)) {
                            cellContents = individualCounts[di];
                        } else {
                            cellContents = "";
                        }
                    }

                    html.push(
                        "<td>",
                            "<input ",
                                "type='text' ",
                                stsf.isManualEntry ? "" : "readonly ",
                                "size='", cellSize, "' ",
                                "class='",
                                    stsf.css,
                                "' ",
                                "sub-table-spec'" + idx + "' ",
                                "data-point='", p, "' ",
                                "tabindex='", tabIndex++, "' ",
                                "value='", cellContents, "'",
                        "</td>"
                    );
                });
                html.push("</tr>");
            }

            html = html.join('');

            $nestedFormContainer.html(html);
        };


        // TODO: Update buildTable to add an additional row (individuals) and restrict to one column
        // when gathering individuals plus mean and small v variance, store the data for each group of 
        // individuals as a series and have the mean and small v variance as a series which lives in metaData
        //

        this.buildTable = function () {
            if ($locked.is('checked')) {
                alert("Please uncheck the locked checkbox to change the numbers of series and/or points.");
            }

            // TODO: confirm any potential/actual data-loss when reducing the number or points or series


            //var seriesTitles = $('#mean-variance-formContainer input.series-name')
            //    .map(function () { return $(this).val(); });

            var om = curOutcomeMeasure;
            var dso = this.getDataStructure();
            var ds = dso.dataStructure;
            var ii = dso.includeIndividuals;
         // var dsi = dso.index;
            var pointCount = ds.dataPoints.length;
            var plotData = wpd.appData.getPlotData();

         // plotData.ensureSeriesCount(dataSeriesCount); //, dataPointCount);
         // updateOutcomeMeasureFieldMetaData();

            var seriesCount = plotData.getDataSeriesCount();

            //plotData.setMeasureFieldMetaData();

            var p, s, m, di, series, cellContents;

            var measureCount = om.fields.length;
            var measureIterations = om.hasFields
                ? measureCount
                : ii
                    ? 1
                    : dataPointCount;

            var html = [
                "<table>",
                    "<thead>",
                        "<tr>",
                            "<th>Series</th>"
            ];

            if (om.hasFields) {
                html.push("<th>Measure</th>");
            }

            var seriesTabIndex = 1000;
            var subjectCountTabIndex = seriesTabIndex + dataSeriesCount;
            var cellsTabIndex = subjectCountTabIndex + dataSeriesCount * curOutcomeMeasure.fields.length;
            var tabIndex = null;
            var cellSize = 5, dp;

            for (p = 0; p < pointCount; p++) {
                dp = ds.dataPoints[p];
                if (om.hasFields || !dp.isManualEntry) {
                    html.push(
                        "<th title='",
                            dp.name,
                        "'>",
                            dp.abbrev,
                        "</th>"
                    );
                }
            }
            if (ii) {
                html.push("<th>Subjects</th>");
            }
            html.push(
                "</tr>",
                "</thead>",
                "<tbody>"
            );

            var maxTitleLength = 0;
            for (s = 0; s < seriesCount; s++) {
                var len = plotData.dataSeriesColl[s].name.length;
                if (len > maxTitleLength) {
                    maxTitleLength = len;
                }
            }
            maxTitleLength = Math.min(maxTitleLength, 10);

            for (s = 0; s < dataSeriesCount; s++) {
                series = plotData.dataSeriesColl[s];
                html.push(
                    "<tr data-series='",
                        s,
                    "'>",
                        "<th rowspan='",
                            measureIterations,
                        "'>",
                            "<input ",
                                "type='text' ",
                                "size='", maxTitleLength, "' ",
                                "class='series-name' ",
                                "data-series='", s, "' ",
                                "tabindex='", seriesTabIndex++, "' ",
                                "value='", series.name, "'",
                            ">",
                        "</th>"
                );

                var fromValue, toValue, editable;
                for (m = 0; m < measureIterations; m++) {
                    if (m !== 0) {
                        html.push(
                            "<tr data-series='",
                                s,
                            "'>"
                        );
                    }
                    if (om.hasFields) {
                        html.push(
                            "<td>",
                            om.fields[m].text,
                            "</td>"
                        );
                    }
                    for (p = 0; p < pointCount; p++) {
                        dp = ds.dataPoints[p];
                        di = null;
                        editable = false;

                        if (!dp.isManualEntry) {
                            di = getDataIndex(m, p, ds);

                            if (di < series.getPixelCount()) {
                                if (dp.isReferencePoint) {
                                    fromValue = getNormalizedDataValueY(plotData.getDataPoint(series.getPixel(di)));
                                    cellContents = fromValue;
                                } else {
                                    var offset = p - ds.refPointFieldIndex;
                                    fromValue = getNormalizedDataValueY(plotData.getDataPoint(series.getPixel(di - offset)));
                                    toValue = getNormalizedDataValueY(plotData.getDataPoint(series.getPixel(di)));
                                    cellContents = toValue - fromValue;
                                }
                            } else {
                                cellContents = ""; // TODO: get the 'n' value from store or default if not yet entered
                            }
                            tabIndex = cellsTabIndex++;
                        } else {
                            if (om.hasFields) {
                                // manual entry cell - currently just the 'n' field which is stored in series metaData
                                var mfd = series.seriesMetaData.measureFieldData;
                                var mfdi = mfd[om.fields[m].id];
                                cellContents = mfdi.n;
                                editable = true;
                                tabIndex = subjectCountTabIndex++;
                            }
                        }

                        var drawCell = om.hasFields || !dp.isManualEntry;
                        if (drawCell) {
                            html.push("<td>",
                               "<input ",
                                   "type='text' ",
                                   !editable ? "readonly " : "",
                                   "size='", cellSize, "' ",
                                   "class='",
                                       dp.css,
                                   "' ",
                                   "data-structure='" + dso.index + "' ",
                                   "data-series='", s, "' ",
                                   "data-measure='", m, "' ",
                                   "data-point='", p, "' ",
                                   "tabindex='", tabIndex, "' ",
                                   "value='", cellContents, "'",
                               "></td>"
                            );
                        }
                    }
                    if (ii) {
                        tabIndex = cellsTabIndex++;

                        html.push(
                            "<td><input ",
                                "type='text' ",
                                "readonly ",
                                "size='", cellSize, "' ",
                                "class='subject-data-points' ",
                                "data-structure='" + dso.index + "' ",
                                "data-series='", s, "' ",
                                "data-measure='", m, "' ",
                                "data-point='", p, "' ",
                                "tabindex='", tabIndex, "' ",
                            "></td>"
                        );
                    }
                    html.push("</tr>");
               }
            }
            html.push(
                    "</tbody>",
                "</table>"
            );
            html = html.join('');
            var $table = $(html);
            $formContainer.html($table);

            if (dataPopup) {
                dataPopup._setTitleWidth();
            }

            // Clear out data for all cells
            var cells = $table.find('td.mean,td.variance');
            cells.removeData('dataInfo');

            // Assign dataInfo to each cell with a corresponding pixel
            for (s = 0; s < dataSeriesCount; s++) {
                var pixelCount = series.getPixelCount();
                series = plotData.dataSeriesColl[s];
                for (m = 0; m < measureIterations; m++) {
                    for (p = 0; p < pointCount; p++) {
                        di = getDataIndex(m, p, ds);
                        if (di < pixelCount) {
                            var $cell = getCellForSeriesMeasureAndPoint(
                                s, m, p, ds
                            );
                            $cell.data('dataInfo', {
                                dataIndex: di
                            });
                        }
                    }
                }
            }

            applyTooltips();

            this.buildTableNextTabIndex = cellsTabIndex;

            this.buildNestedTable(); // regenerate tab indices
        }
        function tr(lbl, val) {
            return ["<tr><td>", lbl, "</td><td>", val, "</td></tr>"].join('');
        }
        function applyTooltips() {
            if ($.url().param('demo')) {
                return;
            }
            $formContainer.find('.series-name,t.subject-count,.mean,.variance,.value,.count').jBox('Tooltip', {
                delayOpen: 1500,
                onOpen: function () {
                    var target = this.source[0];
                    var info = getInfo($(target));

                    var html = ["<table class='cell-info'><tbody>"];
                    for (var prop in info) {
                        if (info.hasOwnProperty(prop)) {
                            html.push(tr(prop, info[prop]));
                        }
                    }
                    html.push("</tbody></table>");

                    this.setContent(html.join(''));
                },
                zIndex: 20000,
                maxWidth: 300
            });
        }

        function showDataPointCounterIfNeeded() {
            if (curOutcomeMeasure.hasFields || getIncludeIndividuals()) {
                $dataPointCountEditWrapper.addClass('hidden');
            } else {
                $dataPointCountEditWrapper.removeClass('hidden');
            }
        }

        function updateOutcomeMeasureFieldMetaData() {
            wpd.appData.getPlotData().setMeasureFieldMetaData(curOutcomeMeasure.fields);
        }
        function outcomeMeasureChanged(ev) {
            curOutcomeMeasure = self.getOutcomeMeasure();
            updateOutcomeMeasureFieldMetaData();

            showDataPointCounterIfNeeded();
            //if (curOutcomeMeasure.hasFields) {
            //    $dataPointCountEditWrapper.addClass('hidden');
            //} else {
            //    $dataPointCountEditWrapper.removeClass('hidden');
            //}
            self.buildTable();
        }

        function includeIndividualsChanged(ev) {
            showDataPointCounterIfNeeded();
            self.buildTable();
        }
        function dataStructureChanged(ev) {
            self.buildTable();
        }

        function dataPointCountChanged(ev) {
            dataPointCount = parseInt($dataPointCountEdit.val(), 10);
            self.buildTable();
        };
        function dataSeriesCountChanged(ev) {
            dataSeriesCount = parseInt($dataSeriesCountEdit.val(), 10);
            plotData.ensureSeriesCount(dataSeriesCount); //, dataPointCount);

            updateOutcomeMeasureFieldMetaData();

            self.buildTable();
        }

        function getCellCorrespondingToSelectedPoint(dataSeries, alsoSelect) {
            var spi = dataSeries.getSelectedPixels()[0];
            var sp = spi != null ? dataSeries.getPixel(spi) : null;
            var activeCell = setActiveCell(
                sp
                ? getCellCorrespondingToPoint(dataSeries, sp)
                : null
            );

            if (alsoSelect) {
                selectCell(activeCell);
            }
        }

        function getCellCorrespondingToPoint(dataSeries, point) {
            var meanVarianceInfo = dataSeries.getPixelMetaDataByKey(point, 'meanVarianceInfo');
            var $cell = $([
                "#mean-variance-formContainer input",
                "[tabindex='",
                meanVarianceInfo.tabIndex,
                "']"
            ].join(''));

            return $cell;
        }

        function selectCell($cell) {
            $("#mean-variance-formContainer input.focused").removeClass('focused');
            if ($cell) {
                $cell.addClass('focused');
            }
        }

        function getCellForSeriesMeasureAndPoint(
            seriesIndex, measureIndex, dataPointIndex, dataStructure
        ) {
            var $cell = $([
                "#mean-variance-formContainer td input.",
                    dataStructure.dataPoints[dataPointIndex].css,
                "[data-series='",
                    seriesIndex,
                "'][data-measure='",
                    measureIndex,
                "'][data-point='",
                    dataPointIndex,
                "']"
            ].join(''));

            return $cell;
        }

        function getNormalizedDataValueX(value) {
            if (value.constructor === Array) {
                value = value[0];
            }
            return value;
        }
        function getNormalizedDataValueY(value) {
            if (value.constructor === Array) {
                if (value.length > 1) {
                    value = value[1];
                }
                else if (value.length === 1) {
                    value = value[0];
                }
            }
            return value;
        }

        function getVarianceDisplayValue(meanDataValue, varianceDataValue) {
            meanDataValue = getNormalizedDataValueY(meanDataValue);
            varianceDataValue = getNormalizedDataValueY(varianceDataValue);

            return varianceDataValue - meanDataValue;
        }

        function getCellValue(imagePos, info, plotData, dataSeries) {
            var val = null;

            if (info.isMean) {
                val = getNormalizedDataValueY(plotData.getDataPoint(imagePos));
            }
            else if (info.isVariance) {
                // Get the corresponding mean cell
                var $meanCell = getCellForSeriesMeasureAndPoint(
                    info.dataSeries,
                    info.dataMeasure,
                    info.dataStructure.refPointFieldIndex,
                    info.dataStructure
                );
                var meanInfo = getInfo($meanCell);
                if (meanInfo.dataIndex != null) {
                    var meanImagePos = dataSeries.getPixel(meanInfo.dataIndex);
                    var meanDataPoint = plotData.getDataPoint(meanImagePos);
                    var varianceDataPoint = plotData.getDataPoint(imagePos);

                    val = getVarianceDisplayValue(meanDataPoint, varianceDataPoint);
                } else {
                    alert("Please enter the mean before the error bar");
                }
            }
            else if (info.isSubjectCount) {
                var om = curOutcomeMeasure;
                val = dataSeries.seriesMetaData.measureFieldData[
                    om.fields[info.dataMeasure].id].n;
            }
            else if (info.isSubjectDataPoints) {
                var activeNestedCell = getActiveNestedCell();
                if (activeNestedCell) {
                    var nestedInfo = getInfo(activeNestedCell);
                    if (nestedInfo.isSubjectDataPointsValue) {
                        val = getNormalizedDataValueY(plotData.getDataPoint(imagePos));
                    }
                }
            }
            //else if (info.isGroupName) {
            //    dataPoint = plotData.getDataPoint(imagePos);
            //}
            return val;
        }

        function getActiveSeriesInfo() {
            var activeDataSeries = plotData.getActiveDataSeries();

            var individualDataSeries = self.getModifierMode() === self.modes.selectSubjectDataPoints
                ? activeDataSeries.getIndividualMetaData ().series
                : null;

            var series = individualDataSeries || activeDataSeries;

            return {
                activeDataSeries: activeDataSeries,
                individualDataSeries: individualDataSeries,
                series: series
            };
        }

        function getActiveCellInfo() {
            var activeCell = getActiveCell();
            var activeNestedCell = getActiveNestedCell();
            var cell = activeNestedCell || activeCell;

            return {
                activeCell: activeCell,
                activeNestedCell: activeNestedCell,
                cell: cell
            };
        }

        function createPointsMouseClick(ev, pos, imagePos) {
            var mm = self.getModifierMode();
            var headerMode = mm === self.modes.selectGroupNames;
            var subjectDataPointsMode = mm === self.modes.selectSubjectDataPoints;
            var aci = getActiveCellInfo();

            //var activeCell = getActiveCell();
            //var activeNestedCell = getActiveNestedCell();

            if (aci.activeCell === null || (subjectDataPointsMode && aci.activeNestedCell === null)) { // && activeNestedCell === null) {
                alert(["please select a ",
                    headerMode
                        ? "header"
                        : subjectDataPointsMode
                            ? "subject data point"
                            : "data",
                    " cell before attempting to add a point!"
                ].join(''));

                return;
            }

            var info = getInfo(aci.activeCell);

            var asi = getActiveSeriesInfo(), pointLabel = null;

            if (plotData.axes.dataPointsHaveLabels) { // e.g. Bar charts

                pointLabel = [
                    "S", info.dataSeries, ".",
                    info.dataPoint,
                    (info.isVariance ? "E" : "")
                ].join('');
            }

            // if (blah && confirm ("This group already data - would you like to override it?"))) {}
            if (info.isGroupName || !aci.activeCell.val()) {
                var metaData = { meanVarianceInfo: info };

                if (plotData.axes.dataPointsHaveLabels) {
                    metaData.label = pointLabel;
                }
                var dataIndex = asi.series.addPixel(imagePos.x, imagePos.y, metaData);
                wpd.graphicsHelper.drawPoint(imagePos, "rgb(200,0,0)", pointLabel);

                var dataPointView = getCellValue(imagePos, info, plotData, asi.series);


                $locked.attr('checked', 'checked').trigger('change');
                aci.cell.val(dataPointView);

                aci.cell.data('dataInfo',
                {
                    dataIndex: dataIndex
                });
                var curTabIndex = aci.cell.prop('tabindex');
                var nextTabIndex = curTabIndex + 1;

                self.buildNestedTable();
                var next = $("[tabindex='" + nextTabIndex + "']");
                next.focus().select();
            } else {
                // TODO: Change to a confirm and add the point if 'Yes'
                alert("This cell already has data!");
            }

            wpd.graphicsWidget.updateZoomOnEvent(ev);
            wpd.dataPointCounter.setCount();

            //// If shiftkey was pressed while clicking on a point that has a label (e.g. bar charts),
            //// then show a popup to edit the label
            //if (plotData.axes.dataPointsHaveLabels && ev.shiftKey) {
            //    wpd.dataPointLabelEditor.show(si.series, si.series.getCount() - 1, this);
            //}
        }
        function adjustPointsMouseClick(ev, pos, imagePos) {
            var dataSeries = wpd.appData.getPlotData().getActiveDataSeries();
            dataSeries.unselectAll();
            dataSeries.selectNearestPixel(imagePos.x, imagePos.y);

            getCellCorrespondingToSelectedPoint(dataSeries, true);

            wpd.graphicsWidget.forceHandlerRepaint();
            wpd.graphicsWidget.updateZoomOnEvent(ev);
        }
        function deletePointsMouseClick(ev, pos, imagePos) {
            var activeDataSeries = plotData.getActiveDataSeries();
            var activeCell = getActiveCell();

            var pixelIndex = activeDataSeries.findNearestPixel(imagePos.x, imagePos.y);
            if (pixelIndex >= 0) {
                activeDataSeries.unselectAll();
                activeDataSeries.selectPixel(pixelIndex);
                getCellCorrespondingToSelectedPoint(activeDataSeries, true);
                activeCell.val('');

                activeDataSeries.removePixelAtIndex(pixelIndex);
                wpd.graphicsWidget.resetData();
                wpd.graphicsWidget.forceHandlerRepaint();
                wpd.graphicsWidget.updateZoomOnEvent(ev);
                wpd.dataPointCounter.setCount();
            }
        }
        this.onMouseClick = function (ev, pos, imagePos) {
            switch (this.getMode()) {
                case this.modes.createPoints:
                    createPointsMouseClick(ev, pos, imagePos);
                    break;
                case this.modes.adjustPoints:
                    adjustPointsMouseClick(ev, pos, imagePos);
                    break;
                case this.modes.deletePoints:
                    deletePointsMouseClick(ev, pos, imagePos);
                    break;
            }
        };

        this.onRemove = function () {
            wpd.dataSeriesManagement.removeNameChangedHandler(dataSeriesNameChangedHandler);
            $button.removeClass('pressed-button');
        };

        function createPointsKeyDown(ev) {
            var $target = $(ev.target);
            var fromEdit = $target.hasClass('mean')
                || $target.hasClass('variance')
             // || $target.hasClass('group-name');

            if (fromEdit) {
                // Don't support modifying points etc if the keydown came from a mean/variance/groupName edit
                ev.preventDefault();
                return;
            }

            var activeDataSeries = plotData.getActiveDataSeries(),
                lastPtIndex = activeDataSeries.getCount() - 1,
                lastPt = activeDataSeries.getPixel(lastPtIndex),
                stepSize = 0.5 / wpd.graphicsWidget.getZoomRatio();

            if (wpd.keyCodes.isUp(ev.keyCode)) {
                lastPt.y = lastPt.y - stepSize;
            } else if (wpd.keyCodes.isDown(ev.keyCode)) {
                lastPt.y = lastPt.y + stepSize;
            } else if (wpd.keyCodes.isLeft(ev.keyCode)) {
                lastPt.x = lastPt.x - stepSize;
            } else if (wpd.keyCodes.isRight(ev.keyCode)) {
                lastPt.x = lastPt.x + stepSize;
            } else {
                return;
            }

            activeDataSeries.setPixelAt(lastPtIndex, lastPt.x, lastPt.y);
            wpd.graphicsWidget.resetData();
            wpd.graphicsWidget.forceHandlerRepaint();
            wpd.graphicsWidget.updateZoomToImagePosn(lastPt.x, lastPt.y);
            ev.preventDefault();
        }
        function adjustPointsKeyDown(ev) {
            var activeDataSeries = wpd.appData.getPlotData().getActiveDataSeries(),
                selIndex = activeDataSeries.getSelectedPixels()[0];

            if (selIndex == null) { return; }

            var selPoint = activeDataSeries.getPixel(selIndex);
            if (!selPoint) { return; }

            var pointPx = selPoint.x,
                pointPy = selPoint.y,
                stepSize = ev.shiftKey === true ? 5 / wpd.graphicsWidget.getZoomRatio() : 0.5 / wpd.graphicsWidget.getZoomRatio(),
                activeCell = getActiveCell();

            getCellCorrespondingToSelectedPoint(activeDataSeries, true);

            if (wpd.keyCodes.isUp(ev.keyCode)) {
                pointPy = pointPy - stepSize;
            } else if (wpd.keyCodes.isDown(ev.keyCode)) {
                pointPy = pointPy + stepSize;
            } else if (wpd.keyCodes.isLeft(ev.keyCode)) {
                pointPx = pointPx - stepSize;
            } else if (wpd.keyCodes.isRight(ev.keyCode)) {
                pointPx = pointPx + stepSize;
            } else if (wpd.keyCodes.isAlphabet(ev.keyCode, 'q')) {
                activeDataSeries.selectPreviousPixel();
                selIndex = activeDataSeries.getSelectedPixels()[0];
                selPoint = activeDataSeries.getPixel(selIndex);
                getCellCorrespondingToSelectedPoint(activeDataSeries, true);
                pointPx = selPoint.x;
                pointPy = selPoint.y;
            } else if (wpd.keyCodes.isAlphabet(ev.keyCode, 'w')) {
                activeDataSeries.selectNextPixel();
                selIndex = activeDataSeries.getSelectedPixels()[0];
                selPoint = activeDataSeries.getPixel(selIndex);
                getCellCorrespondingToSelectedPoint(activeDataSeries, true);
                pointPx = selPoint.x;
                pointPy = selPoint.y;
            } else if (wpd.keyCodes.isAlphabet(ev.keyCode, 'e')) {
                if (wpd.appData.getPlotData().axes.dataPointsHaveLabels) {
                    selIndex = activeDataSeries.getSelectedPixels()[0];
                    ev.preventDefault();
                    ev.stopPropagation();
                    wpd.dataPointLabelEditor.show(activeDataSeries, selIndex, this);
                    return;
                }
            } else if (wpd.keyCodes.isDel(ev.keyCode) || wpd.keyCodes.isBackspace(ev.keyCode)) {
                activeDataSeries.removePixelAtIndex(selIndex);
                activeDataSeries.unselectAll();
                if (activeDataSeries.findNearestPixel(pointPx, pointPy) >= 0) {
                    activeDataSeries.selectNearestPixel(pointPx, pointPy);
                    selIndex = activeDataSeries.getSelectedPixels()[0];
                    selPoint = activeDataSeries.getPixel(selIndex);
                    pointPx = selPoint.x;
                    pointPy = selPoint.y;
                }
                getCellCorrespondingToSelectedPoint(activeDataSeries, true);
                wpd.graphicsWidget.resetData();
                wpd.graphicsWidget.forceHandlerRepaint();
                wpd.graphicsWidget.updateZoomToImagePosn(pointPx, pointPy);
                wpd.dataPointCounter.setCount();
                ev.preventDefault();
                ev.stopPropagation();
                return;
            } else {
                return;
            }

            activeDataSeries.setPixelAt(selIndex, pointPx, pointPy);
            wpd.graphicsWidget.forceHandlerRepaint();
            wpd.graphicsWidget.updateZoomToImagePosn(pointPx, pointPy);
            ev.preventDefault();
            ev.stopPropagation();


            // Update table
            if (activeCell) {
                var info = getInfo(activeCell);

                var plotData = wpd.appData.getPlotData();

                var dataPointView = getCellValue({ x: pointPx, y: pointPy }, info, plotData, activeDataSeries);
                activeCell.val(dataPointView);

                if (info.isMean) {
                    // also adjust dependent cells
                    var $dependentCells = getDependentCells(activeCell, info);
                    $dependentCells.each(function (idx, cell) {
                        var $depCell = $(cell);
                        var depInfo = getInfo($depCell);
                        if (depInfo.dataIndex !== null) {
                            var depPixel = activeDataSeries.getPixel(depInfo.dataIndex);
                            dataPointView = getCellValue(depPixel, depInfo, plotData, activeDataSeries);
                            $depCell.val(dataPointView);
                        }
                    });
                }
            }
        }
        function deletePointsKeyDown(ev) {

        }
        this.onKeyDown = function (ev) {
            if (wpd.acquireMeanVarianceData.isToolSwitchKey(ev.keyCode)) {
                wpd.acquireMeanVarianceData.switchToolOnKeyPress(String.fromCharCode(ev.keyCode).toLowerCase());
                return;
            } else {
                if (wpd.keyCodes.isAlphabet(ev.keyCode, 't')) {
                    if (ev.eventPhase === 1) {
                        return;
                    }
                    // toggle display of points
                    plotData.toggleShowPoints();
                    wpd.graphicsWidget.forceHandlerRepaint();
                } else {
                    switch (this.getMode()) {
                        case this.modes.createPoints:
                            createPointsKeyDown(ev);
                            break;
                        case this.modes.adjustPoints:
                            adjustPointsKeyDown(ev);
                            break;
                        case this.modes.deletePoints:
                            deletePointsKeyDown(ev);
                            break;
                        }
                }
            }
        };
    };
    return Tool;
})();

/*wpd.acquireMeanVarianceData.DeleteDataPointTool = (function () {
    var Tool = function () {
        var ctx = wpd.graphicsWidget.getAllContexts(),
            plotData = wpd.appData.getPlotData(),
            $button = $('#mean-variance-delete-point-button');

        this.onAttach = function () {
            $button.addClass('pressed-button');
            wpd.graphicsWidget.setRepainter(new wpd.DataPointsRepainter());
        };

        this.onMouseClick = function(ev, pos, imagePos) {
            //var activeDataSeries = plotData.getActiveDataSeries();
            //activeDataSeries.removeNearestPixel(imagePos.x, imagePos.y);
            //wpd.graphicsWidget.resetData();
            //wpd.graphicsWidget.forceHandlerRepaint();
            //wpd.graphicsWidget.updateZoomOnEvent(ev);
            //wpd.dataPointCounter.setCount();
        };

        this.onKeyDown = function (ev) {
            if(wpd.acquireMeanVarianceData.isToolSwitchKey(ev.keyCode)) {
                wpd.acquireMeanVarianceData.switchToolOnKeyPress(String.fromCharCode(ev.keyCode).toLowerCase());
            }
        };

        this.onRemove = function () {
            $button.removeClass('pressed-button');
        };
    };
    return Tool;
})();*/

wpd.DataPointsRepainter = (function () {
    var Painter = function () {

        var drawPoints = function () {
            var plotData = wpd.appData.getPlotData();
            if (!plotData.showPoints) { return; }
            var activeDataSeries = plotData.getActiveDataSeries(),
                dindex,
                imagePos,
                fillStyle,
                textStrokeStyle,
                pointStrokeStyle,
                isSelected,
             // mkeys = activeDataSeries.getMetadataKeys(),
                hasLabels = false,
                pointLabel,
                blue = "rgb(0, 0, 255)",
                red = "rgb(255,0,0)",
                black = "rgb(0,0,0)",
                white = "rgb(255,255,255)";

            if (plotData.axes.dataPointsHaveLabels) { // && mkeys != null && mkeys[0] === 'Label') {
                hasLabels = true;
            }

            for (dindex = 0; dindex < activeDataSeries.getCount() ; dindex++) {
                imagePos = activeDataSeries.getPixel(dindex);
                isSelected = activeDataSeries.getSelectedPixels().indexOf(dindex) >= 0;
                var metaDataInfo = activeDataSeries.getPixelMetaDataByKey(imagePos, 'meanVarianceInfo');
                if (metaDataInfo) {
                    var isMean = metaDataInfo.isMean;
                    var isVariance = metaDataInfo.isVariance;

                    fillStyle = isMean ? blue : red;
                } else {
                    if (isSelected) {
                        fillStyle = "rgb(0,200,0)";
                    } else {
                        fillStyle = "rgb(200,0,0)";
                    }
                }
                textStrokeStyle = white;
                pointStrokeStyle = [
                    { style: white, width: 1 },
                    { style: black, width: 1 }
                ];

                if (isSelected) {
                    pointStrokeStyle.push(
                        { style: white, width: 1 },
                        { style: black, width: 1 },
                        { style: fillStyle, width: 2 },
                        { style: white, width: 1 }
                    );
                }

                var pointRadius;
                if (hasLabels) {
                    pointLabel = activeDataSeries.getPixelMetaDataByKey(imagePos, 'Label');
                    wpd.graphicsHelper.drawPoint(imagePos, fillStyle, pointLabel, textStrokeStyle, pointStrokeStyle, pointRadius);
                } else {
                    wpd.graphicsHelper.drawPoint(imagePos, fillStyle, null, textStrokeStyle, pointStrokeStyle, pointRadius);
                }
            }
        };

        this.painterName = 'meanVarianceDataPointsRepainter';

        this.onAttach = function () {
            wpd.graphicsWidget.resetData();
            drawPoints();
        };

        this.onRedraw = function () {
            drawPoints();
        };

        this.onForcedRedraw = function () {
            wpd.graphicsWidget.resetData();
            drawPoints();
        };
    };
    return Painter;
})();

wpd.dataPointCounter = (function () {
    function setCount() {
        var $counters = wpd._config.appContainerElem.getElementsByClassName('data-point-counter'),
            ci;
        for (ci = 0; ci < $counters.length; ci++) {
            $counters[ci].innerHTML = wpd.appData.getPlotData().getActiveDataSeries().getCount();
        }
    }

    return {
        setCount: setCount
    };
})();

