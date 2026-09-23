# MiPhi Sales: setup and release guide

MiPhi Sales is one app for iPhone and Android. Sales and presales staff sign in with their MiPhi Microsoft account. The app then lists the Brochures, AVL and Decks OneDrive locations live, opens files in a built-in viewer (the eye button), and lets staff download and share them. When you add a file to one of those OneDrive folders, it appears in the app the next time a list is opened, refreshed (pull down) or the app is reopened. The app only reads files. It cannot edit or delete anything in OneDrive.

Setup takes four steps. Step 1 needs someone with Microsoft 365 admin rights; it takes about 5 minutes.

---

## Step 1. Register the app in Microsoft Entra ID (IT admin)

1. Go to https://entra.microsoft.com, open **Applications > App registrations > New registration**.
2. Name: `MiPhi Sales`. Supported account types: **Accounts in this organizational directory only (single tenant)**.
3. Redirect URI: choose platform **Public client/native (mobile & desktop)** and enter `miphisales://auth`. Click **Register**.
4. Open **Authentication**. Under *Advanced settings*, set **Allow public client flows** to **Yes**. Save.
5. Open **API permissions > Add a permission > Microsoft Graph > Delegated permissions** and add:
   `User.Read`, `Files.Read.All`, `offline_access`, `openid`, `profile`.
   Then click **Grant admin consent for MiPhi**.
   (These are read-only permissions. The app never asks for write access.)
6. On **Overview**, copy the **Application (client) ID**.

## Step 2. Put the client ID into the app

Open `src/config.ts` and replace the zeros:

```ts
export const AZURE_CLIENT_ID = process.env.EXPO_PUBLIC_AZURE_CLIENT_ID || 'PASTE-THE-CLIENT-ID-HERE';
```

`TENANT` is set to `miphi.in`. If sign-in reports that the tenant is not found, use the **Directory (tenant) ID** from the same Overview page instead.

## Step 3. Check the OneDrive sharing links

The three links are already in `src/config.ts` (`LIBRARY`). For each one:

- **Who can open it:** the link must work for the sales team, either "People in MiPhi with the link" or specific people or groups.
- **Permission:** set it to **Can view** so nobody can edit or delete files through the link, whether they use the app or not.
- **Decks:** the current Decks link points at one file (`MiPhi_Enterprise_Roadmap.pdf`). New decks will only appear automatically if you share a **Decks folder** instead. Move the roadmap into a folder, share the folder (Can view) and paste the folder link into `LIBRARY.decks.shareUrl`.

Sub-folders inside a shared folder show up in the app and can be browsed.

## Step 4. Build the installable apps (Expo EAS, cloud build)

You need Node.js 20 or later and a free Expo account (https://expo.dev/signup). No Android Studio or Xcode is needed.

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init          # links the project to your Expo account (first time only)
```

### Android (APK to share directly)

```bash
npm run build:android
```

When the build finishes (about 10 to 15 minutes), EAS gives you a download link and a QR code for the `.apk`. Send the link to the team; they open it on their phone and install. To publish on Google Play instead, run `npx eas-cli build -p android --profile production` (this produces an `.aab`) and then `npx eas-cli submit -p android`.

### iPhone (TestFlight)

iPhones only install apps from Apple, so this needs the company's **Apple Developer Program** membership (USD 99 per year, https://developer.apple.com/programs/).

```bash
npm run build:ios                   # EAS creates the certificates for you
npx eas-cli@latest submit -p ios   # uploads to App Store Connect
```

In App Store Connect, open **TestFlight** and add the sales team as testers (up to 10,000 people). They install the free TestFlight app and then MiPhi Sales. You can publish it as a private or unlisted App Store app later if you want.

### Updating the app later

- **Content (new brochures, AVLs, decks):** nothing to do. Add the files to OneDrive.
- **Code or text changes:** increase `version` in `app.json` and build again. Small JavaScript-only changes can be pushed without a rebuild using `npx eas-cli update`.

---

## How the app works

| Feature | Detail |
|---|---|
| Sign in | Microsoft work account (MiPhi tenant only), single sign-on, stays signed in |
| Tabs | Brochures, AVL, Decks, Saved |
| Live content | Lists load from OneDrive each time; cached for offline; refresh on pull-down and when the app is reopened |
| Eye button | Opens the built-in viewer. PDFs open directly; Word, Excel and PowerPoint files are converted to PDF by Microsoft for viewing; images open with zoom |
| Download | Saves the original file in the app (Saved tab) for offline use. The icon turns green; it shows a refresh icon if OneDrive has a newer version |
| Share | System share sheet: WhatsApp, email, Teams, "Save to Files" on iPhone. On Android, "Save to phone folder" copies the file to a folder such as Downloads |
| NEW badge | Files added in the last 14 days (`NEW_BADGE_DAYS` in `src/config.ts`) |
| Search and sort | Search by file name, sort by newest or A to Z |
| Read only | Graph permissions are read-only, the app only sends GET requests, and it has no edit or delete functions. "Clear downloads" only removes copies stored on the phone |

## Project layout

```
src/config.ts               client ID, tenant, OneDrive links (edit here)
src/app/                    screens (Expo Router)
src/components/             file row, list, viewer
src/lib/auth.tsx            Microsoft sign-in (PKCE), token refresh
src/lib/graph.ts            read-only Microsoft Graph calls
src/lib/files.ts            download, offline copies, share
scripts/build-pdf-viewer.js regenerates the bundled pdf.js viewer (Android)
assets/                     app icon, splash, MiPhi logo
```

Bundle ID / package name: `in.miphi.sales`. You can change it in `app.json` before the first store upload.

## Troubleshooting

- **"AADSTS50011 redirect URI mismatch":** the redirect URI in Entra ID must be exactly `miphisales://auth` under *Mobile and desktop applications*.
- **"AADSTS65001 consent required":** an admin needs to click *Grant admin consent* (Step 1.5).
- **"You do not have access to this folder":** the OneDrive link is not shared with that person. Update the link's audience (Step 3).
- **Viewer says a file cannot be previewed:** that format (for example .zip) cannot be converted. Use Share to open it in another app.
