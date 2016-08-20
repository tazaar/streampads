/**
 * Created by tazaar on 2016-08-20.
 * Inspired by the work of mwichary@google.com (Marcin Wichary) of whom I also temporary stole the artwork from.
 * If you are the least graphically competent please make and push your own art :)
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
            return "generic";
    },

    setTypeAndStyle: function(type, css) {
        gamepad_HTML.set_gamepad_HTML(type);
        if(css == "")
            lib_gp_helper.setCSS("css/" + type);
        else
            lib_gp_helper.setCSS(css);
    },

    setCSS: function(url) {
        if (!url.endsWith(".css")) //TODO; must polyfill endsWith
            url = url + ".css";

        console.log("Loading stylesheet from: " + url);
        var ss = document.createElement("link");
        ss.type = "text/css";
        ss.rel = "stylesheet";
        ss.href = url;
        document.getElementsByTagName("head")[0].appendChild(ss);
    },

    getAllGamepads: function() {
        //noinspection JSUnresolvedVariable,JSUnresolvedFunction
        return navigator.getGamepads ? navigator.getGamepads() : ( navigator.webkitGetGamepads ?
            navigator.webkitGetGamepads() : null );
    }
};

var gamepad_HTML = { // For safety external resources are not allowed, copy one of the templates and push.

    _add_with_class: function(classes) {
        var newDiv = document.createElement("div");
        newDiv.className = classes;
        document.querySelector('.gamepad').appendChild(newDiv);
    },

    // TODO; this. maybe make a few skins now?
    set_gamepad_HTML: function(type) {
        switch (type) {
            case "ps3":
                gamepad_HTML.generic();
                break;
            case "x360":
                gamepad_HTML.generic();
                break;
            default:
                gamepad_HTML.generic();
                break;
        }
    },

    generic: function() {
        // Create four 4 face buttons, eg X O or A B
        for (var i = 0; i < 4; i++) {
            gamepad_HTML._add_with_class("face button-" + i);
        }
        // Create the rest of the buttons and sticks
        gamepad_HTML._add_with_class('top-shoulder button-left-shoulder-top button-4');
        gamepad_HTML._add_with_class('top-shoulder button-right-shoulder-top button-5');
        gamepad_HTML._add_with_class('bottom-shoulder button-left-shoulder-bottom button-6');
        gamepad_HTML._add_with_class('bottom-shoulder button-right-shoulder-bottom button-7');

        gamepad_HTML._add_with_class('select-start button-select button-8');
        gamepad_HTML._add_with_class('select-start button-start button-9');

        gamepad_HTML._add_with_class('stick stick-0 stick-1-horiz button-10');
        gamepad_HTML._add_with_class('stick stick-2 stick-3-horiz button-11');

        gamepad_HTML._add_with_class('face button-dpad-top button-12');
        gamepad_HTML._add_with_class('face button-dpad-bottom button-13');
        gamepad_HTML._add_with_class('face button-dpad-left button-14');
        gamepad_HTML._add_with_class('face button-dpad-right button-15');
    },

    ps3: function() {

    },

    x360: function() {

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
    gamepads: lib_gp_helper.getAllGamepads(), // Get all gamepads if we need to debug something or do polling
    axis_prevVal: [],
    REQUEST_ID: 0,

    _init: function() {
        console.log("Init");
        lib_gp.setParams();

        // Events starts here
        window.addEventListener("gamepadconnected", function() { // TODO; This runs for every gamepad connected FIX
            if(lib_gp.gamepads[lib_gp.gamepad_index]) {
                var gp = lib_gp.gamepads[lib_gp.gamepad_index];
                //noinspection JSUnresolvedVariable
                console.log("Gamepad connected at index " + gp.index + ": " + gp.id + ". It has " + gp.buttons.length +
                    " buttons and " + gp.axes.length + " axes.");
                lib_gp._mainLoop();
            }
        });

        window.addEventListener("gamepaddisconnected", function() {
            if(gamepads[gamepad_index]) {
                console.log("Waiting for gamepad.");
                window.cancelAnimationFrame(lib_gp.REQUEST_ID);
            }
        });

        if(!('GamepadEvent' in window)) {
            console.log("no gamepad events available");
            // Browser does not support gamepad events, poll instead.
            setInterval(lib_gp._pollGamepads, 500);
        } else {
            // Browser supports gamepad events.
            console.log("gamepad events available")
        }

        if (lib_gp.gamepads[0] !== undefined) { // Refresh does not redefine gamepads. (fixes refreshing page bug)
            console.log("gamepads already connected");
            lib_gp._mainLoop();
        }
    },

    setParams: function() {
        if(lib_gp_helper.Requests("ID")) // Refers to gamepad's API gamepad.index
            lib_gp.gamepad_index = lib_gp_helper.Requests("ID");
        if(lib_gp_helper.Requests("type"))
            lib_gp.gamepad_type = (lib_gp_helper.Requests("type"));
        else
            lib_gp.gamepad_type = "generic"; // TODO; Remove when finished dev
            //lib_gp.gamepad_type = lib_gp_helper.getGamepadType(gamepads[gamepad_index].id); // Figure it out if we can
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
    _pollGamepads: function() {
        for (var i = 0; i < gamepads.length; i++) {
            var gp = gamepads[i];
            if(gp) {
                //noinspection JSUnresolvedVariable
                console.log("Gamepad connected at index " + gp.index + ": " + gp.id + ". It has " + gp.buttons.length +
                    " buttons and " + gp.axes.length + " axes.");
                gameLoop();
                clearInterval(interval);
            }
        }
    },

    /**
     * Update all buttons and axis.
     */
    _mainLoop: function() {
        gamepads = lib_gp_helper.getAllGamepads(); // Important to update gamepads first thing every tick
        if (!gamepads)
            return;
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

            // TODO; There ought to be a nicer way to do this
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