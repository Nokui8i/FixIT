/**
 * Extends app.json. Firebase keys come from EXPO_PUBLIC_* (see .env.example).
 */
module.exports = ({ config }) => {
  const googleSignInPlugin = [
    "@react-native-google-signin/google-signin",
    {
      iosUrlScheme:
        "com.googleusercontent.apps.293775457039-pd03ngo03tocn4q96pnciojepaua6eai",
    },
  ];
  const plugins = Array.isArray(config.plugins) ? [...config.plugins] : [];
  const hasGooglePlugin = plugins.some((plugin) => {
    return Array.isArray(plugin)
      ? plugin[0] === "@react-native-google-signin/google-signin"
      : plugin === "@react-native-google-signin/google-signin";
  });
  if (!hasGooglePlugin) {
    plugins.push(googleSignInPlugin);
  }

  return {
    ...config,
    scheme: ["fixit", "com.fixit.mobile"],
    android: {
      ...(config.android ?? {}),
      package: "com.fixit.mobile",
    },
    ios: {
      ...(config.ios ?? {}),
      bundleIdentifier: "com.fixit.mobile",
      infoPlist: {
        ...((config.ios ?? {}).infoPlist ?? {}),
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    plugins,
    extra: {
      ...(config.extra ?? {}),
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
      googleOAuth: {
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "",
      },
      stripe: {
        publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
      },
    },
  };
};
