costumes "assets/robot_0.svg", "assets/robot_25.svg", "assets/robot_50.svg", "assets/robot_75.svg", "assets/robot_100.svg";

hide;
set_size 130;
set_rotation_style_do_not_rotate;
var effect_token = 0;
var robot_stage = -1;

proc update_robot_costume {
    if repair_percent >= 100 {
        if robot_stage != 100 {
            robot_stage = 100;
            switch_costume "robot_100";
        }
    }
    elif repair_percent >= 75 {
        if robot_stage != 75 {
            robot_stage = 75;
            switch_costume "robot_75";
        }
    }
    elif repair_percent >= 50 {
        if robot_stage != 50 {
            robot_stage = 50;
            switch_costume "robot_50";
        }
    }
    elif repair_percent >= 25 {
        if robot_stage != 25 {
            robot_stage = 25;
            switch_costume "robot_25";
        }
    }
    else {
        if robot_stage != 0 {
            robot_stage = 0;
            switch_costume "robot_0";
        }
    }
}

proc show_robot {
    clear_graphic_effects;
    robot_stage = -1;
    update_robot_costume;
    set_size 130;
    goto 0, -40;
    show;
    goto_front;
}

proc repair_flash {
    set_brightness_effect 55;
    set_color_effect 18;
    set_size 124;
    change_x 4;
}

onflag {
    effect_token = 0;
    robot_stage = -1;
    hide;
}

on "spawn_robot" {
    show_robot;
}

on "hide_robot" {
    hide;
}

on "robot_progress_update" {
    if game_state == "playing" {
        update_robot_costume;
    }
}

on "robot_complete" {
    update_robot_costume;
    clear_graphic_effects;
    set_size 138;
    goto 0, -40;
    show;
    goto_front;
}

proc reset_robot_effect {
    if game_state == "playing" {
        goto 0, -40;
        set_size 130;
        clear_graphic_effects;
    }
}

onclick {
    if game_state == "playing" {
        if repair_done < max_repair {
            effect_token++;
            repair_flash;
            broadcast "repair_clicked";

            wait 0.04;
            effect_token--;
            if effect_token <= 0 {
                effect_token = 0;
                reset_robot_effect;
            }
        }
    }
}
