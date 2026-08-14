costumes "assets/background.svg";

# Game settings．Thirty pulls fit comfortably inside the 22-second round．
var required_pull = 30;
var pull_per_click = 1;
var time_limit = 22;
var warning_time = 5;

var game_state = "intro";
var pull_count = 0;
var time_left = 22;
var warning_active = 0;

proc update_pull_ui {
    broadcast "ui_pull_update";
}

proc update_time_ui {
    broadcast "ui_time_update";
}

proc show_game_ui {
    broadcast "hide_message";
    broadcast "ui_panel_show";
    wait 0.02;
    broadcast "ui_show";
}

proc hide_game_ui {
    broadcast "ui_hide";
}

proc reset_round {
    pull_count = 0;
    time_left = time_limit;
    warning_active = 0;
}

proc start_game {
    game_state = "playing";
    reset_round;
    update_pull_ui;
    update_time_ui;
    broadcast "spawn_fish";
    broadcast "show_reel";
    show_game_ui;
}

proc finish_game_over {
    game_state = "game_over";
    broadcast "hide_fish";
    broadcast "hide_reel";
    hide_game_ui;
    broadcast "show_game_over";
}

proc finish_game_clear {
    game_state = "clear";
    update_pull_ui;
    broadcast "fish_caught";
    broadcast "hide_reel";
    hide_game_ui;
    broadcast "show_clear";
}

proc add_pull_progress {
    pull_count += pull_per_click;
    if pull_count > required_pull {
        pull_count = required_pull;
    }
    update_pull_ui;
    broadcast "fish_progress_update";

    if pull_count >= required_pull {
        finish_game_clear;
    }
}

onflag {
    game_state = "intro";
    reset_round;
    hide_game_ui;
    broadcast "hide_fish";
    broadcast "hide_reel";
    broadcast "hide_message";
    clear_graphic_effects;
    wait 0.1;

    broadcast "show_intro";
    wait 3;
    start_game;

    forever {
        if game_state == "playing" {
            wait 1;
            if game_state == "playing" {
                time_left--;
                update_time_ui;

                if time_left <= warning_time {
                    warning_active = 1;
                }
                else {
                    warning_active = 0;
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

on "pull_clicked" {
    if game_state == "playing" {
        if pull_count < required_pull {
            add_pull_progress;
        }
    }
}
