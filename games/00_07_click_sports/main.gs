costumes "assets/dash_button.svg";

hide;
set_size 100;
var press_effects = 0;

proc press_dash_button {
    if game_state == "playing" {
        if dash_count < target_dashes {
            press_effects++;
            set_size 94;
            set_brightness_effect 28;
            broadcast "dash_pressed";
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

on "dash_button_show" {
    clear_graphic_effects;
    set_size 100;
    goto 0, -143;
    show;
    goto_front;
}

on "dash_button_hide" {
    hide;
}

onclick {
    press_dash_button;
}

onkey "space" {
    press_dash_button;
}
