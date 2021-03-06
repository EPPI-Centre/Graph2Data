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

wpd.initApp = function (config) {// This is run when the page loads.
    wpd._config = config || {
        contentBaseUri: "/",
        loadingCurtainSelector: "#loadingCurtain",
        sidebarContainerSelector: "#sidebarContainer",
        mainContainerSelector: "#mainContainer",
        appContainerElem: document.body,
        focusedSelection: null,
        wpdPlotMemento: null,
        userSettings: {},
    };
    //wpd.appData.lee_setPlotMemento(wpd._config.wpdPlotMemento);

    wpd._config.profileSettings = wpd._config.profileSettings ||
    {
        $profileSelectionList: null,
        $confirmProfileChoice: null,

        profiles: [],
        outcomeMeasures: null,
        dataStructures: null,


        bootProfiles: function() {
            this.$profileSelectionList = $('#profile-selection-list');
            var $confirmProfileChoice = $('#confirmProfileChoice');

            this.configureOutcomeMeasures();
            this.configureDataStructures();

            this.configureProfiles();
            this.populateProfiles();

            $confirmProfileChoice.on('click', this.profileChosen);
            $(document).on('chooseProfile', this.chooseThisProfile);
        },

        chooseThisProfile: function (event, oneAxis, structureId, includeIndividuals, profileId) {        //not sure what to do with structure id yet.
           
            this.forEachProfile(function (index, profile) {

                if (profileId != null) {
                    if (profile.id === "profile_" + profileId) {
                        profile.choose();
                        document.profile = profile;
                        return true;
                    }
                } else {
                    var profileIsSingleAxis = (profile.plotTypeId === "r_bar");


                    if (structureId === profile.dataStructureId &&
                        includeIndividuals === profile.includeIndividuals &&
                        oneAxis === profileIsSingleAxis &&
                        'simple-table-capture' === profile.outcomeMeasureId) {

                        profile.choose();
                        document.profile = profile;
                        return true;
                    }
                }
            });
        },

        profileChosen: function(ev) {
            var profile = this.getProfile();
            profile.choose();
        },

        defaultGridSettings: {
            snap: {
                x: false,
                y: false
            },
            dimensions: {
                x: 1,
                y: 1
            }
        },

        configureProfiles: function() {
            var self = this;

            this.profiles = [{
                id: 'free-points-capture', //this is used by the "ROC Curve" option
                name: "Free points-capture",
                plotTypeId: 'r_xy',
                useTable: false,
                outcomeMeasureId: 'simple-table-capture',
                dataStructureId: 'mean-only',
                includeIndividuals: false,
                dataSeriesCount: 1,
                dataPointCount: 200,
                hideUseTable: true //extra option for ROC Curve
            }, {
                id: 'quantize-test-2D',
                name: "Quantize Testing (2D)",
                plotTypeId: 'r_xy',
                useTable: true,
                outcomeMeasureId: 'simple-table-capture',
                dataStructureId: 'mean-only',
                includeIndividuals: false,
                dataSeriesCount: 1,
                dataPointCount: 200
            }, {
                id: 'quantize-test-1D',
                name: "Quantize Testing (1D)",
                plotTypeId: 'r_bar',
                useTable: true,
                outcomeMeasureId: 'simple-table-capture',
                dataStructureId: 'mean-only',
                includeIndividuals: false,
                dataSeriesCount: 1,
                dataPointCount: 200
            }, {
                id: 'scatter-plot-xy',
                name: "Scatter plot (XY)",
                plotTypeId: 'r_xy',
                useTable: true,
                outcomeMeasureId: 'simple-table-capture',
                dataStructureId: 'mean-only',
                includeIndividuals: true,
                dataSeriesCount: 4,
                dataPointCount: 2
            }, {
                id: 'scatter-plot-1d',
                name: "Scatter plot (1D)",
                plotTypeId: 'r_bar',
                useTable: true,
                outcomeMeasureId: 'simple-table-capture',
                dataStructureId: 'mean-only',
                includeIndividuals: true,
                dataSeriesCount: 4,
                dataPointCount: 2
            }];

            var boolSpace = [true, false];
            var plotTypes = [{
                id: 'r_xy',
                abbrev: '2D'
            }, {
                id: 'r_bar',
                abbrev: '1D'
            }];

            function generateAllCombinations(dataStructures) {
                var profileCounter = 0;
                for (var t = 0; t < plotTypes.length; t++) {
                    var pt = plotTypes[t];
                    for (var o = 0; o < self.outcomeMeasures.length; o++) {
                        var om = self.outcomeMeasures[o];
                        for (var d = 0; d < self.dataStructures.length; d++) {
                            var ds = self.dataStructures[d];
                            for (var b = 0; b < boolSpace.length; b++) {
                                var ii = boolSpace[b];
                                var name = [
                                    pt.abbrev,
                                    om.abbrev,
                                    ds.abbrev,
                                ];
                                if (ii) {
                                    name.push("ii");
                                }
                                name = name.join('_');

                                var profile = {
                                    id: "autogenerated_" + profileCounter++,
                                    name: name,
                                    plotTypeId: pt.id,
                                    outcomeMeasureId: om.id,
                                    useTable: true,
                                    dataStructureId: ds.id,
                                    includeIndividuals: ii,
                                    dataSeriesCount: 4,
                                    dataPointCount: 2
                                };
                                self.profiles.push(profile);
                            }
                        }
                    }
                }
            }

            generateAllCombinations();

            function findByProp(array, propName, propValue) {
                var obj = null;

                for (var i = 0; i < array.length; i++) {
                    var ar = array[i];
                    if (ar[propName] === propValue) {
                        obj = ar;
                        break;
                    }
                }
                return obj;
            }
            function buildNote(profile) {
                var note = [
                    findByProp(plotTypes, 'id', profile.plotTypeId).abbrev,
                    findByProp(self.outcomeMeasures, 'id', profile.outcomeMeasureId).text,
                    findByProp(self.dataStructures, 'id', profile.dataStructureId).text,
                    (profile.includeIndividuals
                        ? "[x]"
                        : "[ ]"
                    ) + " Include Individuals"
                ].join(' | ');

                return note;
            }

            this.forEachProfile(function(i, profile) {
                profile.id = "profile_" + profile.id;
                profile.gridSettings = wpd._config.profileSettings.defaultGridSettings;
                profile.note = buildNote(profile);
                profile.choose = function () {
                    wpd.popup.close('chooseGraph');
                    //wpd.popup.close('chooseProfile');
                    wpd.alignAxes.start({
                        plotTypeId: profile.plotTypeId,
                        afterCalibrated: function (calibrator) {}
                    });
                };
            }, this);
        },

        forEachProfile: function (callback, bindTo) {
            if (bindTo != null) {
                callback = callback.bind(bindTo);
            }
            for (var i = 0; i < this.profiles.length; i++) {
                var profile = this.profiles[i];
                if (callback(i, profile)) {
                    break;
                }
            }
        },

        getProfile: function () {
            if (document.profile != null) {
                return document.profile;
            }

            var profile = null;
            var option = this.$profileSelectionList.find(':selected')[0];

            this.forEachProfile(function(index, p) {
                if (option.id === p.id) {
                    profile = p;
                    return true;
                }
            });

            return profile;
        },

        populateProfiles: function() {
            this.$profileSelectionList.html("");

            this.forEachProfile(function(index, profile) {
                this.$profileSelectionList.append([
                    "<option id='",
                        profile.id,
                    "' title='",
                        profile.note,
                    "'>",
                        (index + 1) + ") " + profile.name,
                    "</option>"
                ].join(''));
            }, this);
        },

        configureOutcomeMeasures: function () {
            this.outcomeMeasures = [{
                id: 'simple-table-capture',
                text: "Simple TableCapture",
                abbrev: "SimpleTable",
                fields: []
            }, {
                id: 'model-experiment',
                text: "Model Characterising",
                abbrev: "ModelChar",
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
                abbrev: "IntTest",
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

            this.forEachOutcomeMeasure(function(index, om) {
                om.hasFields = (om.fields && om.fields.length > 0);
            });
        },

        forEachOutcomeMeasure: function(callback) {
            for (var i = 0; i < this.outcomeMeasures.length; i++) {
                var om = this.outcomeMeasures[i];
                if (callback(i, om)) {
                    break;
                }
            }
        },

        configureDataStructures: function() {
            this.dataStructures = [{
                id: 'mean-only',
                text: "Mean only",
                abbrev: "Mean",
                dataPoints: [{
                    name: "Mean",
                    abbrev: "Mean",
                    css: "mean"
               // , isReferencePoint: true  // irrelevant as this is the only field
                }]
            }, {
                id: 'mean-and-standard-error',
                text: "Mean and Standard Error (SEM)",
                abbrev: "MeanSE",
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
                abbrev: "MeanSD",
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
                abbrev: "Mean95CI",
                dataPoints: [{
                    name: "Mean",
                    abbrev: "Mean",
                    css: "mean",
                    isReferencePoint: true
                }, {
                    name: "95% Confidence range (upper)",
                    abbrev: "CIu95",
                    css: "variance"
                }, {
                        name: "95% Confidence range (lower)",
                        abbrev: "CIl95",
                        css: "variance"
                }]
            }, {
                id: 'mean-and-confidence-interval-99',
                text: "Mean and 99% CI",
             // varianceAbbrev: "CI99",
                abbrev: "MeanCI99",
                dataPoints: [{
                    name: "Mean",
                    abbrev: "Mean",
                    css: "mean",
                    isReferencePoint: true
                }, {
                    name: "99% Confidence range (upper)",
                    abbrev: "CIu99",
                    css: "variance"
                }, {
                    name: "99% Confidence range (lower)",
                    abbrev: "CIl99",
                    css: "variance"
                }]
            }, {
                id: 'median-and-confidence-interval-95',
                text: "Median and 95% CI",
                abbrev: "Median95CI",
                dataPoints: [{
                    name: "Median",
                    abbrev: "Median",
                    css: "mean",
                    isReferencePoint: true
                }, {
                    name: "95% Confidence range (upper)",
                    abbrev: "CIu95",
                    css: "variance"
                }, {
                    name: "95% Confidence range (lower)",
                    abbrev: "CIl95",
                    css: "variance"
                }]
            }, {
                id: 'median-and-confidence-interval-99',
                text: "Median and 99% CI",
                abbrev: "Median99CI",
             // varianceAbbrev: "CI99",
                dataPoints: [{
                    name: "Median",
                    abbrev: "Median",
                    css: "mean",
                    isReferencePoint: true
                }, {
                    name: "99% Confidence range (upper)",
                    abbrev: "CIu99",
                    css: "variance"
                }, {
                    name: "99% Confidence range (lower)",
                    abbrev: "CIl99",
                    css: "variance"
                }]
            }, {
                id: 'median-and-interquartile-range',
                text: "Median and Interquartile Range",
                abbrev: "MeadianIQR",
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
                abbrev: "B&W",
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
            }];

            function getDependentFieldsSelector(ds) {
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

            this.forEachDataStructure(function (key, ds) {
                ds.dataPoints.splice(0, 0,
                {
                    name: "Subjects in sample",
                    abbrev: "n",
                    isManualEntry: true,
                    css: "subject-count"
                });

                ds.manualEntryFieldIndex = getManualEntryFieldIndexForDataStructure(ds);
                ds.refPointFieldIndex = getReferencePointFieldIndexForDataStructure(ds);
                ds.dependentFieldsSelector = getDependentFieldsSelector(ds);
            });
        },

        forEachDataStructure: function(callback) {
            for (var i = 0; i < this.dataStructures.length; i++) {
                var ds = this.dataStructures[i];
                if (callback(i, ds)) {
                    break;
                }
            }
        },
    };

    wpd.utils.bindMemberFunctions(wpd._config.profileSettings);
    wpd._config.profileSettings.bootProfiles();





    wpd.browserInfo.checkBrowser();
    wpd.layoutManager.initialLayout(config);
    if (!wpd.loadRemoteData()) {
        if (!!config.graphImage) {
            document.graphImageNumber = config.graphImageNumber;
            wpd.graphicsWidget.loadImageFromURL(
                config.graphImage.imageSrc,
                false, //true <-- TODO - this bool needs to be dynamic
                function () {
                    //wpd.popup.show('axesList');
                    wpd.popup.show('chooseGraph');
                    //wpd.popup.show('chooseProfile');
                }
            );
            //wpd.graphicsWidget.leeInit();
            //wpd.graphicsWidget.loadImageFromData(
            //    config.graphImage.imageData,
            //    config.graphImage.imageData.width,
            //    config.graphImage.imageData.height,
            //    false,
            //    true
            //);
        } else {
            wpd.graphicsWidget.loadImageFromURL(wpd._config.contentBaseUri + 'start.png');
            //wpd.messagePopup.show(wpd.gettext('unstable-version-warning'), wpd.gettext('unstable-version-warning-text'));
        }
    }
    // document.getElementById('loadingCurtain').style.display = 'none';
    document.querySelectorAll(wpd._config.loadingCurtainSelector)[0].style.display = 'none';

};


wpd.loadRemoteData = function() {

    if(typeof wpdremote === "undefined") {
        return false;
    }
    if(wpdremote.status != null && wpdremote.status === 'fail') {
        wpd.messagePopup.show('Remote Upload Failed!', 'Remote Upload Failed!');
        return false;
    }
    if(wpdremote.status === 'success' && wpdremote.localUrl != null) {
        wpd.graphicsWidget.loadImageFromURL(wpdremote.localUrl);
        wpd.popup.show('axesList');
        return true;
    }
    return false;
};

//document.addEventListener("DOMContentLoaded", wpd.initApp, true);

