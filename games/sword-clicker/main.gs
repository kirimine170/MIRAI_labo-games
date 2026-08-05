costumes "assets/slime.svg";

hide;
set_size 130;
set_rotation_style_do_not_rotate;

proc show_slime {
    clear_graphic_effects;
    set_size 130;
    goto 0, -40;
    show;
    goto_front;
}

proc damage_flash {
    set_brightness_effect 45;
    set_color_effect 35;
    set_size 122;
    change_x 5;
}

onflag {
    hide;
}

on "spawn_slime" {
    show_slime;
}

on "hide_slime" {
    hide;
}

on "reset_slime_effect" {
    wait 0.04;
    if game_state == "playing" {
        goto 0, -40;
        set_size 130;
        clear_graphic_effects;
    }
}

onclick {
    if game_state == "playing" {
        if current_hp > 0 {
            current_hp--;
            broadcast "update_ui";
            damage_flash;
            broadcast "reset_slime_effect";

            if current_hp <= 0 {
                broadcast "slime_defeated";
            }
        }
    }
}
