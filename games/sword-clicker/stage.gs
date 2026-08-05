costumes "assets/background.svg";

# Game settings. Change these values to tune the game.
var total_slimes = 3;
var base_hp = 5;
var hp_increase_per_slime = 1;
var time_per_slime = 10;
var warning_time = 3;

var game_state = "intro";
var defeated_count = 0;
var current_hp = 0;
var max_hp = 0;
var time_left = 10;
var HP = "";
var time_display = "";
var defeated_display = "";
var message_text = "";
var warning_active = 0;

proc update_hp_ui {
    HP = "HP: " & current_hp & " / " & max_hp;
    broadcast "ui_hp_update";
}

proc update_time_ui {
    time_display = "のこり時間: " & time_left;
    broadcast "ui_time_update";
}

proc update_defeated_ui {
    defeated_display = "たおした数: " & defeated_count & " / " & total_slimes;
    broadcast "ui_defeated_update";
}

proc update_dynamic_ui {
    update_hp_ui;
    update_time_ui;
    update_defeated_ui;
}

proc show_game_ui {
    broadcast "hide_message";
    broadcast "ui_show";
    broadcast "ui_static_update";
}

proc hide_game_ui {
    broadcast "ui_hide";
}

proc set_next_slime {
    max_hp = base_hp + defeated_count * hp_increase_per_slime;
    current_hp = max_hp;
    time_left = time_per_slime;
    warning_active = 0;
    update_hp_ui;
    update_time_ui;
    clear_graphic_effects;
    broadcast "spawn_slime";
}

proc start_game {
    game_state = "playing";
    hide_game_ui;
    set_next_slime;
    update_defeated_ui;
    show_game_ui;
}

proc finish_game_over {
    game_state = "game_over";
    broadcast "hide_slime";
    hide_game_ui;
    clear_graphic_effects;
    message_text = "ざんねん！時間内にスライムをたおせなかった！緑のはたをおして、もう一度やってみよう！";
    broadcast "show_game_over";
}

proc finish_game_clear {
    game_state = "clear";
    broadcast "hide_slime";
    hide_game_ui;
    clear_graphic_effects;
    message_text = "おめでとう！時間内にスライムをたおせたよ！もう一度やりたいときは、緑のはたをおしてね！";
    broadcast "show_clear";
}

onflag {
    game_state = "intro";
    defeated_count = 0;
    current_hp = 0;
    max_hp = 0;
    time_left = time_per_slime;
    warning_active = 0;
    HP = "";
    time_display = "";
    defeated_display = "";
    hide_game_ui;
    broadcast "hide_slime";
    broadcast "hide_message";
    clear_graphic_effects;
    wait 0.1;

    message_text = "スライムをクリックしてたおそう！ぜんぶで" & total_slimes & "体のスライムを時間内にたおせたら、ゲームクリア！";
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
                        set_color_effect 20;
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

on "slime_defeated" {
    if game_state == "playing" {
        defeated_count++;
        update_defeated_ui;

        if defeated_count >= total_slimes {
            finish_game_clear;
        }
        else {
            set_next_slime;
        }
    }
}
