# Calendar Bot

Calendar Bot is a desktop Electron app that lets you:

- connect your Google Calendar account with desktop OAuth
- type a natural-language request like "Lunch with Sarah next Tuesday at 1pm"
- let OpenAI turn that into a structured event draft
- review the draft before adding it to your Google Calendar

## Interface highlights

The desktop app includes a lightweight status strip so you can tell at a glance whether the scheduler is ready:

- `Connection`: shows when Google Calendar is linked successfully
- `AI Drafting`: shows when OpenAI parsing is ready for prompt drafting
- `Timezone`: shows the local timezone the app will use when drafting and creating events

## What you need

1. Node.js 18+ and npm
2. A Google Cloud project with the Google Calendar API enabled
3. A Google OAuth client of type `Desktop app`
4. An OpenAI API key

## Google setup

1. Go to the Google Cloud console.
2. Enable the Google Calendar API for your project.
3. Configure the OAuth consent screen.
4. Create an OAuth client with application type `Desktop app`.
5. Download the OAuth client JSON file.

Inside the app, click `Import credentials` and choose that JSON file.

If you prefer, you can also place the file at `google-credentials.local.json` in the project root and the app will pick it up automatically.

## Run locally

```bash
npm install
npm start
```

## Build as a desktop app

```bash
npm run dist
```

Electron Builder will generate a platform-specific app package inside `dist/`.

## Notes

- The app stores your Google token locally in Electron's user-data folder.
- The OpenAI API key is stored locally for the app, using Electron's secure storage when available.
- The app drafts events first so you can review them before anything gets added to your calendar.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
