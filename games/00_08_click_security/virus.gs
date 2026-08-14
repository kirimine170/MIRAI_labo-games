costumes "assets/virus_100.svg", "assets/virus_75.svg", "assets/virus_50.svg", "assets/virus_25.svg", "assets/virus_removed.svg";

hide;
set_size 112;
set_rotation_style_do_not_rotate;
var virus_stage = -1;

proc update_virus_costume {
    if scan_count >= target_scans {
        if virus_stage != 0 {
            virus_stage = 0;
            switch_costume "virus_removed";
            set_size 105;
        }
    }
    elif scan_count >= 23 {
        if virus_stage != 25 {
            virus_stage = 25;
            switch_costume "virus_25";
            set_size 76;
        }
    }
    elif scan_count >= 15 {
        if virus_stage != 50 {
            virus_stage = 50;
            switch_costume "virus_50";
            set_size 88;
        }
    }
    elif scan_count >= 8 {
        if virus_stage != 75 {
            virus_stage = 75;
            switch_costume "virus_75";
            set_size 100;
        }
    }
    else {
        if virus_stage != 100 {
            virus_stage = 100;
            switch_costume "virus_100";
            set_size 112;
        }
    }
    goto 34, -12;
    clear_graphic_effects;
    show;
    goto_front;
}

onflag {
    virus_stage = -1;
    hide;
}

on "virus_spawn" {
    virus_stage = -1;
    update_virus_costume;
}

on "virus_progress_update" {
    if game_state == "playing" {
        update_virus_costume;
        set_brightness_effect 38;
        wait 0.04;
        clear_graphic_effects;
    }
}

on "virus_removed" {
    update_virus_costume;
    set_brightness_effect 45;
    show;
    goto_front;
}

on "virus_freeze" {
    clear_graphic_effects;
    set_color_effect 22;
    show;
}

on "virus_hide" {
    hide;
}
