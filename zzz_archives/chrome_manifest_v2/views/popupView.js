var Gmail2Trello = Gmail2Trello || {};

Gmail2Trello.PopupView = function (parent) {
    this.parent = parent;
    this.event = new EventTarget();
    this.isInitialized = false;

    this.data = { settings: {} };

    this.size_k = {
        width: {
            min: 700,
            max: window.innerWidth - 16, // Max width is 100% of the window - 1em. KS
        },
        height: {
            min: 464,
            max: 1400,
        },
        text: {
            min: 111,
        },
    };
    this.draggable = {
        height: {
            min: 464,
            max: window.innerHeight - 100, // 100 - a safety buffer to prevent the dragable controls from being hidden by gmail's menu buttons.
        },
        width: {
            min: 700,
            max: window.innerWidth - 100,
        },
    };

    // html pieces
    this.html = {};

    this.chrome_access_token = "";

    this.dataDirty = true;
    this.posDirty = false;

    this.MAX_BODY_SIZE = 16384;

    this.mouseDownTracker = {};

    this.lastError = "";

    this.intervalId = 0;

    this.EVENT_LISTENER = ".g2t_event_listener"; // NOTE (acoven@2020-05-23): beginning with dot intentional and required

    this.CLEAR_EXT_BROWSING_DATA = "g2t_clear_extension_browsing_data";

    this.VERSION_STORAGE = "g2t_version";

    this.ATTRIBUTE_STORAGE = "g2t-attr-";

    this.updatesPending = [];
    this.comboInitialized = false;

    // this.fullName = "";
};

Gmail2Trello.PopupView.prototype.init = function () {
    // g2t_log('PopupView:init');
    var self = this;

    //   if (!this.$toolBar) {
    //       return; // button not available yet
    //   }

    // inject a button & a popup
    this.confirmPopup();

    if (self.intervalId) {
        clearInterval(self.intervalId);
    }

    self.intervalId = setInterval(function () {
        self.event.fire("detectButton");
    }, 2000);
};
Gmail2Trello.PopupView.prototype.comboBox = function (update) {
    let self = this;
    let $jVals = { Board: "", Card: "", List: "" };
    let setJQueryVals = function () {
        $.each($jVals, function (key) {
            $jVals[key] = $("#g2t" + key, self.$popup);
        });
    };
    let set_max_autocomplete_size = function () {
        const max_k = window.innerHeight; // Was: self.draggable.height.max;
        const $board_k = $jVals.Board;
        const popup_offset_k = self.$popup.offset();
        const popup_top_k = popup_offset_k.top;
        const board_height_k = $board_k.outerHeight();
        const calc_k =
            max_k -
            popup_top_k -
            board_height_k -
            90; /* titlebar of popup with some room*/
        const val_k = calc_k > self.size_k.text.min ? calc_k : "60%";
        $(".ui-autocomplete").css("max-height", val_k);
    };
    if (!update) {
        setTimeout(() => {
            self.comboInitialized = true;
            setJQueryVals();
            $.each($jVals, function (key, $value) {
                $value.combobox();
            });
            set_max_autocomplete_size();
        }, 1000);
    } else if (self.comboInitialized) {
        // Updating type-in list's value when a value is changed.
        setJQueryVals();
        $.each($jVals, function (key, $value) {
            $value.combobox(
                "setInputValue",
                $value.children("option:selected").text()
            );
        });
        set_max_autocomplete_size();
    }
};

Gmail2Trello.PopupView.prototype.confirmPopup = function () {
    if (!this.$toolBar) {
        return; // button not available yet
    }

    var self = this,
        needInit = false,
        $button = $("#g2tButton"),
        $popup = $("#g2tPopup");

    if ($button.length < 1) {
        if (
            this.html &&
            this.html["add_to_trello"] &&
            this.html["add_to_trello"].length > 0
        ) {
            // g2t_log('PopupView:confirmPopup: add_to_trello_html already exists');
        } else {
            var img = "G2T",
                classAdd = "Bn";

            // Refresh icon present? If so, use graphics, if not, use text:
            if (
                $(
                    "div.asl.T-I-J3.J-J5-Ji,div.asf.T-I-J3.J-J5-Ji",
                    this.$toolBar
                ).length > 0
            ) {
                img =
                    '<img class="f tk3N6e-I-J3" height="20" width="20" src="' +
                    chrome.runtime.getURL("images/icon-48.png") +
                    '" />';
                classAdd = "asa ";
            }

            this.html["add_to_trello"] =
                '<div id="g2tButton" class="' +
                'G-Ni J-J5-Ji" ' + // "lS T-I-ax7 ar7" // 'G-Ni J-J5-Ji T-I ar7 nf T-I-ax7 L3" '
                'data-tooltip="Add this Gmail to Trello">' +
                '<div class="' +
                classAdd +
                '">' +
                '<div aria-haspopup="true" role="button" class="J-J5-Ji W6eDmd L3 J-J5-Ji L3" tabindex="0">' + // class="J-J5-Ji W6eDmd L3 J-J5-Ji Bq L3">' // Bq = Delete icon
                img +
                '<div id="g2tDownArrow" class="G-asx T-I-J3 J-J5-Ji">&nbsp;</div></div></div></div>';
        }
        // g2t_log('PopupView:confirmPopup: creating button');
        this.$toolBar.append(this.html["add_to_trello"]);
        needInit = true;
    } else if ($button.first().is(":visible")) {
        // g2t_log('PopupView:confirmPopup: button visible');
    } else {
        // g2t_log('PopupView:confirmPopup: Button is in an inactive region. Moving...');
        //relocate
        if ($button.length > 1) {
            $button.detach(); // In case multiple copies were created
            if ($popup.length > 1) {
                $popup.detach(); // In case copies were created
            }
        }
        g2t_log("PopupView:confirmPopup: adding Button and Popup");
        $button.first().appendTo(this.$toolBar);
        $popup.first().appendTo(this.$toolBar);
    }

    if (needInit || $popup.length < 1) {
        if (this.html && this.html["popup"] && this.html["popup"].length > 0) {
            // g2t_log('PopupView:confirmPopup: adding popup');
            this.$toolBar.append(this.html["popup"]);
            needInit = true;
        } else {
            needInit = false;
            $.get(
                chrome.runtime.getURL("views/popupView.html"),
                function (data) {
                    // data = self.parent.replacer(data, {'jquery-ui-css': chrome.runtime.getURL('lib/jquery-ui-1.12.1.min.css')}); // OBSOLETE (Ace@2017.06.09): Already loaded by manifest
                    self.html["popup"] = data;
                    g2t_log("PopupView:confirmPopup: creating popup");
                    self.$toolBar.append(data);
                    self.parent.loadSettings(self); // Calls init_popup
                }
            );
        }
    }

    if (needInit) {
        this.parent.loadSettings(this); // Calls init_popup
    }
};

/**
 * Set the initial width by measuring from the left corner of the
 * "Add card" button to the edge of the window and then center that under the "Add card" button:
 */
Gmail2Trello.PopupView.prototype.centerPopup = function (useWidth) {
    var g2tLeft = this.$g2tButton.position().left;
    var g2tRight = g2tLeft + this.$g2tButton.width();
    var g2tCenter = g2tLeft + this.$g2tButton.outerWidth() / 2;

    var parent = this.$g2tButton.offsetParent();
    var parentRight = parent.position().left + parent.width();

    const length_from_left_k = g2tLeft * 1.5;
    const length_from_right_k = (parentRight - g2tRight) * 1.5;
    const calcWidth_k = Math.min(length_from_left_k, length_from_right_k); // If we need a width to use

    // We'll make our popup 1.25x as wide as the button to the end of the window up to max width:
    var newPopupWidth = this.size_k.width.min;
    if (useWidth && useWidth > 0) {
        newPopupWidth = useWidth; // May snap to min if necessary
        g2tCenter = this.$popup.position().left;
        g2tCenter += this.$popup.width() / 2;
    } else if (
        this.data &&
        this.data.settings &&
        this.data.settings.popupWidth &&
        this.data.settings.popupWidth.length > 0
    ) {
        newPopupWidth = parseFloat(
            this.data.settings.popupWidth,
            10 /* base 10 */
        );
    } else {
        newPopupWidth = calcWidth_k;
    }

    newPopupWidth = Math.min(
        this.size_k.width.max,
        Math.max(this.size_k.width.min, newPopupWidth)
    );

    var newPopupLeft = g2tCenter - newPopupWidth / 2;

    if (newPopupLeft < 0) {
        // button positions have moved, recalculate
        newPopupWidth = calcWidth_k;
        newPopupLeft = g2tCenter - newPopupWidth / 2;
    }

    this.$popup.css("width", newPopupWidth + "px");
    this.$popup.css("left", newPopupLeft + "px");

    this.onResize();

    this.posDirty = !this.validateData() ? true : false;
};

Gmail2Trello.PopupView.prototype.init_popup = function () {
    this.$g2tButton = $("#g2tButton");
    this.$popup = $("#g2tPopup");

    this.$popupMessage = $(".popupMsg", this.$popup);
    this.$popupContent = $(".content", this.$popup);

    this.centerPopup();
    this.bindEvents();

    this.isInitialized = true;
};

// NOTE (Ace, 15-Jan-2017): This resizes all the text areas to match the width of the popup:
Gmail2Trello.PopupView.prototype.onResize = function () {
    this.validateData(); // Assures size is saved // OBSOLETE (acoven@2020-08-12): Can probably remove "onResize" completely
};

Gmail2Trello.PopupView.prototype.resetDragResize = function () {
    var $g2tDesc = $("#g2tDesc", self.$popup);
    var $popupBB = $("#g2tPopup", self.$popup);
    var padding = 95;
    this.$popup.draggable({
        disabled: false,
        containment: "window",
    });

    this.$popup.resizable({
        disabled: false,
        minHeight: this.draggable.height.min,
        minWidth: this.draggable.width.min,
        maxHeight: this.draggable.height.max,
        maxWidth: this.draggable.width.max,
        resize: () => {
            // This will remove the max-height restriction set in CSS, thereby allwing the user to resize freely.
            if ($("#g2tPopup").css("max-height") != "inherit") {
                $("#g2tPopup").css("max-height", "inherit");
            }
        },
        handles: "w,sw,s,se,e",
    });
};

Gmail2Trello.PopupView.prototype.updateBody = function (data = {}) {
    let self = this;
    const attribute_storage_k = self.ATTRIBUTE_STORAGE;

    const markdown_k = $("#chkMarkdown", self.$popup).is(":checked");
    const useBackLink_k = $("#chkBackLink", self.$popup).is(":checked");
    const addCC_k = $("#chkCC", self.$popup).is(":checked");
    let $g2tDesc = $("#g2tDesc", self.$popup);

    let fields = ["bodyAsRaw", "bodyAsMd", "linkAsRaw", "linkAsMd", "emailId"];
    const valid_data_k = self.parent.validHash(data, fields);

    fields.push("ccAsRaw", "ccAsMd"); // These are conditional

    if (valid_data_k) {
        // Store data in description object attributes:
        $.each(fields, function (index, value) {
            const val_k = data[value] || "";
            const name_k = attribute_storage_k + value;
            $g2tDesc.attr(name_k, val_k);
        });
        /*
        $("#g2tDesc", self.$popup)
            // .val(self.parent.addSpace(link_k, cc_k + desc_k); // set below
            .attr("gmail-body-raw", data.body_raw || "")
            .attr("gmail-body-md", data.body_md || "")
            .attr("gmail-link-raw", data.link_raw || "")
            .attr("gmail-link-md", data.link_md || "")
            .attr("gmail-cc-raw", data.cc_raw || "")
            .attr("gmail-cc-md", data.cc_md || "")
            .attr("gmail-id", data.emailId || 0); // NOTE (Ace, 2021-01-04): NOT "" and NOT "gmail-emailId"
            */
    } else {
        // Restore data values from description object attributes:
        $.each(fields, function (index, value) {
            const name_k = attribute_storage_k + value;
            const val_k = $g2tDesc.attr(name_k) || "";
            data[value] = val_k;
        }); // WARNING (Ace, 2021-01-04): this might override data.emailId when we don't want it to
        /*
        data.body_raw = $g2tDesc.attr("gmail-body-raw") || "";
        data.body_md = $g2tDesc.attr("gmail-body-md") || "";
        data.link_raw = $g2tDesc.attr("gmail-link-raw") || "";
        data.link_md = $g2tDesc.attr("gmail-link-md") || "";
        data.cc_raw = $g2tDesc.attr("gmail-cc-raw") || "";
        data.cc_md = $g2tDesc.attr("gmail-cc-md") || "";
        */
    }

    const body_k = markdown_k ? data.bodyAsMd : data.bodyAsRaw;
    const link_k = useBackLink_k
        ? markdown_k
            ? data.linkAsMd
            : data.linkAsRaw
        : "";
    const cc_k = addCC_k ? (markdown_k ? data.ccAsMd : data.ccAsRaw) : "";
    const desc_k = self.parent.truncate(
        body_k,
        self.MAX_BODY_SIZE - (link_k.length + cc_k.length),
        "..."
    );
    const val_k = link_k + cc_k + desc_k;

    $g2tDesc.val(val_k);
    $g2tDesc.change();
};

Gmail2Trello.PopupView.prototype.bindEvents = function () {
    // bind events
    var self = this;

    /** Popup's behavior **/
    this.resetDragResize();

    $("#close-button", this.$popup)
        .off("click")
        .on("click", () => {
            self.hidePopup();
        });

    /** Add Card Panel's behavior **/

    this.$g2tButton
        .off("mousedown") // was: ("click")
        .on("mousedown" /* was: "click" */, (event) => {
            if (self.parent.modKey(event)) {
                // TODO (Ace, 28-Mar-2017): Figure out how to reset layout here!
            } else {
                if (self.popupVisible()) {
                    self.hidePopup();
                } else {
                    // const selectedText_k = self.parent.getSelectedText(); // grab selected text before click?
                    self.showPopup();
                }
            }
        })
        .hover(
            function () {
                // This is a google class that on hover highlights the button and arrow, darkens the background:
                $(this).addClass("T-I-JW");
            },
            function () {
                $(this).removeClass("T-I-JW");
            }
        );
    /*
        .off("mousedown")
        .on("mousedown", (event) => {
            
        });
        */

    var $board = $("#g2tBoard", this.$popup);
    $board.off("change").on("change", () => {
        var boardId = $board.val();

        var $list = $("#g2tList", self.$popup);
        var $card = $("#g2tCard", self.$popup);
        var $labels = $("#g2tLabels", self.$popup);
        var $members = $("#g2tMembers", self.$popup);
        var $labelsMsg = $("#g2tLabelsMsg", self.$popup);
        var $membersMsg = $("#g2tMembersMsg", self.$popup);

        if (boardId === "_") {
            $board.val("");
        }

        if (
            boardId === "_" ||
            boardId === "" ||
            boardId !== self.data.settings.boardId
        ) {
            // $membersMsg.text("...please pick a board...").show();
            // $labelsMsg.text("...please pick a board...").show();
            $members.html("").hide(); // clear it out
            $labels.html("").hide(); // clear it out
            $list
                .html($('<option value="">...please pick a board...</option>'))
                .val("");
            $card
                .html($('<option value="">...please pick a list...</option>'))
                .val("");
            self.data.settings.labelsId = "";
            self.data.settings.listId = "";
            self.data.settings.cardId = "";
            // self.data.settings.membersId = ''; // NOTE (Ace, 28-Mar-2017): Do NOT clear membersId, as we can persist selections across boards
            $;
        } else {
            $members.hide(); // clear it out
            $labels.hide(); // hiding when loading is being showed.
            // $labelsMsg.text("Loading...").show();
            // $membersMsg.text("Loading...").show();
        }

        self.event.fire("onBoardChanged", { boardId: boardId });

        if (self.comboBox) self.comboBox("updateValue");
        self.validateData();
    });

    let $list = $("#g2tList", this.$popup);
    $list.off("change").on("change", () => {
        const listId = $list.val();
        self.event.fire("onListChanged", { listId });
        if (self.comboBox) self.comboBox("updateValue");
        self.validateData();
    });

    $("#g2tPosition", this.$popup)
        .off("change")
        .on("change", (event) => {
            // Focusing the next element in select.
            $("#" + $(event.target).attr("next-select"))
                .find("input")
                .focus();
        })
        .off("keyup")
        .on("keyup", (event) => {
            // Focusing the next element on enter key up.
            if (event.which == 13) {
                $("#" + $(event.target).attr("next-select"))
                    .find("input")
                    .focus();
            }
        });

    $("#g2tCard", this.$popup)
        .off("change")
        .on("change", () => {
            if (self.comboBox) self.comboBox("updateValue");
            self.validateData();
        });

    $("#g2tDue_Shortcuts", this.$popup)
        .off("change")
        .on("change", (event) => {
            const dayOfWeek_k = {
                sun: 0,
                sunday: 0,
                mon: 1,
                monday: 1,
                tue: 2,
                tuesday: 2,
                wed: 3,
                wednesday: 3,
                thu: 4,
                thursday: 4,
                fri: 5,
                friday: 5,
                sat: 6,
                saturday: 6,
            };
            let pad0 = function (str = "", n = 2) {
                return ("0".repeat(n) + str).slice(-n);
            };
            let dom_date_format = function (d = new Date()) {
                // yyyy-MM-dd
                return `${d.getFullYear()}-${pad0(d.getMonth() + 1)}-${pad0(
                    d.getDate()
                )}`;
            };
            let dom_time_format = function (d = new Date()) {
                // HH:mm
                return `${pad0(d.getHours())}:${pad0(d.getMinutes())}`;
            };

            const due_k = ($(event.target).val() || "").split(" "); // Examples: d=monday am=2 | d+0 pm=3:00

            let d = new Date();

            let [due_date, due_time] = due_k || [];

            let new_date = "",
                new_time = "";

            if (due_date.substr(1, 1) === "+") {
                d.setDate(d.getDate() + parseInt(due_date.substr(2)), 10);
                new_date = dom_date_format(d); // d.toString(dom_date_format_k);
            } else if (due_date.substr(1, 1) === "=") {
                d.setDate(d.getDate() + 1); // advance to tomorrow, don't return today for "next x"
                const weekday_k = due_date.substr(2).toLowerCase();
                if (weekday_k === "0") {
                    new_date = "";
                } else {
                    const weekday_num_k = dayOfWeek_k[weekday_k];
                    while (d.getDay() !== weekday_num_k) {
                        d.setDate(d.getDate() + 1);
                    }
                    new_date = dom_date_format(d); // d.toString(dom_date_format_k);
                }
            } else {
                g2t_log(
                    'due_Shortcuts:change: Unknown due date shortcut: "' +
                        due_date +
                        '"'
                );
            }

            if (due_time.substr(2, 1) === "+") {
                d.setTime(d.getTime() + parseInt(due_time.substr(3)), 10);
                new_time = dom_time_format(d); // d.toString(dom_time_format_k);
            } else if (due_time.substr(2, 1) === "=") {
                if (due_time.substr(3) === "0") {
                    new_time = "";
                } else {
                    const am_k = due_time.substr(0, 1).toLowerCase() === "a";
                    const hhmm_k = due_time.substr(3).split(":");
                    var hours = parseInt(hhmm_k[0], 10);
                    // http://stackoverflow.com/questions/15083548/convert-12-hour-hhmm-am-pm-to-24-hour-hhmm:
                    if (hours === 12) {
                        hours = 0;
                    }
                    if (!am_k) {
                        hours += 12;
                    }
                    new_time =
                        ("0" + hours.toString()).substr(-2) +
                        ":" +
                        ("0" + (hhmm_k[1] || 0).toString()).substr(-2);
                }
            } else {
                g2t_log(
                    'due_Shortcuts:change: Unknown due time shortcut: "' +
                        due_time +
                        '"'
                );
            }

            $("#g2tDue_Date", this.$popup).val(new_date || "");
            $("#g2tDue_Time", this.$popup).val(new_time || "");

            if (self.comboBox) {
                self.comboBox("updateValue");
            }

            if (due_date === "d=0") {
                // Reset to hidden item if we're first "--" item (allows us to select "--" to clear any time):
                $(this).val("none");
            }
            self.validateData();
        });

    $("#g2tTitle", this.$popup)
        .off("change")
        .on("change", () => {
            self.validateData();
        });

    $("#g2tDesc", this.$popup)
        .off("change")
        .on("change", () => {
            self.validateData();
        });

    $("#chkMarkdown, #chkBackLink, #chkCC", this.$popup)
        .off("change")
        .on("change", () => {
            self.updateBody();
        });

    $("#addToTrello", this.$popup)
        .off("click")
        .on("click", (event) => {
            if (self.parent.modKey(event)) {
                self.displayAPIFailedForm();
            } else {
                self.submit();
            }
        });

    $("#g2tLabelsHeader", this.$popup)
        .off("click")
        .on("click", (event) => {
            if (self.parent.modKey(event)) {
                self.clearLabels();
            }
        });

    $("#g2tMembersHeader", this.$popup)
        .off("click")
        .on("click", (event) => {
            if (self.parent.modKey(event)) {
                self.clearMembers();
            }
        });

    $("#g2tAttachHeader", this.$popup)
        .off("click")
        .on("click", (event) => {
            if (self.parent.modKey(event)) {
                self.toggleCheckboxes("g2tAttachments");
            }
        });

    $("#g2tImagesHeader", this.$popup)
        .off("click")
        .on("click", (event) => {
            if (self.parent.modKey(event)) {
                self.toggleCheckboxes("g2tImages");
            }
        });

    /* NOTE (Ace, 2021-02-09: Uncomment if you want to enable/disable -> Trello via attach/images:
    $("#g2tAttachments", this.$popup)
        .off("change")
        .on("change", () => {
            self.validateData();
        });

    $("#g2tImages", this.$popup)
        .off("change")
        .on("change", () => {
            self.validateData();
        });
    */
};

Gmail2Trello.PopupView.prototype.submit = function () {
    var self = this;

    if (self.validateData()) {
        //$('#addToTrello', this.$popup).attr('disabled', 'disabled');
        self.$popupContent.hide();
        self.showMessage(self, "Submitting to Trello...");
        self.event.fire("onSubmit");
    }
};

Gmail2Trello.PopupView.prototype.showPopup = function () {
    var self = this;

    if (self.$g2tButton && self.$popup) {
        $(document)
            .on("keydown" + self.EVENT_LISTENER, function keyboardTrap(event) {
                const visible_k = self.popupVisible(),
                    periodASCII_k = 46,
                    periodNumPad_k = 110,
                    periodKeyCode_k = 190,
                    isEscape_k = event.which === $.ui.keyCode.ESCAPE,
                    isEnter_k = event.which === $.ui.keyCode.ENTER,
                    isPeriodASCII_k = event.which === periodASCII_k,
                    isPeriodNumPad_k = event.which === periodNumPad_k,
                    isPeriodKeyCode_k = event.which === periodKeyCode_k,
                    isPeriod_k =
                        isPeriodASCII_k ||
                        isPeriodNumPad_k ||
                        isPeriodKeyCode_k,
                    isCtrlCmd_k = event.ctrlKey || event.metaKey,
                    isCtrlCmdPeriod_k = isCtrlCmd_k && isPeriod_k,
                    isCtrlCmdEnter_k = isCtrlCmd_k && isEnter_k;

                if (visible_k) {
                    if (isEscape_k || isCtrlCmdPeriod_k) {
                        self.hidePopup();
                    } else if (isCtrlCmdEnter_k) {
                        self.submit();
                    }
                    // To stop propagation: event.stopPropagation();
                }
            })
            .on("mouseup" + self.EVENT_LISTENER, function click(event) {
                // Click isn't always propagated on Mailbox bar, so using mouseup instead.
                /* Added additional check for .ui-autocomplete to prevent the popup from  closing
                when clicked on a type-in select. KS*/
                if (
                    $(event.target).closest("#g2tButton").length == 0 &&
                    $(event.target).closest("#g2tPopup").length == 0 &&
                    self.mouseDownTracker.hasOwnProperty(event.target) &&
                    self.mouseDownTracker[event.target] === 1 &&
                    $(event.target).closest(".ui-autocomplete").length == 0
                ) {
                    self.mouseDownTracker[event.target] = 0;
                    self.hidePopup();
                }
            })
            .on("mousedown" + self.EVENT_LISTENER, function click(event) {
                // Click isn't always propagated on Mailbox bar, so using mouseup instead
                if (
                    $(event.target).closest("#g2tButton").length == 0 &&
                    $(event.target).closest("#g2tPopup").length == 0
                ) {
                    self.mouseDownTracker[event.target] = 1;
                }
            })
            .on("focusin" + self.EVENT_LISTENER, function focus(event) {
                if (
                    $(event.target).closest("#g2tButton").length == 0 &&
                    $(event.target).closest("#g2tPopup").length == 0
                ) {
                    self.hidePopup();
                }
            });

        if (self.posDirty) {
            self.centerPopup();
        }
        // resetting the max height on load.
        $("#g2tPopup").css("max-height", "564px");
        self.mouseDownTracker = {};

        self.$popup.show();
        self.validateData();

        self.event.fire("onPopupVisible");
    }
};
Gmail2Trello.PopupView.prototype.toggleActiveMouseDown = function (elm) {
    var activeDiv = elm;
    if (!$(activeDiv).hasClass("active-mouseDown")) {
        $(activeDiv).addClass("active-mouseDown");
    } else {
        $(activeDiv).removeClass("active-mouseDown");
    }
};
Gmail2Trello.PopupView.prototype.hidePopup = function () {
    var self = this;

    if (self.$g2tButton && self.$popup) {
        $(document).off(self.EVENT_LISTENER); // Turns off everything in namespace
        self.$popup.hide();
    }
};

Gmail2Trello.PopupView.prototype.popupVisible = function () {
    var self = this;
    var visible = false;
    if (
        self.$g2tButton &&
        self.$popup &&
        self.$popup.css("display") === "block"
    ) {
        visible = true;
    }

    return visible;
};

Gmail2Trello.PopupView.prototype.getManifestVersion = function () {
    if (typeof chrome.runtime.getManifest === "function") {
        const manifest_k = chrome.runtime.getManifest();
        if (manifest_k.hasOwnProperty("version")) {
            return manifest_k.version;
        }
    }
    return "0";
};

Gmail2Trello.PopupView.prototype.periodicChecks = function () {
    let self = this;
    const version_storage_k = self.VERSION_STORAGE;
    const version_new = self.getManifestVersion();

    if (version_new > "0") {
        chrome.storage.sync.get(version_storage_k, function (response) {
            const version_old =
                response && response.hasOwnProperty(version_storage_k)
                    ? response[version_storage_k]
                    : "0";
            if (version_old > "0") {
                if (version_old !== version_new) {
                    $.get(
                        chrome.runtime.getURL("views/versionUpdate.html"),
                        function (data) {
                            var dict = {
                                version_old,
                                version_new,
                            };
                            data = self.parent.replacer(data, dict);
                            self.showMessage(self, data);
                        }
                    );
                }
            } else {
                self.forceSetVersion();
            }
        });
    }
};

Gmail2Trello.PopupView.prototype.forceSetVersion = function () {
    let self = this;
    const version_storage_k = self.VERSION_STORAGE;
    const version_new = self.getManifestVersion();
    const dict_k = {
        [version_storage_k]: version_new,
    };
    chrome.storage.sync.set(dict_k);
};

Gmail2Trello.PopupView.prototype.showSignOutOptions = function (data) {
    var self = this;

    $.get(chrome.runtime.getURL("views/signOut.html"), function (data_in) {
        self.showMessage(self, data_in);
    });
};

Gmail2Trello.PopupView.prototype.bindData = function (data) {
    var self = this;
    $(".header a").each(() => {
        $(document).on("keyup", $(this), (evt) => {
            if (evt.which == 13 || evt.which == 32) {
                $(evt.target).trigger("click");
            }
        });
    });
    $("#g2tSignOutButton", self.$popup).click(function () {
        self.showSignOutOptions();
    });

    /*
    $("#g2tSubscribe", self.$popup).click(function () {
        $.get(chrome.runtime.getURL("views/subscribe.html"), function (
            data_in
        ) {
            self.showMessage(self, data_in);
            google.payments.inapp.getSkuDetails({
                // getSkuDetails({
                parameters: { env: "prod" },
                sku: "gmail_to_trello_yearly_subscription_29_99",
                success: function (response) {
                    // onLicenseUpdate
                },
                failure: function (response) {
                    // onLicenseUpdateFail
                },
            });
        });
    });
    */

    chrome.storage.sync.get("dueShortcuts", function (response) {
        // Borrowed from options file until this gets persisted everywhere:
        const dueShortcuts_k = JSON.stringify({
            today: {
                am: "d+0 am=9:00",
                noon: "d+0 pm=12:00",
                pm: "d+0 pm=3:00",
                end: "d+0 pm=6:00",
                eve: "d+0 pm=11:00",
            },
            tomorrow: {
                am: "d+1 am=9:00",
                noon: "d+1 pm=12:00",
                pm: "d+1 pm=3:00",
                end: "d+1 pm=6:00",
                eve: "d+1 pm=11:00",
            },
            "next monday": {
                am: "d=monday am=9:00",
                noon: "d=monday pm=12:00",
                pm: "d=monday pm=3:00",
                end: "d=monday pm=6:00",
                eve: "d=monday pm=11:00",
            },
            "next friday": {
                am: "d=friday am=9:00",
                noon: "d=friday pm=12:00",
                pm: "d=friday pm=3:00",
                end: "d=friday pm=6:00",
                eve: "d=friday pm=11:00",
            },
        });

        var due = JSON.parse(response.dueShortcuts || dueShortcuts_k);

        var $g2t = $("#g2tDue_Shortcuts", self.$popup);
        $g2t.html(""); // Clear it.

        var opt =
            '<option value="none" selected disabled hidden>-</option>' +
            '<option value="d=0 am=0">--</option>';

        $.each(due, function (key, value) {
            if (typeof value === "object") {
                opt += '<optgroup label="' + key + '">';
                $.each(value, function (key1, value1) {
                    opt +=
                        '<option value="' + value1 + '">' + key1 + "</option>";
                });
                opt += "</optgroup>";
            } else {
                opt += '<option value="' + value + '">' + key + "</option>";
            }
        });

        if (opt) {
            $g2t.append($(opt));
        }
    });

    if (!data) {
        g2t_log("bindData shouldn't continue without data!");
        return;
    }

    const settings_existing_k = self.parent.deep_link(self, [
        "data",
        "settings",
    ]);
    const settings_existing_boardId_valid_k = self.parent.validHash(
        settings_existing_k,
        ["boardId"]
    );

    const settings_incoming_k = self.parent.deep_link(data, ["settings"]);
    const settings_incoming_boardId_valid_k = self.parent.validHash(
        settings_incoming_k,
        ["boardId"]
    );

    self.data = data;

    if (settings_incoming_k && settings_incoming_boardId_valid_k) {
        // leave settings that came in, they look valid
    } else if (settings_existing_k && settings_existing_boardId_valid_k) {
        data.settings = settings_existing_k;
    }

    // bind trello data
    const me = self.parent.deep_link(data, ["trello", "user"]); // First member is always this user
    // self.fullName = me.fullName; // Move a copy here

    const avatarUrl = me.avatarUrl || "";
    const avatarSrc = self.parent.model.makeAvatarUrl({ avatarUrl });
    let avatarText = "";

    if (!avatarSrc) {
        var initials = "?";
        if (me.initials && me.initials.length > 0) {
            initials = me.initials;
        } else if (me.fullName && me.fullName.length > 1) {
            var matched = me.fullName.match(/^(\w).*?[\s\\W]+(\w)\w*$/);
            if (matched && matched.length > 1) {
                initials = matched[1] + matched[2]; // 0 is whole string
            }
        } else if (me.username && me.username.length > 0) {
            initials = me.username.slice(0, 1);
        }

        avatarText = initials.toUpperCase();
        $("#g2tAvatarImgOrText", this.$popup).text(avatarText);
    } else {
        $("#g2tAvatarImgOrText", this.$popup).html(
            '<img width="30" height="30" alt="' +
                me.username +
                '" src="' +
                avatarSrc +
                '">'
        );
    }

    $("#g2tAvatarUrl", this.$popup).attr("href", me.url);

    $("#g2tUsername", this.$popup)
        .attr("href", me.url)
        .text(me.username || "?");

    if (data.settings.hasOwnProperty("useBackLink")) {
        $("#chkBackLink", this.$popup).prop(
            "checked",
            data.settings.useBackLink
        );
    }

    if (data.settings.hasOwnProperty("addCC")) {
        $("#chkCC", this.$popup).prop("checked", data.settings.addCC);
    }

    $(document).on("keyup", ".g2t-checkbox", (evt) => {
        if (evt.which == 13 || evt.which == 32) {
            $(evt.target).trigger("click");
        }
    });
    $(document).on("keydown", ".g2t-checkbox", (evt) => {
        if (evt.which == 13 || evt.which == 32) {
            $(evt.target).trigger("mousedown");
        }
    });

    if (data.settings.hasOwnProperty("markdown")) {
        $("#chkMarkdown", this.$popup).prop("checked", data.settings.markdown);
    }

    if (data.settings.hasOwnProperty("due_Date")) {
        $("#g2tDue_Date", this.$popup).val(data.settings.due_Date);
    }

    if (data.settings.hasOwnProperty("due_Time")) {
        $("#g2tDue_Time", this.$popup).val(data.settings.due_Time);
    }

    // Attach reportError function to report id if in text:
    $("#report", self.$popup).click(function () {
        self.reset();

        const lastError_k =
            (self.lastError || "") + (self.lastError ? "\n" : "");

        const dl_k = self.parent.deep_link; // Pointer to function for expedience
        const data_k = dl_k(self, ["data"]);
        const newCard_k = dl_k(data_k, ["newCard"]);
        let newCard = $.extend({}, newCard_k);
        //// delete newCard.title;
        delete newCard.description;
        const user_k = dl_k(data_k, ["trello", "user"]);
        const username_k = dl_k(user_k, ["username"]);
        const fullname_k = dl_k(user_k, ["fullName"]);
        const date_k = new Date().toISOString().substr(0, 10);
        self.updateBoards("52e1397addf85d4751f99319"); // GtT board
        $("#g2tDesc", self.$popup).val(
            lastError_k + JSON.stringify(newCard) + "\n" + g2t_log()
        );
        $("#g2tTitle", self.$popup).val(
            "Error report card: " +
                [fullname_k, username_k].join(" @") +
                " " +
                date_k
        );
        self.validateData();
    });

    self.$popupMessage.hide();
    self.$popupContent.show();

    self.updateBoards();

    // Setting up comboboxes after loading data.
    self.comboBox();
};

Gmail2Trello.PopupView.prototype.bindGmailData = function (data = {}) {
    let self = this;

    if ($.isEmptyObject(data)) {
        return;
    }

    self.updateBody(data);

    $("#g2tTitle", self.$popup).val(data.subject);

    const mime_html = function (tag, isImage) {
        var html = "";
        var img = "";
        var img_big = "";
        const domTag_k =
            "#g2t" + tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
        var $domTag = $(domTag_k, self.$popup);

        const domTagContainer = domTag_k + "Container";
        var $domTagContainer = $(domTagContainer, self.$popup);
        $domTagContainer.css(
            "display",
            data[tag].length > 0 ? "block" : "none"
        );

        if (isImage && isImage === true) {
            img =
                '<div class="img-container"><img src="%url%" alt="%name%" /></div> '; // See style.css for #g2tImage img style REMOVED: height="32" width="32"
        }

        var x = 0;
        $.each(data[tag], function (iter, item) {
            var dict = {
                url: item.url,
                name: item.name,
                mimeType: item.mimeType,
                img,
                id: item.name + ":" + x,
            };

            if (tag == "attachments") {
                html += self.parent.replacer(
                    '<div class="imgOrAttach textOnlyPopup" title="%name%"><input type="checkbox" id="%id%" class="g2t-checkbox" mimeType="%mimeType%" name="%name%" url="%url%" checked /><label for="%id%">%name%</label></div>',
                    dict
                );
            } else if (tag == "images") {
                html += self.parent.replacer(
                    '<div class="imgOrAttach"><input type="checkbox" id="%id%" mimeType="%mimeType%" class="g2t-checkbox" name="%name%" url="%url%" /><label for="%id%" title="%name%"> %img% </label></div>',
                    dict
                );
            }
            x++;
        });

        $domTag.html(html);

        if (isImage && isImage === true) {
            $("img", $domTag).each(function () {
                var $img = $(this);
                $img.on("error", function () {
                    $img.attr(
                        "src",
                        chrome.runtime.getURL(
                            "images/doc-question-mark-512.png"
                        )
                    );
                }).tooltip({
                    track: true,
                    content: function () {
                        var dict = {
                            src: $img.attr("src"),
                            alt: $img.attr("alt"),
                        };
                        return self.parent.replacer(
                            '<img src="%src%">%alt%',
                            dict
                        );
                    },
                });
            });
            $(".textOnlyPopup").tooltip({
                track: true,
            });
        }
    };

    mime_html("attachments");
    mime_html("images", true /* isImage */);

    const emailId = data.emailId || 0;
    const mapAvailable_k = self.parent.model.emailBoardListCardMapLookup({
        emailId,
    });

    if (
        self.parent.validHash(mapAvailable_k, ["boardId", "listId", "cardId"])
    ) {
        // If we're restoring we must be adding to an existing card:
        $("#g2tPosition", self.$popup).val("to");

        self.updateBoards(mapAvailable_k.boardId); // Causes a cascade of updates if it's changed

        // We have a small pending queue for updates to grab these changes and show them, if possible:
        const listId = mapAvailable_k.listId;
        const cardId = mapAvailable_k.cardId;
        self.updatesPending.push({ listId }); // instead of: self.updateLists(listId);
        self.updatesPending.push({ cardId }); // instead of: self.updateCards(cardId);
    }

    this.dataDirty = false;
    self.validateData();
};

Gmail2Trello.PopupView.prototype.showMessage = function (parent, text) {
    let self = this;
    self.$popupMessage.html(text);

    // Attach hideMessage function to hideMsg class if in text:
    $(".hideMsg", self.$popupMessage).click(function () {
        parent.hideMessage();
    });

    $(":button", self.$popupMessage).click(function () {
        let $status = $("span#" + this.id, self.$popupMessage) || "";
        switch (this.id) {
            case "signout":
                $status.html("Done");
                self.event.fire("onRequestDeauthorizeTrello");
                break;
            case "reload":
                self.forceSetVersion(); // Sets value for version if needing update
                $status.html("Reloading");
                window.location.reload(true);
                break;
            case "clearCacheNow":
                $status.html("Clearing");
                var hash = {};
                hash[self.CLEAR_EXT_BROWSING_DATA] = true;
                chrome.runtime.sendMessage(hash, function () {
                    $status.html("Done");
                    setTimeout(function () {
                        $status.html("&nbsp;");
                    }, 2500);
                });
                break;
            case "showsignout":
                self.showSignOutOptions();
            default:
                g2t_log('showMessage: ERROR unhandled case "' + this.id + '"');
        }
        if ($status.length > 0) {
            setTimeout(function () {
                $status.html("&nbsp;");
            }, 2500);
        }
    });

    self.$popupMessage.show();
};

Gmail2Trello.PopupView.prototype.hideMessage = function () {
    if (this.$popupContent.is(":hidden")) {
        // Rest of box is hidden so close it all:
        this.$popup.hide(); // Parent is popup, so hide the whole thing
    } else {
        this.$popupMessage.hide();
    }
};

Gmail2Trello.PopupView.prototype.clearBoard = function () {
    var $g2t = $("#g2tBoard", this.$popup);
    $g2t.html(""); // Clear it.

    $g2t.append($('<option value="">Select a board....</option>'));

    $g2t.change();
};

Gmail2Trello.PopupView.prototype.updateBoards = function (tempId = 0) {
    var self = this;

    const array_k = self.parent.deep_link(self, ["data", "trello", "boards"]);

    if (!array_k) {
        return;
    }

    const restoreId_k =
        tempId ||
        self.parent.deep_link(self, ["data", "settings", "boardId"]) ||
        0;

    let newArray = {};

    $.each(array_k, function (iter, item) {
        const org_k =
            item.hasOwnProperty("organization") &&
            item.organization.hasOwnProperty("displayName")
                ? "!" + item.organization.displayName + ": "
                : "~";
        const display_k = org_k + item.name; // Ignore first char, it's used just for sorting
        newArray[display_k.toLowerCase()] = {
            id: item.id,
            display: display_k,
        };
    });

    var $g2t = $("#g2tBoard", this.$popup);
    $g2t.html(""); // Clear it.

    $g2t.append($('<option value="">Select a board....</option>'));

    $.each(Object.keys(newArray).sort(), function (iter, item) {
        const id_k = newArray[item].id;
        const display_k = newArray[item].display.substring(1); // Ignore first char, it's used just for sorting
        const selected_k = id_k == restoreId_k;
        $g2t.append(
            $("<option>")
                .attr("value", id_k)
                .prop("selected", selected_k)
                .append(display_k)
        );
    });
    $g2t.change();
};

Gmail2Trello.PopupView.prototype.updateLists = function (tempId = 0) {
    var self = this;
    const array_k = self.parent.deep_link(self, ["data", "trello", "lists"]);

    if (!array_k) {
        return;
    }

    const settings_k = self.parent.deep_link(self, ["data", "settings"]);

    const boardId_k = $("#g2tBoard", this.$popup).val();

    const prev_item_k =
        settings_k.hasOwnProperty("boardId") &&
        settings_k.boardId == boardId_k &&
        settings_k.hasOwnProperty("listId")
            ? settings_k.listId
            : 0;

    const first_item_k = array_k.length ? array_k[0].id : 0; // Default to first item

    const updatePending_k =
        self.updatesPending.length &&
        self.updatesPending[0].hasOwnProperty("listId")
            ? self.updatesPending.shift().listId
            : 0;

    const restoreId_k =
        updatePending_k || tempId || prev_item_k || first_item_k || 0;

    var $g2t = $("#g2tList", this.$popup);
    $g2t.html("");

    $.each(array_k, function (iter, item) {
        const id_k = item.id;
        const display_k = item.name;
        const selected_k = id_k == restoreId_k;
        $g2t.append(
            $("<option>")
                .attr("value", id_k)
                .prop("selected", selected_k)
                .append(display_k)
        );
    });

    $g2t.change();
};

Gmail2Trello.PopupView.prototype.updateCards = function (tempId = 0) {
    var self = this;

    const new_k = '<option value="-1">(new card at top)</option>';

    const array_k = self.parent.deep_link(self, ["data", "trello", "cards"]);
    // var cards = this.data.trello.cards;

    if (!array_k) {
        return;
    }

    const settings_k = self.parent.deep_link(self, ["data", "settings"]);

    const listId_k = $("#g2tList", this.$popup).val();

    const prev_item_k =
        settings_k.hasOwnProperty("listId") &&
        settings_k.listId == listId_k &&
        settings_k.hasOwnProperty("cardId")
            ? settings_k.cardId
            : 0;

    const first_item_k = array_k.length ? array_k[0].id : 0; // Default to first item

    const updatePending_k =
        self.updatesPending.length &&
        self.updatesPending[0].hasOwnProperty("cardId")
            ? self.updatesPending.shift().cardId
            : 0;

    const restoreId_k =
        updatePending_k || tempId || prev_item_k || first_item_k || 0;

    var $g2t = $("#g2tCard", this.$popup);
    $g2t.html(new_k);

    $.each(array_k, function (iter, item) {
        const id_k = item.id;
        const display_k = self.parent.truncate(item.name, 80, "...");
        const selected_k = id_k == restoreId_k;
        $g2t.append(
            $("<option>")
                .attr("value", id_k)
                .prop("pos", item.pos)
                .prop("members", item.idMembers)
                .prop("labels", item.idLabels)
                .prop("selected", selected_k)
                .append(display_k)
        );
    });

    $g2t.change();
};

// Select/de-select attachments and images based on first button's state:
Gmail2Trello.PopupView.prototype.toggleCheckboxes = function (tag) {
    var $jTags = $("#" + tag + ' input[type="checkbox"]', self.$popup);
    let $jTag1 = $jTags.first();
    const checked_k = $jTag1.prop("checked") || false;
    $jTags.prop("checked", !checked_k);
    this.validateData();
};

Gmail2Trello.PopupView.prototype.clearLabels = function () {
    this.data.settings.labelsId = "";
    this.updateLabels();
    this.validateData();
};

Gmail2Trello.PopupView.prototype.updateLabels = function () {
    var self = this;
    var labels = this.data.trello.labels;
    var $g2t = $("#g2tLabels", this.$popup);
    $g2t.html(""); // Clear out

    for (var i = 0; i < labels.length; i++) {
        var item = labels[i];
        if (item.name && item.name.length > 0) {
            var $color = $("<div id='g2t_temp'>").css("color", item.color);
            var bkColor = self.parent.luminance($color.css("color")); // If you'd like to determine whether to make the background light or dark
            $g2t.append(
                $("<button>")
                    .attr("trelloId-label", item.id)
                    .css("border-color", item.color)
                    // .css("background-color", bkColor)
                    .append(item.name)
                    .on("mousedown mouseup", (evt) => {
                        var elm = $(evt.currentTarget);
                        self.toggleActiveMouseDown(elm);
                    })
                    .on("keypress", (evt) => {
                        const trigger_k =
                            evt.which == 13
                                ? "mousedown"
                                : evt.which == 32
                                ? "click"
                                : "";
                        if (trigger_k) {
                            $(evt.target).trigger(trigger_k);
                        }
                        /* var elm = $(evt.currentTarget);
                            self.toggleActiveMouseDown(elm); */
                    })
            );
        }
    }

    $("#g2tLabelsMsg", this.$popup).hide();

    var control = new MenuControl({
        selectors: "#g2tLabels button",
        nonexclusive: true,
    });
    control.event.addListener("onMenuClick", function (e, params) {
        self.validateData();
    });

    var settings = this.data.settings;
    var boardId = $("#g2tBoard", this.$popup).val();
    if (settings.boardId && settings.boardId === boardId && settings.labelsId) {
        var settingId = settings.labelsId;
        for (var i = 0; i < labels.length; i++) {
            var item = labels[i];
            if (settingId.indexOf(item.id) !== -1) {
                $(
                    '#g2tLabels button[trelloId-label="' + item.id + '"]',
                    self.$popup
                ).click();
            }
        }
    } else {
        settings.labelsId = ""; // Labels do not have to be set, so no default.
    }

    $g2t.show();
};

Gmail2Trello.PopupView.prototype.clearMembers = function () {
    this.data.settings.membersId = "";
    this.updateMembers();
    this.validateData();
};

Gmail2Trello.PopupView.prototype.updateMembers = function () {
    var self = this;
    var members = this.data.trello.members;
    var $g2t = $("#g2tMembers", this.$popup);
    $g2t.html(""); // Clear out

    for (var i = 0; i < members.length; i++) {
        var item = members[i];
        if (item && item.id) {
            var txt = item.initials || item.username || "?";
            var avatar =
                self.parent.model.makeAvatarUrl({
                    avatarUrl: item.avatarUrl || "",
                }) ||
                chrome.runtime.getURL(
                    "images/avatar_generic_profile_gry_30x30.png"
                ); // Default generic profile
            const size_k = 20;
            $g2t.append(
                $("<button>")
                    .attr("trelloId-member", item.id)
                    .attr("title", item.fullName + " @" + item.username || "?")
                    .attr("class", "g2t-holder-button")
                    .append(
                        $("<img>")
                            .attr("src", avatar)
                            .attr("width", size_k)
                            .attr("height", size_k)
                    )
                    .append(" " + txt)
                    .on("mousedown mouseup", (evt) => {
                        var elm = $(evt.currentTarget);
                        self.toggleActiveMouseDown(elm);
                    })
                    // NOTE (Ace, 2021-02-08): crlf uses mousedown, spacebar uses click:
                    .on("keypress", (evt) => {
                        const trigger_k =
                            evt.which == 13
                                ? "mousedown"
                                : evt.which == 32
                                ? "click"
                                : "";
                        if (trigger_k) {
                            $(evt.target).trigger(trigger_k);
                        }
                        /* var elm = $(evt.currentTarget);
                            self.toggleActiveMouseDown(elm); */
                    })
            );
        }
    }

    $("#g2tMembersMsg", this.$popup).hide();

    var control = new MenuControl({
        selectors: "#g2tMembers button",
        nonexclusive: true,
    });
    control.event.addListener("onMenuClick", function (e, params) {
        self.validateData();
    });

    var settings = this.data.settings;
    if (settings.membersId && settings.membersId.length > 0) {
        var settingId = settings.membersId;
        for (var i = 0; i < members.length; i++) {
            var item = members[i];
            if (settingId.indexOf(item.id) !== -1) {
                $(
                    '#g2tMembers button[trelloId-member="' + item.id + '"]',
                    self.$popup
                ).click();
            }
        }
    } else {
        settings.membersId = "";
    }

    $g2t.show();
};

Gmail2Trello.PopupView.prototype.validateData = function () {
    var self = this;
    var newCard = {};
    var boardId = $("#g2tBoard", self.$popup).val();
    var listId = $("#g2tList", self.$popup).val();
    var position = $("#g2tPosition", self.$popup).val();
    var $card = $("#g2tCard", self.$popup).find(":selected").first();
    var cardId = $card.val() || "";
    var cardPos = $card.prop("pos") || "";
    var cardMembers = $card.prop("members") || "";
    var cardLabels = $card.prop("labels") || "";
    var due_Date = $("#g2tDue_Date", self.$popup).val();
    var due_Time = $("#g2tDue_Time", self.$popup).val();
    var title = $("#g2tTitle", self.$popup).val();
    var description = $("#g2tDesc", self.$popup).val();
    var emailId = $("#g2tDesc", self.$popup).attr("gmail_emailId") || 0;
    var useBackLink = $("#chkBackLink", self.$popup).is(":checked");
    var addCC = $("#chkCC", self.$popup).is(":checked");
    var markdown = $("#chkMarkdown", self.$popup).is(":checked");
    var timeStamp = $(".gH .gK .g3:first", self.$visibleMail).attr("title");
    var popupWidth = self.$popup.css("width");
    var labelsId = $("#g2tLabels button.active", self.$popup)
        .map(function (iter, item) {
            var val = $(item).attr("trelloId-label");
            return val;
        })
        .get()
        .join();
    var labelsCount = $("#g2tLabels button", self.$popup).length;

    if (
        !labelsCount &&
        labelsId.length < 1 &&
        self.data &&
        self.data.settings &&
        self.data.settings.labelsId
    ) {
        labelsId = self.data.settings.labelsId; // We're not yet showing labels so override labelsId with settings
    }

    var membersId = $("#g2tMembers button.active", self.$popup)
        .map(function (iter, item) {
            var val = $(item).attr("trelloId-member");
            return val;
        })
        .get()
        .join();
    var membersCount = $("#g2tMembers button", self.$popup).length;

    if (
        !membersCount &&
        membersId.length < 1 &&
        self.data &&
        self.data.settings &&
        self.data.settings.membersId
    ) {
        membersId = self.data.settings.membersId; // We're not yet showing members so override membersId with settings
    }

    let mime_array = function (tag) {
        let $jTags = $("#" + tag + ' input[type="checkbox"]', self.$popup),
            array = [],
            array1 = {},
            checked_total = 0;

        $.each($jTags, function () {
            const checked = $(this).is(":checked");
            if (checked) {
                checked_total++;
            }
            array1 = {
                url: $(this).attr("url"),
                name: $(this).attr("name"),
                mimeType: $(this).attr("mimeType"),
                checked,
            };
            array.push(array1);
        });

        return { array, checked_total };
    };

    const attach_k = mime_array("g2tAttachments");
    let attachments = attach_k.array,
        attachments_checked = attach_k.checked_total;

    const images_k = mime_array("g2tImages");
    let images = images_k.array,
        images_checked = images_k.checked_total;

    const validateStatus =
        boardId &&
        listId &&
        title /* && (description || attachments_checked > 0 || images_checked > 0) // Not sure we need to require these */
            ? true
            : false; // Labels are not required
    // g2t_log('validateData: board:' + boardId + ' list:' + listId + ' title:' + title + ' desc:' + ((description || '') . length));

    if (validateStatus) {
        newCard = {
            emailId,
            boardId,
            listId,
            cardId,
            cardPos,
            cardMembers,
            cardLabels,
            labelsId,
            membersId,
            due_Date,
            due_Time,
            title,
            description,
            attachments,
            images,
            useBackLink,
            addCC,
            markdown,
            popupWidth,
            position,
            timeStamp,
        };
        self.data.newCard = newCard;
        $.extend(self.data.settings, newCard);

        self.parent.saveSettings();
    }
    $("#addToTrello", self.$popup).attr(
        "disabled",
        validateStatus ? false : "disabled"
    );

    return validateStatus;
};

Gmail2Trello.PopupView.prototype.reset = function () {
    this.$popupMessage.hide();
    this.$popupContent.show();
};

Gmail2Trello.PopupView.prototype.displaySubmitCompleteForm = function () {
    var self = this;
    var data = this.data.newCard;
    // g2t_log('displaySubmitCompleteForm: ' + JSON.stringify(this.data)); // This fails with a circular reference

    // NB: this is a terrible hack. The existing showMessage displays HTML by directly substituting text strings.
    // This is very dangerous (very succeptible to XSS attacks) and generally bad practice.  It should be either
    // switched to a templating system, or changed to use jQuery. For now, I've used this to fix
    // vulnerabilities without having to completely rewrite the substitution part of this code.
    // TODO(vijayp): clean this up in the future
    var jQueryToRawHtml = function (jQueryObject) {
        return jQueryObject.prop("outerHTML");
    };
    this.showMessage(
        self,
        '<a class="hideMsg" title="Dismiss message">&times;</a>Trello card updated: ' +
            jQueryToRawHtml(
                $("<a>")
                    .attr("href", data.url)
                    .attr("target", "_blank")
                    .append(data.title)
            )
    );
    this.$popupContent.hide();
};

Gmail2Trello.PopupView.prototype.displayAPIFailedForm = function (response) {
    var self = this;

    var resp = {};
    if (response && response.data) {
        resp = response.data;
    }

    if (this.data && this.data.newCard) {
        resp.title = this.data.newCard.title; // Put a temp copy of this over where we'll get the other data
    }

    const dict_k = {
        title: resp.title || "?",
        status: resp.status || "?",
        statusText: resp.statusText || "?",
        responseText: resp.responseText || JSON.stringify(response),
        method: resp.method || "?",
        keys: resp.keys || "?",
    };

    $.get(chrome.runtime.getURL("views/error.html"), function (data) {
        const lastErrorHtml_k = self.parent.replacer(data, dict_k);
        self.showMessage(self, lastErrorHtml_k);
        self.lastError = JSON.stringify(dict_k);
        self.$popupContent.hide();
        if (resp.status && resp.status == 401) {
            // Invalid token, so deauthorize Trello
            self.event.fire("onRequestDeauthorizeTrello");
        }
    });
};

// End, popupView.js
