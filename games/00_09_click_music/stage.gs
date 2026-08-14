costumes "assets/background.svg";

# Game settings. Change these values only when tuning a new complete version.
var hit_target = 30;
var hit_per_click = 1;
var time_limit = 20;
var warning_time = 5;

var game_state = "intro";
var hit_done = 0;
var beat_percent = 0;
var time_left = 20;
var hit_display = "";
var time_display = "";
var message_text = "";
var warning_active = 0;

proc update_beat_percent {
    beat_percent = floor (hit_done * 100 / hit_target);
    if beat_percent > 100 {
        beat_percent = 100;
    }
}

proc update_hit_ui {
    hit_display = "たたいた回数: " & hit_done & " / " & hit_target;
    broadcast "ui_hit_update";
}

proc update_time_ui {
    time_display = "のこり時間: " & time_left;
    broadcast "ui_time_update";
}

proc update_dynamic_ui {
    update_hit_ui;
    update_time_ui;
}

proc show_game_ui {
    broadcast "hide_message";
    broadcast "ui_show";
}

proc hide_game_ui {
    broadcast "ui_hide";
}

proc reset_performance_state {
    hit_done = 0;
    beat_percent = 0;
    time_left = time_limit;
    warning_active = 0;
}

proc start_game {
    game_state = "playing";
    hide_game_ui;
    reset_performance_state;
    update_dynamic_ui;
    broadcast "spawn_drum";
    show_game_ui;
}

proc finish_game_over {
    game_state = "game_over";
    hide_game_ui;
    clear_graphic_effects;
    broadcast "performance_failed";
    message_text = "じかんぎれ";
    broadcast "show_game_over";
}

proc finish_game_clear {
    game_state = "clear";
    hit_done = hit_target;
    update_beat_percent;
    update_hit_ui;
    broadcast "performance_complete";
    hide_game_ui;
    clear_graphic_effects;
    message_text = "ライブせいこう";
    broadcast "show_clear";
}

proc add_drum_hit {
    hit_done += hit_per_click;
    if hit_done > hit_target {
        hit_done = hit_target;
    }
    update_beat_percent;
    update_hit_ui;
    broadcast "performance_progress_update";
    if hit_done >= hit_target {
        finish_game_clear;
    }
}

onflag {
    game_state = "intro";
    reset_performance_state;
    hit_display = "";
    time_display = "";
    message_text = "";
    hide_game_ui;
    broadcast "hide_drum";
    broadcast "hide_message";
    clear_graphic_effects;
    wait 0.1;

    message_text = "ドラムをクリックしてライブをもりあげよう";
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
                    if warning_active == 0 {
                        warning_active = 1;
                        set_color_effect 28;
                        set_brightness_effect -10;
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

on "drum_hit" {
    if game_state == "playing" {
        if hit_done < hit_target {
            add_drum_hit;
        }
    }
}
