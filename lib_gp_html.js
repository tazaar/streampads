/**
 * Created by tazaar on 2016-08-21.
 */
var lib_gp_html = { // For safety external resources are not allowed, copy one of the templates and push.

    _add_with_class: function(classes) {
        var newDiv = document.createElement("div");
        newDiv.className = classes;
        document.querySelector('.gamepad').appendChild(newDiv);
    },

    // TODO; this. maybe make a few skins now?
    set_gamepad_HTML: function(type) {
        switch (type) {
            case "ps3":
                lib_gp_html._ps3();
                break;
            case "x360":
                lib_gp_html._x360();
                break;
            default:
                lib_gp_html._generic();
                break;
        }
    },

    _generic: function() {
        // Create four 4 face buttons, eg X O or A B
        for (var i = 0; i < 4; i++) {
            lib_gp_html._add_with_class("face button-" + i);
        }
        // Create the rest of the buttons and sticks
        lib_gp_html._add_with_class('top-shoulder button-left-shoulder-top button-4');
        lib_gp_html._add_with_class('top-shoulder button-right-shoulder-top button-5');
        lib_gp_html._add_with_class('bottom-shoulder button-left-shoulder-bottom button-6');
        lib_gp_html._add_with_class('bottom-shoulder button-right-shoulder-bottom button-7');

        lib_gp_html._add_with_class('select-start button-select button-8');
        lib_gp_html._add_with_class('select-start button-start button-9');

        lib_gp_html._add_with_class('stick stick-0 stick-1-horiz button-10');
        lib_gp_html._add_with_class('stick stick-2 stick-3-horiz button-11');

        lib_gp_html._add_with_class('face button-dpad-top button-12');
        lib_gp_html._add_with_class('face button-dpad-bottom button-13');
        lib_gp_html._add_with_class('face button-dpad-left button-14');
        lib_gp_html._add_with_class('face button-dpad-right button-15');
    },

    _ps3: function() {
        lib_gp_html._generic(); // Conventions are made to be broken.
    },

    _x360: function() {

    }
};