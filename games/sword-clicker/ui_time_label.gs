costumes "assets/ui_time_label.svg";

hide;
set_size 100;

onflag {
    hide;
}

on "ui_show" {
    goto 80, 148;
    show;
    goto_front;
}

on "ui_hide" {
    hide;
}
