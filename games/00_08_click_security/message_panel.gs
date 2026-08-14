costumes "assets/message_intro.svg", "assets/message_game_over.svg", "assets/message_clear.svg";

hide;
set_size 100;

proc show_panel {
    goto 0, 18;
    show;
    goto_front;
}

onflag {
    hide;
}

on "show_intro" {
    switch_costume "message_intro";
    show_panel;
}

on "show_game_over" {
    switch_costume "message_game_over";
    show_panel;
}

on "show_clear" {
    switch_costume "message_clear";
    show_panel;
}

on "hide_message" {
    hide;
}

onclick {
    if game_state != "playing" {
        broadcast "start_requested";
    }
}
