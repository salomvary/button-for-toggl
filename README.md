# Button for Toggl <!--[![Build Status](https://travis-ci.org/toggl/toggl-button.svg?branch=master)](https://travis-ci.org/toggl/toggl-button) [![Chrome Extension](https://img.shields.io/chrome-web-store/v/oejgccbfbmkkpaidnkphaiaecficdnfn.svg?label=Chrome%20Extension)](https://chrome.google.com/webstore/detail/toggl-button-productivity/oejgccbfbmkkpaidnkphaiaecficdnfn) [![Firefox Add-on](https://img.shields.io/amo/v/toggl-button-time-tracker.svg?label=Firefox%20Add-on)](https://addons.mozilla.org/en-US/firefox/addon/toggl-button-time-tracker/)-->

> Track time effortlessly.

Start and stop the timer from the web tools you use daily. Get the time-tracking
out of the way and focus on real work.

# ⚠️ This is an unofficial fork of the [Toggl Track Extension](https://github.com/toggl/track-extension) formerly known as Toggl Button

Unfortunately, Toggl Track extension [got unceremoniously closed-sourced](https://github.com/toggl/track-extension/commit/f78590c447f30eaa3685d582a2ac888302bd8f41). The move was explained in [this blog post](https://toggl.com/blog/purposeful-open-source):

>  The main browser extension code will be closed, which will allow us to work on the extensions’ features more easily as it will allow us to share code with other projects.

Fortunately the original extension has BSD-3-Clause license which allows this fork to exist.

## Compatible services

Everything the official Toggl extension supports is supported by Button for Toggl as we use
the [same - still open source - code for integrations](https://github.com/toggl/track-extension).

## Installing from the Web Store/Addons page

This extension is currently not published anywhere in a ready-to-be-installed form. See how to install from source below.

## Installing from Source

- Clone the repository `git clone git@github.com:salomvary/button-for-toggl.git`
- Install Node.js and NPM https://nodejs.org/en/
- Run `npm install`
- Run `npm start`

Then depending on your browser, continue with the following steps.

#### On Chrome:

1.  Navigate to `chrome://extensions/` and enable "Developer Mode".
2.  Choose "Load unpacked extension..."
3.  Select the `dist/chrome/` directory

**Note** that you will sometimes need to manually reload the unpacked extension, depending which files you're working on.

#### On Firefox:

1. Navigate to `about:debugging`
2. Choose `Load Temporary Add-on`
3. Select the `dist/firefox/manifest.json` file

**Note** that in Firefox the add-on needs to be manually loaded again when the browser restarts.

If you want to install the extension permanently from source on Firefox, follow these steps:

1. [Install web-ext](https://extensionworkshop.com/documentation/develop/getting-started-with-web-ext/).
2. Create an account at https://addons.mozilla.org.
3. Get API key from https://addons.mozilla.org/en-US/developers/addon/api/key/.
4. Run `web-ext sign --api-key [JWT issuer] --api-secret [JWT secret] --source-dir dist/firefox` in a terminal.
5. Go to `about:addons` in Firefox.
6. Click Install add-on from File under the ⚙ menu
7. Choose the `.xpi` file under the `web-ext-artifacts` folder of this project.

If you want to inspect the distribution version, run `npm run build`. A zipped distribution can then be found in `dist/`.

## Changelog

List of all the changes and added features can be found at https://github.com/salomvary/button-for-toggl/releases.

## Using the Button

1. Log in to your [Toggl] account from the extension popup.
2. Navigate to your [service](#compatible-services) and start your Toggl timer there.

_See this article for reference where the start timer link is located in all the tools: [Where can I find the Button?]_

Or start entry from the extension icon menu.

3. To edit the running time entry:
  - Edit entry details from the post start popup that is shown right after you click the "Start timer" button.
  - Edit entry details from the extension icon menu by clicking the running time entry name.

4. To stop the current running timer:
  - Press the button again.
  - Stop the entry from the extension icon menu.
  - Start another time entry inside your account.

## Custom domains

If you use a setup, where one of the supported services is on a custom domain you can define the custom domains in settings "Permissions" tab.

## Contributing

Want to contribute? Great! Read up on our
guidelines for [contributing](.github/CONTRIBUTING.md)

Just fork the project, make your changes and create a [pull request].

When adding new integrations please use `git squash` and merge all your commits into one commit. This keeps the git log more compact and clear.

Don't know how to start? Just check out the [user requested services] that have not yet been implemented, pick one and start hacking.

[Pull Request]: https://github.com/salomvary/button-for-toggl/pulls
[Toggl]: https://www.toggl.com/
[Where can I find the button?]: https://github.com/salomvary/button-for-toggl/wiki/Where-can-I-find-the-Button%3F
[user requested services]: https://github.com/salomvary/button-for-toggl/wiki/User-requested-buttons
