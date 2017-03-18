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

            meanVarianceSelection();
//            tool = new wpd.acquireMeanVarianceData.MeanVarianceSelectionTool();
//            wpd.graphicsWidget.setTool(tool);
        }
    }

    //function editLabels() {
    //    wpd.graphicsWidget.setTool(new wpd.EditLabelsTool());
    //}

    function meanVarianceSelection() {
        tool = new wpd.acquireMeanVarianceData.MeanVarianceSelectionTool();
        wpd.graphicsWidget.setTool(tool);
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
        wpd.dataPointCounter.setCount();
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
     // updateDatasetControl();
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

    //function updateDatasetControl() {
    //    var plotData = wpd.appData.getPlotData(),
    //        currentDataset = plotData.getActiveDataSeries(), // just to create a dataset if there is none.
    //        currentIndex = plotData.getActiveDataSeriesIndex(),
    //        $datasetList = document.getElementById('manual-sidebar-dataset-list'),
    //        listHTML = '',
    //        i;
    //    for (i = 0; i < plotData.dataSeriesColl.length; i++) {
    //        listHTML += '<option>' + plotData.dataSeriesColl[i].name + '</option>';
    //    }
    //    $datasetList.innerHTML = listHTML;
    //    $datasetList.selectedIndex = currentIndex;
    //}

    //function changeDataset($datasetList) {
    //    var index = $datasetList.selectedIndex;
    //    wpd.appData.getPlotData().setActiveDataSeriesIndex(index);
    //    tool.showAreaUnderCurveIfNeeded();
    //    wpd.graphicsWidget.forceHandlerRepaint();
    //    wpd.dataPointCounter.setCount();
    //}

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

    function hideAllDataPopups() {
        $('.jBox-wrapper.jBox-Modal').each(function () {
            $(this).data('jBox').destroy();
        });
        //$.each([
        //    dataPopup,
        //    nestedDataPopup
        //], function (idx, pu) {
        //    if (pu) {
        //        pu.close();
        //    }
        //});
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
        hideAllDataPopups: hideAllDataPopups
        //updateDatasetControl: updateDatasetControl,
        // changeDataset: changeDataset,
        // editLabels: editLabels
    };
})();

wpd.acquireMeanVarianceData.MeanVarianceSelectionTool = (function () {
    var Tool = function () {
        var self = this;
        var plotData = wpd.appData.getPlotData();
        var $dom = {
            $createPointsButton: $('#mean-variance-create-points-button'),
            $adjustPointsButton: $('#mean-variance-adjust-button'),
            $deletePointsButton: $('#mean-variance-delete-point-button'),

            $locked: $('#mean-variance-dataSeriesLocked'),

            $useTable: $('#use-table'),
            $tableControls: $('#table-controls'),
            $freeControls: $('#free-controls'),
            $areaUnderCurve: $('#area-under-curve'),
            $showTrapezoids: $('#show-trapezoids'),
            $trapezoidAlpha: $('#trapezoid-alpha'),
            $outcomeMeasureList: $('#outcome-measure'),
            $dataStructureList: $('#mean-variance-data-structure'),
            $includeIndividuals: $('#include-individuals'),

            $dataSetLists: $('.dataset-list'),
            $dataPointCountEditWrapper: $('#mean-variance-dataPointCount-wrapper'),
            $dataPointCountEdit: $('#mean-variance-dataPointCount'),
            $dataSeriesCountEdit: $('#mean-variance-dataSeriesCount'),
            $formContainerHost: $('#mean-variance-formContainerHost'),
            $formContainer: $('#mean-variance-formContainer'),
            $detachFormContainerTrigger: $('#mean-variance-formContainerDetachTrigger'),
            $nestedFormContainer: $('#mean-variance-nestedFormContainer'),
            $snapToGridX: $('#snap-to-grid-x'),
            $snapToGridY: $('#snap-to-grid-y'),
            $gridEditX: $('#grid-edit-x'),
            $gridEditY: $('#grid-edit-y')
        };

        function populateDatasetControls() {
            $dom.$dataSetLists.each(function() {
                wpd.utils.populateDatasetControl(this);
            });
        }

        populateDatasetControls();

        var dataStructures = wpd._config.profileSettings.dataStructures;
        var gridSettings = {
            snap: {
                x: true,
                y: false
            },
            _dimensions: {
                x: 1,
                y: 1
            },
            _pixelDimensions: {
                x: 0,
                y: 0
            },
            _origin: { x: 0, y: 0 },

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
            useTable,
            curOutcomeMeasure,
            nestedSeries = null;

            //nestedSeries = {
            //    belongsTo: // the data series,
            //};

        var dataPopupTitle = "Data extraction", nestedDataPopupTitle = "Subject&nbsp;Data&nbsp;Points";
        var dataPopup = $('.jBox-wrapper.jBox-Modal.dataPopup').data('jBox');
        var nestedDataPopup = $('.jBox-wrapper.jBox-Modal.nestedDataPopup').data('jBox');
        var dataPopupVisible = null, nestedDataPopupVisible = null;

        function getUseTable() {
            return $dom.$useTable.is(":checked");
        }
        function getShowTrapezoids() {
            return $dom.$showTrapezoids.is(":checked");
        }
        function getTrapezoidAlpha() {
            return $dom.$trapezoidAlpha.val();
        }
        function showTrapezoidAlpha(alpha) {
            $dom.$trapezoidAlpha.val(trapezoidAlpha);
        }
        function getIncludeIndividuals() {
            return $dom.$includeIndividuals.is(":checked");
        }

        function showDataPopup() {
            if (useTable) {
                if (!dataPopup) {
                    dataPopup = new jBox('Modal',
                    {
                        addClass: 'dataPopup',
                        content: $dom.$formContainer,
                        title: dataPopupTitle,
                        closeOnEsc: true,
                        closeButton: 'box',
                        closeOnClick: 'overlay',
                        draggable: "title",
                        overlay: false,
                        pointer: true,
                        position: wpd._config.userSettings.documents[0].dataEntryPopupPosition,
                        onOpen: function() {
                            $dom.$formContainerHost.addClass('detached');
                            dataPopupVisible = true;
                        },
                        onClose: function() {
                            if (nestedDataPopupVisible) {
                                hideNestedDataPopup();
                            }
                            if (dataPopupVisible) {
                                var pos = this.wrapper.position();
                                wpd._config.userSettings.documents[0].dataEntryPopupPosition = {
                                    x: pos.left,
                                    y: pos.top
                                };
                                wpd._config.flushSettings(wpd._config.userSettings);
                            }
                            dataPopupVisible = false;
                            dataPopup = null;

                            $dom.$formContainerHost.append($dom.$formContainer).removeClass('detached');
                        },
                        onPosition: function() {
                            // console.log("onPosition!");
                        },
                        onDragEnd: function() {
                            // console.log("onDragEnd!");
                        },
                        maxHeight: 250,
                        maxWidth: 800
                    });
                }
                dataPopup.open();
            }
        }
        function focusNextAvailableNestedValueCell() {
            var $available = self.findNextAvaialbleNestedValueCell();
            selectCell($available);
        }

        function showNestedDataPopup() {
            var zIndex = dataPopup.wrapper.css("zIndex");

            if (!nestedDataPopup) {
                nestedDataPopup = new jBox('Modal', {
                    addClass: 'nestedDataPopup',
                    content: $dom.$nestedFormContainer,
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
                        if (nestedDataPopup) {
                            var pos = this.wrapper.position();
                            wpd._config.userSettings.documents[0].nestedDataEntryPopupPosition = {
                                x: pos.left,
                                y: pos.top
                            };
                            wpd._config.flushSettings(wpd._config.userSettings);
                        }

                        nestedDataPopup = null;
                        nestedDataPopupVisible = false;
                        setActiveNestedCell(null);

                        $dom.$formContainerHost.append($dom.$nestedFormContainer);
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
                _$activeNestedCell.removeClass(focusedClassName);
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

        $dom.$detachFormContainerTrigger.on({
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
            $dom.$outcomeMeasureList.html("");

            wpd._config.profileSettings.forEachOutcomeMeasure(function (index, om) {
                $dom.$outcomeMeasureList.append([
                    "<option id='",
                    om.id,
                    "'>",
                    om.text,
                    "</option>"
                ].join(''));
            });

            $dom.$outcomeMeasureList.change();
        }

        function populateDataStructures() {
            $dom.$dataStructureList.html("");

            wpd._config.profileSettings.forEachDataStructure(function(index, ds) {
                $dom.$dataStructureList.append([
                    "<option id='",
                    ds.id,
                    "'>",
                    ds.text,
                    "</option>"
                ].join(''));
            });

            $dom.$dataStructureList.change();
        }

        function showCheckboxSetting($cb, isChecked, triggerChange) {
            if (isChecked) {
                $cb.attr('checked', 'checked');
            } else {
                $cb.removeAttr('checked');
            }
            if (triggerChange) {
                $cb.trigger('change');
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
            showCheckboxSetting($dom.$snapToGridX, gridSettings.snap.x);
            showCheckboxSetting($dom.$snapToGridY, gridSettings.snap.y);
            var dim = gridSettings.getDimensions();
            showEditSetting($dom.$gridEditX, dim.x);
            showEditSetting($dom.$gridEditY, dim.y);

            forceExtendedCrosshairAsRequired();
        }

        populateOutcomeMeasures();
        populateDataStructures();
        configureSubTableSpecs();

        // TODO: Be clearer about which things should be done within OnAttach

        this.getOutcomeMeasure = function () {
            var outcomeMeasure = null;
            var option = $dom.$outcomeMeasureList.find(':selected')[0];

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
            var option = $dom.$dataStructureList.find(':selected')[0];
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

        var modeStack = [];
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

        function dataSeriesChangedHandler(eventObj) {
            // eventObj: { seriesIndex: ..., series: ..., action: "renamed" };
            switch (eventObj.action) {
                case "renamed":
                    if (useTable) {
                        var seriesTitleEdit = $([
                            "#mean-variance-formContainer input.series-name[data-series='",
                            eventObj.seriesIndex,
                            "']"
                        ].join(''));
                        seriesTitleEdit.val(series.name);
                    }
                    populateDatasetControls();
                    break;
                case "seriesAdded":
                    populateDatasetControls();
                    break;
                case "seriesRemoved":
                    //populateDatasetControl();
                    break;
                case "selectedSeriesChanged":
                    populateDatasetControls();
                    self.showAreaUnderCurveIfNeeded();
                    break;
            }
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
            wpd.dataSeriesManagement.addDataSeriesChangeHandler(dataSeriesChangedHandler);
            wpd.graphicsWidget.setRepainter(new wpd.DataPointsRepainter());

            $dom.$dataSetLists.on('change', datasetChanged);
            $dom.$useTable.on('change', useTableChanged);
            $dom.$showTrapezoids.on('change', trapezoidsChanged);
            $dom.$trapezoidAlpha.on('change', trapezoidsChanged);
            trapezoidsChanged();
            $dom.$outcomeMeasureList.on('change', outcomeMeasureChanged);
            $dom.$dataStructureList.on('change', dataStructureChanged);
            $dom.$includeIndividuals.on('change', includeIndividualsChanged);

            $dom.$dataPointCountEdit.on('change', dataPointCountChanged);
            $dom.$dataSeriesCountEdit.on('change', dataSeriesCountChanged);

            $dom.$snapToGridX.on('change', snapToGridChanged);
            $dom.$snapToGridY.on('change', snapToGridChanged);
            $dom.$gridEditX.on('change', gridDimensionsChanged);
            $dom.$gridEditY.on('change', gridDimensionsChanged);


            var lockable = [
                $dom.$outcomeMeasureList,
                $dom.$dataStructureList,
                $dom.$includeIndividuals,
                $dom.$dataPointCountEdit,
                $dom.$dataSeriesCountEdit
            ];

            $dom.$locked.on({
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
                            $dom.$nestedFormContainer.removeClass('hidden');
                            if (dataPopupVisible && !nestedDataPopupVisible) {
                                showNestedDataPopup();
                            }
                            focusNextAvailableNestedValueCell();
                            wpd.graphicsWidget.forceHandlerRepaint();
                        } else {
                            if (self.getModifierMode() === self.modes.selectSubjectDataPoints) {
                                self.clearModifierMode();
                            }
                            hideNestedDataPopup();
                            $dom.$nestedFormContainer.addClass('hidden');

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
                change: function (e) {
                    var msg = ["nestedConfig.change..."];
                    var $edit = $(this);
                    var info = getInfo($edit);

                    if (info.is.subjectDataPointsCount) {
                        var outerSeries = plotData.getActiveDataSeries();
                        var imd = outerSeries.getIndividualMetaData();
                        var counts = imd.counts;
                        var subjectCount = $edit.val();
                        counts[info.dataPoint] = subjectCount;
                        msg.push("..just set the count for dataPoint: ", info.dataPoint, " to: " + subjectCount);
                    }
                    console.log(msg.join(''));
                }
            };
            nestedConfig.spinchange = nestedConfig.change;
            nestedConfig.keydown = config.keydown;

            $dom.$nestedFormContainer.on(nestedConfig, '.value,.count');
            $dom.$formContainer.on(config, '.series-name,.mean,.variance,.subject-count,.subject-data-points');

            $dom.$formContainer.on({
                change: function (e) {
                    var $edit = $(this);
                    var seriesIndex = $edit.attr('data-series');
                    plotData.setActiveDataSeriesIndex(seriesIndex);
                    var series = plotData.getActiveDataSeries();
                    series.name = $edit.val();
                }
            }, '.series-name');

            function showElemIf($elem, showIf) {
                if (showIf) {
                    $elem.removeClass('hidden');
                }
                else {
                    $elem.addClass('hidden');
                }
            }
            function applyUseTable(profile) {
                showCheckboxSetting($dom.$useTable, profile.useTable, true);
                showElemIf($dom.$detachFormContainerTrigger, useTable);

                //showElemIf($dom.$createPointsButton, !useTable);
                showElemIf($dom.$adjustPointsButton, !useTable);
                showElemIf($dom.$deletePointsButton, !useTable);
            }

            function applyProfile(profile) {

                gridSettings.snap = profile.gridSettings.snap;
                gridSettings._dimensions = profile.gridSettings.dimensions;

                $dom.$outcomeMeasureList
                    .find('option#' + profile.outcomeMeasureId)
                    .attr('selected', 'selected')
                    .change();

                $dom.$dataStructureList
                    .find('option#' + profile.dataStructureId)
                    .attr('selected', 'selected')
                    .change();

                applyUseTable(profile);

                showCheckboxSetting($dom.$includeIndividuals, profile.includeIndividuals, true);

                $dom.$dataSeriesCountEdit
                    .val(profile.dataSeriesCount)
                    .change();

                $dom.$dataPointCountEdit
                    .val(profile.dataPointCount)
                    .change();

                lock();
            }

            applyProfile(wpd._config.profileSettings.getProfile());
            populateGridSettings();

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
                                var valueEdits = $dom.$nestedFormContainer.find("." + stsf.css);
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

            $dom.$nestedFormContainer.html(html);
            $dom.$nestedFormContainer.find('.count').spinner({ min: 1 });

            // Clear out data for all cells
            var cells = $dom.$nestedFormContainer.find('td.value');
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
            if (!useTable) {
                wpd.acquireMeanVarianceData.hideAllDataPopups();
                $dom.$formContainer.html('');
                return;
            }
            if ($dom.$locked.is('checked')) {
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
            $dom.$formContainer.html($table);

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
            if (!$.url().param('dev')) {
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
            $dom.$formContainer
                .find('.series-name,.subject-count,.mean,.variance,.subject-data-points')
                .jBox('Tooltip', editTooltipConfig);

            $dom.$nestedFormContainer
                .find('.value,.count')
                .jBox('Tooltip', editTooltipConfig);
        }

        function updateUiToReflectShowTableStatus() {
            if (useTable) {
                $dom.$tableControls.removeClass('hidden');
                $dom.$freeControls.addClass('hidden');
            } else {
                $dom.$tableControls.addClass('hidden');
                $dom.$freeControls.removeClass('hidden');
            }
        }
        function showDataPointCounterIfNeeded() {
            if (curOutcomeMeasure.hasFields || getIncludeIndividuals()) {
                $dom.$dataPointCountEditWrapper.addClass('hidden');
            } else {
                $dom.$dataPointCountEditWrapper.removeClass('hidden');
            }
        }

        function updateOutcomeMeasureFieldMetaData() {
            wpd.appData.getPlotData().setMeasureFieldMetaData(curOutcomeMeasure.fields);
        }

        function datasetChanged() {
            var index = this.selectedIndex;
            plotData.setActiveDataSeriesIndex(index);

            wpd.graphicsWidget.forceHandlerRepaint();
            wpd.dataPointCounter.setCount();
            self.showAreaUnderCurveIfNeeded();
        }
        function useTableChanged(ev) {
            useTable = getUseTable();
            updateUiToReflectShowTableStatus();
            self.buildTable();
        }
        function trapezoidsChanged(ev) {
            var painter = wpd.graphicsWidget.getRepainter();

            painter.setShowArea(getShowTrapezoids(), getTrapezoidAlpha());
            wpd.graphicsWidget.forceHandlerRepaint();
        }
        function outcomeMeasureChanged(ev) {
            curOutcomeMeasure = self.getOutcomeMeasure();
            updateOutcomeMeasureFieldMetaData();

            showDataPointCounterIfNeeded();
            //if (curOutcomeMeasure.hasFields) {
            //    $dom.$dataPointCountEditWrapper.addClass('hidden');
            //} else {
            //    $dom.$dataPointCountEditWrapper.removeClass('hidden');
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
            dataPointCount = parseInt($dom.$dataPointCountEdit.val(), 10);
            self.buildTable();
        };
        function snapToGridChanged(ev) {
            gridSettings.snap.x = $dom.$snapToGridX.is(':checked');
            gridSettings.snap.y = $dom.$snapToGridY.is(':checked');

            forceExtendedCrosshairAsRequired();
        }
        function gridDimensionsChanged(ev) {
            gridSettings.setDimensions({
                x: parseFloat($dom.$gridEditX.val()),
                y: parseFloat($dom.$gridEditY.val())
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
            dataSeriesCount = parseInt($dom.$dataSeriesCountEdit.val(), 10);
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

        //function getNormalizedDataValueX(value) {
        //    if (value.constructor === Array) {
        //        value = value[0];
        //    }
        //    return value;
        //}
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
            $dom.$locked
                .attr('checked', 'checked')
                .trigger('change');
        }

        function annotateData(series) {
            var axes = plotData.axes,
                dataPt,
                transformedDataPt,
                data = [];

            for (var i = 0; i < series.getCount() ; i++) {
                dataPt = wpd.utils.deepClone (series.getPixel(i));
                transformedDataPt = axes.pixelToData(dataPt.x, dataPt.y);

                data.push({ origIndex: i, origData: dataPt, transformedDataPt: transformedDataPt});
            }

            return data;
        }

        function calculateAreaUnderCurveForSeries(series) {
            var i,
                area = 0,
                trapezoidArea,
                count = series.getPixelCount(),
                sortedData = [];

            if (count > 1) {
                // get all points in data-space
                var data = annotateData(series);
                var origin = plotData.getPixelPoint({ x: 0, y: 0 });
                origin = plotData.axes.pixelToData(origin.x, origin.y);

                // order them by x
                data.sort(function(a, b) {
                    return a.transformedDataPt[0] - b.transformedDataPt[0];
                });

                for (i = 0; i < data.length; i++) {
                    sortedData.push(data[i].origData);
                }

                // calculate the total area of the trapezoids created by two adjacent points and their projection onto the y=0 axis
                var left = data[0].transformedDataPt, right;
                for (i = 1; i < count; i++) {
                    right = data[i].transformedDataPt;

                    // area of trapezoid: base times average height
                    var width = right[0] - left[0];
                    var leftHeight = Math.abs(left[1] - origin[1]);
                    var rightHeight = Math.abs(right[1] - origin[1]);
                    var averageHeight = (rightHeight + leftHeight) / 2;
                    trapezoidArea = width * averageHeight;
                    area += trapezoidArea;

                    left = right;
                }
            }

            return { area: area, sortedPoints: sortedData };
        }

        this.showAreaUnderCurveIfNeeded = function() {
            if (!useTable) {
                showAreaUnderCurve ();
            }
        };

        function showAreaUnderCurve() {
            var series = wpd.appData.getPlotData().getActiveDataSeries();
            var areaAndSortedPoints = calculateAreaUnderCurveForSeries(series);
            var area = areaAndSortedPoints.area;
            var sortedPoints = areaAndSortedPoints.sortedPoints;

            // Update the series with identical data (i.e. without introducing any rounding errors) sorted by x
            for (var i = 0; i < sortedPoints.length; i++) {
                var sp = sortedPoints[i];
                series.setPixelAt(i, sp.x, sp.y);
            }

            $dom.$areaUnderCurve.html(
                "Area under curve: " + area
            );
        }

        function focusFirstValueCell() {
            if (!getActiveCell()) {
                var first = $dom.$formContainer
                    .find('>table>tbody input[data-series="0"]:not(.series-name):first');
                setActiveCell(first);
            }
            selectCell(getActiveCell());
        }

        function createPointsMouseClick(ev, pos, imagePos) {
            var mi = getModeInfo(),
                aci,
                info,
                dataIndex,
                metaData;

            if (useTable) {
                aci = getActiveCellInfo();

                if (aci.activeCell === null || (mi.subjectDataPointsMode && aci.activeNestedCell === null)) { // && activeNestedCell === null) {
                    // Select the first cell in the grid
                    focusFirstValueCell();
                    aci = getActiveCellInfo();
                }

                info = getInfo(aci.cell);
                if (info.is.subjectDataPointsCount) {
                    focusNextAvailableNestedValueCell();
                    aci = getActiveCellInfo();
                    info = getInfo(aci.cell);
                }
            }


            var asi = self.getActiveSeriesInfo(), pointLabel = null;

            // if (blah && confirm ("This group already data - would you like to override it?"))) {}
            if (useTable) {
                if (info.is.groupName || !aci.activeCell.val()) {
                    metaData = { meanVarianceInfo: info };

                    imagePos = wpd.graphicsWidget.screenPx(imagePos.x, imagePos.y);
                    gridSettings.quantize(imagePos);
                    imagePos = wpd.graphicsWidget.imagePx(imagePos.x, imagePos.y);

                    dataIndex = asi.series.addPixel(imagePos.x, imagePos.y, metaData);

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
                    selectCell($next);
                } else {
                    // TODO: Change to a confirm and add the point if 'Yes'
                    alert("This cell already has data!");
                }
            } else {
                metaData = { };

                imagePos = wpd.graphicsWidget.screenPx(imagePos.x, imagePos.y);
                gridSettings.quantize(imagePos);
                imagePos = wpd.graphicsWidget.imagePx(imagePos.x, imagePos.y);

                dataIndex = asi.series.addPixel(imagePos.x, imagePos.y, metaData);

                self.showAreaUnderCurveIfNeeded();

                wpd.graphicsWidget.forceHandlerRepaint(); // draw points from the painter only

                lock();
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

            if (useTable) {
                var cell = getCellCorrespondingToSelectedPoint(dataSeries);
                selectCell(cell);
            }

            wpd.graphicsWidget.forceHandlerRepaint();
            wpd.graphicsWidget.updateZoomOnEvent(ev);
        }
        function deletePointsMouseClick(ev, pos, imagePos) {
            var activeDataSeries = plotData.getActiveDataSeries();

            var pixelIndex = activeDataSeries.findNearestPixel(imagePos.x, imagePos.y);
            if (pixelIndex >= 0) {
                activeDataSeries.unselectAll();
                activeDataSeries.selectPixel(pixelIndex);

                if (useTable) {
                    var activeCell = getActiveCell();

                    var cell = getCellCorrespondingToSelectedPoint(activeDataSeries);
                    selectCell(cell);

                    activeCell.val('');

                }

                activeDataSeries.removePixelAtIndex(pixelIndex);
                wpd.graphicsWidget.resetData();


                self.showAreaUnderCurveIfNeeded();

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
        this.removeEventHandlers = function () {
            for (var $elem in $dom) {
                if ($dom.hasOwnProperty($elem)) {
                    $dom[$elem].off();
                }
            }
        };

        this.onRemove = function () {
            wpd.acquireMeanVarianceData.hideAllDataPopups();
            this.removeEventHandlers();
            wpd.dataSeriesManagement.removeDataSeriesChangeHandler(dataSeriesChangedHandler);
            $('.mean-variance-selection-mode').removeClass('pressed-button');
        };

        function createPointsKeyDown(ev) {
            var $target = $(ev.target);
            var fromEdit = $target.hasClass('mean')
                || $target.hasClass('variance')
            // || $target.hasClass('group-name')
            ;

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
                aci,
                activeCell,
                cell;

            if (useTable) {
                aci = getActiveCellInfo();
                activeCell = aci.cell;

                cell = getCellCorrespondingToSelectedPoint(activeDataSeries);
                selectCell(cell);
            }

            function reselectCell() {
                if (useTable) {
                    cell = getCellCorrespondingToSelectedPoint(activeDataSeries);
                    selectCell(cell);
                }
            }

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

                reselectCell();

                pointPx = selPoint.x;
                pointPy = selPoint.y;
            } else if (wpd.keyCodes.isAlphabet(ev.keyCode, 'w')) {
                activeDataSeries.selectNextPixel();
                selIndex = activeDataSeries.getSelectedPixels()[0];
                selPoint = activeDataSeries.getPixel(selIndex);

                reselectCell();

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
                reselectCell();

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

            self.showAreaUnderCurveIfNeeded();

            wpd.graphicsWidget.forceHandlerRepaint();
            wpd.graphicsWidget.updateZoomToImagePosn(pointPx, pointPy);
            ev.preventDefault();
            ev.stopPropagation();

            // Update table
            if (useTable && activeCell) {
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
                    if (ev.eventPhase === 3) {
                        return;
                    }
                    // toggle display of points
                    plotData.toggleShowPoints();
                    wpd.graphicsWidget.forceHandlerRepaint();
                } else {
                    switch (this.getMode()) {
                        case this.modes.createPoints:
                         // moving newly-created points is now disabled
                            // createPointsKeyDown(ev);
                            if (useTable) {
                                adjustPointsKeyDown(ev);
                            }
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

wpd.DataPointsRepainter = (function () {
    var Painter = function () {

        var showArea = false;
        var areaAlpha = 0.5;

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

                red = "rgba(255,0,0,alpha)",
                orange = "rgba(255,165,0,alpha)",
                yellow = "rgba(255,255,0,alpha)",
                green = "rgba(0,255,0,alpha)",
                blue = "rgba(0,0,255,alpha)",
                indigo = "rgba(75,0,130,alpha)",
                violet = "rgba(199,21,133,alpha)",

                black = "rgb(0,0,0,0)",
                white = "rgb(255,255,255)",
                areaColours = [
                    red, orange, yellow, green, blue, indigo, violet
                ],
                areaColourCount = areaColours.length,
                count = series.getCount();

            //if (plotData.axes.dataPointsHaveLabels) { // && mkeys != null && mkeys[0] === 'Label') {
            //    hasLabels = true;
            //}

            if (showArea) {
                var origin = plotData.getPixelPoint({ x: 0, y: 0 });
                var left = series.getPixel(0), right;
                for (dindex = 1; dindex < count; dindex++) {
                    right = series.getPixel(dindex);

                    wpd.graphicsHelper.drawTrapezoid([
                        left,
                        right,
                        { x: right.x, y: origin.y },
                        { x: left.x, y: origin.y }
                    ], areaColours[(dindex - 1) % areaColourCount].replace('alpha', areaAlpha));

                    left = right;
                }
            }

            for (dindex = 0; dindex < count ; dindex++) {
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

        this.setShowArea = function(show, alpha) {
            showArea = show;
            areaAlpha = alpha;
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

