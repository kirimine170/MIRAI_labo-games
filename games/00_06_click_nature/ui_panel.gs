costumes "assets/ui_panel.svg";

hide;
set_size 100;

onflag {
    hide;
}

on "ui_panel_show" {
    goto 0, 145;
    show;
    goto_front;
}

on "ui_hide" {
    hide;
}
