costumes "assets/background.svg";

# Game settings. Change these values only when tuning a new complete version.
var mix_target = 30;
var mix_per_click = 1;
var time_limit = 20;
var warning_time = 5;

var game_state = "intro";
var mix_done = 0;
var mix_percent = 0;
var time_left = 20;
var mix_display = "";
var time_display = "";
var message_text = "";
var warning_active = 0;

proc update_mix_percent {
    mix_percent = floor (mix_done * 100 / mix_target);
    if mix_percent > 100 {
        mix_percent = 100;
    }
}

proc update_mix_ui {
    mix_display = "まぜた回数: " & mix_done & " / " & mix_target;
    broadcast "ui_mix_update";
}

proc update_time_ui {
    time_display = "のこり時間: " & time_left;
    broadcast "ui_time_update";
}

proc update_dynamic_ui {
    update_mix_ui;
    update_time_ui;
}

proc show_game_ui {
    broadcast "hide_message";
    broadcast "ui_show";
}

proc hide_game_ui {
    broadcast "ui_hide";
}

proc reset_mix_state {
    mix_done = 0;
    mix_percent = 0;
    time_left = time_limit;
    warning_active = 0;
}

proc start_game {
    game_state = "playing";
    hide_game_ui;
    reset_mix_state;
    update_dynamic_ui;
    broadcast "spawn_bowl";
    show_game_ui;
}

proc finish_game_over {
    game_state = "game_over";
    hide_game_ui;
    clear_graphic_effects;
    broadcast "mixing_failed";
    message_text = "じかんぎれ";
    broadcast "show_game_over";
}

proc finish_game_clear {
    game_state = "clear";
    mix_done = mix_target;
    update_mix_percent;
    update_mix_ui;
    broadcast "mixture_complete";
    hide_game_ui;
    clear_graphic_effects;
    message_text = "できあがり";
    broadcast "show_clear";
}

proc add_mix_progress {
    mix_done += mix_per_click;
    if mix_done > mix_target {
        mix_done = mix_target;
    }
    update_mix_percent;
    update_mix_ui;
    broadcast "mixture_progress_update";

    if mix_done >= mix_target {
        finish_game_clear;
    }
}

onflag {
    game_state = "intro";
    reset_mix_state;
    mix_display = "";
    time_display = "";
    message_text = "";
    hide_game_ui;
    broadcast "hide_bowl";
    broadcast "hide_message";
    clear_graphic_effects;
    wait 0.1;

    message_text = "ボウルをクリックしてまぜよう";
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
                        set_color_effect 12;
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

on "mix_clicked" {
    if game_state == "playing" {
        if mix_done < mix_target {
            add_mix_progress;
        }
    }
}
