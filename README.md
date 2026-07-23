# FinGuard – Complete Credit, Klarna and Spending Android App

FinGuard is an offline-first personal finance application built specifically for tracking:

- a bank credit, repayment term, monthly payment, interest and advance payments;
- Klarna purchases, partial payments such as €10 or €20, remaining balances and due dates;
- Advanzia, TF Bank, overdraft and other debts;
- recurring costs such as rent, Amazon, phone, internet, electricity and family support;
- daily spending and additional income;
- monthly budget and remaining cash;
- the complete first-month cost of buying a car;
- local JSON backup and restore.

All information stays locally on the phone. No bank login, cloud server or subscription is required.

## Build the APK using only GitHub

1. Create a new empty GitHub repository, for example `finguard-mobile`.
2. Extract this ZIP on your computer.
3. Upload **all extracted files and folders** to the root of the repository. Do not upload the ZIP itself as the only file.
4. Commit the files to the `main` branch.
5. Open the repository's **Actions** tab.
6. Open **Build Android APK**.
7. Wait for the workflow to finish with a green check.
8. Open the completed workflow run.
9. Under **Artifacts**, download `FinGuard-Android-APK`.
10. Extract the downloaded artifact and install `FinGuard-debug.apk` on the Android phone.

Android may ask you to allow installation from the browser or file manager. Enable that permission only for the installation, then disable it again if preferred.

## Updating the app

Change or replace files in GitHub and commit them. Every push to `main` automatically creates a new APK artifact.

## Current preloaded financial data

The first launch contains editable starting values based on the current plan:

- salary: €2,970;
- Sparkasse credit: €10,500, 24 months, 13.04% APR, estimated €525.12/month;
- Advanzia, TF Bank and overdraft balances;
- Klarna starting purchases and instalments;
- recurring monthly bills;
- €1,500 car purchase plan.

Every value can be changed in the app.

## Local development, optional

```bash
npm install
npm run dev
```

Build web assets:

```bash
npm run build
```

Create Android locally:

```bash
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

## Important data note

Browser/app storage can be erased if the app is uninstalled or application data is cleared. Use **Settings → Export backup** regularly and keep the JSON file safely.
