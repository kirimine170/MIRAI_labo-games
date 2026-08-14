costumes "assets/digit_0.svg", "assets/digit_1.svg", "assets/digit_2.svg", "assets/digit_3.svg", "assets/digit_4.svg", "assets/digit_5.svg", "assets/digit_6.svg", "assets/digit_7.svg", "assets/digit_8.svg", "assets/digit_9.svg";

hide;
set_size 70;
var digit_value = 0;
var last_digit_value = -1;
var last_warning_value = -1;

proc switch_digit {
    if digit_value == 0 { switch_costume "digit_0"; }
    elif digit_value == 1 { switch_costume "digit_1"; }
    elif digit_value == 2 { switch_costume "digit_2"; }
    elif digit_value == 3 { switch_costume "digit_3"; }
    elif digit_value == 4 { switch_costume "digit_4"; }
    elif digit_value == 5 { switch_costume "digit_5"; }
    elif digit_value == 6 { switch_costume "digit_6"; }
    elif digit_value == 7 { switch_costume "digit_7"; }
    elif digit_value == 8 { switch_costume "digit_8"; }
    else { switch_costume "digit_9"; }
}

proc update_digit {
    digit_value = time_left % 10;
    if digit_value != last_digit_value {
        last_digit_value = digit_value;
        switch_digit;
    }
    goto 182, 145;
    if time_left <= warning_time {
        if last_warning_value != 1 {
            last_warning_value = 1;
            set_color_effect 18;
            set_brightness_effect 35;
            set_size 82;
        }
    }
    else {
        if last_warning_value != 0 {
            last_warning_value = 0;
            clear_graphic_effects;
            set_size 70;
        }
    }
    show;
    goto_front;
}

onflag {
    last_digit_value = -1;
    last_warning_value = -1;
    hide;
}

on "ui_show" {
    if game_state == "playing" { update_digit; }
}

on "ui_time_update" {
    if game_state == "playing" { update_digit; }
}

on "ui_hide" {
    last_digit_value = -1;
    last_warning_value = -1;
    hide;
}
