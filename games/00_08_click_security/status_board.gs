costumes "assets/status_anchor.svg";

hide;
set_size 100;

proc render_status {
    say status_text;
}

onflag {
    hide;
    say "";
}

on "status_show" {
    clear_graphic_effects;
    set_size 100;
    goto -205, 132;
    show;
    goto_front;
    render_status;
}

on "status_update" {
    if game_state == "playing" {
        render_status;
    }
}

on "warning_on" {
    set_color_effect 18;
    set_brightness_effect 30;
    set_size 115;
}

on "warning_off" {
    clear_graphic_effects;
    set_size 100;
}

on "status_hide" {
    say "";
    clear_graphic_effects;
    set_size 100;
    hide;
}
