
(() => {
  $.widget("custom.combobox", {
    _create: function () {


      this.wrapper = $("<div>")
        .addClass("g2t-custom-combobox")
        .attr("for-select", this.element.attr('id'))
        .attr("id", "combo_" + this.element.attr('id'))
        .insertAfter(this.element);

      this.element.hide();
      this._createAutocomplete();
      this._createShowAllButton();
    },
    setInputValue: function (val) {
      if (this.input)
        this.input.val(val);
    },
    _createAutocomplete: function () {
      var selected = this.element.children(":selected"),
        value = selected.val() ? selected.text() : "";
      this.input = $("<input>")
        .appendTo(this.wrapper)
        .val(value)
        .attr("title", "")
        .addClass("g2t-custom-combobox-input ui-widget ui-state-default")
        .autocomplete({
          delay: 0,
          minLength: 0,
          autoFocus: true,
          source: $.proxy(this, "_source")
        })
        .tooltip({
          classes: {
            "ui-tooltip": "ui-state-highlight"
          }
        }).keyup((event) => {

          if (event.which == 13) {
            var forAttr = $(event.target).parent().attr("for-select");
            if (forAttr) {
              var nextSelAttr = $("#" + forAttr).attr("next-select");
              var nextSel = $("#" + nextSelAttr);
              if ($(nextSel).hasClass("g2t-custom-combobox")) {
                $(nextSel).find("input").focus();
              } else {
                $(nextSel).focus();
              }
            }
          }

        });

      this._on(this.input, {
        autocompleteselect: function (event, ui) {
          ui.item.option.selected = true;
          this._trigger("select", event, {
            item: ui.item.option
          });

          var forAttr = this.input.parent().attr('for-select');
          // if (forAttr == "g2tBoard") {
          //   $("#combo_g2tList").contents('.g2t-custom-combobox-input').focus();
          // } else if (forAttr == "g2tList") {
          //   $("#g2tPosition").focus()
          // }
          $('#' + forAttr).trigger('change')
        },

        autocompletechange: "_removeIfInvalid"
      });
    },

    _createShowAllButton: function () {
      var input = this.input,
        wasOpen = false;

      $("<a>")
        .attr("tabIndex", -1)
        .tooltip()
        .appendTo(this.wrapper)
        .button({
          icons: {
            primary: "ui-icon-triangle-1-s"
          },
          text: false
        })
        .removeClass("ui-corner-all")
        .addClass("g2t-custom-combobox-toggle ui-corner-right")
        .on("mousedown", function () {
          wasOpen = input.autocomplete("widget").is(":visible");
        })
        .on("click", function () {
          input.trigger("focus");

          // Close if already visible
          if (wasOpen) {
            return;
          }

          // Pass empty string as value to search for, displaying all results
          input.autocomplete("search", "");
        });
    },

    _source: function (request, response) {
      var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
      response(this.element.children("option").map(function () {
        var text = $(this).text();
        if (this.value && (!request.term || matcher.test(text)))
          return {
            label: text,
            value: text,
            option: this
          };
      }));
    },

    _removeIfInvalid: function (event, ui) {
      // Search for a match (case-insensitive)
      var value = this.input.val(),
        valueLowerCase = value.toLowerCase(),
        valid = false;
      this.element.children("option").each(function () {
        if ($(this).text().toLowerCase() === valueLowerCase) {
          this.selected = valid = true;
        }
      });

      // Found a match, nothing to do
      if (valid) {
        //   return;
      }
      this.input.autocomplete("instance").term = "";
    },

    _destroy: function () {
      debugger
      if (this.wrapper && this.element) {

        this.wrapper.remove();
        this.element.show();
      }
    }
  });
})();
