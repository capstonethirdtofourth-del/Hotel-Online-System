import {
  GoogleOneTapSignIn,
  isCancelledResponse,
  isErrorWithCode,
  isNoSavedCredentialFoundResponse,
  isSuccessResponse,
  statusCodes,
} from "react-native-nitro-google-signin";
import {
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";

let googleConfigured = false;

function configureGoogleOnce() {
  if (googleConfigured) return;

  // Reads the Web OAuth client ID from google-services.json on Android
  // and GoogleService-Info.plist on iOS.
  GoogleOneTapSignIn.configure({
    webClientId: "autoDetect",
    offlineAccess: false,
    autoSelectOnSignIn: false,
  });

  googleConfigured = true;
}

async function ensureGuestProfile(firebaseUser, googleUser = null) {
  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    // Never overwrite an existing role. This is especially important for
    // an existing admin account that later signs in through Google.
    return {
      profile: userSnap.data(),
      created: false,
    };
  }

  const profile = {
    uid: firebaseUser.uid,
    fullName:
      firebaseUser.displayName ||
      googleUser?.name ||
      "Guest User",
    email: (
      firebaseUser.email ||
      googleUser?.email ||
      ""
    ).toLowerCase(),
    phone: firebaseUser.phoneNumber || "",
    role: "guest",
  };

  await setDoc(userRef, {
    ...profile,
    createdAt: serverTimestamp(),
  });

  return {
    profile,
    created: true,
  };
}

export async function continueWithGoogle({
  mode = "login",
} = {}) {
  configureGoogleOnce();

  try {
    // On iOS this resolves immediately; on Android it checks Google Play
    // services before opening the Google account UI.
    await GoogleOneTapSignIn.checkPlayServices();

    let response;

    if (mode === "register") {
      // Account-picker / sign-up-oriented flow.
      response = await GoogleOneTapSignIn.createAccount();

      if (isNoSavedCredentialFoundResponse(response)) {
        response = await GoogleOneTapSignIn.presentExplicitSignIn();
      }
    } else {
      // Explicit UI is preferable for a visible "Continue with Google"
      // button because the user can intentionally choose an account.
      response = await GoogleOneTapSignIn.presentExplicitSignIn();
    }

    if (isCancelledResponse(response)) {
      return {
        cancelled: true,
        created: false,
        user: null,
      };
    }

    if (!isSuccessResponse(response)) {
      throw new Error(
        "Google Sign-In did not return a usable account."
      );
    }

    const {
      idToken,
      user: googleUser,
    } = response.data;

    if (!idToken) {
      throw new Error(
        "Google did not return an ID token. Check google-services.json and your Firebase Google provider setup."
      );
    }

    // Exchange Google's ID token for a normal Firebase Authentication
    // session. The rest of H&K can keep using auth.currentUser as before.
    const googleCredential =
      GoogleAuthProvider.credential(idToken);

    const userCredential =
      await signInWithCredential(
        auth,
        googleCredential
      );

    const firebaseUser = userCredential.user;

    let profileResult;

    try {
      profileResult =
        await ensureGuestProfile(
          firebaseUser,
          googleUser
        );
    } catch (profileError) {
      console.log(
        "GOOGLE FIRESTORE PROFILE ERROR:",
        profileError?.code,
        profileError?.message
      );
      throw profileError;
    }

    const { profile, created } =
      profileResult;

    return {
      cancelled: false,
      created,
      user: firebaseUser,
      profile,
    };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return {
          cancelled: true,
          created: false,
          user: null,
        };
      }

      if (error.code === statusCodes.DEVELOPER_ERROR) {
        const setupError = new Error(
          "Google Sign-In configuration does not match this Android build. Check the Android package name, EAS keystore SHA-1, Firebase Android app, and google-services.json."
        );
        setupError.code = "google/developer-error";
        throw setupError;
      }

      if (
        error.code ===
        statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        const playServicesError = new Error(
          "Google Play Services is unavailable or needs to be updated on this device."
        );
        playServicesError.code =
          "google/play-services-unavailable";
        throw playServicesError;
      }
    }

    throw error;
  }
}

export async function signOutGoogleSession() {
  try {
    configureGoogleOnce();
    await GoogleOneTapSignIn.signOut();
  } catch (error) {
    // Firebase logout should still continue even if Google has no active
    // native session.
    console.log(
      "Google native sign-out skipped:",
      error?.message || error
    );
  }
}
  