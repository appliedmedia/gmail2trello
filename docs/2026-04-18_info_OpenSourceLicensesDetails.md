# Open Source License Details

Tracking file for third-party open-source components bundled into the Gmail-2-Trello Chrome extension. Each entry captures the upstream URL, bundled version, license, copyright holder, and the location of the bundled artifact in this repository.

## gmail.js

* **Upstream:** [KartikTalwar/gmail.js](https://github.com/KartikTalwar/gmail.js)
* **Purpose:** Event-driven Gmail DOM observation library. Replaces our prior hand-rolled `MutationObserver` polling (Wave 1, merged 2026-03-29 in [appliedmedia/gmail2trello#136](https://github.com/appliedmedia/gmail2trello/pull/136)).
* **Bundled version:** 0.8.0 (per the `a.version` string inside the minified file)
* **Bundled artifact:** [chrome_manifest_v3/lib/gmail.min.js](../chrome_manifest_v3/lib/gmail.min.js)
* **License:** MIT License
* **Copyright:** Copyright (c) 2014 Kartik Talwar
* **License source:** [LICENSE.md on master](https://github.com/KartikTalwar/gmail.js/blob/master/LICENSE.md)
* **Attribution requirement:** MIT requires the copyright notice and permission notice be included in all copies or substantial portions of the software. This is satisfied by the Third-Party Software Notices section of [LICENSE.txt](../LICENSE.txt) at the repository root.

## Trello client.js

* **Upstream:** [trello.com/1/client.js](https://trello.com/1/client.js) (Trello's official JavaScript SDK for REST API auth and calls).
* **Purpose:** Authenticates the user against Trello via OAuth-style token flow and provides a thin wrapper over the Trello REST API used by the extension.
* **Bundled version:** Snapshot fetched 2020-07-18, per the header comment in the bundled file: `/* https://trello.com/1/client.js updated acoven@2020-07-18 */`.
* **Bundled artifact:** [chrome_manifest_v3/lib/trello.min.js](../chrome_manifest_v3/lib/trello.min.js)
* **License:** Not an open-source license. Governed by the [Atlassian Developer Terms of Use](https://support.atlassian.com/trello/docs/developer-terms-of-use/) (formerly Trello Developer Terms). Use of `client.js` and the Trello REST API is permitted for apps that integrate with Trello, subject to those terms.
* **Copyright:** (c) Atlassian Pty Ltd. The bundled file itself ships without an inline copyright notice.
* **Attribution requirement:** None under an OSS license (there is none), but the extension must comply with the Atlassian Developer Terms of Use at runtime (user consent, Trello branding, rate limits, etc).

