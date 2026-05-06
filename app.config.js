/**
 * Merges with app.json. Firebase keys from EXPO_PUBLIC_* (see .env.example).
 */
module.exports = {
  ios: {
    bundleIdentifier: "com.fixit.mobile",
  },
  extra: {
    eas: {
      projectId: "2d284365-071f-4c18-87d5-06567328c3b4",
    },
    fixitBrand: {
      termsUrl: process.env.EXPO_PUBLIC_FIXIT_TERMS_URL ?? "",
      privacyUrl: process.env.EXPO_PUBLIC_FIXIT_PRIVACY_URL ?? "",
      refundsUrl: process.env.EXPO_PUBLIC_FIXIT_REFUNDS_URL ?? "",
      helpCenterUrl: process.env.EXPO_PUBLIC_FIXIT_HELP_CENTER_URL ?? "",
      supportEmail: process.env.EXPO_PUBLIC_FIXIT_SUPPORT_EMAIL ?? "",
      googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    },
    firebaseWeb: {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "",
      storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
      messagingSenderId:
        process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
    },
  },
};
