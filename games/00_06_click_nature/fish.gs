costumes "assets/fish_far.svg", "assets/fish_quarter.svg", "assets/fish_mid.svg", "assets/fish_near.svg", "assets/fish_caught.svg";

hide;
set_rotation_style_do_not_rotate;
var fish_stage = -1;

proc update_fish_costume {
    if pull_count >= required_pull {
        if fish_stage != 100 {
            fish_stage = 100;
            switch_costume "fish_caught";
            goto -82, 42;
            set_size 112;
        }
    }
    elif pull_count >= 23 {
        if fish_stage != 75 {
            fish_stage = 75;
            switch_costume "fish_near";
            goto -22, 14;
            set_size 108;
        }
    }
    elif pull_count >= 15 {
        if fish_stage != 50 {
            fish_stage = 50;
            switch_costume "fish_mid";
            goto 42, -8;
            set_size 100;
        }
    }
    elif pull_count >= 8 {
        if fish_stage != 25 {
            fish_stage = 25;
            switch_costume "fish_quarter";
            goto 102, -28;
            set_size 92;
        }
    }
    else {
        if fish_stage != 0 {
            fish_stage = 0;
            switch_costume "fish_far";
            goto 158, -48;
            set_size 82;
        }
    }
    clear_graphic_effects;
    show;
    goto_front;
}

onflag {
    fish_stage = -1;
    hide;
}

on "spawn_fish" {
    fish_stage = -1;
    update_fish_costume;
}

on "fish_progress_update" {
    if game_state == "playing" {
        update_fish_costume;
        set_brightness_effect 35;
        wait 0.05;
        clear_graphic_effects;
    }
}

on "fish_caught" {
    update_fish_costume;
    set_brightness_effect 45;
    show;
    goto_front;
}

on "hide_fish" {
    hide;
}
