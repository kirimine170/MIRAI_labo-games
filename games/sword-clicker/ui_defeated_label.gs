costumes "assets/ui_defeated_label.svg";

hide;
set_size 100;

onflag {
    hide;
}

on "ui_show" {
    goto 15, 108;
    show;
    goto_front;
}

on "ui_hide" {
    hide;
}
