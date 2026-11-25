# Camera Reminder Notes

OpenAI model available with “luna” in its name: `gpt-5.6-luna`

## Done
- Expo React Native app created in `app/` with SDK 58.
- Version 1 flow: enter class date/time, ask the AI once, save the reminder on the phone, and schedule a notification.
- Website date field now opens a calendar picker so students can choose a class date by month and year.
- Students can now select one or more weekly class days and one class end time; the phone schedules a repeating reminder for each selected day.
- Students can also add multiple specific class dates and end times before saving reminders.
- Verified on November 19, 2026: weekly class days and end times build successfully for web and iOS/Expo Go.
- Reminder notifications now use a loud default sound, strong vibration/priority where supported, and a high-contrast in-app notice card.
- After saving a reminder, the user can check off battery removed, SD card removed, and camera turned off; checklist progress is saved on the phone.
- Users can now either ask a question in the optional AI box or leave it blank and use their class dates and times.
- On the website, dates can be typed or chosen from a calendar, and times can be typed or chosen from a time picker.
- Website users can switch between “Choose with controls” and “Type it”; only the selected input method is shown, and they can switch back anytime.
- Safety reminder is built into the AI instructions and the screen.
- Local helper is in `helper.js`; the server uses `getKey()` to obtain a temporary key from MindDo and never puts it in the app.
- Web version uses a 400px phone frame and calls the Vercel function in `api/ask.js`.
- Local web export and the Vercel API function have been checked; the API returned a reminder successfully without exposing the key.

## Run it
1. In one terminal: `PATH="$PWD/.tools/node/bin:$PATH" node helper.js`
2. In another terminal: `cd app && PATH="../.tools/node/bin:$PATH" npx expo start`
3. Scan the Expo QR code with Expo Go while the phone and computer are on the same Wi-Fi.

## Put it online with Vercel
1. Push this project to GitHub, then import the repository into Vercel.
2. Vercel uses `vercel.json` to run `cd app && npx expo export -p web` and publish `app/dist`.
3. In Vercel Project Settings → Environment Variables, add `KEYGEN_URL` and `KEYGEN_TOKEN` for the Production environment. Do not add an OpenAI key; `getKey()` obtains it from MindDo.
4. Deploy. The web app calls `/api/ask`, while Expo Go continues calling the local helper.

Vercel needs `KEYGEN_URL` and `KEYGEN_TOKEN`; no other setting is required.

The app currently reaches this computer at `http://192.168.86.29:3001`. If your Wi-Fi address changes, update `HELPER_URL` in `app/App.js`.

## Maybe Later
- Add a settings screen for more than one class.
- Add a short competition demo mode and a written-entry export.
- Add a teacher-approved class setup flow.
