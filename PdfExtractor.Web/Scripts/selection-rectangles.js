//window.console = console || { clear: function () { }, log: function () { } };

(function() {
    var body = $(document.body), config;


    window.selectionRectangles_initialized = false;
    var $canvasOverlay;

    var _registeredCanvases = {}, _selectionInfo = {};
    var idAttr = "data-id";


    // <-- helpers moved from init (begin)

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
    }

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
                row("auto", si.autoPlaced),
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
    var infoHeader, infoContent;

    function showInfo(e) {
        if (!wpd.utils.getDevOptions().showSelectionInfo) {
            return;
        }
        infoContent.html([
            "<table>",
            "<tbody>",
         // row("zindexRange", _getZindexRange()),
            row("canvas", _getCanvasCount()),
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

    function doSetRectPosition(rectElem, rs) {
        if (rectElem && rectElem.style) {
            rectElem.style.left = rs.left + 'px';
            rectElem.style.top = rs.top + 'px';
        }
    }

    function doSetRectSize(rectElem, rs) {
        if (rectElem && rectElem.style) {
            rectElem.style.width = rs.width + 'px';
            rectElem.style.height = rs.height + 'px';
        }
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
            left: Math.min(mouse.x, mouseStart.x),
            top: Math.min(mouse.y, mouseStart.y),
            width: Math.abs(d.x),
            height: Math.abs(d.y),
        };

        doSetRectPosition(rectElem, rs);
        doSetRectSize(rectElem, rs);

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

    function findCanvasBeneathSelection($elem) {
        var elem = $elem[0];
        var ret = null;
        var state = {
            elem: elem,
            elemBounds: _getRectBounds(elem)
        };

        $.each(_registeredCanvases, function (_, canvas) {
            state.canvasBounds = _getElemBounds(canvas);
         // if (within(state.elemBounds, state.canvasBounds)) {
            if (withinVertical(state.elemBounds, state.canvasBounds)) {
                state.canvas = canvas;
                ret = state;
                return false;
            }
            return true;
        });

        return ret;
    }

    function prepareSelectionInfo($elem, autoPlaced) {
        var canvasInfo = findCanvasBeneathSelection($elem);
        var ret = null;
        if (canvasInfo) {
            var cb = _augmentBounds(canvasInfo.canvasBounds);
            var eb = canvasInfo.elemBounds;
            var bounds = _augmentBounds({
                x1: eb.left - cb.left,
                y1: eb.top - cb.top,
                x2: eb.right - cb.left,
                y2: eb.bottom - cb.top
            });

            //var boundsInCanvas = _augmentBounds({
            //    x1: eb.left - cb.left,
            //    y1: eb.top - cb.top,
            //    x2: eb.right - cb.left,
            //    y2: eb.bottom - cb.top
            //});
            var si = getSelectionInfoFromRect($elem);
            if (si) {
                if (!si.hasOwnProperty('autoPlaced') || autoPlaced) {
                    si.autoPlaced = autoPlaced;
                }
            }

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
                    putData: function (obj) {
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

                        // ???? - revisit this when saving data
                        //if (obj.hasOwnProperty('canvasImageInfo')) {
                        //    si.canvasImageInfo = obj.canvasImageInfo;
                        //}
                        //if (obj.hasOwnProperty('autoPlaced')) {
                        //    si.canvasImageInfo = obj.autoPlaced;
                        //}
                        applyDataStyle(rect);
                    },
                    getData: function () {
                        var si = getSelectionInfoFromRect(rect);
                        return {
                            data: si.data,
                            dataDesc: si.dataDesc,
                            zoomedCloneImgSrc: si.zoomedCloneImgSrc,
                            canvasImageInfo: si.canvasImageInfo,
                            autoPlaced: si.autoPlaced
                        };
                    }
                }
            };
        }
        return ret;
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

    function setRectId(rect, id) {
        $(rect).attr(idAttr, id);
    }

    function getSelectionInfoFromRect(rect) {
        var id = getRectId(rect);
        return _selectionInfo[id];
    }

    function createSelectionInfo(id, canvasImageInfo) {
        _selectionInfo[id] = {
            id: id + "",
            data: null,
            dataDesc: "none",
            zoomedCloneImgSrc: null,
            canvasImageInfo: canvasImageInfo
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


    function doCreateSelectionDiv(pos, canvasImageInfo) {
        var id = nextId++;
        var rectHtml = [
            "<div ",
                "class='rectangle' ",
             // idAttr,"='",id,"'",
                "style='",
                    "left: ", pos.x, "px; ",
                    "top: ", pos.y, "px' ",
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
        createSelectionInfo(id, canvasImageInfo);
    }

    function beginCreatingSelection(e) {
        if (!creating) {
            if (focused) {
                setUnfocused(focused);
            }
            if (hovered) {
                setUnhovered(hovered);
            }
            mouseStart = mouse;

            doCreateSelectionDiv(mouseStart);

            creating = true;
        }
        showInfo(e);
    }

    function removeRect(elem) {
        var $elem = $(elem);
        if (!$elem.hasClass('rectangle')) { return; }

        var si = getSelectionInfoFromRect(elem);
        var cii = si.canvasImageInfo, cii2;
        if (cii) {
            cii.canvas._imageInfo.splice(cii.imageInfoIndex, 1);
            si.canvasImageInfo *= -1; 'deleted'

            // decrement the `cii.imageInfoIndex` for each subsequent cii on this canvas
            $.each(_selectionInfo, function (idx, val) {
                cii2 = val.canvasImageInfo;
                if (idx > si.id && cii2.canvas === cii.canvas) {
                    cii2.imageInfoIndex--;
                }
            });
        }

        $elem.remove();

        // discards unused selectionInfo_s
        renumber();

        config.selectionDeletedHandler(prepareSelectionInfo($elem));
    }

    function doEndCreatingSelectionDiv(autoPlaced) {
        var $element = $(element);
        config.selectionCreatedHandler(prepareSelectionInfo($element, autoPlaced));
        showIdElem($element, true);
        return $element;
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

                var $element = doEndCreatingSelectionDiv();
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

    // createSelection
    //      canvas is the canvas containing the area of interest
    //      bounds are the { left: .., top: .., width: .., height: .. } - bounds of the area of interest,
    //          expressed in the canvas' (inner) coordinate system
    //
    function createSelection(canvas, bounds, canvasImageInfo) {
        // convert to canvas-relative then page-relative bounds
        var hiddenScale = getCanvasHiddenScale(canvas);
        var $canvas = $(canvas);
        var canvasPos = $canvas.offset();

        var pageBounds = [];
        for (var prop in bounds) {
            if (bounds.hasOwnProperty(prop)) {
                var value = bounds[prop];
                var isRange = prop === 'width' || prop === 'height';
                switch (prop) {
                    // case 'x1':
                    // case 'x2':
                    case 'left':
                        // case 'right':
                    case 'width':
                        pageBounds[prop] = value * hiddenScale.x + (isRange ? 0 : canvasPos.left);
                        break;
                        //  case 'y1':
                        //  case 'y2':
                    case 'top':
                        //  case 'bottom':
                    case 'height':
                        pageBounds[prop] = value * hiddenScale.y + (isRange ? 0 : canvasPos.top);
                        break;
                }
            }
        }

        doCreateSelectionDiv({
            x: pageBounds.left,
            y: pageBounds.top - pageBounds.height
        }, canvasImageInfo);
        // set the size of the rect - usually completed during mouse move
        doSetRectSize(element, pageBounds);
        doEndCreatingSelectionDiv(true); // true <- autoPlaced
    }





    // <-- helpers moved from init (end)


    function reset() {
        window.selectionRectangles_initialized = false;

        $('.rectangle').each(function () {
            removeRect(this);
        });

        _registeredCanvases = {};
        _selectionInfo = {};
    }

    function _initConfig(config) {

        config = config || {};
        config.minX = config.minX || 35;
        config.minY = config.minY || 35;
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

    function withinHorizontal(innerBounds, outerBounds) {
        var isWithin =
            innerBounds.left >= outerBounds.left
            && innerBounds.right <= outerBounds.right;

        return isWithin;
    }
    function withinVertical(innerBounds, outerBounds) {
        var isWithin =
            innerBounds.top >= outerBounds.top
            && innerBounds.bottom <= outerBounds.bottom;

        return isWithin;
    }
    function within(innerBounds, outerBounds) {
        var isWithin =
            withinHorizontal(innerBounds, outerBounds)
            && withinVertical(innerBounds, outerBounds);

        return isWithin;
    }

    function _getCanvasCount() {
        var keys = Object.keys(_registeredCanvases);
        var keyCount = keys.length;
        return keyCount;
    }

    function _registerCanvases(canvases) {
        $.each(canvases,
            function(idx, c) {
                _registeredCanvases[c.id] = c;
            });
    }

    function _findImageMetaInfoBySelId(selId) {
        var imi, idx = 0, more = true;
        $.each(_registeredCanvases, function (_, canvas) {
            $.each(canvas._imageInfo, function (canvasRelativeSelIdx, info) {
                if (++idx == selId) {
                    imi = {
                        canvas: canvas,
                        canvasRelativeSelIdx: canvasRelativeSelIdx,
                        info: info
                    };
                    more = false;
                }
                return more;
            });
            return more;
        });
        return imi;
    }

    function _getImageInfoFromSelId(selId) {
        var imi = _findImageMetaInfoBySelId(selId);

        return imi ? imi.info : undefined;
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

    function getRectId(rect) {
        var id = $(rect).attr(idAttr);
        return id;
    }

    var _module;
    function init(canvases, cfg) {
        canvases = canvases || [];

        if (canvases.length > 0) {
            _registerCanvases(canvases);
        }
        if (window.selectionRectangles_initialized) {
            return;
        }
        config = _initConfig(cfg);

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
                '<div class="header"><span class=imgBefore></span><span class=caption>Annotations</span><span class=imgAfter></span></div>',
                '<div class="content"></div>',
            '</div>'
        ].join(''));

        infoHeader = info.find('>.header');
        infoContent = info.find('>.content');

        if (wpd.utils.getDevOptions().showSelectionInfo) {
            info.removeClass('hidden');
        }

        infoHeader.on('click',
            function toggleAnnotationMode() {
                var annotationsDisabled = 'annotations-disabled';
                if (body.hasClass(annotationsDisabled)) {
                    body.removeClass(annotationsDisabled);
                } else {
                    body.addClass(annotationsDisabled);
                }
            }
        );

        config.$growthContainer.append(info);

        body.append($canvasOverlay);
        ensureOverlaySize();


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

                        var si = getSelectionInfoFromRect(moveElem);
                        si.autoPlaced = false;

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

        $(document).on({
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
        });


        $canvasOverlay.on({
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

        $canvasOverlay.on({
            mousedown: function (e) {
                if (leftButtonDown(e)) {
                    var $elem = $(this.parentNode);
                    config.selectionNumberClickedHandler(prepareSelectionInfo($elem));
                    e.preventDefault();
                }
            }
        },
            '.rectangle > .id'
        );

        $canvasOverlay.on({
            mousedown: function (e) {
                var $elem = $(this.parentNode);
                config.dataIconClickedHandler(prepareSelectionInfo($elem));
                e.preventDefault();
            }
        },
            '.rectangle.has-data > .data'
        );


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
    } // init (end)

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

        //ctx2.fillStyle = "rgb(255,0,0)";
        //ctx2.fillRect(0, 0, scaled.width, scaled.height);
        ctx2.drawImage(ctx1,
            sel.bounds.left / hiddenScale.x,
            sel.bounds.top / hiddenScale.y,
            preScaled.width, //sel.bounds.width,
            preScaled.height, //sel.bounds.height,
            0,
            0,
            scaled.width,
            scaled.height
        );

        return copiedCanvas;
    }

    function getZoomedCloneOfArea2(sel, scale) {
        var selId = getRectId(sel.elem);
        // var ii = sel.canvas._imageInfo[selId - 1];
        var ii = _getImageInfoFromSelId(selId);
        if (!ii) {
            alert("Unexpected attempt to getZoomedCloneOfArea2 where ii could not be found - consider calling original method.");
        }
        var ctx1 = sel.canvas;
        var scaled = {
            width: ii.image.width * scale,
            height: ii.image.height * scale
        };
        var copiedCanvas = $("<canvas>").attr("width", scaled.width).attr("height", scaled.height)[0];
        var ctx2 = copiedCanvas.getContext("2d", { alpha: false });

        //ctx2.fillStyle = "rgb(255,0,0)";
        //ctx2.fillRect(0, 0, scaled.width, scaled.height);
        ctx2.drawImage(ii.image,
            0,
            0,
            ii.image.width,
            ii.image.height,
            0,
            0,
            scaled.width,
            scaled.height
        );

        return copiedCanvas;
    }


    _module = {
        init: init,
        reset: reset,
        getSelections: getSelections,
        getSelectionInfo: getSelectionInfo,
        getZoomedCloneOfArea: getZoomedCloneOfArea,
        getZoomedCloneOfArea2: getZoomedCloneOfArea2,
        getCanvasHiddenScale: getCanvasHiddenScale,
        createSelection: createSelection
    };


    window.selectionRectangles = _module;
})();

