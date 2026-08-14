costumes "assets/background.svg";

# Game settings．About 30 deliberate inputs in 20 seconds．
var target_dashes = 30;
var time_limit = 20;
var warning_time = 5;
var start_x = -185;
var finish_x = 170;

var game_state = "intro";
var dash_count = 0;
var time_left = 20;
var runner_x = -185;
var progress_percent = 0;
var status_text = "";
var warning_active = 0;

proc update_status_ui {
    progress_percent = floor (dash_count * 100 / target_dashes);
    if progress_percent > 100 {
        progress_percent = 100;
    }
    status_text = "ダッシュ " & dash_count & " / " & target_dashes & "　のこり " & time_left & " びょう";
    broadcast "status_update";
}

proc reset_game_state {
    dash_count = 0;
    time_left = time_limit;
    runner_x = start_x;
    progress_percent = 0;
    warning_active = 0;
    clear_graphic_effects;
    update_status_ui;
}

proc start_game {
    game_state = "playing";
    broadcast "hide_message";
    broadcast "dash_button_hide";
    broadcast "status_hide";
    reset_game_state;
    broadcast "runner_spawn";
    broadcast "dash_button_show";
    broadcast "status_show";
}

proc finish_game_clear {
    game_state = "clear";
    runner_x = finish_x;
    broadcast "runner_finish";
    broadcast "dash_button_hide";
    broadcast "status_hide";
    clear_graphic_effects;
    broadcast "show_clear";
}

proc finish_game_over {
    game_state = "game_over";
    broadcast "runner_stop";
    broadcast "dash_button_hide";
    broadcast "status_hide";
    clear_graphic_effects;
    broadcast "show_game_over";
}

proc register_dash {
    if game_state == "playing" {
        if dash_count < target_dashes {
            dash_count++;
            runner_x = start_x + (finish_x - start_x) * dash_count / target_dashes;
            update_status_ui;
            broadcast "runner_progress_update";

            if dash_count >= target_dashes {
                finish_game_clear;
            }
        }
    }
}

onflag {
    game_state = "intro";
    dash_count = 0;
    time_left = time_limit;
    runner_x = start_x;
    progress_percent = 0;
    status_text = "";
    warning_active = 0;
    broadcast "runner_hide";
    broadcast "dash_button_hide";
    broadcast "status_hide";
    broadcast "hide_message";
    clear_graphic_effects;
    wait 0.1;
    broadcast "show_intro";

    forever {
        if game_state == "playing" {
            wait 1;
            if game_state == "playing" {
                time_left--;
                if time_left < 0 {
                    time_left = 0;
                }
                update_status_ui;

                if time_left <= warning_time {
                    if warning_active == 0 {
                        warning_active = 1;
                        broadcast "warning_on";
                    }
                }
                else {
                    if warning_active == 1 {
                        warning_active = 0;
                        broadcast "warning_off";
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

on "start_requested" {
    if game_state != "playing" {
        start_game;
    }
}

on "dash_pressed" {
    register_dash;
}
