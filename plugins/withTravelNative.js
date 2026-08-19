const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withGradleProperties,
  withMainActivity,
  withMainApplication,
} = require("@expo/config-plugins");

const PACKAGE_PATH = ["com", "anonymous", "travelplanner"];
const SOURCES = [
  "CallActionReceiver.kt",
  "ChatBubbleActivity.kt",
  "IncomingCallActivity.kt",
  "TravelCallAudioModule.kt",
  "TravelFirebaseMessagingService.kt",
  "TravelNativePackage.kt",
  "TravelNotifications.kt",
];

const upsertNamedEntry = (entries, name, attributes) => {
  const current = entries.find((entry) => entry.$?.["android:name"] === name);
  if (current) current.$ = { ...current.$, ...attributes };
  else entries.push({ $: { "android:name": name, ...attributes } });
};

module.exports = function withTravelNative(config) {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    manifest["uses-permission"] = manifest["uses-permission"] || [];
    upsertNamedEntry(manifest["uses-permission"], "android.permission.USE_FULL_SCREEN_INTENT", {});

    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.activity = application.activity || [];
    application.receiver = application.receiver || [];
    application.service = application.service || [];

    upsertNamedEntry(application.activity, ".IncomingCallActivity", {
      "android:excludeFromRecents": "true",
      "android:exported": "false",
      "android:launchMode": "singleTask",
      "android:showWhenLocked": "true",
      "android:taskAffinity": "com.anonymous.travelplanner.incomingcall",
      "android:turnScreenOn": "true",
      "android:theme": "@style/AppTheme",
    });
    upsertNamedEntry(application.activity, ".ChatBubbleActivity", {
      "android:allowEmbedded": "true",
      "android:configChanges": "keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode",
      "android:documentLaunchMode": "always",
      "android:exported": "false",
      "android:resizeableActivity": "true",
      "android:theme": "@style/AppTheme",
      "android:windowSoftInputMode": "adjustResize",
    });
    upsertNamedEntry(application.receiver, ".CallActionReceiver", {
      "android:exported": "false",
    });
    upsertNamedEntry(
      application.service,
      "expo.modules.notifications.service.ExpoFirebaseMessagingService",
      { "tools:node": "remove" },
    );
    upsertNamedEntry(application.service, ".TravelFirebaseMessagingService", {
      "android:exported": "false",
    });
    const travelService = application.service.find(
      (entry) => entry.$?.["android:name"] === ".TravelFirebaseMessagingService",
    );
    travelService["intent-filter"] = [
      {
        $: { "android:priority": "1000" },
        action: [{ $: { "android:name": "com.google.firebase.MESSAGING_EVENT" } }],
      },
    ];
    return mod;
  });

  config = withAppBuildGradle(config, (mod) => {
    const dependency = 'implementation("com.google.firebase:firebase-messaging:24.0.1")';
    if (!mod.modResults.contents.includes(dependency)) {
      mod.modResults.contents = mod.modResults.contents.replace(
        'implementation("com.facebook.react:react-android")',
        `implementation("com.facebook.react:react-android")\n    ${dependency}`,
      );
    }
    return mod;
  });

  config = withGradleProperties(config, (mod) => {
    const key = "org.gradle.jvmargs";
    const value = "-Xmx4096m -XX:MaxMetaspaceSize=2048m";
    const property = mod.modResults.find(
      (entry) => entry.type === "property" && entry.key === key,
    );
    if (property) property.value = value;
    else mod.modResults.push({ type: "property", key, value });
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    if (!mod.modResults.contents.includes("add(TravelNativePackage())")) {
      mod.modResults.contents = mod.modResults.contents.replace(
        "PackageList(this).packages.apply {",
        "PackageList(this).packages.apply {\n              add(TravelNativePackage())",
      );
    }
    if (!mod.modResults.contents.includes("TravelNotifications.createChannels(this)")) {
      mod.modResults.contents = mod.modResults.contents.replace(
        "super.onCreate()",
        "super.onCreate()\n    TravelNotifications.createChannels(this)",
      );
    }
    return mod;
  });

  config = withMainActivity(config, (mod) => {
    if (!mod.modResults.contents.includes("open class MainActivity : ReactActivity()")) {
      mod.modResults.contents = mod.modResults.contents.replace(
        "class MainActivity : ReactActivity()",
        "open class MainActivity : ReactActivity()",
      );
    }
    return mod;
  });

  config = withDangerousMod(config, ["android", async (mod) => {
    const sourceDir = path.join(__dirname, "travel-native", "android");
    const targetDir = path.join(
      mod.modRequest.platformProjectRoot,
      "app",
      "src",
      "main",
      "java",
      ...PACKAGE_PATH,
    );
    fs.mkdirSync(targetDir, { recursive: true });
    for (const source of SOURCES) {
      fs.copyFileSync(path.join(sourceDir, source), path.join(targetDir, source));
    }
    return mod;
  }]);

  return config;
};
