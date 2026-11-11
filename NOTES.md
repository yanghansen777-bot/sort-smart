# Camera Reminder Notes

OpenAI model available with “luna” in its name: `gpt-5.6-luna`

## Done
- Expo React Native app created in `app/` with SDK 58.
- Version 1 flow: enter class date/time, ask the AI once, save the reminder on the phone, and schedule a notification.
- Safety reminder is built into the AI instructions and the screen.
- Local helper is in `helper.js`; it reads the key from `.env` and never puts the key in the app.

## Run it
1. In one terminal: `PATH="$PWD/.tools/node/bin:$PATH" node helper.js`
2. In another terminal: `cd app && PATH="../.tools/node/bin:$PATH" npx expo start`
3. Scan the Expo QR code with Expo Go while the phone and computer are on the same Wi-Fi.

The app currently reaches this computer at `http://192.168.86.29:3001`. If your Wi-Fi address changes, update `HELPER_URL` in `app/App.js`.

## Maybe Later
- Add a settings screen for more than one class.
- Add a short competition demo mode and a written-entry export.
- Add a teacher-approved class setup flow.
