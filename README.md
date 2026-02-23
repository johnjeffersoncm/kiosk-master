# Kiosk Master Controller 🖥️

A robust, 100% client-side web application designed to manage, rotate, and display multiple web pages in a continuous Kiosk/Dashboard environment. It overcomes modern browser restrictions (like Cross-Origin Opener Policies) by utilizing a Master-Popup architecture.

## 🚀 Features

* **Master-Slave Architecture:** The control panel (Master) runs in a separate tab, controlling the display window (Popup). If a target website crashes or resets the connection, the Master forces the rotation to continue.
* **Drag & Drop UI:** Easily reorder, add, or remove URLs directly from the UI.
* **Local Storage:** Configurations are saved directly in the browser's `localStorage`. Multiple users can use the same hosted link without interfering with each other's custom lists.
* **Network Radar:** Actively pings the target URL to measure response times and logs network availability.
* **Visual Progress Bars:** Integrates via URL Hashes to display an Instagram-style progress bar overlay over the rotating pages (requires the optional UserScript).
* **Zero Backend:** Hosted entirely on GitHub Pages. No databases, no servers, no maintenance costs.

---

## 🛠️ How to Use

1. Access the hosted GitHub Pages link.
2. Allow pop-ups for the site in your browser.
3. Add the websites you want to rotate, set their individual display times (in seconds), and arrange them using the drag (☰) icon.
4. Click **Start Kiosk**. A new fullscreen window will open and begin rotating the selected URLs.
5. You can view the live connection logs and upcoming rotations in the Master tab.

---

## 🧩 Optional Enhancements (UserScripts)

To make the displayed pages look like native dashboards, this repository includes optional [Violentmonkey](https://violentmonkey.github.io/) scripts.

### Installation
1. Install the [Violentmonkey extension](https://violentmonkey.github.io/) on your browser.
2. Navigate to the `userscripts/` folder in this repository.
3. Click on the `.user.js` file you want to install.
4. Click the **Raw** button. Violentmonkey will automatically intercept it and prompt you to install.

### Available Scripts:
* **`progress-bar-overlay.user.js`**: Reads instructions passed via the URL hash by the Master Controller and draws a live progress bar at the top of the Kiosk popup.
* **`custom-grid-dashboard.user.js`**: Transforms a specific native table layout into a modern flexbox grid with user photos. *(Note: You must manually edit this script after installation to include your specific internal domain and photo path).*

---

## 🔒 Privacy & Security

This tool operates strictly on the client side. The URLs you add are never sent to a server. They remain within the `localStorage` of the specific browser and machine you configure them on.
