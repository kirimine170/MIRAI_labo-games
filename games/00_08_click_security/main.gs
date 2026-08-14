costumes "assets/scan_button.svg";

hide;
set_size 100;
var press_effects = 0;

proc press_scan_button {
    if game_state == "playing" {
        if scan_count < target_scans {
            press_effects++;
            set_size 94;
            set_brightness_effect 32;
            broadcast "scan_pressed";
            wait 0.04;
            press_effects--;
            if press_effects <= 0 {
                press_effects = 0;
                if game_state == "playing" {
                    clear_graphic_effects;
                    set_size 100;
                }
            }
        }
    }
}

onflag {
    press_effects = 0;
    hide;
}

on "scan_button_show" {
    clear_graphic_effects;
    set_size 100;
    goto 0, -140;
    show;
    goto_front;
}

on "scan_button_hide" {
    hide;
}

onclick {
    press_scan_button;
}

onkey "space" {
    press_scan_button;
}
