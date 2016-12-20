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

        bootProfiles: function() {
            this.$profileSelectionList = $('#profile-selection-list');
            var $confirmProfileChoice = $('#confirmProfileChoice');

            this.configureProfiles();
            this.populateProfiles();
            $confirmProfileChoice.on('click', this.profileChosen);

        },

        profileChosen: function(ev) {
            var profile = this.getProfile();
            profile.choose();
        },

        configureProfiles: function() {
            this.profiles = [{
                id: 'scatter-plot-xy',
                name: "Scatter plot (XY)",
                plotTypeId: 'r_xy'
            }, {
                id: 'scatter-plot-1d',
                name: "Scatter plot (1D)",
                plotTypeId: 'r_bar'
            }];

            this.forEachProfile(function(i, profile) {
                profile.id = "profile_" + profile.id;
                profile.choose = function () {
                    wpd.popup.close('chooseProfile');
                    wpd.alignAxes.start({
                        plotTypeId: profile.plotTypeId,
                        afterCalibrated: function (calibrator) {
                            // apply profile settings
                            alert("now to apply the profile settings to this tool!");
                        }
                    });
                };
                profile.activate = function() {
                    alert("Profile is being activated - it should set Outcome Measure, DataStructure, 'Include Individuals', '# Data series' and '# Data points'");
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

        getProfile: function() {
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
                    "'>",
                    profile.name,
                    "</option>"
                ].join(''));
            }, this);
        }
    };


    var ps = wpd._config.profileSettings;
    for (var prop in ps) {
        if (ps.hasOwnProperty(prop)) {
            var val = ps[prop];
            if (typeof val === 'function') {
                ps[prop] = val.bind(ps);
            }
        }
    }
    wpd._config.profileSettings.bootProfiles();





    wpd.browserInfo.checkBrowser();
    wpd.layoutManager.initialLayout(config);
    if (!wpd.loadRemoteData()) {
        if (!!config.graphImage) {
            wpd.graphicsWidget.loadImageFromURL(
                config.graphImage.imageSrc,
                false, //true <-- TODO - this bool needs to be dynamic
                function () {
                    //wpd.popup.show('axesList');
                    wpd.popup.show('chooseProfile');
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

