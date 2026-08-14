costumes "assets/bowl_0.svg", "assets/bowl_25.svg", "assets/bowl_50.svg", "assets/bowl_75.svg", "assets/bowl_100.svg";

hide;
set_size 120;
set_rotation_style_do_not_rotate;
var effect_token = 0;
var mixture_stage = -1;

proc update_mixture_costume {
    if mix_percent >= 100 {
        if mixture_stage != 100 {
            mixture_stage = 100;
            switch_costume "bowl_100";
        }
    }
    elif mix_percent >= 75 {
        if mixture_stage != 75 {
            mixture_stage = 75;
            switch_costume "bowl_75";
        }
    }
    elif mix_percent >= 50 {
        if mixture_stage != 50 {
            mixture_stage = 50;
            switch_costume "bowl_50";
        }
    }
    elif mix_percent >= 25 {
        if mixture_stage != 25 {
            mixture_stage = 25;
            switch_costume "bowl_25";
        }
    }
    else {
        if mixture_stage != 0 {
            mixture_stage = 0;
            switch_costume "bowl_0";
        }
    }
}

proc place_bowl {
    goto 0, -55;
    set_size 120;
    clear_graphic_effects;
}

proc show_bowl {
    mixture_stage = -1;
    update_mixture_costume;
    place_bowl;
    show;
    goto_front;
}

proc mixing_flash {
    set_brightness_effect 35;
    set_color_effect 8;
    set_size 116;
    change_x 5;
}

proc reset_bowl_effect {
    if game_state == "playing" {
        place_bowl;
    }
}

onflag {
    effect_token = 0;
    mixture_stage = -1;
    hide;
}

on "spawn_bowl" {
    show_bowl;
}

on "hide_bowl" {
    hide;
}

on "mixture_progress_update" {
    if game_state == "playing" {
        update_mixture_costume;
    }
}

on "mixture_complete" {
    update_mixture_costume;
    goto 0, -55;
    clear_graphic_effects;
    set_size 126;
    show;
    goto_front;
}

on "mixing_failed" {
    effect_token = 0;
    place_bowl;
    show;
    goto_front;
}

onclick {
    if game_state == "playing" {
        if mix_done < mix_target {
            effect_token++;
            mixing_flash;
            broadcast "mix_clicked";

            wait 0.04;
            effect_token--;
            if effect_token <= 0 {
                effect_token = 0;
                reset_bowl_effect;
            }
        }
    }
}
