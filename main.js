define([
  'require',
  'jquery',
  'base/js/namespace',
  'base/js/events',
  'base/js/utils',
  'notebook/js/codecell',
], function (
  requirejs,
  $,
  Jupyter,
  events,
  utils,
  codecell
) {
  "use strict";
  var CodeCell = codecell.CodeCell;

  var Scratchpad = function (nb) {
    var scratchpad = this;
    this.notebook = nb;
    this.kernel = nb.kernel;
    this.km = nb.keyboard_manager;
    this.collapsed = true;

    // create elements
    this.element = $("<div id='nbextension-scratchpad'>");
    this.close_button = $("<i>").addClass("fa fa-caret-square-o-down scratchpad-btn scratchpad-close");
    this.open_button = $("<i>").addClass("fa fa-caret-square-o-up scratchpad-btn scratchpad-open");
    this.element.append(this.close_button);
    this.element.append(this.open_button);
    this.open_button.click(function () {
      scratchpad.expand();
    });
    this.close_button.click(function () {
      scratchpad.collapse();
    });

    // create my cell
    var cell = this.cell = new CodeCell(nb.kernel, {
      events: nb.events,
      config: nb.config,
      keyboard_manager: nb.keyboard_manager,
      notebook: nb,
      tooltip: nb.tooltip,
    });
    cell.set_input_prompt();
    this.element.append($("<div/>").addClass('cell-wrapper').append(this.cell.element));
    cell.render();
    cell.refresh();
    this.collapse();

    // override ctrl/shift-enter to execute me if I'm focused instead of the notebook's cell
    var execute_and_select_action = this.km.actions.register({
      handler: $.proxy(this.execute_and_select_event, this),
    }, 'scratchpad-execute-and-select');
    var execute_action = this.km.actions.register({
      handler: $.proxy(this.execute_event, this),
    }, 'scratchpad-execute');
    var toggle_action = this.km.actions.register({
      handler: $.proxy(this.toggle, this),
    }, 'scratchpad-toggle');
    
    var shortcuts = {
      'shift-enter': execute_and_select_action,
      'ctrl-enter': execute_action,
      'ctrl-b': toggle_action,
    }

    // Workaround for a bug when using this extension together with jupyter-vim-binding.
    // Whenever this extension loads before jupyter-vim-binding, the shortcuts get overwritten
    // causing this extension to break. Therefore, wait 2 seconds to force jupyter-vim-binding
    // to finish loading before we register our shortcuts.
    setTimeout(function(){
      scratchpad.km.edit_shortcuts.add_shortcuts(shortcuts);
      scratchpad.km.command_shortcuts.add_shortcuts(shortcuts);
    }, 2000);

    // finally, add me to the page
    $("body").append(this.element);
  };

  Scratchpad.prototype.toggle = function () {
    if (this.collapsed) {
      this.expand();
    } else {
      this.collapse();
    }
    return false;
  };

  Scratchpad.prototype.expand = function () {
    this.collapsed = false;
    var site_height = $("#site").height();
    this.element.animate({
      height: site_height,
    }, 200);
    this.open_button.hide();
    this.close_button.show();
    this.cell.element.show();
    this.cell.focus_editor();
    $("#notebook-container").css('margin-left', 0);
  };

  Scratchpad.prototype.collapse = function () {
    this.collapsed = true;
    $("#notebook-container").css('margin-left', 'auto');
    this.element.animate({
      height: 0,
    }, 100);
    this.close_button.hide();
    this.open_button.show();
    this.cell.element.hide();
  };

  Scratchpad.prototype.execute_and_select_event = function (evt) {
    if (utils.is_focused(this.element)) {
      this.cell.execute();
    } else {
      this.notebook.execute_cell_and_select_below();
    }
  };

  Scratchpad.prototype.execute_event = function (evt) {
    if (utils.is_focused(this.element)) {
      this.cell.execute();
    } else {
      this.notebook.execute_selected_cells();
    }
  };

  function setup_scratchpad () {
    // lazy, hook it up to Jupyter.notebook as the handle on all the singletons
    console.log("Setting up scratchpad");
    return new Scratchpad(Jupyter.notebook);
  }

  function load_extension () {
    // add css
    var link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = requirejs.toUrl("./scratchpad.css");
    document.getElementsByTagName("head")[0].appendChild(link);
    // load when the kernel's ready
    if (Jupyter.notebook.kernel) {
      setup_scratchpad();
    } else {
      events.on('kernel_ready.Kernel', setup_scratchpad);
    }
  }

  return {
    load_ipython_extension: load_extension,
  };
});
