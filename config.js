// Site settings, read by main.js.
//
// downloadUrl: where the installer is hosted, for example a GitHub Releases asset:
//   https://github.com/OWNER/REPO/releases/download/v1.0.0/Weather-Client-Setup-1.0.0.exe
// While it's empty, the Download buttons scroll to the download section and say the link isn't set.
//
// `npm run dist` in ../launcher rewrites the other fields (versions, installer size in bytes,
// SHA-256) from the build it just made, and keeps downloadUrl as it is. Keep the object as plain
// JSON (double quotes, no comments inside) so that script can read it.
window.WEATHER_SITE = {
  "downloadUrl": "https://github.com/snifffnfnn/weather-client/releases/download/v1.0.4/Weather-Client-Setup-1.0.4.exe",
  "launcherVersion": "1.0.4",
  "modVersion": "1.3.2",
  "installerName": "Weather-Client-Setup-1.0.4.exe",
  "installerSize": 124042483,
  "sha256": "f00b119b0f846fe1ae959349d5a305b27a1f40ef5d3afb71cac7ba59b5239c56"
};
