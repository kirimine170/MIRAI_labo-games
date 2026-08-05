costumes "assets/background.svg";

# Game settings. Change these values to tune the robot repair game.
var robot_count = 1;
var max_repair = 30;
var repair_per_click = 1;
var time_limit = 60;
var warning_time = 10;

var game_state = "intro";
var repair_done = 0;
var repair_left = 30;
var repair_percent = 0;
var time_left = 60;
var repair_display = "";
var time_display = "";
var percent_display = "";
var message_text = "";
var warning_active = 0;

proc update_repair_percent {
    repair_percent = floor (repair_done * 100 / max_repair);
    if repair_percent > 100 {
        repair_percent = 100;
    }
}

proc update_repair_ui {
    repair_display = "repair: " & repair_done & " / " & max_repair;
    broadcast "ui_repair_update";
}

proc update_time_ui {
    time_display = "time: " & time_left;
    broadcast "ui_time_update";
}

proc update_percent_ui {
    percent_display = "percent: " & repair_percent & "%";
    broadcast "ui_percent_update";
}

proc update_dynamic_ui {
    update_repair_ui;
    update_time_ui;
    update_percent_ui;
}

proc show_game_ui {
    broadcast "hide_message";
    broadcast "ui_show";
}

proc hide_game_ui {
    broadcast "ui_hide";
}

proc reset_repair_state {
    repair_done = 0;
    repair_left = max_repair;
    repair_percent = 0;
    time_left = time_limit;
    warning_active = 0;
}

proc start_game {
    game_state = "playing";
    hide_game_ui;
    reset_repair_state;
    update_dynamic_ui;
    broadcast "spawn_robot";
    show_game_ui;
}

proc finish_game_over {
    game_state = "game_over";
    broadcast "hide_robot";
    hide_game_ui;
    clear_graphic_effects;
    message_text = "game over";
    broadcast "show_game_over";
}

proc finish_game_clear {
    game_state = "clear";
    update_repair_ui;
    update_percent_ui;
    broadcast "robot_complete";
    hide_game_ui;
    clear_graphic_effects;
    message_text = "clear";
    broadcast "show_clear";
}

proc add_repair_progress {
    repair_done += repair_per_click;
    if repair_done > max_repair {
        repair_done = max_repair;
    }
    repair_left = max_repair - repair_done;
    update_repair_percent;
    update_repair_ui;
    update_percent_ui;
    broadcast "robot_progress_update";

    if repair_done >= max_repair {
        finish_game_clear;
    }
}

onflag {
    game_state = "intro";
    reset_repair_state;
    repair_display = "";
    time_display = "";
    percent_display = "";
    hide_game_ui;
    broadcast "hide_robot";
    broadcast "hide_message";
    clear_graphic_effects;
    wait 0.1;

    message_text = "intro";
    broadcast "show_intro";
    wait 4;
    start_game;

    forever {
        if game_state == "playing" {
            wait 1;
            if game_state == "playing" {
                time_left--;
                update_time_ui;

                if time_left <= warning_time {
                    if warning_active == 0 {
                        warning_active = 1;
                        set_color_effect 18;
                        set_brightness_effect -8;
                    }
                }
                else {
                    if warning_active == 1 {
                        warning_active = 0;
                        clear_graphic_effects;
                    }
                }

                if time_left <= 0 {
                    finish_game_over;
                }
            }
        }
        else {
            wait 0.1;
        }
    }
}

on "update_ui" {
    update_dynamic_ui;
}

on "repair_clicked" {
    if game_state == "playing" {
        if repair_done < max_repair {
            add_repair_progress;
        }
    }
}
