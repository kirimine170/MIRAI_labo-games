costumes "assets/drum_0.svg", "assets/drum_25.svg", "assets/drum_50.svg", "assets/drum_75.svg", "assets/drum_100.svg";

hide;
set_size 115;
set_rotation_style_do_not_rotate;
var effect_token = 0;
var performance_stage = -1;

proc update_performance_costume {
    if beat_percent >= 100 {
        if performance_stage != 100 {
            performance_stage = 100;
            switch_costume "drum_100";
        }
    }
    elif beat_percent >= 75 {
        if performance_stage != 75 {
            performance_stage = 75;
            switch_costume "drum_75";
        }
    }
    elif beat_percent >= 50 {
        if performance_stage != 50 {
            performance_stage = 50;
            switch_costume "drum_50";
        }
    }
    elif beat_percent >= 25 {
        if performance_stage != 25 {
            performance_stage = 25;
            switch_costume "drum_25";
        }
    }
    else {
        if performance_stage != 0 {
            performance_stage = 0;
            switch_costume "drum_0";
        }
    }
}

proc place_drum {
    goto 0, -50;
    set_size 115;
    clear_graphic_effects;
}

proc show_drum {
    performance_stage = -1;
    update_performance_costume;
    place_drum;
    show;
    goto_front;
}

proc hit_flash {
    set_brightness_effect 45;
    set_color_effect 18;
    set_size 121;
    change_y 4;
}

proc reset_drum_effect {
    if game_state == "playing" {
        place_drum;
    }
}

onflag {
    effect_token = 0;
    performance_stage = -1;
    hide;
}

on "spawn_drum" {
    show_drum;
}

on "hide_drum" {
    hide;
}

on "performance_progress_update" {
    if game_state == "playing" {
        update_performance_costume;
    }
}

on "performance_complete" {
    update_performance_costume;
    goto 0, -50;
    clear_graphic_effects;
    set_size 122;
    show;
    goto_front;
}

on "performance_failed" {
    effect_token = 0;
    place_drum;
    show;
    goto_front;
}

onclick {
    if game_state == "playing" {
        if hit_done < hit_target {
            effect_token++;
            hit_flash;
            broadcast "drum_hit";

            wait 0.05;
            effect_token--;
            if effect_token <= 0 {
                effect_token = 0;
                reset_drum_effect;
            }
        }
    }
}
