---
name: Sync Privacy Policy text to Trello legal card
description: Todo: paste the updated privacy-policy paragraph into the published Trello card so the in-repo policy and the public policy match
type: plan
---

# Sync Privacy Policy to Trello card

## Context

The in-repo privacy policy at [docs/2020-04-20_info_PrivacyPolicy.txt](<../2020-04-20_info_PrivacyPolicy.txt>) was updated on 2026-04-18 to remove a now-false claim that the extension generates usage analytics via Google Analytics. The extension itself no longer embeds Google Analytics (Universal Analytics was sunset 2023-07-01; the UA SDK was removed from the repo on 2026-04-18 and the bundle files moved to [archives/](<../../archives/>)).

The policy has two homes and they are now out of sync:

* [docs/2020-04-20_info_PrivacyPolicy.txt](<../2020-04-20_info_PrivacyPolicy.txt>) -- updated in-repo (current).
* [https://trello.com/c/2e6evx8s/67-privacy-policy](<https://trello.com/c/2e6evx8s/67-privacy-policy>) -- still shows the old text (shortened link: [https://g2t.pub/legal](<https://g2t.pub/legal>)).

## The change to paste into the Trello card

### Paragraph to locate

Heading: `### Software Downloads Are Controlled by Google`

### FROM (current text on the Trello card)

```text
The Chrome Web Store automatically generates anonymatized data regarding downloads of this extension. Once this extension is installed, it connects automatically to the Chrome Web Store to determine if updated versions are available, and generate anonymatized usage analytics using Google Analytics collection. All interactions with the Chrome Web Store, Google, and other third-parties are governed by their privacy policies.
```

### TO (new text, already committed to the repo)

```text
The Chrome Web Store automatically generates anonymized install and update data for this extension. Once installed, Chrome periodically contacts the Chrome Web Store to check for updates, and the Web Store aggregates anonymized install/active-user counts on our behalf. The Extension itself does not send any usage analytics to us or to any third party. All interactions with the Chrome Web Store, Google, and other third parties are governed by their privacy policies.
```

### Also bump the footer

* Old footer: `Updated: 2020-04-21`
* New footer: `Updated: 2026-04-18`

## Checklist

* [ ] Open [the Trello card](<https://trello.com/c/2e6evx8s/67-privacy-policy>).
* [ ] Edit the card description; replace the FROM paragraph with the TO paragraph.
* [ ] Update the `Updated:` date at the bottom of the description from `2020-04-21` to `2026-04-18`.
* [ ] Save.
* [ ] Reload [g2t.pub/legal](<https://g2t.pub/legal>) (which redirects to the card) and spot-check the rendered text.
* [ ] Rename this plan file from `_plan_todo_` to `_plan_done_`.

## Why this matters

The published privacy policy is a legal representation to users about what the extension does. Claiming we collect Google Analytics data when the SDK has been ripped out is the wrong kind of inaccuracy -- it overstates data collection, which is worse than understating it.
