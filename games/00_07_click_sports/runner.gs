costumes "assets/runner_step_1.svg", "assets/runner_step_2.svg", "assets/runner_goal.svg";

hide;
set_size 100;
set_rotation_style_do_not_rotate;

proc show_runner_at_start {
    clear_graphic_effects;
    switch_costume "runner_step_1";
    goto runner_x, -42;
    show;
    goto_front;
}

proc update_runner_position {
    if dash_count % 2 == 0 {
        switch_costume "runner_step_1";
    }
    else {
        switch_costume "runner_step_2";
    }
    goto runner_x, -42;
    set_brightness_effect 18;
    wait 0.03;
    clear_graphic_effects;
}

onflag {
    hide;
}

on "runner_spawn" {
    show_runner_at_start;
}

on "runner_progress_update" {
    if game_state == "playing" {
        update_runner_position;
    }
}

on "runner_finish" {
    switch_costume "runner_goal";
    goto runner_x, -42;
    clear_graphic_effects;
    show;
    goto_front;
}

on "runner_stop" {
    clear_graphic_effects;
    show;
}

on "runner_hide" {
    hide;
}
