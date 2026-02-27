# Kiosk Master Controller 🖥️

A robust, 100% client-side web application designed to manage, rotate, and display multiple web pages in a continuous Kiosk/Dashboard environment. It overcomes modern browser restrictions (like Cross-Origin Opener Policies - COOP - and Single Page Applications - SPAs) by utilizing an advanced Master-Phantom Tab architecture combined with powerful UserScripts.

## 🚀 Features

* **Phantom Tabs Architecture:** Bypasses aggressive COOP security by alternating target window names (`KIOSK_A` and `KIOSK_B`). The Master forcefully manages the lifecycle of each tab, preventing isolated pages (like Google or Outlook) from becoming orphaned.
* **Interactive Native UI:** When paired with the Overlay script, it injects an Instagram-style progress bar. Users can **click on specific bars to instantly jump** to that dashboard, or pause the rotation interactively.
* **Remote F12 Telemetry (Cloud Logs):** The Master tab intercepts `console.log`, `console.error`, and network failures from the isolated rotating tabs and displays them in a centralized terminal in the Master UI.
* **Network Radar with MS Ping:** Actively pings the target URLs to measure response times (in milliseconds) and logs network availability.
* **Drag & Drop UI & Local Storage:** Easily reorder URLs. Configurations are saved directly in the browser's `localStorage`, allowing multiple users to use the same hosted link with different custom lists.
* **Zero Backend:** Hosted entirely on GitHub Pages. No databases, no servers, no maintenance costs.

---

## 🛠️ How to Use

1. Access the hosted GitHub Pages link.
2. **Allow pop-ups** for the site in your browser.
3. Add the websites you want to rotate, set their individual display times (in seconds), and arrange them using the drag (☰) icon.
4. Click **Start Kiosk**. A new window/tab will open side-by-side and begin rotating the selected URLs automatically.
5. Enable **Advanced Logs** in the Master tab to view real-time F12 telemetry and performance data from the rotating tabs.

---

## 🧩 The UserScript Ecosystem (Violentmonkey)

To achieve a true native dashboard look and bypass corporate CSS blocks (React, SPAs), this project relies on a modular UserScript ecosystem. 

### Installation
1. Install the [Violentmonkey extension](https://violentmonkey.github.io/) on your browser.
2. Navigate to the `userscripts/` folder in this repository.
3. Click on the `.user.js` file you want to install, then click the **Raw** button to trigger the installation prompt.

### Core Script:
* **`progress-bar-overlay.user.js` (The Universal Manager):** Reads instructions passed via the Zero-Point URL hash. It injects a viewport-locked (`vh`/`vw`) progress bar, a live clock, and a pause button. 
  * *Features:* Immune to page zoom, safe delayed injection for React SPAs, interactive jump-clicks, and a **Kamikaze Protocol** (tabs autonomously self-destruct when they detect the Master has moved on).

### Specific Tweaks:
* **`outlook-calendar-totem.user.js` (Outlook Maquiador):**
  Specifically targets `outlook.office.com/calendar`. Because Outlook's React framework is highly restrictive, this script focuses **only** on layout. It hides the Microsoft ribbons/toolbars, applies an intelligent Auto-Zoom to fit the commercial hours (07:00 to 17:30) on a single screen without scrolling, highlights the current day, and calculates/injects the total duration of each meeting directly into the calendar blocks.
* **`custom-grid-dashboard.user.js`:** Transforms specific native table layouts into a modern flexbox grid with user photos. *(Note: Requires manual editing after installation to include specific internal domains).*

---

## 🔒 Privacy & Security

This tool operates strictly on the client side. The URLs you add and the logs captured are never sent to a server. Everything remains within the local memory of the specific browser and machine running the Kiosk.
