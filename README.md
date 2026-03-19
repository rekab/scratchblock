# Scratch User Blocker - Chrome Extension

A simple Chrome extension that lets you block users on [scratch.mit.edu](https://scratch.mit.edu). When you block someone, their comments, projects, and forum posts are hidden from view.

## What It Does

- **Hides comments** from blocked users on project pages
- **Hides projects** by blocked users in galleries and search results
- **Hides forum posts** by blocked users in the Scratch discussion forums
- **Shows a warning banner** if you visit a blocked user's profile
- **Updates instantly** — block/unblock someone and the page updates right away
- **Remembers your list** — your block list saves automatically

## How to Install

1. Download or clone this repository to your computer
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the folder containing these files
6. The extension icon (orange circle) appears in your toolbar!

## How to Use

1. Click the extension icon in your Chrome toolbar
2. Type a Scratch username in the text box
3. Click **Block** (or press Enter)
4. That's it! Their content is now hidden on Scratch

To unblock someone, click **Unblock** next to their name in the list.

## Files in This Project

| File | What it does |
|------|-------------|
| `manifest.json` | Tells Chrome about the extension (like a table of contents) |
| `popup.html` | The little window that appears when you click the icon |
| `popup.css` | Makes the popup window look nice |
| `popup.js` | Makes the popup buttons actually work |
| `content.js` | Runs on Scratch pages and hides blocked users' content |
| `blocked.css` | The CSS that makes blocked content invisible |
| `icon.png` | The extension's icon |
| `icon.svg` | Source file for the icon (not used by Chrome) |

## For Kids Who Want to Learn!

Every file in this project has lots of comments explaining what each part does. Open any `.js` or `.css` file to read along and learn how Chrome extensions work!

Some fun things to try:
- Change the colors in `popup.css` — try making the button purple!
- Change the banner message in `content.js` — make it say something funny!
- Add new features — what if it counted how many things it blocked?
