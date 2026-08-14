costumes "assets/message_intro.svg", "assets/message_game_over.svg", "assets/message_clear.svg";

hide;
set_size 100;

proc place_message {
    goto 0, 22;
    goto_front;
}

onflag {
    hide;
}

on "show_intro" {
    switch_costume "message_intro";
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
