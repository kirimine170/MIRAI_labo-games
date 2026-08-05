costumes "assets/ui_slash.svg";

hide;
set_size 70;

onflag {
    hide;
}

on "ui_show" {
    goto 158, 108;
    show;
    goto_front;
}

on "ui_hide" {
    hide;
}
