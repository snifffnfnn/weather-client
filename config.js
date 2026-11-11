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
  "downloadUrl": "https://github.com/snifffnfnn/weather-client/releases/download/v1.0.2/Weather-Client-Setup-1.0.2.exe",
  "launcherVersion": "1.0.2",
  "modVersion": "1.3.2",
  "installerName": "Weather-Client-Setup-1.0.2.exe",
  "installerSize": 124041683,
  "sha256": "5064f6f2ff689f2ad7359e05202076499d4ebde9d40ca804cb88498939f04c00"
};
