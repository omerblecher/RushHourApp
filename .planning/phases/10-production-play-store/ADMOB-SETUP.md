# AdMob Setup Guide — Rush Hour Puzzle

## Prerequisites
- Google account (can be the same as Play Store developer account)
- App already published on Play Store (even internal track counts)

## Step 1: Create AdMob Account
1. Go to https://admob.google.com
2. Sign in with your Google account
3. Click "Get started" and follow the account creation wizard
4. Accept the AdMob terms of service
5. Skip the "Add your first app" prompt if offered — you'll do it in Step 2

## Step 2: Register the App in AdMob
1. In the AdMob console sidebar, click "Apps" → "Add app"
2. Select platform: Android
3. "Is the app listed on a supported app store?" → Yes
4. Search for "Rush Hour" by your developer name, or paste the Play Store URL / package name: `com.otis.brooke.rushhour.puzzle`
5. Select the app from the search results and click "Continue"
6. You'll be shown the **AdMob App ID** — it looks like `ca-app-pub-XXXXXXXXXXXXXXXXX~YYYYYYYYYY`
7. Copy this ID immediately. You will need it for strings.xml.

## Step 3: Create the Banner Ad Unit
1. In AdMob, go to Apps → Rush Hour → Ad units → "Add ad unit"
2. Select "Banner"
3. Name it: `rush-hour-banner`
4. Click "Create ad unit"
5. Copy the **Banner Ad Unit ID** — looks like `ca-app-pub-XXXXXXXXXXXXXXXXX/YYYYYYYYYY`

## Step 4: Create the Interstitial Ad Unit
1. In AdMob, go to Apps → Rush Hour → Ad units → "Add ad unit"
2. Select "Interstitial"
3. Name it: `rush-hour-interstitial`
4. Click "Create ad unit"
5. Copy the **Interstitial Ad Unit ID** — same format as banner

## Step 5: Configure Privacy & Messaging (UMP Consent Form)
This step is required for GDPR compliance — EU users will see this consent form.

1. In AdMob sidebar, go to "Privacy & messaging"
2. Under "GDPR", click "Create message"
3. Follow the wizard:
   - Select your app (Rush Hour)
   - Add your privacy policy URL (the GitHub Pages URL from Plan 10-02)
   - Choose which ad partners to include (Google AdMob at minimum)
   - Publish the message
4. Without this step, EEA users will not see a consent dialog and AdMob may restrict serving.

## Step 6: Fill In Real IDs
Once you have all three IDs, update two files:

### `.env.production`
```
VITE_ADMOB_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXXX~YYYYYYYYYY     ← App ID from Step 2
VITE_ADMOB_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXXX/YYYYYYYYYY  ← Banner unit from Step 3
VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXXX/YYYYYYYYYY ← Interstitial from Step 4
```

### `android/app/src/main/res/values/strings.xml`
Replace the test App ID with the real one from Step 2:
```xml
<string name="admob_app_id">ca-app-pub-XXXXXXXXXXXXXXXXX~YYYYYYYYYY</string>
```

**Why strings.xml needs the real App ID:** AndroidManifest.xml reads the App ID via
`@string/admob_app_id` at build time. This is a native Android manifest meta-data tag —
it is NOT read from .env.production (which is a Vite/JS concept). Both files must have
the real App ID for a production build to work correctly.

## Step 7: Verify
After filling in the IDs, the release build in Plan 10-02 will use the real values.
AdMob ad serving typically activates within a few hours of app submission.

## Notes
- Ad unit IDs take up to a few hours to activate after creation
- The AdMob App ID in strings.xml is NOT secret — it is visible in your compiled APK and is safe to commit
- Keep your AdMob account linked to the same Google account as your Play Console for easy integration
