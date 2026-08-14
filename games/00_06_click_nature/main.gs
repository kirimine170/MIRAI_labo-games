costumes "assets/reel_button.svg";

hide;
set_size 100;
set_rotation_style_do_not_rotate;
var effect_token = 0;

proc place_reel {
    goto 0, -132;
    set_size 100;
    clear_graphic_effects;
    show;
    goto_front;
}

proc pull_flash {
    set_brightness_effect 35;
    set_size 94;
}

proc reset_reel_effect {
    if game_state == "playing" {
        set_size 100;
        clear_graphic_effects;
    }
}

onflag {
    effect_token = 0;
    hide;
}

on "show_reel" {
    place_reel;
}

on "hide_reel" {
    hide;
}

onclick {
    if game_state == "playing" {
        if pull_count < required_pull {
            effect_token++;
            pull_flash;
            broadcast "pull_clicked";

            wait 0.04;
            effect_token--;
            if effect_token <= 0 {
                effect_token = 0;
                reset_reel_effect;
            }
        }
    }
}
