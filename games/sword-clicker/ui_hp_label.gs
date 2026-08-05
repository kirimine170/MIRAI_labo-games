costumes "assets/ui_hp_label.svg";

hide;
set_size 100;

onflag {
    hide;
}

on "ui_show" {
    goto -205, 148;
    show;
    goto_front;
}

on "ui_hide" {
    hide;
}
