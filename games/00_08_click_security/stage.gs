costumes "assets/background.svg";

# Game settings．Thirty scans in 20 seconds．
var target_scans = 30;
var time_limit = 20;
var warning_time = 5;

var game_state = "intro";
var scan_count = 0;
var time_left = 20;
var removal_percent = 0;
var status_text = "";
var warning_active = 0;

proc update_status_ui {
    removal_percent = floor (scan_count * 100 / target_scans);
    if removal_percent > 100 {
        removal_percent = 100;
    }
    status_text = "じょきょ " & scan_count & " / " & target_scans & "　のこり " & time_left & " びょう";
    broadcast "status_update";
}

proc reset_game_state {
    scan_count = 0;
    time_left = time_limit;
    removal_percent = 0;
    warning_active = 0;
    clear_graphic_effects;
    update_status_ui;
}

proc start_game {
    game_state = "playing";
    broadcast "hide_message";
    broadcast "scan_button_hide";
    broadcast "status_hide";
    reset_game_state;
    broadcast "virus_spawn";
    broadcast "scan_button_show";
    broadcast "status_show";
}

proc finish_game_clear {
    game_state = "clear";
    scan_count = target_scans;
    removal_percent = 100;
    broadcast "virus_removed";
    broadcast "scan_button_hide";
    broadcast "status_hide";
    clear_graphic_effects;
    broadcast "show_clear";
}

proc finish_game_over {
    game_state = "game_over";
    broadcast "virus_freeze";
    broadcast "scan_button_hide";
    broadcast "status_hide";
    clear_graphic_effects;
    broadcast "show_game_over";
}

proc register_scan {
    if game_state == "playing" {
        if scan_count < target_scans {
            scan_count++;
            update_status_ui;
            broadcast "virus_progress_update";

            if scan_count >= target_scans {
                finish_game_clear;
            }
        }
    }
}

onflag {
    game_state = "intro";
    scan_count = 0;
    time_left = time_limit;
    removal_percent = 0;
    status_text = "";
    warning_active = 0;
    broadcast "virus_hide";
    broadcast "scan_button_hide";
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

on "scan_pressed" {
    register_scan;
}
