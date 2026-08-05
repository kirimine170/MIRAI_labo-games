costumes "assets/ui_percent.svg";

hide;
set_size 70;

onflag {
    hide;
}

on "ui_show" {
    goto 194, 108;
    show;
    goto_front;
}

on "ui_hide" {
    hide;
}
