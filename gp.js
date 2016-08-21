/**
 Copyright 2016 Johan Englund

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 Inspired by the work of mwichary@google.com (Marcin Wichary) of whom I also temporary stole the artwork from.
 If you are the least graphically competent please make and push your own art :)
 */

var lib_gp_helper = {

    Requests: function(item) {
        var svalue = location.search.match(new RegExp("[\?\&]" + item + "=([^\&]*)(\&?)","i"));
        return svalue ? svalue[1] : svalue;
    },

    removeOptions: function(selectbox) {
        var i;
        for(i=selectbox.options.length-1; i>=0; i--) {
            selectbox.remove(i);
        }
    },

    getGamepadType: function(id) {
        if (id.indexOf("Xbox 360") > -1 )
            return "x360";
        else if (id.indexOf("SIXAXIS") > -1 )
            return "ps3";
        else
            return "_generic";
    },

    setTypeAndStyle: function(type, css) {
        lib_gp_html.set_gamepad_HTML(type);
        if(css == "")
            lib_gp_helper.setCSS("css/" + type);
        else
            lib_gp_helper.setCSS(css);
    },

    setCSS: function(url) {
        if (!url.endsWith(".css"))
            url = url + ".css";

        console.log("Loading stylesheet from: " + url);
        var ss = document.createElement("link");
        ss.type = "text/css";
        ss.rel = "stylesheet";
        ss.id = "gp-style";
        ss.href = url;
        document.getElementsByTagName("head")[0].appendChild(ss);
    },

    getAllGamepads: function() {
        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        return navigator.getGamepads ? navigator.getGamepads() : ( navigator.webkitGetGamepads ?
            navigator.webkitGetGamepads() : null );
    },

    detectGamepadAPI: function() {
        if (!('Gamepad' in window)) {
            console.log("Gamepad API not found");
            //noinspection JSDuplicatedDeclaration
            var e = document.getElementById("no-gamepad-support");
            e.classList ? e.classList.add('visible') : e.className += ' visible';
            return false;
        } else
            return true;
    },

    detectGamepadAvailable: function() {
        if (lib_gp_helper.getAllGamepads()[0] !== undefined) {
            lib_gp.gamepads = lib_gp_helper.getAllGamepads();
            document.getElementById("no-gamepads-connected").className = "";
            return true;
        } else {
            console.log("no gamepads available");
            //noinspection JSDuplicatedDeclaration
            var e = document.getElementById("no-gamepads-connected");
            e.classList ? e.classList.add('visible') : e.className += ' visible';
            return false;
        }
    },

    detectGamepadEvents: function() {
        return 'GamepadEvent' in window;
    }
};

var lib_gp = {

    // Global variables starts here
    // DO TOUCH, MAYBE
    gamepad_min_delta: 0.01, // Minimum move distance to trigger visual update
    gamepad_type: "",
    gamepad_style: "",
    gamepad_index:  0,
    // DO NOT TOUCH, UNLESS YOU DO WANT TO
    STICK_OFFSET: 25,
    ANALOGUE_BUTTON_THRESHOLD: .5,
    // DO NOT TOUCH, EVER
    gamepads: null, // Get all gamepads if we need to debug something or do polling
    axis_prevVal: [],
    REQUEST_ID: 0,
    POLL_ID: 0,
    LOOPING: false,

    init: function() {
        if (lib_gp_helper.detectGamepadAPI()) {
            if (lib_gp_helper.detectGamepadEvents()) {
                lib_gp._enableEvents();
                if (lib_gp_helper.detectGamepadAvailable()) {
                    if (lib_gp.gamepads[0] !== undefined) { // Refresh does not redefine gamepads. (already defined)
                        console.log("gamepads already connected");
                        lib_gp._initGamepad();
                    }
                }
            } else {
                console.log("no gamepad events available, polling");
                // Browser does not support gamepad events, poll instead.
                lib_gp.POLL_ID = setInterval(lib_gp._pollGamepads, 500);
            }
        }
    },

    _enableEvents: function() {
        // Events starts here
        window.addEventListener("gamepadconnected", function() {
            if (!lib_gp.LOOPING) {
                lib_gp.gamepads = lib_gp_helper.getAllGamepads();
                if (lib_gp.gamepads[lib_gp.gamepad_index]) {
                    var gp = lib_gp.gamepads[lib_gp.gamepad_index];
                    //noinspection JSUnresolvedVariable
                    console.log("Gamepad connected at index " + gp.index + ": " + gp.id + ". It has " + gp.buttons.length +
                        " buttons and " + gp.axes.length + " axes.");
                    lib_gp._initGamepad();
                }
            }
        });

        window.addEventListener("gamepaddisconnected", function() {
            if(lib_gp.gamepads[lib_gp.gamepad_index]) {
                console.log("Waiting for gamepad.");
                lib_gp.LOOPING = false;
                document.getElementById("gp-style").disabled = true;
                document.getElementById("gp-style").remove();
                document.getElementById("gamepad").innerHTML = "";
                lib_gp_helper.detectGamepadAvailable();
                window.cancelAnimationFrame(lib_gp.REQUEST_ID);
            }
        });
    },

    _initGamepad: function() {
        if (lib_gp_helper.detectGamepadAvailable()) {
            lib_gp._setParams();
            lib_gp.LOOPING = true;
            lib_gp._mainLoop();
        }
    },

    _setParams: function() {
        if(lib_gp_helper.Requests("ID")) // Refers to gamepad's API gamepad.index
            lib_gp.gamepad_index = lib_gp_helper.Requests("ID");
        if(lib_gp_helper.Requests("type"))
            lib_gp.gamepad_type = (lib_gp_helper.Requests("type"));
        else
            lib_gp.gamepad_type = "generic"; // TODO; Remove when finished dev
            //lib_gp.gamepad_type = lib_gp_helper.getGamepadType(lib_gp.gamepads[lib_gp.gamepad_index].id); // Figure it out if we can
        if(lib_gp_helper.Requests("deadzone"))
            lib_gp.gamepad_min_delta = lib_gp_helper.Requests("deadzone");
        if(lib_gp_helper.Requests("style"))
            lib_gp.gamepad_style = lib_gp_helper.Requests("style");

        lib_gp_helper.setTypeAndStyle(lib_gp.gamepad_type, lib_gp.gamepad_style);
    },

    /**
     * Poll all gamepads (if browser does not support gamepad events)
     * Rewrite to only poll wanted index
     */
    _pollGamepads: function() { // TODO;  Maybe fixed? not pretty but should work
        for (var i = 0; i < gamepads.length; i++) {
            var gp = gamepads[i];
            if(gp) {
                //noinspection JSUnresolvedVariable
                console.log("Gamepad connected at index " + gp.index + ": " + gp.id + ". It has " + gp.buttons.length +
                    " buttons and " + gp.axes.length + " axes.");

                clearInterval(lib_gp.POLL_ID);
                lib_gp._initGamepad();

            }
        }
    },

    /**
     * Update all buttons and axis.
     */
    _mainLoop: function() {
        if (lib_gp.LOOPING) {
            lib_gp.gamepads = lib_gp_helper.getAllGamepads(); // Important to update gamepads first thing every tick
            if (!lib_gp.gamepads) {
                lib_gp.LOOPING = false;
                return;
            }

            var gp = lib_gp.gamepads[lib_gp.gamepad_index];
            //noinspection JSDuplicatedDeclaration
            for (var i = 0; i <= gp.buttons.length; i++) {
                lib_gp._updateButton(gp.buttons[i], i)
            }
            //noinspection JSDuplicatedDeclaration,JSUnresolvedVariable
            for (var i = 0; i <= gp.axes.length; i++) {
                //noinspection JSUnresolvedVariable
                lib_gp._updateAxis(gp.axes[i], i)
            }
            lib_gp.REQUEST_ID = window.requestAnimationFrame(lib_gp._mainLoop);
        }
    },

    /**
     * Update a given button on the screen.
     */
    _updateButton: function(button, id) {
        // TODO; Update to support analog buttons
        var value, pressed;

        // Older version of the gamepad API provided buttons as a floating point
        // value from 0 to 1. Newer implementations provide GamepadButton objects,
        // which contain an analog value and a pressed boolean.
        if (typeof(button) == 'object') {
            value = button.value;
            //noinspection JSUnresolvedVariable
            pressed = button.pressed;
        } else {
            value = button;
            pressed = button > lib_gp.ANALOGUE_BUTTON_THRESHOLD;
        }

        // Update the button visually.
        var buttonEl = document.querySelector('.button-' + id);
        if (buttonEl) { // Extraneous buttons have just a label.
            if (pressed) {
                //console.log("pressed button" + id)
                buttonEl.classList.add('pressed');
            } else {
                buttonEl.classList.remove('pressed');
            }
        }
    },

    /**
     * Update a given analogue axis on the screen.
     */
    _updateAxis: function(value, stickId) {
        if(!lib_gp.axis_prevVal[stickId])
            lib_gp.axis_prevVal[stickId] = 0;
        var dV = lib_gp.axis_prevVal[stickId] + lib_gp.gamepad_min_delta; // Check positive
        var dnV = lib_gp.axis_prevVal[stickId] - lib_gp.gamepad_min_delta; // Check negative

        if(value > dV || value < dnV) { // If value is greater than minimum
            lib_gp.axis_prevVal[stickId] = value;

            var offsetVal = value * lib_gp.STICK_OFFSET; // How far should the stick move
            var stickEl = document.querySelector('.stick-' + stickId);

            if (stickEl) {
                stickEl.style.marginLeft = offsetVal + 'px';
            } else {
                stickEl = document.querySelector('.stick-' + stickId + '-horiz');
                if (stickEl) {
                    stickEl.style.marginTop = offsetVal + 'px';
                }
            }
        }
    }
};