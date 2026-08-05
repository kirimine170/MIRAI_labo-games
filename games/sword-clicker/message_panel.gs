costumes "assets/message_intro_1.svg", "assets/message_intro_2.svg", "assets/message_intro_3.svg", "assets/message_intro_4.svg", "assets/message_intro_5.svg", "assets/message_intro_6.svg", "assets/message_intro_7.svg", "assets/message_intro_8.svg", "assets/message_intro_9.svg", "assets/message_game_over.svg", "assets/message_clear.svg";

hide;
set_size 100;

proc place_message {
    goto 0, 25;
    goto_front;
}

proc switch_intro_costume {
    if total_slimes == 1 {
        switch_costume "message_intro_1";
    }
    elif total_slimes == 2 {
        switch_costume "message_intro_2";
    }
    elif total_slimes == 3 {
        switch_costume "message_intro_3";
    }
    elif total_slimes == 4 {
        switch_costume "message_intro_4";
    }
    elif total_slimes == 5 {
        switch_costume "message_intro_5";
    }
    elif total_slimes == 6 {
        switch_costume "message_intro_6";
    }
    elif total_slimes == 7 {
        switch_costume "message_intro_7";
    }
    elif total_slimes == 8 {
        switch_costume "message_intro_8";
    }
    else {
        switch_costume "message_intro_9";
    }
}

onflag {
    hide;
}

on "show_intro" {
    switch_intro_costume;
    place_message;
    show;
}

on "show_game_over" {
    switch_costume "message_game_over";
    place_message;
    show;
}

on "show_clear" {
    switch_costume "message_clear";
    place_message;
    show;
}

on "hide_message" {
    hide;
}
