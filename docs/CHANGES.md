=== 3.2.0.001@2026-04-26 ===

* Replace MutationObserver polling with gmail.js event-driven Gmail UI detection
* Restore "add to existing card" feature lost in the v2-to-v3 migration; restore position routing (top vs bottom of list); unify uploader chain
* Add per-category version counters to discard stale Trello API responses on rapid board or list switches
* Add submit guard on the popup form to prevent duplicate cards on double-click
* Add cascade tracker so the popup updates only after all three (lists, labels, members) loads complete for the same board
* Remove the embedded Universal Analytics SDK and the dead telemetry code paths it fed; the extension itself sends no usage analytics
* Add a third-party-notices file documenting bundled libraries
* Migrate to Cucumber as the sole test runner; remove Jest and node:test; suite covers 653 scenarios
* Bump devDependencies: @cucumber/cucumber 12.7.0 to 12.8.2, prettier 3.8.1 to 3.8.3, globals 17.3.0 to 17.5.0, eslint 10.0.0 to 10.0.3, jsdom 27.4.0 to 29.0.0; security bump for flatted

=== 3.1.0.000@2025-01-27 ===

* Major code refactoring: Converted entire codebase to class-based architecture with class_* naming convention
* Simplified namespace from Gmail2Trello to G2T for cleaner code organization
* Enhanced error handling with periodic checks and version tracking throughout extension
* Updated Node.js requirement to v18 and upgraded all dependencies including ESLint and Prettier
* Fixed multiple linter warnings and improved variable declarations with cleaner object destructuring
* Removed problematic submodules and deleted unused Python scripts for better maintenance

=== 3.0.0.001@2025-07-10 ===

* Update for minor security patch for jQuery, reduced dependency
* Cleaned up md format for Trello

=== 2.9.0.002@2023-06-09 ===

* Update Google Analytics ID
* Fix Markdown checkbox not reflecting markdown in description correctly
* Update Trello API key to get rid of "Can't have wildcard" Trello API error
* Start using ?. for data array access
* Update manifest for content_security_policy

=== 2.8.6.006@2021-06-15 ===

* mouseDown for main version getSelectedText works instead of click

=== 2.8.6.004@2021-05-11 ===

* G2T Main button not popping. Stricter adherence to styles required.

=== 2.8.6.004@2021-03-04 ===

* Doesn't respect crlfs in email

=== 2.8.6.003@2021-02-22 ===

* Extra logic to process "me" name (still won't work first time due to when we refresh Trello username on popup first reveal)
* Due date pull-down doesn't populate fields (need to use $(event.target) not $(this))

=== 2.8.6.002@2021-02-22 ===

* Update hover text
* Body in cards not coming over
* Updated selectors and selector logic to reference within context of code

=== 2.8.6.001@2021-02-08 ===

* Make spacebar also highlight/deselect Labels and Assign
* Automatically select attachments, when present (but not Images)
* Allow submitting to Trello with no Body (Title still required)
* Use off("change") trick to keep script from getting called twice

=== 2.8.5.018@2021-01-29 ===

* User reports clicking markdown/Gmail-links/recipients clears body and doesn't return - confirmed, found really good bug, fixed

=== 2.8.5.017@2021-01-04 ===

* Update formatting of backlinks
* Iterate fields instead of setting directly
* Change To: me to Trello ID name

=== 2.8.5.016@2020-12-29 ===

* Return CCs from gmailView via body_raw, body_md
* CCs checkbox respected
* "Recipients" used instead of To/CC

=== 2.8.5.015@2020-12-02 ===

* Collect CCs
* Convert CCs to md

=== 2.8.5.014@2020-11-18 ===

* Use more calculated .ui-autocomplete value
* Fix highlighting of labels with mouseover--typo: g2tLabel ≠ g2tLabels

=== 2.8.5.013@2020-10-25 ===

* Where/List/Card overflow: auto to show scrollbar when long list set .ui-autocomplete max-height to 60% screen

=== 2.8.5.012@2020-10-18 ===

* Gmail changed class for mail body from '.a3s.aXjCH' to '.a3s.aiL'

=== 2.8.5.011@2020-09-04 ===

* Add 33px top margin to the popupMsg so it will not appear over the popup titlebar.

=== 2.8.5.010@2020-09-03 ===

* Fix for buttons highlighting outward instead of inward from @KS-CleverCopter

=== 2.8.5.009@2020-08-12 ===

* Add base64 default image if avatarUrl is missing
* Add avatar_generic_30x30.png if avatarUrl is missing
* Updates to minimizing and resizing from @KS-CleverCopter

=== 2.8.5.008@2020-07-18 ===

* Make due shortcuts reset when picking "--" even when it's selected
* Change manifest to '\*.trello.com' to support api.trello.com, api-gateway.trello.com
* Add '\*.gstatic.com' to manifest for googleusercontent

=== 2.8.5.007@2020-07-15 ===

* @KS-CleverCopter fix for images hover clipping, Where: a few pixels misaligned
* Change "+Trello!" to "-> Trello"
* Notice that Labels and Assign draw off to the right and then snap to the left

=== 2.8.5.006@2020-06-30 ===

* Add icon files
* Remove unused files from main bundle
* Remove dependency on old datejs.com code
* Bump version and notes

=== 2.8.5.005@2020-06-27 ===

* Update description
* Call ForceSetVersion if periodicChecks proves different versions or unset

=== 2.8.5.004@2020-06-27 ===

* Accessibility improvements: tabbing and enter key from @KS-CleverCopter

=== 2.8.5.003@2020-06-18 ===

* More UI cleanup from @KS-CleverCopter
* Fix for bug where on Windows 10, Boards popup appears behind

=== 2.8.5.002@2020-05-25 ===

* Ton of UI work from @KS-CleverCopter
* Change board alphabetization formatting

=== 2.8.5.001@2020-05-24 ===

* First cut at remembering what message was stored with what card
* Move to safer "g2t\_" instead of "g2t:" for variable names stored in hashes
* Reduce log lines circular queue to 100 lines
* Set "remembered" to 100 emails
* First version of restoring settings based on email, had to add ability to cache list updates til list refreshed
* This history available at: https://g2t.pub/changes

=== 2.8.0.013@2020-05-22 ===

* Fix validHash to work correctly - was always taking the req = [] path. This was causing empty data to be sent to Trello, causing a 400 error

=== 2.8.0.012@2020-05-15 ===

* Update icons for correct classes for Gmail with highlighting css

=== 2.8.0.011@2020-05-07 ===

* Use avatarUrl instead of id + '/' + avatarHash in case it moves in the future
* Update http:// to https://
* Remove unused chrome.identity

=== 2.8.0.009@2020-05-03 ===

* Update text-only from "GtT" to "G2T"
* Update these notes references from "GtT" to "G2T"
* More trials for better resizing (failed)
* Replace 403'ing "https://trello-avatars.s3.amazonaws.com/{avatarHash}/30.png" with "https://trello-members.s3.amazonaws.com/{id}/{avatarHash}/30.png"

=== 2.8.0.007@2020-04-21 ===

* Update links from Trello to http://g2t.support
* Update title to "Gmail-2-Trello (was: Gmail-to-Trello)"

=== 2.8.0.006@2020-04-20 ===

* Had to publish as new Extension "Gmail-2-Trello" due to old extension updates being disallowed.
* Change "Arrows" to a pop-up for "Add below:" and "Add to:"
* Try AspectRatio on for more reasonable resize experience [nope, doesn't work for what we'd want]
* Posted in new github repo: http://g2t.pub/github

=== 2.8.0.003@2020-03-04 ===

* Now uses background script for retrieval and upload of all attachments/images/embedded images, should resolve CORS/CORB new higher level of Chrome Security.
* Standardize on selectors for embedded titles
* Reduce scopes of domains in manifest
* Update descriptive text in manifest
* Update to jQuery 3.4.1.slim
* Add option/shift-click to "Attach" or "Images" will select-all/deselect-all based on first checkbox's state
* Remove in-app purchases
* Output jQuery object when body can't be found

=== 2.7.2.32@2020-02-15...2.7.0.0 ===

* Try some changes to grow boxes (unsuccessfully)
* Update file naming upload code to gleen filename from aria-label text
* Gmail UI class names changed again, in gmailView we now use a single viewport: '.aia:first'. It was '.aeJ:first'. We no longer explicitly try to detect splitlayout, which may or may not work. Will need to test with folks.
* Initial error message when retrieving attachment content fails with 0 length. Probably CORS/CORB new Chrome security model, need to retrieve data from background script. Fix in progress but will take a while to refactor uploading code.
* Deeper highlighting for Labels and Assign, use gradient to indicate selected
* Remove trash can from G2T pull down
* Move popup location of G2T pull down to under icon
* Use new === of Trello Client.js
* Make sure UI, Sign-out works (enough) when Trello Authenticate fails.
* Look for old legacy classname m{UNIQUEID} only if other emailId tags aren't present
* Iterate differently
* Use data-thread-id if present
* Get Legacy Gmail Thread ID for backlink on new Gmail
* Find new Gmail views
* Make getManifest === check more robust error-handling-wise
* Fix calculation for pop-up when button position has changed
* New HD toolbar icon & sketch version
* Attachment image previews are now scale-to-fit
* Attachment file and image sections are hidden when there is no attachment
* [dev] Change form markups from dl/dt/dd to regular divs
* Fix bug on the new Gmail that cause toolbar buttons failed to work properly
* Remove overlapping intervals, thanks to Travis Hardman.
* Up debug log
* Silence logging of button positioner [still need to fix]
* Gmails coming up blank content in G2T - Change .adP:first to use more deterministic tag
* Check for ASL or ASF div for Refresh icon.
* Only call detach if more than one button/popup
* Use '0' for unknown === in === check
* More debugging logs for adding button / popup
* Only show === update if previous === > 0
* Remove toolBarHolder
* Debug Multiple Inboxes - more to do
* Circular log wasn't - hogged memory
* inline image now should upload to Trello correctly
* Restrict log from 1000 to 100 lines.
* Call browsingData from background to clear extension data.
* Show message to reload when === changes.
* Fix $button[0] -> $button.first().
* Fix missing views/options.html.
* detectToolbar return true if detected.
* .detach button and popup and then only append one.
* Make sign out an explicit button on the page.
* Fix resize via jQuery UI, needed clearfix at popup level for jQuery UI added elements
* Call pre-init after button disappear
* Semi-final jQuery UI resizing (not quite right for normal state, works okay for list state)
* Show === number in options panel (prep for noticing === change and prompting to reload)
* Remove G-Ni from G2T icon
* Add timer to check every 2 seconds for G2T button showing
* Use gh='mtb' to find toolbar
* Add G-Ni to G2T icon
* Remove :first from G-atb
* Additional debugging code in toolbar and labels code
* Report of G2T button not appearing when Streak and RightInbox, some tweaks to button positioning code to hopefully circumvent problem.
* Add info message to options screen
* Initial cut at button for chrome.browsingData.remove
* Update manifest with 64 and 128 icons
* Icon not showing up in toolbar due to other extension icons in toolbar
* Update g2t_log to have timestamp
* Move email search hyperlinks to top of content
* Parse "29. Mai 2017 um 15:18" correctly
* (Until I have a better idea, have to decode the dateTime by hand and do some month comparisons)
* And then after doing that ton of work and realizing this will be horrific to maintain, I ripped it all out
* Check for 401 more leniently, add target to error
* Lists without organizations were being filtered out! Fixed.
* Change Features/Bugs to 'Help'
* Created 'Report' feature, which will put latest error and last 1000 log items into card to post to G2T Trello board
* 400 invalid id on attachment upload: Use pos === 'at' to indicate path to attach
* Track mouseUp and mouseDown in same external-to-window container
* Make positioning logic more robust for Upload to combat Trello POST pos 404 error
* Click outside window closes window
* Focus outside window closes window
* Error in attachments processing fixed to produce correct filename
* Install keyboard trap to Show Popup, Remove keyboard trap on Hide Popup
* Clean up consts for keyboard trap
* First cut at image with larger tooltip on hover
* Load jQuery UI CSS before our CSS so we can override it
* Add named function g2t_keydown to prevent duplicate listeners
* Bump === to work around Google problem
* Remove Gmail load wait timer now that G2T button is more robust on no-data
* Move keyboard trap to bindEvents
* Dirty centering when no data so popup will move as appropriate
* Fix error with "bottom" should be "below"
* Refactor upload code to pull it all into model work, add model.Uploader class
* Move attach code back into our code since Trello doesn't want it
* Fix error where attachment URL was click link instead of updated card
* Fixed long untruncated image/attachment string
* First cut at having G2T button always show, even when there is no data to populate - this may reduce the "where's my button?" support issues
* Have images bottom grow when you grab the window grow handle in the lower right corner
* Fix bug in creating new card
* Simplify UI for adding to a card vs. adding new card below
* Add to an existing card!
* Had to change UI a little to account for card selection and "where" to put the card

=== 2.6.0.0...2.5.0.1 ===

* Make minimum width bigger for popup
* Create shortcut dropdown for due date
* Create option entry to add more to shortcut dropdown
* Persist previous due date and time
* Attachments and Images now are transferred completely to Trello instead of lodging as links back to Gmail
* Attachments downloaded to memory and uploaded to Trello instead of just providing links
* Support keyboard shortcuts: Alt/Opt+Shift+G is the default to show the popup (once in Gmail and the button is visible)
* While the Popup is showing, hitting ESCAPE or CTRL+. or CMD+. will dismiss the popup.
* CTRL/CMD+ENTER will Add to Trello.
* Change stray bullets to asterisks but not stray hyphens
* Fix member assignment buttons to persist across board changes
* Shift-click "Labels:" or "Members:" to clear
* Fix typos GMail -> Gmail
* Layout changes to accomodate smaller screens
* Can now assign other users
* Your id should always be first in Assign list
* Remove "Assign to me" button
* Move signout and error to chrome extension loaded html files
* Make label and member msg boxes same height as label and member chicklets so things don't "jump" up and down when picking new boards
* Fix pInterest loads with white overlay on top of first 20 pinned items; was conflicting with jQuery UI CSS
* Moved jQuery-ui-css loading to top of popup
* Changed matches to mail.google.com instead of all urls.
* Fix problem of email with no body
* Try to fix parseData to always return a valid data block (even if empty data)
* Update board changed to clear out list/labels when settings boardId is different than boardId
* Gray box around imgs in image list to show "spacer" images
* Use window.location.pathname to provide "/mail/u/0/" or "/mail/u/1/" etc. for different gmail accounts
* Add support to attach images from Gmail
* Fix typo with missing brace for uriForDisplay
* To handle jQuery UI looking to Gmail for UI icons, must replace url("images... with url("chrome-extension://**MSG\_@@extension_id**/images...

=== 2.4.27...2.2.2 ===

* Support img vs text buttons
* Make sure correct ThreadID is used for message
* Better processing of hand-provided bullets to markdown
* Generate thread id for direct link to email
* Take another pass at storing board, list, label and resetting when changed
* Use Gmail's down-facing widget instead of plus sign
* Make window resizable and scrollable
* Separate date and time inputs for due date
* Smaller UI for Add Card button
* Change nomenclature to "Add to Trello" to prep for adding to individual card
* Fix "Name" <name> email pattern
* Make sure to clear out list and labels when no labels
* Restrict labels space to two rows with scroll bar if longer
* Add back steps to clear cache for Trello sign-out
* Add height and width to image tag so it doesn't "jump"
* Adjust centering logic for popup to be more human-friendly (still should move to lower-third resize logic)
* Call Trello.deauthorize on Sign Out request
* Clean up logic of Sign Out to request Reload afterward
* Clean up error display to find error data in response packet
* Clean up 3+ CRLFs in Markdownify
* Make replacements holistic
* Clean up markdownify to add numeric lists and allow <span>-like items inside of <div>-like items.
* Remove href="javascript:void(0)" as a likely cause of Content Security Policy warning
* Change const hash to var hash, causing chrome storage error.
* Truncate description enough to make room for link at end
* Match regex for Markdownify on non-word boundary, do additional pass and make placeholders then replace those so markdown anchors don't get out of hand
* Change top/bottom popup to up-line and down-line arrow icons
* Change default for attachments to unchecked
* Fix bug where popup width wasn't being saved and restored correctly
* Fix avatar initials to be first name + last name initials, or first 2 chars of username, if no avatar URL/pic
* Have reproducable case for settings not being saved; fixed with using chrome sync settings and getting timing right
* Added popup to indicate whether to add card to top or bottom (default) of list
* Try another approach for titlebar of popup to not get duplicate options by setting explicit properties
* Use paragraph marker for markdown 'li' conversion
* Respect () [] for anchor markdown bookends
* Clear out html before appending items, should fix duplicate html elements problem
* Add APIFailure display when initial trello grabs fail out
* Check for avatar URL returned before checking length
* When text is selected, bring that over instead of entire message
* Added Markdown button to turn off for main description text
* Added Attachments
* Changed Lists UI to Drop-down, kept styled UI for Labels
* Made labels multi-selectable
* Added Due Date
* Additional markdown formatting causing too much noise
* Adding Labels
* Movable modal UI centered under Add card, Avatars working
* Cleaned up UI
* Lots of bug fixes
* Some additional markdown formatting in description for from: email.

=== 2.1.5...2.1 ===

* Add Google Analytics
* Fix some XSS bugs. Reduce URL permission. Thanks to Vijay for your Pull Request
* Don't show up closed boards.
* Fix "Add to card" button UI
* Fix some CSS bugs
* Fix broken layout caused by min-width
* Increase z-index
* Add "Options" page
* Fix no-wrap error in new card's link displays after creation
* Remove Organization filter
* Add email address to specify where the card came from
* Is now support an option to assign yourself on creating card
* Is now support Split layout (Preview Panel)
* Big changes: refactoring, bugs fixes, UI/UX improvements
* Instantly update popup's content when user's clicking to another email thread
* Resizable popup
* Better text conversion

=== 2.0.6.2...2.0 ===

* Fix bug: Localization time parsing
* Add "Search email" ability, which means more accessible from other people
* Auto detect (and highlight) the email thread that is most closed to current viewport. Scrolling can make change to current selection
* Fix bug: Boards are not in any organizations doesn't show up.
* Fix bug duplicated buttons
* Fix bug in layout
* Fix bug: can't change subject or description
* Fix missing icons
* Backlink appearance improving
* Improve UX
* Remember previous selections
* Add a "close" popup button
* Add Orgranization list
* Don't display closed boards
* Insert a backlink to Gmail's thread in new card (optional)
* Display a link to new created card
* Refactoring

=== 1.1.1@2013.08.15 ===

* Fix bug: missing button after install
* Fix bug: missing icon in "Add to Trello" button
* Keep line-breaks in email's content
* Auto remove email's signature

This history available at: https://g2t.pub/changes
