//window.console = console || { clear: function () { }, log: function () { } };

(function() {
    var body = $(document.body);

    function _initConfig(config) {
        config = config || {};
        config.minX = config.minX || 20;
        config.minY = config.minY || 20;
        config.$growthContainer = config.$growthContainer || body;
        config.minDragDistance = config.minDragDistance || 5;



        /*
        each handler has a paramter 'sel':
        
        sel: { 
            elem: dom elem for selection,
            canvas: canvas beneath selection
            canvasBounds: bounds of canvas relative to top-left of screen
            bounds: bounds of selection relative to top-left of screen
         // boundsInCanvas: bounds of selection in canvas coordinates
            dataStore: {
                putData: function ({ data: {}, dataDesc: "" }) {},
                getData: function() {} // returns { data: {}, dataDesc: "" }
            }
        }
        */

        config.selectionCreatedHandler = config.selectionCreatedHandler ||
            function (sel) {
                //console.log("selectionCreated: " + getCoords(sel.elem));
            };
        config.selectionDeletedHandler = config.selectionDeletedHandler ||
            function (sel) {
                //console.log("selectionDeleted: " + getCoords(sel.elem));
            };
        config.selectionHoveredHandler = config.selectionHoveredHandler ||
            function (sel) {
                //console.log("selectionHovered: " + getCoords(sel.elem));
            };
        config.selectionUnhoveredHandler = config.selectionUnhoveredHandler ||
            function (sel) {
                //console.log("selectionUnhovered: " + getCoords(sel.elem));
            };
        config.selectionFocusedHandler = config.selectionFocusedHandler ||
            function (sel) {
                //console.log("selectionFocused: " + getCoords(sel.elem));
            };
        config.selectionBlurredHandler = config.selectionBlurredHandler ||
            function (sel) {
                //console.log("selectionBlurred: " + getCoords(sel.elem));
            };
        config.selectionNumberClickedHandler = config.selectionNumberClickedHandler ||
            function(sel) {
                //console.log("selectionNumberClicked: " + getCoords(sel.elem));
            }
        config.dataIconClickedHandler = config.dataIconClickedHandler ||
            function(sel) {
                //console.log("dataIconClicked: " + getCoords(sel.elem));
            }
        return config;
    }

    window.selectionRectangles_initialized = false;
    var $canvasOverlay;

    var _registeredCanvases = {};
    var _selectionInfo = {};
    var idAttr = "data-id";

    function _getElemPos(elem) {
        // console.log("_getRectPos(" + getElemId(elem) + ")");
        var pos = {
            x: parseInt(elem.style.left, 10),
            y: parseInt(elem.style.top, 10),
        };
        return pos;
    }
    function _setElemPos(elem, pos) {
        if (elem && elem.style) {
            elem.style.left = pos.x + 'px';
            elem.style.top = pos.y + 'px';
        }
    }

    function _getElemExtent(elem) {
        var pos = {
            x: parseInt(elem.style.width, 10),
            y: parseInt(elem.style.height, 10),
        };
        return pos;
    }
    function _setElemExtent(elem, pos) {
        if (elem && elem.style) {
            elem.style.width = pos.x + 'px';
            elem.style.height = pos.y + 'px';
        }
    }

    function _getElemBounds(rectElem) {
        var $rectElem = $(rectElem);
        var pos = $rectElem.offset();

        var bounds = _augmentBounds({
            x1: Math.floor(pos.left),
            y1: Math.floor(pos.top),
            x2: Math.floor(pos.left + $rectElem.width()),
            y2: Math.floor(pos.top + $rectElem.height())
        });

        return bounds;
    }

    function _augmentBounds(bounds) {
        if (bounds.x1 < bounds.x2) {
            bounds.left = bounds.x1;
            bounds.right = bounds.x2;
        } else {
            bounds.left = bounds.x2;
            bounds.right = bounds.x1;
        }
        if (bounds.y1 < bounds.y2) {
            bounds.top = bounds.y1;
            bounds.bottom = bounds.y2;
        } else {
            bounds.top = bounds.y2;
            bounds.bottom = bounds.y1;
        }
        bounds.width = Math.abs(bounds.x2 - bounds.x1);
        bounds.height = Math.abs(bounds.y2 - bounds.y1);

        return bounds;
    }

    function _getRectBounds(rectElem) {
        var pos = _getElemPos(rectElem);
        var extent = _getElemExtent(rectElem);
        var bounds = _augmentBounds({
            x1: pos.x,
            y1: pos.y,
            x2: pos.x + extent.x,
            y2: pos.y + extent.y
        });

        return bounds;
    }

    function within(innerBounds, outerBounds) {
        var isWithin =
            innerBounds.left >= outerBounds.left
            && innerBounds.right <= outerBounds.right
            && innerBounds.top >= outerBounds.top
            && innerBounds.bottom <= outerBounds.bottom;

        return isWithin;
    }

    function _getCanvasCount() {
        var keys = Object.keys(_registeredCanvases);
        var keyCount = keys.length;
        //var keyCount = $(_registeredCanvases).size();
        return keyCount;
    }

    function _registerCanvases(canvases) {
        $.each(canvases,
            function(idx, c) {
                _registeredCanvases[c.id] = c;
            });
    }

    //function _getZindexRange() {
    //    var min, minElem, max, maxElem, elemCount = 0;
    //    $("*").each(function () {
    //        elemCount++;
    //        var elem = this;
    //        var $elem = $(elem);
    //        var zi = $elem.css('z-index');
    //        //var zi = elem.style.zIndex;
    //        if (zi && zi !== "auto") {
    //            if (typeof min === "undefined" || zi < min) {
    //                min = zi;
    //                minElem = elem;
    //            }
    //            if (typeof max === "undefined" || zi > max) {
    //                max = zi;
    //                maxElem = elem;
    //            }
    //        }
    //    });
    //    var info = { elemCount: elemCount, min: min, max: max };
    //    return JSON.stringify(info);
    //}

    function init(canvases, config) {
        canvases = canvases || [];

        if (window.selectionRectangles_initialized) {
            if (canvases.length > 0) {
                _registerCanvases(canvases);
            }
            return;
        }
        config = _initConfig(config);

        //console.clear();

        config.$growthContainer.addClass('growth-container');

     // body.addClass('annotations-disabled');

        $canvasOverlay = $("<div class='canvas-overlay'></div>");
        var canvasOverlay = $canvasOverlay[0];
        var ensureOverlaySize = function () {
            var size = { x: config.$growthContainer.width(), y: config.$growthContainer.height() };
         // console.log("growthContainer size: { x: " + size.x + ", y: " + size.y + " }");
            var growthContainerOffset = config.$growthContainer.offset();
            $canvasOverlay.width(size.x + growthContainerOffset.left);
            $canvasOverlay.height(size.y + growthContainerOffset.top);
         // $canvasOverlay.offset(growthContainerOffset);
        }
        config.$growthContainer.resize(function () {
         // console.log("growthContainer resized");
            ensureOverlaySize();
        });

        var info = $([
            '<div class="info">',
                '<div class="header">Annotations</div>',
                '<div class="content"></div>',
            '</div>'
        ].join(''));
        var infoHeader = info.find('>.header');
        var infoContent = info.find('>.content');

        infoHeader.on('click',
            function toggleAnnotationMode() {
                var annotationsDisabled = 'annotations-disabled';
                if (body.hasClass(annotationsDisabled)) {
                    body.removeClass(annotationsDisabled);
                } else {
                    body.addClass(annotationsDisabled);
                }
            });

        config.$growthContainer.append(info);

        body.append($canvasOverlay);
        ensureOverlaySize();

        var mouse = null, mousePrev = null, mouseStart = null, mouseStart2 = null, mouseDragStart = null;
        var element = null;
        var creating = false, dragging = false, dragSuggested = null, sizing = false;
        var hovered = null, focused = null;
        var dragDistance = 0;
        var leftButtonWasDown = false;


        function coord(obj) {
            var ret;
            if (obj && !!obj.x && !!obj.y) {
                ret = "(" + obj.x + ", " + obj.y + ")";
            } else {
                ret = "?";
            }
            return ret;
        }

        function quantize(thing) {
            return {
                x: Math.floor(thing.x),
                y: Math.floor(thing.y)
            };
        }

        function applyMultiplier(thing, multiplier, msg) {
            var modified = {
                x: thing.x * multiplier.x,
                y: thing.y * multiplier.y
            };
            if (msg) {
                // console.log(msg + ": " + coord(thing) + " * " + coord(offset) + " -> " + coord(modified));
            }
            return modified;
        }
        function applyOffset(thing, offset, msg) {
            var modified = {
                x: thing.x + offset.x,
                y: thing.y + offset.y
            };
            if (msg) {
                // console.log(msg + ": " + coord(thing) + " + " + coord(offset) + " -> " + coord(modified));
            }
            return modified;
        }

        function getMousePosition(e) {
            var pos = {}, offset = {};
            var ev = e || window.event; //Moz || IE
            if (ev.pageX) { //Moz
                pos = { x: ev.pageX, y: ev.pageY }; // pageX and pageY include the offset
                offset = { x: 0, y: 0 };
                var canvasPos = $canvasOverlay.offset();
                offset = { x: -canvasPos.left, y: -canvasPos.top };
                // offset = { x: window.pageXOffset, y: window.pageYOffset};
            } else if (ev.clientX) { //IE
                pos = {
                    x: ev.clientX,
                    y: ev.clientY
                };
                offset = {
                    x: document.body.scrollLeft,
                    y: document.body.scrollTop
                };
            }

            pos = quantize(pos);
            offset = quantize(offset);
            var mouse = applyOffset(pos, offset);

            // console.log ("target id: '" + e.target.id + "' - " + coord(pos) + " + " + coord (offset) + " -> " + coord(mouse));

            showInfo(e, mouse);

            return mouse;
        };

        function leftButtonDown(e) {
            return (e.buttons & 1) !== 0;
        }
        function rightButtonDown(e) {
            return (e.buttons & 2) !== 0;
        }

        function getButtons(e) {
            var str = [];
            if (leftButtonDown(e)) {
                str.push("L");
            }
            if (rightButtonDown(e)) {
                str.push("R");
            }

            return str.join(' ');
        }

        function row(label, value) {
            return [
                "<tr>",
                "<td>", label, "</td>",
                "<td>", value, "</td>",
                "</tr>"
            ].join('');
        }
        function coordOption(obj) {
            return obj ? coord(obj) : "?";
        }

        function showSelInfo(obj) {
            var si = getSelectionInfoFromRect(obj);
            var info = "?";
            if (!!si) {
                info = [
                    "<table>",
                    "<tbody>",
                    row("id", si.id),
                    row("data", si.dataDesc),
                    "</tbody>",
                    "</table>"
                ].join('');
            }
            return info;
        }

        function showRectInfo(obj) {
            var info = "?";
            if (!!obj) {
                info = [
                    "<table>",
                    "<tbody>",
                 // row("id", !!obj.id ? obj.id : "?"),
                 // row("class", !!obj.className ? obj.className : "?"),
                    row("selInfo", showSelInfo(obj)),
                    "</tbody>",
                    "</table>"
                ].join('');
            }
            return info;
        }

        function showInfo(e) {
            if ($.url().param('demo')) {
                return;
            }
            infoContent.html([
                "<table>",
                "<tbody>",
             // row("zindexRange", _getZindexRange()),
                row("canvaes", _getCanvasCount()),
                row("buttons", getButtons(e)),
                row("mouse", coordOption(mouse)),
                row("mousePrev", coordOption(mousePrev)),
                row("mouseStart", coordOption(mouseStart)),
                row("mouseDragStart", coordOption(mouseDragStart)),
                row("creating", creating),
                row("dragSuggested", dragSuggested),
                row("dragDistance", dragDistance),
                row("dragging", dragging),
                row("sizing", sizing),
                row("element", element),
                row("hovered", showRectInfo(hovered)),
                row("focused", showRectInfo(focused)),
                "</tbody>",
                "</table>"
            ].join(''));
        }

        function getCoords(elem) {
            var pos = {
                x: parseInt(elem.style.left, 10),
                y: parseInt(elem.style.top, 10),
                w: parseInt(elem.style.width, 10),
                h: parseInt(elem.style.height, 10)
            };
            return "(" + pos.x + "," + pos.y + ") - (" + pos.w + " x " + pos.h + ")";
        }

        function setRectSize(rectElem, mouseStart) {
            if (!mouseStart) {
                debugger;
            }
            var d = {
                x: mouse.x - mouseStart.x,
                y: mouse.y - mouseStart.y
            };
            var rs = {
                x: Math.abs(d.x),
                y: Math.abs(d.y)
            };

            if (rectElem && rectElem.style) {
                rectElem.style.width = rs.x + 'px';
                rectElem.style.height = rs.y + 'px';
                rectElem.style.left = Math.min(mouse.x, mouseStart.x) + 'px';
                rectElem.style.top = Math.min(mouse.y, mouseStart.y) + 'px';
            }

            return rs;
        }

        function getElemId(elem) {
            var str = elem.id
                ? ("#" + elem.id)
                : elem.className
                    ? ("." + elem.className)
                    : "unknown";
            return str;
        }

        function clearSelection() {
            if (document.selection) {
                document.selection.empty();
            } else {
                window.getSelection().removeAllRanges();
            }

        }

        // TODO: move this into the jquery 'on' block below
        canvasOverlay.onmousemove = function (e) {
            mouse = getMousePosition(e);
            var moveDelta = mousePrev ? {
                x: mouse.x - mousePrev.x,
                y: mouse.y - mousePrev.y
            } : null;

            if (leftButtonDown(e)) {
                if (dragSuggested) {
                    var dragSuggestDelta = mouseDragStart ? {
                        x: mouse.x - mouseDragStart.x,
                        y: mouse.y - mouseDragStart.y
                    } : null;
                    dragDistance = Math.sqrt(Math.pow(dragSuggestDelta.x, 2) + Math.pow(dragSuggestDelta.y, 2));
                    if (dragDistance >= config.minDragDistance) {
                        endDragSuggest(e);
                        beginDrag(e);
                    }
                }

                if (dragging) {
                    // dragging
                    if (creating) {
                        // dragging a new rect
                        var dragDelta = {
                            x: mouse.x - mouseDragStart.x,
                            y: mouse.y - mouseDragStart.y
                        };
                        // console.log("'" + getElemId(e.target) + "' dragDelta: " + coord(dragDelta));
                        mouseStart2 = applyOffset(mouseStart, dragDelta, "mouseStart");
                        setRectSize(element, mouseStart2);
                    }
                    else {
                        // dragging an existing rect
                        var moveElem = hovered || focused;
                        if (sizing) {
                            var extent = _getElemExtent(moveElem);
                            var extentOffset = applyOffset(extent, moveDelta);

                            _setElemExtent(moveElem, extentOffset);
                        } else {
                            var pos = _getElemPos(moveElem);
                            var offset = applyOffset(pos, moveDelta);

                            _setElemPos(moveElem, offset);
                        }
                    }
                }
                else {
                    // not dragging
                    if (creating) {
                        // not dragging a new rect which is being created
                        setRectSize(element, mouseStart);
                    }
                    else {
                        // not dragging an existing rect
                    }
                }
            }
            clearSelection();
            mousePrev = mouse;
            showInfo(e);
        }

        $(document)
            .on(
                {
                    keydown: function (e) {
                        //console.log("key: " + e.key);
                        //console.log("keyCode: " + e.keyCode);
                        if (creating) {
                            if (e.shiftKey) {
                                if (!dragging) {
                                    beginDrag(e);
                                } else {
                                    endDrag(e);
                                }
                            }
                        } else {
                            if (e.shiftKey) {
                                if (!sizing) {
                                    beginSizing(e);
                                } else {
                                    endSizing(e);
                                }
                            }
                        }
                        switch (e.keyCode) {
                            case 37: // Left arrow
                            case 38: // Up arrow
                            case 39: // Right arrow
                            case 40: // Down arrow
                                doMoveFocused(e);
                                break;

                            case 46: // Delete
                                if (focused) {
                                    removeRect(focused);
                                    focused = null;
                                }
                                break;
                        }
                    }
                }
            );

        function findCanvasBeneathSelection($elem) {
            var elem = $elem[0];
            var ret = null;
            var state = {
                elem: elem,
                elemBounds: _getRectBounds(elem)
            };

            $.each(_registeredCanvases, function(_, canvas) {
                state.canvasBounds = _getElemBounds(canvas);
                if (within(state.elemBounds, state.canvasBounds)) {
                    state.canvas = canvas;
                    ret = state;
                    return false;
                }
                return true;
            });

            return ret;
        }

        function prepareSelectionInfo($elem) {
            var canvasInfo = findCanvasBeneathSelection($elem);
            var ret = null;
            if (canvasInfo) {
                var cb = _augmentBounds(canvasInfo.canvasBounds);
                var eb = canvasInfo.elemBounds;
                var bounds = _augmentBounds({
                    x1: eb.left   - cb.left,
                    y1: eb.top    - cb.top,
                    x2: eb.right  - cb.left,
                    y2: eb.bottom - cb.top
                });

                //var boundsInCanvas = _augmentBounds({
                //    x1: eb.left - cb.left,
                //    y1: eb.top - cb.top,
                //    x2: eb.right - cb.left,
                //    y2: eb.bottom - cb.top
                //});

                function applyDataStyle(rect) {
                    var si = getSelectionInfoFromRect(rect);
                    var $rect = $(rect);
                    var hasData = 'has-data';
                    if (!!si.data) {
                        $rect.addClass(hasData);
                    } else {
                        $rect.removeClass(hasData);
                    }
                }
                var rect = $elem[0];
                ret = {
                    elem: rect,
                    canvas: canvasInfo.canvas,
                    bounds: bounds,
                    canvasBounds: cb,
                    // boundsInCanvas: boundsInCanvas,
                    dataStore: {
                        putData: function(obj) {
                            var si = getSelectionInfoFromRect(rect);
                            if (obj.hasOwnProperty('data')) {
                                si.data = obj.data;
                            }
                            if (obj.hasOwnProperty('dataDesc')) {
                                si.dataDesc = obj.dataDesc;
                            }
                            if (obj.hasOwnProperty('zoomedCloneImgSrc')) {
                                si.zoomedCloneImgSrc = obj.zoomedCloneImgSrc;
                            }
                            applyDataStyle(rect);
                        },
                        getData: function() {
                            var si = getSelectionInfoFromRect(rect);
                            return {
                                data: si.data,
                                dataDesc: si.dataDesc,
                                zoomedCloneImgSrc: si.zoomedCloneImgSrc
                            };
                            //return { data: getTestData(), dataDesc: "Test data" };
                        }
                    }
                };
            }
            return ret;
        }

        function getTestData() {
            return {
                "datasets": [{
                    "name": "CHADS2, score = 0",
                    "points": [{
                        "px": 87.16666666666667,
                        "py": 99.38888888888889,
                        "dx": -0.15972866948229258,
                        "dy": 99.5889728573357
                    },
                    {
                        "px": 98.5,
                        "py": 99.22727272727273,
                        "dx": 0.12054445144318038,
                        "dy": 99.63263616136575
                    },
                    {
                        "px": 109.5,
                        "py": 102.15151515151516,
                        "dx": 0.3927901057679266,
                        "dy": 98.38848675808873
                    },
                    {
                        "px": 120.5,
                        "py": 104.0909090909091,
                        "dx": 0.6649667621649096,
                        "dy": 97.55556500427463
                    },
                    {
                        "px": 131.5,
                        "py": 106.5909090909091,
                        "dx": 0.9371826943053891,
                        "dy": 96.48855981922779
                    },
                    {
                        "px": 142.5,
                        "py": 107.97045454545454,
                        "dx": 1.2093201280342059,
                        "dy": 95.88940516768531
                    },
                    {
                        "px": 153.5,
                        "py": 110.08333333333334,
                        "dx": 1.4815089386815417,
                        "dy": 94.9840440817735
                    },
                    {
                        "px": 164.5,
                        "py": 111.88701298701298,
                        "dx": 1.753676087012436,
                        "dy": 94.20779040185245
                    },
                    {
                        "px": 175.5,
                        "py": 112.83203463203462,
                        "dx": 2.02578307824895,
                        "dy": 93.79007300444114
                    },
                    {
                        "px": 186.5,
                        "py": 114.22554112554111,
                        "dx": 2.2979214900802587,
                        "dy": 93.18508886204364
                    },
                    {
                        "px": 197.5,
                        "py": 115.46363636363635,
                        "dx": 2.5700490138869236,
                        "dy": 92.64499734652841
                    },
                    {
                        "px": 208.5,
                        "py": 116.60000000000001,
                        "dx": 2.8421694104351163,
                        "dy": 92.14738429150717
                    },
                    {
                        "px": 219.5,
                        "py": 117.27272727272727,
                        "dx": 3.1142573248819323,
                        "dy": 91.84336456069462
                    },
                    {
                        "px": 230.5,
                        "py": 117.4909090909091,
                        "dx": 3.386313394131319,
                        "dy": 91.72914220655727
                    },
                    {
                        "px": 241.5,
                        "py": 118.86363636363636,
                        "dx": 3.658450350182175,
                        "dy": 91.13283451566492
                    },
                    {
                        "px": 252.5,
                        "py": 120.31818181818181,
                        "dx": 3.9305930383685688,
                        "dy": 90.50236329697104
                    },
                    {
                        "px": 263.5,
                        "py": 121.81818181818181,
                        "dx": 4.202738911074704,
                        "dy": 89.85291234060963
                    },
                    {
                        "px": 274.5,
                        "py": 123.04545454545455,
                        "dx": 4.474865676662382,
                        "dy": 89.31733981025334
                    },
                    {
                        "px": 285.5,
                        "py": 124.72727272727273,
                        "dx": 4.74702428744749,
                        "dy": 88.59196990322187
                    },
                    {
                        "px": 296.5,
                        "py": 126.36363636363636,
                        "dx": 5.019179713712854,
                        "dy": 87.8855797338579
                    },
                    {
                        "px": 307.5,
                        "py": 127.63636363636364,
                        "dx": 5.291309663820276,
                        "dy": 87.3310274658341
                    },
                    {
                        "px": 318.5,
                        "py": 129,
                        "dx": 5.563445982967183,
                        "dy": 86.73851572247526
                    },
                    {
                        "px": 329.5,
                        "py": 130.4090909090909,
                        "dx": 5.835585486633833,
                        "dy": 86.12702424144888
                    },
                    {
                        "px": 340.5,
                        "py": 131.5909090909091,
                        "dx": 6.1077090677017685,
                        "dy": 85.61043144876011
                    },
                    {
                        "px": 351.5,
                        "py": 133,
                        "dx": 6.379848571368419,
                        "dy": 84.99893996773375
                    },
                    {
                        "px": 362.5,
                        "py": 134.27272727272728,
                        "dx": 6.651978521475841,
                        "dy": 84.44438769970994
                    },
                    {
                        "px": 373.5,
                        "py": 135.6818181818182,
                        "dx": 6.92411802514249,
                        "dy": 83.83289621868357
                    },
                    {
                        "px": 384.5,
                        "py": 137,
                        "dx": 7.196251159769656,
                        "dy": 83.25936421299224
                    },
                    {
                        "px": 395.5,
                        "py": 138.3181818181818,
                        "dx": 7.468384294396819,
                        "dy": 82.68583220730092
                    },
                    {
                        "px": 406.5,
                        "py": 139.5909090909091,
                        "dx": 7.740514244504241,
                        "dy": 82.1312799392771
                    },
                    {
                        "px": 417.5,
                        "py": 140.86363636363637,
                        "dx": 8.012644194611664,
                        "dy": 81.57672767125331
                    },
                    {
                        "px": 428.5,
                        "py": 141.77272727272728,
                        "dx": 8.28474866856114,
                        "dy": 81.17401330456966
                    },
                    {
                        "px": 439.5,
                        "py": 142.9090909090909,
                        "dx": 8.556869065109332,
                        "dy": 80.67640024954841
                    },
                    {
                        "px": 450.5,
                        "py": 145.0909090909091,
                        "dx": 8.829062705611612,
                        "dy": 79.7422532281742
                    },
                    {
                        "px": 461.5,
                        "py": 147,
                        "dx": 9.101237238995434,
                        "dy": 78.92198463280513
                    },
                    {
                        "px": 472.5,
                        "py": 147.0909090909091,
                        "dx": 9.373284391589543,
                        "dy": 78.86090554413684
                    },
                    {
                        "px": 483.5,
                        "py": 149.3181818181818,
                        "dx": 9.645481216611564,
                        "dy": 77.9077787850951
                    },
                    {
                        "px": 494.5,
                        "py": 149.5,
                        "dx": 9.917534738245156,
                        "dy": 77.80874022109178
                    },
                    {
                        "px": 500.5,
                        "py": 150,
                        "dx": 10.065955649901213,
                        "dy": 77.58735240856728
                    }]
                },
                {
                    "name": "Diabetes mellitus",
                    "points": [{
                        "px": 83.5,
                        "py": 99.0909090909091,
                        "dx": -0.2504298069632589,
                        "dy": 99.72110211982275
                    },
                    {
                        "px": 95.5,
                        "py": 100.06190476190477,
                        "dx": 0.04640998432196941,
                        "dy": 99.2904373749997
                    },
                    {
                        "px": 106.73809523809524,
                        "py": 107.78138699924413,
                        "dx": 0.3248799190839291,
                        "dy": 96.04351488567227
                    },
                    {
                        "px": 117.5,
                        "py": 105.87200577200578,
                        "dx": 0.5908986038214561,
                        "dy": 96.81816590247601
                    },
                    {
                        "px": 124.57692307692308,
                        "py": 113.06807081807082,
                        "dx": 0.7664220014318923,
                        "dy": 93.79854435576632
                    },
                    {
                        "px": 130.3,
                        "py": 107.95555555555556,
                        "dx": 0.9076011242770039,
                        "dy": 95.92126805689038
                    },
                    {
                        "px": 139.5,
                        "py": 109.88084415584416,
                        "dx": 1.1352610278802429,
                        "dy": 95.0980192565213
                    },
                    {
                        "px": 150.73809523809524,
                        "py": 114.44722222222224,
                        "dx": 1.4135100579475601,
                        "dy": 93.16768874726444
                    },
                    {
                        "px": 162.27777777777777,
                        "py": 115.4903439153439,
                        "dx": 1.6989708002875874,
                        "dy": 92.70787496433107
                    },
                    {
                        "px": 172.08333333333334,
                        "py": 115.90393518518518,
                        "dx": 1.9415007777599742,
                        "dy": 92.51456903039218
                    },
                    {
                        "px": 184.43333333333334,
                        "py": 120.32555555555557,
                        "dx": 2.2472381609728727,
                        "dy": 90.64234572667822
                    },
                    {
                        "px": 194.08333333333334,
                        "py": 122.21875,
                        "dx": 2.4860247572231247,
                        "dy": 89.83155217443431
                    },
                    {
                        "px": 205.5,
                        "py": 125.31818181818181,
                        "dx": 2.7685872603523576,
                        "dy": 88.51337595596777
                    },
                    {
                        "px": 216.5,
                        "py": 127.60606060606064,
                        "dx": 3.0407883314007034,
                        "dy": 87.534942880036
                    },
                    {
                        "px": 228.4375,
                        "py": 132.36979166666666,
                        "dx": 3.3363481533117447,
                        "dy": 85.52073679643566
                    },
                    {
                        "px": 237.56666666666666,
                        "py": 133.79500000000002,
                        "dx": 3.5622212438014653,
                        "dy": 84.90644750251386
                    },
                    {
                        "px": 242.5,
                        "py": 140.45454545454547,
                        "dx": 3.684693977383187,
                        "dy": 82.11535734056274
                    },
                    {
                        "px": 250.625,
                        "py": 134.06944444444446,
                        "dx": 3.8851858559437673,
                        "dy": 84.76440628079291
                    },
                    {
                        "px": 255,
                        "py": 142.34410430838997,
                        "dx": 3.993963612846988,
                        "dy": 81.30009176291126
                    },
                    {
                        "px": 266.1111111111111,
                        "py": 141.74706790123457,
                        "dx": 4.268710455071212,
                        "dy": 81.5260336946171
                    },
                    {
                        "px": 275.5625,
                        "py": 142.7092261904762,
                        "dx": 4.502519975974231,
                        "dy": 81.10441566350013
                    },
                    {
                        "px": 282.4375,
                        "py": 148.52678571428572,
                        "dx": 4.672953040625365,
                        "dy": 78.66081932537095
                    },
                    {
                        "px": 291.92857142857144,
                        "py": 147.55714285714288,
                        "dx": 4.907608608740865,
                        "dy": 79.04574962781767
                    },
                    {
                        "px": 298.7857142857143,
                        "py": 154.64705215419502,
                        "dx": 5.077689188848771,
                        "dy": 76.07091579334391
                    },
                    {
                        "px": 307.8076923076923,
                        "py": 149.63827838827845,
                        "dx": 5.300460637929384,
                        "dy": 78.14338821952475
                    },
                    {
                        "px": 310.5,
                        "py": 159.35833333333332,
                        "dx": 5.36772502804294,
                        "dy": 74.0790795275423
                    },
                    {
                        "px": 319.9,
                        "py": 151.625,
                        "dx": 5.599654450121604,
                        "dy": 77.28840880222486
                    },
                    {
                        "px": 322.1923076923077,
                        "py": 160.99184981684982,
                        "dx": 5.657001702754411,
                        "dy": 73.37242311832995
                    },
                    {
                        "px": 332.26190476190476,
                        "py": 159.17857142857144,
                        "dx": 5.9059056724864485,
                        "dy": 74.1084010688967
                    },
                    {
                        "px": 342.79999999999995,
                        "py": 162.60345238095238,
                        "dx": 6.166763043685452,
                        "dy": 72.65617875474277
                    },
                    {
                        "px": 353.5,
                        "py": 164.34199134199133,
                        "dx": 6.431506334199324,
                        "dy": 71.9077553814024
                    },
                    {
                        "px": 364.1666666666667,
                        "py": 168.71626984126985,
                        "dx": 6.695609917123547,
                        "dy": 70.05883787759105
                    },
                    {
                        "px": 375.73809523809524,
                        "py": 171.81428571428575,
                        "dx": 6.981999734673901,
                        "dy": 68.74092761707097
                    },
                    {
                        "px": 386,
                        "py": 171.565,
                        "dx": 7.235769234602448,
                        "dy": 68.82344962393476
                    },
                    {
                        "px": 397.73809523809524,
                        "py": 174.0487528344671,
                        "dx": 7.5262378472856435,
                        "dy": 67.76167719551417
                    },
                    {
                        "px": 408.9166666666667,
                        "py": 174.54801587301586,
                        "dx": 7.80272985541261,
                        "dy": 67.52971287081029
                    },
                    {
                        "px": 418.56666666666666,
                        "py": 176.82962962962964,
                        "dx": 8.04154366410016,
                        "dy": 66.55673319226698
                    },
                    {
                        "px": 430.5,
                        "py": 178.0681818181818,
                        "dx": 8.33675346822212,
                        "dy": 66.01448921099455
                    },
                    {
                        "px": 437.5,
                        "py": 190.72727272727272,
                        "dx": 8.510757219232541,
                        "dy": 60.71391978937824
                    },
                    {
                        "px": 439,
                        "py": 176,
                        "dx": 8.54682190532057,
                        "dy": 66.86020211910919
                    },
                    {
                        "px": 448.8,
                        "py": 191.95,
                        "dx": 8.79030296046519,
                        "dy": 60.179614697879614
                    },
                    {
                        "px": 459.5,
                        "py": 192.2077922077922,
                        "dx": 9.05494251069912,
                        "dy": 60.04948339296965
                    },
                    {
                        "px": 468.64285714285717,
                        "py": 203.60694444444445,
                        "dx": 9.28185294895416,
                        "dy": 55.27050287113521
                    },
                    {
                        "px": 477.4166666666667,
                        "py": 221.90476190476193,
                        "dx": 9.500119794387523,
                        "dy": 47.611731170897286
                    },
                    {
                        "px": 475.5,
                        "py": 210.125,
                        "dx": 9.451893465312413,
                        "dy": 52.534448984612936
                    },
                    {
                        "px": 488.8,
                        "py": 224.25,
                        "dx": 9.781805093120369,
                        "dy": 46.60854179012824
                    },
                    {
                        "px": 497.5,
                        "py": 224.28571428571428,
                        "dx": 9.996967124054407,
                        "dy": 46.57534362674019
                    }]
                },
                {
                    "name": "Heart failure",
                    "points": [{
                        "px": 98.5,
                        "py": 101.72727272727273,
                        "dx": 0.12071960002903825,
                        "dy": 98.58875058965216
                    },
                    {
                        "px": 109.8,
                        "py": 105.15,
                        "dx": 0.4004194720172416,
                        "dy": 97.13582619504558
                    },
                    {
                        "px": 120.5,
                        "py": 107.86363636363636,
                        "dx": 0.6652310773035683,
                        "dy": 95.98024677787049
                    },
                    {
                        "px": 130.72222222222223,
                        "py": 109.72222222222223,
                        "dx": 0.9181668654141171,
                        "dy": 95.18270150004443
                    },
                    {
                        "px": 142.5,
                        "py": 112.86363636363636,
                        "dx": 1.2096629415845261,
                        "dy": 93.84623640777681
                    },
                    {
                        "px": 152.5,
                        "py": 115.22222222222223,
                        "dx": 1.4571379860071025,
                        "dy": 92.84038107850367
                    },
                    {
                        "px": 166.5,
                        "py": 117.45454545454545,
                        "dx": 1.8035281058340935,
                        "dy": 91.87884011063022
                    },
                    {
                        "px": 177.5,
                        "py": 119.27272727272727,
                        "dx": 2.0756962701784287,
                        "dy": 91.0965309905962
                    },
                    {
                        "px": 187.5,
                        "py": 122.38888888888889,
                        "dx": 2.3232243899300533,
                        "dy": 89.7743467001977
                    },
                    {
                        "px": 200.5,
                        "py": 124.81818181818181,
                        "dx": 2.6448973290194493,
                        "dy": 88.73266198546196
                    },
                    {
                        "px": 210,
                        "py": 127.25,
                        "dx": 2.880012013895593,
                        "dy": 87.69727908146186
                    },
                    {
                        "px": 222.5,
                        "py": 130.6818181818182,
                        "dx": 3.189389699175522,
                        "dy": 86.23803659968542
                    },
                    {
                        "px": 233.2,
                        "py": 133.54000000000002,
                        "dx": 3.45421143123463,
                        "dy": 85.0221016167276
                    },
                    {
                        "px": 243.28571428571428,
                        "py": 138.72619047619048,
                        "dx": 3.704004374350675,
                        "dy": 82.83538786949202
                    },
                    {
                        "px": 253.5,
                        "py": 140.88888888888889,
                        "dx": 3.9567651907931287,
                        "dy": 81.91087578951763
                    },
                    {
                        "px": 256.5,
                        "py": 142.5,
                        "dx": 4.031071005295679,
                        "dy": 81.23184418310022
                    },
                    {
                        "px": 267.5,
                        "py": 142.95454545454547,
                        "dx": 4.3031436340477285,
                        "dy": 81.01892719309177
                    },
                    {
                        "px": 278.5,
                        "py": 148.3181818181818,
                        "dx": 4.575560190932009,
                        "dy": 78.75619853499119
                    },
                    {
                        "px": 288.5,
                        "py": 151.66666666666666,
                        "dx": 4.823104587117875,
                        "dy": 77.33700669651427
                    },
                    {
                        "px": 300.5,
                        "py": 154.69393939393942,
                        "dx": 5.120088440010518,
                        "dy": 76.0477347714939
                    },
                    {
                        "px": 310.94444444444446,
                        "py": 158.93703703703704,
                        "dx": 5.378687059073019,
                        "dy": 74.25405945179908
                    },
                    {
                        "px": 321.5,
                        "py": 160.85185185185185,
                        "dx": 5.63987044666015,
                        "dy": 73.43233494118162
                    },
                    {
                        "px": 335.5,
                        "py": 163.66666666666666,
                        "dx": 5.986301375517919,
                        "dy": 72.22757214986517
                    },
                    {
                        "px": 347.5,
                        "py": 163.4090909090909,
                        "dx": 6.283055093783811,
                        "dy": 72.30990260028422
                    },
                    {
                        "px": 358.5,
                        "py": 166.04545454545453,
                        "dx": 6.55528057948352,
                        "dy": 71.18595820223483
                    },
                    {
                        "px": 370.64285714285717,
                        "py": 171.71428571428572,
                        "dx": 6.855982495655383,
                        "dy": 68.7933921249034
                    },
                    {
                        "px": 380.5,
                        "py": 171.69696969696972,
                        "dx": 7.099758088547458,
                        "dy": 68.77990492557335
                    },
                    {
                        "px": 391.125,
                        "py": 172.1875,
                        "dx": 7.362559120756457,
                        "dy": 68.55275047854781
                    },
                    {
                        "px": 401.72222222222223,
                        "py": 172.93650793650795,
                        "dx": 7.624691290086607,
                        "dy": 68.21772598550503
                    },
                    {
                        "px": 416.5,
                        "py": 174.10606060606062,
                        "dx": 7.990242159727136,
                        "dy": 67.69831464010414
                    },
                    {
                        "px": 426.75,
                        "py": 177.75,
                        "dx": 8.243990000372118,
                        "dy": 66.1552290610308
                    },
                    {
                        "px": 438,
                        "py": 177.55,
                        "dx": 8.522199517120658,
                        "dy": 66.21509484767705
                    },
                    {
                        "px": 453,
                        "py": 175.4375,
                        "dx": 8.893016221412815,
                        "dy": 67.0656514103206
                    },
                    {
                        "px": 468,
                        "py": 175,
                        "dx": 9.2639502752575,
                        "dy": 67.21680463991605
                    },
                    {
                        "px": 482,
                        "py": 175.125,
                        "dx": 9.610192757210857,
                        "dy": 67.13518539890622
                    },
                    {
                        "px": 496,
                        "py": 175.41666666666666,
                        "dx": 9.956446915736606,
                        "dy": 66.98397378644883
                    }]
                }]
            };
        }


        function setHovered($elem) {
            $elem.addClass('hovered');
            hovered = $elem[0];

            config.selectionHoveredHandler(prepareSelectionInfo($elem));
        }

        function setUnhovered($elem) {
            $elem.removeClass('hovered');
            hovered = null;
            config.selectionUnhoveredHandler(prepareSelectionInfo($elem));
        }

        function setFocused($elem) {
            $elem.addClass('focused');
            focused = $elem[0];
            config.selectionFocusedHandler(prepareSelectionInfo($elem));
        }

        function setUnfocused($elem) {
            $elem.removeClass('focused');
            focused = null;
            config.selectionBlurredHandler(prepareSelectionInfo($elem));
        }


        $canvasOverlay.on(
            {
                mouseenter: function (e) {
                    if (creating || dragging) {
                        return;
                    }
                    setHovered($(this));
                },
                mouseleave: function (e) {
                    if (creating || dragging) {
                        return;
                    }
                    if (dragSuggested) {
                        endDragSuggest(e);
                    }
                    setUnhovered($(this));
                }
            },
            '.rectangle'
        );

        $canvasOverlay.on(
            {
                mousedown: function(e) {
                    var $elem = $(this.parentNode);
                    config.selectionNumberClickedHandler(prepareSelectionInfo($elem));
                    e.preventDefault();
                }
            },
            '.rectangle > .id');

        $canvasOverlay.on(
            {
                mousedown: function(e) {
                    var $elem = $(this.parentNode);
                    config.dataIconClickedHandler(prepareSelectionInfo($elem));
                    e.preventDefault();
                }
            },
            '.rectangle.has-data > .data');

        function doMoveFocused(e) {
            /*
                case 37: // Left arrow
                case 38: // Up arrow
                case 39: // Right arrow
                case 40: // Down arrow
            */
            var elem = focused;
            if (elem) {
                var pos = _getElemPos(elem);
                var moveMap = {
                    37: { x: -1, y: 0 },
                    38: { x: 0, y: -1 },
                    39: { x: +1, y: 0 },
                    40: { x: 0, y: +1 }
                };
                var speeds = [1, 5, 50];

                // Shift + Ctrl -> slow
                // Shift -> default
                // Shift + Alt -> fast

                var goSlow    = (e.shiftKey &&  e.ctrlKey && !e.altKey);
                var goDefault = (e.shiftKey && !e.ctrlKey && !e.altKey);
                var goFast    = (e.shiftKey && !e.ctrlKey &&  e.altKey);
                var speed =
                    goSlow ? speeds[0]
                        : goFast
                            ? speeds[2]
                            : speeds[1];

                var scaledMoveMap = applyMultiplier(
                    moveMap[e.keyCode],
                    { x: speed, y: speed }
                );
                var offset = applyOffset(pos, scaledMoveMap);

                _setElemPos(elem, offset);
            }
        }

        var nextId = 1;

        function getIdElem($elem) {
            return $elem.children('.id');
        }
        function showIdElem($elem, show) {
            if (show) {
                getIdElem($elem).removeClass('hidden');
            } else {
                getIdElem($elem).addClass('hidden');
            }
        }

        function getRectId(rect) {
            var id = $(rect).attr(idAttr);
            return id;
        }
        function setRectId(rect, id) {
            $(rect).attr(idAttr, id);
        }
        function getSelectionInfoFromRect(rect) {
            var id = getRectId(rect);
            return _selectionInfo[id];
        }
        function createSelectionInfo(id) {
            _selectionInfo[id] = {
                id: id + "",
                data: null,
                dataDesc: "none",
                zoomedCloneImgSrc: null
            };
        }

        function renumber() {
            var rects = $('.rectangle');
            var selectionInfoTemp = _selectionInfo;
            _selectionInfo = {};

            rects.each(function (idx, r) {
                var rect = $(r);
                var id = idx + 1;
                // rect.tabIndex = id;
                var oldId = getRectId(rect);
                var si = selectionInfoTemp[oldId];
                si.id += " > " + id;
                _selectionInfo[id] = si;
                setRectId(rect, id);
                getIdElem(rect).html(id);
            });
            nextId = rects.length + 1;
        }

        function beginCreatingSelection(e) {
            if (!creating) {
                if (focused) {
                    setUnfocused(focused);
                }
                if (hovered) {
                    setUnhovered(hovered);
                }
                // console.log("begun.");
                mouseStart = mouse;

                var id = nextId++;
                var rectHtml = [
                    "<div ",
                        "class='rectangle' ",
                     // idAttr,"='",id,"'",
                        "style='",
                            "left: ", mouseStart.x, "px; ",
                            "top: ", mouseStart.y, "px' ",
                 // "tabIndex='", id, "'",
                    ">",
                        "<span ",
                            "class='id hidden'",
                        ">",
                        id,
                        "</span>",
                        "<span class='data'>data</span>",
                    "</div>"
                ].join('');
                element = $(rectHtml)[0];
                setRectId(element, id);
                $canvasOverlay.append(element);
                createSelectionInfo(id);

                creating = true;
            }
            showInfo(e);
        }

        function removeRect(elem) {
            var $elem = $(elem);
            if (!$elem.hasClass('rectangle')) { return; }

            $elem.remove();
            renumber();

            config.selectionDeletedHandler(prepareSelectionInfo($elem));
        }

        function endCreatingSelection(e) {
            if (creating && element) {
                endDrag(e);
                var rs = setRectSize(element, mouseStart);
                if (rs.x < config.minX || rs.y < config.minY) {
                    removeRect(element);
                    //console.log("rect was too small: " + coord(rs) + " - removed.");
                } else {
                    // console.log("finished. rect: " + coord(rs));
                    var $element = $(element);
                    config.selectionCreatedHandler(prepareSelectionInfo($element));
                    showIdElem($element, true);
                    setHovered($element);
                    setFocused($element);
                }
                element = null;
                creating = false;
                mouseStart = null;
            }
            showInfo(e);
        }

        function beginDragSuggest(e) {
            if (!dragging && !dragSuggested) {
                mouseDragStart = mouse;
                dragSuggested = e.target;
                showInfo(e);
            }
        }
        function endDragSuggest(e) {
            if (dragSuggested) {
                dragSuggested = null;
                showInfo(e);
            }
        }

        function beginDrag(e) {
            if (!dragging) {
                showIdElem($(e.target), false);
                mouseDragStart = mouse;
                dragging = true;
                showInfo(e);
            }
        }
        function endDrag(e) {
            if (dragging) {
                showIdElem($(e.target), true);
                mouseStart = mouseStart2;
                dragging = false;
                // mouseDragStart = null;
                showInfo(e);
            }
        }

        function beginSizing(e) {
            if ((hovered || focused) && dragging && !sizing) {
                sizing = true;
            }
            showInfo(e);
        }
        function endSizing(e) {
            if (sizing) {
                sizing = false;
            }
            showInfo(e);
        }

        function hoveredOrFocused() {
            return hovered || focused;
        }

        canvasOverlay.onmousedown = function (e) {
            if (leftButtonDown(e)) {
                leftButtonWasDown = true;
            }
            if (!rightButtonDown(e)) {
                if (!creating && !dragging && leftButtonDown(e)) {

                    if (hovered === e.target) {
                        beginDragSuggest(e);

                        if (focused === hovered) {
                            // beginDragSuggest(e);
                        }
                    } else {
                        var ancestorRect = $(e.target).closest('.rectangle');
                        if (ancestorRect.length > 0) {
                            ancestorRect = ancestorRect[0];
                        }
                        if (ancestorRect && ancestorRect === hovered) {
                            // clicking on a descendant of a rectangle
                        } else {
                            // start creating a new selection rect
                            if (hovered) {
                                setUnhovered($(hovered));
                            }
                            if (focused) {
                                setUnfocused($(focused));
                            }
                            beginCreatingSelection(e);
                        }
                    }
                }
            }
            showInfo(e);
        };

        canvasOverlay.onmouseup = function (e) {
            var leftButtonNowUp = false;
            if (leftButtonWasDown && !leftButtonDown(e)) {
                leftButtonWasDown = false;
                leftButtonNowUp = true;
            }
            if (creating && leftButtonNowUp) {
                endCreatingSelection(e);
            }
            else if (!creating && !dragging && leftButtonNowUp) {
                if (hovered === e.target) {
                    // click existing selection rect
                    if (focused === e.target) {
                        setUnfocused($(focused));
                    } else {
                        if (focused) {
                            setUnfocused($(focused));
                        }
                        setFocused($(hovered));
                    }
                }
                else {
                    // start creating a new selection rect
                    if (hovered) {
                        setUnhovered($(hovered));
                    }
                    if (focused) {
                        setUnfocused($(focused));
                    }
                    beginCreatingSelection(e);
                }
            }
            else if (!creating && dragging) {
                endDrag(e);
                if (sizing) {
                    endSizing(e);
                }
            }
            showInfo(e);
        };

        canvasOverlay.oncontextmenu = function (e) {
            e.preventDefault();
        };

        window.selectionRectangles_initialized = true;
    }

    function getSelections() {
        var selections = $canvasOverlay.find('>.rectangle')
            .map(function (rectElem) {
                return _getRectBounds(rectElem);
            });
        return selections;
    }

    function getSelectionInfo(rectElem) {
        return _getRectBounds(rectElem);
    }

    function getCanvasHiddenScale(canvas) {
        var canvasStyleExtent = _getElemExtent(canvas);
        var $canvas = $(canvas);
        var canvasExtent = { x: $canvas.attr('width'), y: $canvas.attr('height') };

        //var hiddenScaleX = 800/714;
        //var hiddenScaleY = 1064/959;
        var hiddenScale = {
            x: canvasStyleExtent.x / canvasExtent.x,
            y: canvasStyleExtent.y / canvasExtent.y
        };

        return hiddenScale;
    }


    function getZoomedCloneOfArea(sel, scale) {
        var ctx1 = sel.canvas;
        var hiddenScale = getCanvasHiddenScale(sel.canvas);

        var preScaled = {
            width: sel.bounds.width / hiddenScale.x,
            height: sel.bounds.height / hiddenScale.y
        };
        var scaled = {
            width: preScaled.width * scale,
            height: preScaled.height * scale
        };
        var copiedCanvas = $("<canvas>").attr("width", scaled.width).attr("height", scaled.height)[0];
        var ctx2 = copiedCanvas.getContext("2d", { alpha: false });

        ctx2.fillStyle = "rgb(255,0,0)";
        ctx2.fillRect(0, 0, scaled.width, scaled.height);
        ctx2.drawImage(ctx1,
            sel.bounds.left / hiddenScale.x,
            sel.bounds.top  / hiddenScale.y,
            preScaled.width, //sel.bounds.width,
            preScaled.height, //sel.bounds.height,
            0,
            0,
            scaled.width,
            scaled.height
        );

        return copiedCanvas;
    }


    window.selectionRectangles = {
        init: init,
        getSelections: getSelections,
        getSelectionInfo: getSelectionInfo,
        getZoomedCloneOfArea: getZoomedCloneOfArea,
        getCanvasHiddenScale: getCanvasHiddenScale
    }
})();

