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
        var $showGrid = $('#show-grid');
        var $snapToGridX = $('#snap-to-grid-x');
        var $snapToGridY = $('#snap-to-grid-y');
        var $gridEditX = $('#grid-edit-x');
        var $gridEditY = $('#grid-edit-y');

        var dataStructures = wpd._config.profileSettings.dataStructures;
        var gridSettings = {
            show: true,
            snap: {
                x: true,
                y: false
            },
            _dimensions: {
                x: 100,
                y: 100
            },
            _pixelDimensions: {
                x: 0,
                y: 0
            },
            _origin: {},

            getDimensions: function() {
                return {
                    x: this._dimensions.x,
                    y: this._dimensions.y
                };
            },
            dumpPoint: function(msg, p) {
                console.log(msg + p.x.toFixed(2) + "," + p.y.toFixed(2));
            },
            setDimensions: function (d) {
                this._dimensions.x = d.x;
                this._dimensions.y = d.y;

                this.inferPixelDimensions();
            },
            inferPixelDimensions: function() {
                this._origin = plotData.getPixelPoint({ x: 0, y: 0 });
                this._origin = wpd.graphicsWidget.screenPx(this._origin.x, this._origin.y);

                var point = plotData.getPixelPoint(this._dimensions);
                point = wpd.graphicsWidget.screenPx(point.x, point.y);
                var offset = { x: point.x - this._origin.x, y: point.y - this._origin.y };
                this._pixelDimensions = offset;
            },
            getPixelDimensions: function () {
                return {
                    x: this._pixelDimensions.x,
                    y: this._pixelDimensions.y
                };
            },
            //setPixelDimensions: function (d) {
            //    this._pixelDimensions = d;
            //},
            quantize: function (point) {
                function q(val, dim) {
                    return Math.round(val / dim) * dim;
                }
                if (this.snap.x) {
                    point.x =
                        q(point.x - this._origin.x, this._pixelDimensions.x)
                        + this._origin.x;
                }
                if (this.snap.y) {
                    point.y =
                        q(point.y - this._origin.y, this._pixelDimensions.y)
                        + this._origin.y;
                }
            }
        };

        wpd.graphicsWidget.setGridSettingsFactory(function() {
            return gridSettings;
        });

        wpd.utils.bindMemberFunctions(gridSettings);

            var
         // outcomeMeasures = wpd._config.profileSettings.outcomeMeasures,
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

        function hideAllDataPopups() {
            $.each([
                dataPopup,
                nestedDataPopup
            ], function (idx, pu) {
                if (pu) {
                    pu.close();
                }
            });
        }

        function showDataPopup() {
         // if (dataPopup != null) {
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
                    maxHeight: 250,
                    maxWidth: 800
                });
            }
            dataPopup.open();
        }
        function focusNextAvailableValueCell() {
            var $available = self.findNextAvaialbleNestedValueCell();
            selectCell($available);
        }

        function showNestedDataPopup() {
            var zIndex = dataPopup.wrapper.css("zIndex");

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
                        setActiveNestedCell(null);
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
                    maxHeight: 250,
                    maxWidth: 300,
                    zIndex: zIndex + 1
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
        var currentSeriesClassName = "current-series";
        var focusedClassName = 'focused';
        function setActiveCell($cell) {
            //console.log([
            //    "activeCell: '",
            //    wpd.utils.getElemId(_$activeCell),
            //    "' -> '",
            //    wpd.utils.getElemId($cell),
            //    "' [activeNestedCell: '",
            //    wpd.utils.getElemId(_$activeNestedCell),
            //    "']."
            //].join(''));

            var info = getInfo($cell);
            if (_$activeCell) {
                _$activeCell.removeClass(focusedClassName);
            }

            _$activeCell = $cell;

            if (_$activeCell) {
                _$activeCell.addClass(focusedClassName);

                var activeRow = _$activeCell.closest('tr');
                activeRow.closest('table').find('tr').removeClass(currentSeriesClassName);
                activeRow.addClass(currentSeriesClassName);

                if (!info.is.groupName) {
                    var ourSeries = _$activeCell.closest('tr').attr('data-series');
                    $("tr[data-series='" + ourSeries + "'").addClass(currentSeriesClassName);
                }

            }

            return _$activeCell;
        }
        function setActiveNestedCell($cell) {
            //console.log([
            //    "activeNestedCell: '",
            //    wpd.utils.getElemId(_$activeNestedCell),
            //    "' -> '",
            //    wpd.utils.getElemId($cell),
            //    "' [activeCell: '",
            //    wpd.utils.getElemId(_$activeCell),
            //    "']."
            //].join(''));

            if (_$activeNestedCell) {
                _$activeNestedCell.removeClass('focused');
            }

            _$activeNestedCell = $cell;

            if (_$activeNestedCell) {
                _$activeNestedCell.addClass(focusedClassName);

                var activeRow = _$activeNestedCell.closest('tr');
                activeRow.closest('table').find('tr').removeClass(currentSeriesClassName);
                activeRow.addClass(currentSeriesClassName);
            }

            return _$activeNestedCell;
        }

        var dataPointCount, dataSeriesCount;

        $detachFormContainerTrigger.on({
            click: function () {
                showDataPopup();
                var activeCell = getActiveCell();
                if (activeCell) {
                    var info = getInfo(activeCell);
                    if (info.is.subjectDataPoints) {
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

        function forEachSubTableSpecField(callback) {
            for (var i = 0; i < subTableSpecs.fields.length; i++) {
                var stsf = subTableSpecs.fields[i];
                if (callback(i, stsf)) {
                    break;
                }
            }
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

        function populateOutcomeMeasures() {
            $outcomeMeasureList.html("");

            wpd._config.profileSettings.forEachOutcomeMeasure(function (index, om) {
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

            wpd._config.profileSettings.forEachDataStructure(function(index, ds) {
                $dataStructureList.append([
                    "<option id='",
                    ds.id,
                    "'>",
                    ds.text,
                    "</option>"
                ].join(''));
            });
        }

        function showCheckboxSetting($cb, isChecked) {
            if (isChecked) {
                $cb.attr('checked', 'checked');
            } else {
                $cb.removeAttr('checked');
            }
        }
        function showEditSetting($edit, value) {
            $edit.val(value).change();
        }

        function forceExtendedCrosshairAsRequired() {
            wpd.graphicsWidget.setExtendedCrosshair(
                gridSettings.snap.x || gridSettings.snap.y
            );
        }

        function populateGridSettings() {
            showCheckboxSetting($showGrid, gridSettings.show);
            showCheckboxSetting($snapToGridX, gridSettings.snap.x);
            showCheckboxSetting($snapToGridY, gridSettings.snap.y);
            var dim = gridSettings.getDimensions();
            showEditSetting($gridEditX, dim.x);
            showEditSetting($gridEditY, dim.y);

            forceExtendedCrosshairAsRequired();
        }

        populateOutcomeMeasures();
        populateDataStructures();
        populateGridSettings();
        configureSubTableSpecs();

        // TODO: Be clearer about which things should be done within OnAttach
        $outcomeMeasureList.change();

        this.getOutcomeMeasure = function () {
            var outcomeMeasure = null;
            var option = $outcomeMeasureList.find(':selected')[0];

            wpd._config.profileSettings.forEachOutcomeMeasure(function (index, om) {
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

            wpd._config.profileSettings.forEachDataStructure(function (index, ds) {
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
            var isConfig = {
                groupName: 'group-name',
                seriesName: 'series-name',
                mean: 'mean',
                variance: 'variance',
                subjectCount: 'subject-count',
                subjectDataPoints: 'subject-data-points',
                subjectDataPointsValue: 'value',
                subjectDataPointsCount: 'count'
            };
            var info = {
                dataStructure: dataStructures[$edit.attr('data-structure')],
                dataSeries: $edit.attr('data-series'),
                dataMeasure: $edit.attr('data-measure'),
                dataPoint: $edit.attr('data-point'), // within ds.dataPoints[]

                dataIndex: dataInfo ? dataInfo.dataIndex : null,
                tabIndex: $edit.attr('tabindex')
                // , isName: "mean" // for example - to be set later
                // , is: { prop names from isConfig - values are bool } // set later
            };

            info.is = {};
            for (var prop in isConfig) {
                if (isConfig.hasOwnProperty(prop)) {
                    var yes = $edit.hasClass(isConfig[prop]);
                    info.is[prop] = yes;
                    if (yes) {
                        info.isName = prop;
                        break;
                    }
                }
            }

            info.dataSeries = (
                info.is.mean ||
                info.is.variance ||
                info.is.subjectDataPoints ||
                info.is.subjectCount
            )
                ? $edit.attr('data-series')
                : null;

            info.summarize = function() {
                var html = [
                    "<table class='cell-info'><tbody>",
                    info.dataStructure
                        ? tr("dataStructure", info.dataStructure.text)
                        : "",
                    tr("s / m / p", [
                        (info.dataSeries  ? info.dataSeries  : "-"),
                        (info.dataMeasure ? info.dataMeasure : "-"),
                        (info.dataPoint   ? info.dataPoint   : "-")
                    ].join(' / ')),

                    tr("is", info.isName),
                    tr("dataIndex", info.dataIndex),
                    tr("tabIndex", info.tabIndex)
                ];
                html.push("</tbody></table>");

                return html.join('');
            };

            info.dump = function(msg) {
                var text = JSON.stringify(info);

             // console.log(msg + "--------" + text);
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

            $showGrid.on('change', showGridChanged);
            $snapToGridX.on('change', snapToGridChanged);
            $snapToGridY.on('change', snapToGridChanged);
            $gridEditX.on('change', gridDimensionsChanged);
            $gridEditY.on('change', gridDimensionsChanged);


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

            var config = {
                focus: function (e) {
                    var edit = $(this);
                    var info = getInfo(edit);
                    setActiveCell(edit);

                    if (info.is.groupName) {
                        self.setModifierMode(self.modes.selectGroupNames);
                    } else {
                        if (self.getModifierMode() === self.modes.selectGroupNames) {
                            self.clearModifierMode();
                        }
                    }
                 // edit.addClass('focused');

                    if (info.is.mean ||
                        info.is.variance ||
                     // info.is.groupName ||
                        info.is.subjectDataPoints ||
                        info.is.subjectCount) {
                        if (info.is.mean || info.is.variance || info.is.subjectDataPoints || info.is.subjectCount) {
                            plotData.setActiveDataSeriesIndex(info.dataSeries);
                        }

                        if (info.is.subjectDataPoints) {
                            self.setModifierMode(self.modes.selectSubjectDataPoints);
                            self.buildNestedTable();
                            $nestedFormContainer.removeClass('hidden');
                            if (dataPopupVisible && !nestedDataPopupVisible) {
                                showNestedDataPopup();
                            }
                            focusNextAvailableValueCell();
                            wpd.graphicsWidget.forceHandlerRepaint();
                        } else {
                            if (self.getModifierMode() === self.modes.selectSubjectDataPoints) {
                                self.clearModifierMode();
                            }
                            hideNestedDataPopup();
                            $nestedFormContainer.addClass('hidden');

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
                            } else {
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
                    var handleSpecialKeys = !info.is.seriesName;

                    if (handleSpecialKeys &&
                    (
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
                },
                change: function (e) {
                    var $edit = $(this);
                    var info = getInfo($edit);
                    if (info.is.groupName) {
                        var groupNames = plotData.metaSeries.groupNames;
                        var label = $edit.val();
                        groupNames.text[info.dataPoint] = label;
                        $edit.attr('title', label);
                    } else if (info.is.subjectCount) {
                        // Store the 'n' value!
                        var series = plotData.getActiveDataSeries();
                        var measureFieldId = curOutcomeMeasure.fields[info.dataMeasure].id;
                        var mfmd = series.getMeasureFieldMetaData(measureFieldId);
                        var nValue = parseInt($edit.val(), 10);
                        mfmd.n = nValue;
                    }
                }
            };
            var nestedConfig = {
                focus: function(e) {
                    var edit = $(this);
                    var info = getInfo(edit);

                    setActiveNestedCell(edit);

                    if (info.is.subjectDataPointsValue) {
                        if (info.dataSeries) {
                            plotData.setActiveDataSeriesIndex(info.dataSeries);
                        }

                        var asi = self.getActiveSeriesInfo();
                     // var dataSeries = plotData.getActiveDataSeries();
                        var dataSeries = asi.series;
                        dataSeries.unselectAll();

                        if (info.dataIndex != null) {
                            dataSeries.selectPixel(info.dataIndex);
                            var selectedPoint = dataSeries.getPixel(info.dataIndex);
                            if (selectedPoint) {
                                wpd.graphicsWidget.resetData();
                                wpd.graphicsWidget.forceHandlerRepaint();
                                wpd.graphicsWidget.updateZoomToImagePosn(selectedPoint.x, selectedPoint.y);
                            }
                        } else {
                            // wpd.graphicsWidget.forceHandlerRepaint();
                        }
                        wpd.graphicsWidget.forceHandlerRepaint();
                    }
                },
                change: function(e) {
                    var $edit = $(this);
                    var info = getInfo($edit);

                    if (info.is.subjectDataPointsCount) {
                        var outerSeries = plotData.getActiveDataSeries();
                        var imd = outerSeries.getIndividualMetaData();
                        var counts = imd.counts;
                        var subjectCount = $edit.val();
                        counts[info.dataPoint] = subjectCount;
                    }
                }
            };
            nestedConfig.spinchange = nestedConfig.change;
            nestedConfig.keydown = config.keydown;

            $nestedFormContainer.on(nestedConfig, '.value,.count');
            $formContainer.on(config, '.series-name,.mean,.variance,.subject-count,.subject-data-points');

            $formContainer.on({
                change: function (e) {
                    var $edit = $(this);
                    var seriesIndex = $edit.attr('data-series');
                    plotData.setActiveDataSeriesIndex(seriesIndex);
                    var series = plotData.getActiveDataSeries();
                    series.name = $edit.val();
                }
            }, '.series-name');

            function applyProfile(profile) {
                $outcomeMeasureList
                    .find('option#' + profile.outcomeMeasureId)
                    .attr('selected', 'selected')
                    .change();

                $dataStructureList
                    .find('option#' + profile.dataStructureId)
                    .attr('selected', 'selected')
                    .change();

                if (profile.includeIndividuals) {
                    $includeIndividuals
                        .attr('checked', 'checked')
                        .trigger('change');
                } else {
                    $includeIndividuals
                        .removeAttr('checked')
                        .trigger('change');
                }

                $dataSeriesCountEdit
                    .val(profile.dataSeriesCount)
                    .change();

                $dataPointCountEdit
                    .val(profile.dataPointCount)
                    .change();

                lock();
            }

            applyProfile(wpd._config.profileSettings.getProfile());

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

        this.findNextAvaialbleNestedValueCell = function() {
            var outerSeries = plotData.getActiveDataSeries();
            var imd = outerSeries.getIndividualMetaData();
            var individualSeries = imd.series;
            var pointCount = individualSeries.getPixelCount();
            var iterationCount = pointCount + 1;
            var di, pixel;
            var $avail = null;

            for (p = 0; p < iterationCount; p++) {
                forEachSubTableSpecField(function(idx, stsf) {
                    di = getNestedDataIndex(p, idx, subTableSpecs);
                    if (!stsf.isManualEntry) {
                        if (di >= pointCount) {
                            if (p === (iterationCount - 1)) {
                                var valueEdits = $nestedFormContainer.find("." + stsf.css);
                                var tabIndices = valueEdits.map(function() {
                                    return $(this).attr('tabindex');
                                });
                                var maxTabIndex = Math.max.apply(null, tabIndices);
                                $avail = getCellWithTabIndex(maxTabIndex);

                            } else {
                                pixel = $(individualSeries.getPixel(p));
                                $avail = getCellCorrespondingToPoint(individualSeries, pixel);
                            }
                            return true;
                        }
                    }
                });
            }

            return $avail;
        };
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
                                "sub-table-spec='" + idx + "' ",
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
            $nestedFormContainer.find('.count').spinner({ min: 1 });

            // Clear out data for all cells
            var cells = $nestedFormContainer.find('td.value');
            cells.removeData('dataInfo');

            var stsIndex = 0;

            // Assign dataInfo to each nested value-cell with a corresponding pixel
            for (p = 0; p < pointCount; p++) {
                di = getNestedDataIndex(p, stsIndex, subTableSpecs);
                var $cell = getNestedCellForPointAndSts(
                    p, stsIndex, subTableSpecs
                );
                $cell.data('dataInfo', {
                    dataIndex: di
                });
            }

            applyTooltips();

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

            var editTooltipConfig = {
                delayOpen: 0,
             // delayClose: 600000,
                onOpen: function() {
                    var target = this.source[0];
                    var $target = $(target);
                    var info = getInfo($target);
                 // $target.addClass('tooltip-showing');

                    this.setContent(info.summarize());

                    if (dataPopup) {
                        var zIndex = Math.max(
                            dataPopup.wrapper.css("zIndex"),
                            nestedDataPopup ? nestedDataPopup.wrapper.css("zIndex") : 0
                        );

                        this.wrapper.css({ zIndex: zIndex + 1 });
                    }
                },
                onClose: function() {
                 // var target = this.source[0];
                 // var $target = $(target);
                 // $target.removeClass('tooltip-showing');
                },
                zIndex: 20000,
                maxWidth: 300
            };
            $formContainer
                .find('.series-name,.subject-count,.mean,.variance,.subject-data-points')
                .jBox('Tooltip', editTooltipConfig);

            $nestedFormContainer
                .find('.value,.count')
                .jBox('Tooltip', editTooltipConfig);
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
        function showGridChanged(ev) {
            gridSettings.show = $showGrid.is(':checked');
        }
        function snapToGridChanged(ev) {
            gridSettings.snap.x = $snapToGridX.is(':checked');
            gridSettings.snap.y = $snapToGridY.is(':checked');

            forceExtendedCrosshairAsRequired();
        }
        function gridDimensionsChanged(ev) {
            gridSettings.setDimensions({
                x: parseInt($gridEditX.val(), 10),
                y: parseInt($gridEditY.val(), 10)
            });

            var dim = gridSettings.getDimensions();
            var pxDim = gridSettings.getPixelDimensions();
            console.log([
                dim.x.toFixed(2),
                ",",
                dim.y.toFixed(2),
                " -> ",
                pxDim.x.toFixed(2),
                ",",
                pxDim.y.toFixed(2)
            ].join(''));
        }
        function dataSeriesCountChanged(ev) {
            dataSeriesCount = parseInt($dataSeriesCountEdit.val(), 10);
            plotData.ensureSeriesCount(dataSeriesCount); //, dataPointCount);

            updateOutcomeMeasureFieldMetaData();

            self.buildTable();
        }

        function getCellCorrespondingToSelectedPoint(dataSeries) {
            var spi = dataSeries.getSelectedPixels()[0];
            var sp = spi != null ? dataSeries.getPixel(spi) : null;
            var activeCell = setActiveCell(
                sp
                ? getCellCorrespondingToPoint(dataSeries, sp)
                : null
            );

            return activeCell;
        }

        function getCellWithTabIndex(tabIndex) {
            var $cell = $([
                ".table-container input",
                "[tabindex='",
                    tabIndex,
                "']"
                ].join(''));

            return $cell;
                }

        function getCellCorrespondingToPoint(dataSeries, point) {
            var meanVarianceInfo = dataSeries.getPixelMetaDataByKey(point, 'meanVarianceInfo');
            var $cell = $([
             // "#mean-variance-formContainer input",
                ".table-container input",
                "[tabindex='",
                    meanVarianceInfo.tabIndex,
                "']"
            ].join(''));

            return $cell;
        }

        function selectCell($cell) {
            $(".table-container input.focused").removeClass('focused');
            if ($cell) {
                $cell.addClass('focused');
                $cell.focus().select();
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

        function getNestedCellForPointAndSts(
            pointIndex, stsIndex, subTableSpecs
        ) {
            var sts = subTableSpecs.fields[stsIndex];

            var $cell = $([
                "#mean-variance-nestedFormContainer td input.",
                    sts.css,
                "[sub-table-spec='",
                    stsIndex,
                "'][data-point='",
                    pointIndex,
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

            if (info.is.mean) {
                val = getNormalizedDataValueY(plotData.getDataPoint(imagePos));
            }
            else if (info.is.variance) {
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
            else if (info.is.subjectCount) {
                var om = curOutcomeMeasure;
                val = dataSeries.seriesMetaData.measureFieldData[
                    om.fields[info.dataMeasure].id].n;
            }
            else if (info.is.subjectDataPoints) {
                var activeNestedCell = getActiveNestedCell();
                if (activeNestedCell) {
                    var nestedInfo = getInfo(activeNestedCell);
                    if (nestedInfo.is.subjectDataPointsValue) {
                        val = getNormalizedDataValueY(plotData.getDataPoint(imagePos));
                    }
                }
            }
            else if (info.is.subjectDataPointsValue) {
                val = getNormalizedDataValueY(plotData.getDataPoint(imagePos));
            }
            //else if (info.is.groupName) {
            //    dataPoint = plotData.getDataPoint(imagePos);
            //}
            return val;
        }

        this.getActiveSeriesInfo = function () {
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

        function getModeInfo() {
            var mm = self.getModifierMode();
            var headerMode = mm === self.modes.selectGroupNames;
            var subjectDataPointsMode = mm === self.modes.selectSubjectDataPoints;

            return {
                headerMode: headerMode,
                subjectDataPointsMode: subjectDataPointsMode
            };
        }

        function lock() {
            $locked
                .attr('checked', 'checked')
                .trigger('change');
        }

        function createPointsMouseClick(ev, pos, imagePos) {
            var mi = getModeInfo();
            var aci = getActiveCellInfo();

            if (aci.activeCell === null || (mi.subjectDataPointsMode && aci.activeNestedCell === null)) { // && activeNestedCell === null) {
                alert(["please select a ",
                    mi.headerMode
                        ? "header"
                        : mi.subjectDataPointsMode
                            ? "subject data point"
                            : "data",
                    " cell before attempting to add a point!"
                ].join(''));

                return;
            }

            var info = getInfo(aci.cell);

            var asi = self.getActiveSeriesInfo(), pointLabel = null;

            //if (plotData.axes.dataPointsHaveLabels) { // e.g. Bar charts

            //    pointLabel = [
            //        "S", info.dataSeries, ".",
            //        info.dataPoint,
            //        (info.is.variance ? "E" : "")
            //    ].join('');
            //}

            // if (blah && confirm ("This group already data - would you like to override it?"))) {}
            if (info.is.groupName || !aci.activeCell.val()) {
                var metaData = { meanVarianceInfo: info };

                //if (plotData.axes.dataPointsHaveLabels) {
                //    metaData.label = pointLabel;
                //}

                imagePos = wpd.graphicsWidget.screenPx(imagePos.x, imagePos.y);
                gridSettings.quantize(imagePos);
                imagePos = wpd.graphicsWidget.imagePx(imagePos.x, imagePos.y);

                var dataIndex = asi.series.addPixel(imagePos.x, imagePos.y, metaData);

                //wpd.graphicsHelper.drawPoint(imagePos, "rgb(200,0,0)", pointLabel);
                wpd.graphicsWidget.forceHandlerRepaint(); // draw points from the painter only

                var dataPointView = getCellValue(imagePos, info, plotData, asi.series);

                lock();
                aci.cell.val(dataPointView);

                aci.cell.data('dataInfo',
                {
                    dataIndex: dataIndex
                });
                var curTabIndex = aci.cell.prop('tabindex');
                var nextTabIndex = curTabIndex + 1;

                self.buildNestedTable();
                var $next = $("[tabindex='" + nextTabIndex + "']");
                selectCell ($next);
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

            var cell = getCellCorrespondingToSelectedPoint(dataSeries);
            selectCell(cell);

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
                var cell = getCellCorrespondingToSelectedPoint(activeDataSeries);
                selectCell(cell);

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

            var asi = self.getActiveSeriesInfo();
            var activeDataSeries = asi.series;
            // var activeDataSeries = wpd.appData.getPlotData().getActiveDataSeries();

            var selIndex = activeDataSeries.getSelectedPixels()[0];

            if (selIndex == null) { return; }

            var selPoint = activeDataSeries.getPixel(selIndex);
            if (!selPoint) { return; }

            var pointPx = selPoint.x,
                pointPy = selPoint.y,
                stepSize = ev.shiftKey === true ? 5 / wpd.graphicsWidget.getZoomRatio() : 0.5 / wpd.graphicsWidget.getZoomRatio(),
                aci = getActiveCellInfo(),
                activeCell = aci.cell,
                cell;

            cell = getCellCorrespondingToSelectedPoint(activeDataSeries);
            selectCell(cell);

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
                cell = getCellCorrespondingToSelectedPoint(activeDataSeries);
                selectCell(cell);

                pointPx = selPoint.x;
                pointPy = selPoint.y;
            } else if (wpd.keyCodes.isAlphabet(ev.keyCode, 'w')) {
                activeDataSeries.selectNextPixel();
                selIndex = activeDataSeries.getSelectedPixels()[0];
                selPoint = activeDataSeries.getPixel(selIndex);
                cell = getCellCorrespondingToSelectedPoint(activeDataSeries);
                selectCell(cell);

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
                cell = getCellCorrespondingToSelectedPoint(activeDataSeries);
                selectCell(cell);

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

                if (info.is.mean) {
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

        function doDraw(series) {
            var plotData = wpd.appData.getPlotData();
            if (!plotData.showPoints) { return; }
            var dindex,
                imagePos,
                fillStyle,
                textStrokeStyle,
                pointStrokeStyle,
                isSelected,
                hasLabels = false,
                pointLabel,
                blue = "rgb(0, 0, 255)",
                red = "rgb(255,0,0)",
                black = "rgb(0,0,0)",
                white = "rgb(255,255,255)",
                orange = "rgb(255,255,0)";

            //if (plotData.axes.dataPointsHaveLabels) { // && mkeys != null && mkeys[0] === 'Label') {
            //    hasLabels = true;
            //}

            for (dindex = 0; dindex < series.getCount() ; dindex++) {
                imagePos = series.getPixel(dindex);
                isSelected = series.getSelectedPixels().indexOf(dindex) >= 0;
                var info = series.getPixelMetaDataByKey(imagePos, 'meanVarianceInfo');
                if (info) {
                    var isMean = info.is.mean;

                    fillStyle = info.is.mean
                        ? blue
                        : info.is.subjectDataPoints
                            ? orange
                            : info.is.subjectDataPointsCount
                                ? black
                                : info.is.variance
                                    ? red
                                    : white;
                } else {
                    if (isSelected) {
                        fillStyle = "rgb(0,200,0)";
                    } else {
                        fillStyle = "rgb(200,0,0)";
                    }
                }
                textStrokeStyle = white;
                pointStrokeStyle = {
                    default: [
                        { style: white, width: 1 },
                        { style: black, width: 1 }
                    ],
                    orig: [
                        { style: white, width: 1 },
                        { style: black, width: 1 }
                    ]
                };

                if (isSelected) {
                    pointStrokeStyle.default.push(
                        { style: white, width: 1 },
                        { style: black, width: 1 },
                        { style: fillStyle, width: 2 },
                        { style: white, width: 1 }
                    );
                }

                var pointRadius;
                if (hasLabels) {
                    pointLabel = series.getPixelMetaDataByKey(imagePos, 'label');
                    wpd.graphicsHelper.drawPoint(imagePos, fillStyle, pointLabel, textStrokeStyle, pointStrokeStyle, pointRadius);
                } else {
                    wpd.graphicsHelper.drawPoint(imagePos, fillStyle, null, textStrokeStyle, pointStrokeStyle, pointRadius);
                }
            }
        }
        var drawPoints = function () {
            var tool = wpd.graphicsWidget.getTool ? wpd.graphicsWidget.getTool() : null;
            var asi = tool && tool.getActiveSeriesInfo ? tool.getActiveSeriesInfo() : null;

            if (!tool) {
                doDraw(wpd.appData.getPlotData().getActiveDataSeries());
            } else {
                if (asi.activeDataSeries) {
                    doDraw(asi.activeDataSeries);
                }
                if (asi.individualDataSeries) {
                    doDraw(asi.individualDataSeries);
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

