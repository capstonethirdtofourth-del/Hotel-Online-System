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
  signOut,
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

async function createGuestProfile(
  firebaseUser,
  googleUser = null
) {
  const userRef = doc(
    db,
    "users",
    firebaseUser.uid
  );

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
    registrationMethod: "google",
    emailVerificationRequired: false,
  };

  await setDoc(userRef, {
    ...profile,
    createdAt: serverTimestamp(),
  });

  return profile;
}

async function clearGoogleLoginSession() {
  // Clear the Firebase session first so App.js no longer considers the
  // Google account authenticated.
  try {
    await signOut(auth);
  } catch (error) {
    console.log(
      "Firebase sign-out skipped:",
      error?.message || error
    );
  }

  // Also clear the native Google session/account selection.
  try {
    configureGoogleOnce();
    await GoogleOneTapSignIn.signOut();
  } catch (error) {
    console.log(
      "Google native sign-out skipped:",
      error?.message || error
    );
  }
}

export async function continueWithGoogle({
  mode = "login",
} = {}) {
  configureGoogleOnce();

  if (!["login", "register"].includes(mode)) {
    throw new Error(
      "Invalid Google authentication mode."
    );
  }

  try {
    // On iOS this resolves immediately; on Android it checks Google Play
    // services before opening the Google account UI.
    await GoogleOneTapSignIn.checkPlayServices();

    let response;

    if (mode === "register") {
      // Account-picker / sign-up-oriented flow.
      response =
        await GoogleOneTapSignIn.createAccount();

      if (
        isNoSavedCredentialFoundResponse(response)
      ) {
        response =
          await GoogleOneTapSignIn.presentExplicitSignIn();
      }
    } else {
      // Login should only authenticate a Google account.
      // It must NOT create an H&K Firestore user profile.
      response =
        await GoogleOneTapSignIn.presentExplicitSignIn();
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

    // Exchange Google's ID token for a Firebase Authentication session.
    const googleCredential =
      GoogleAuthProvider.credential(idToken);

    const userCredential =
      await signInWithCredential(
        auth,
        googleCredential
      );

    const firebaseUser =
      userCredential.user;

    const userRef = doc(
      db,
      "users",
      firebaseUser.uid
    );

    const userSnap =
      await getDoc(userRef);

    // =========================================================
    // LOGIN MODE
    // =========================================================
    // Firebase/Google authentication alone is NOT enough to count as
    // an H&K registration. The Firestore profile must already exist.
    if (mode === "login") {
      if (!userSnap.exists()) {
        await clearGoogleLoginSession();

        const notRegisteredError =
          new Error(
            "This Google account is not registered in H&K Home Kafe. Please register first."
          );

        notRegisteredError.code =
          "google/account-not-registered";

        throw notRegisteredError;
      }

      return {
        cancelled: false,
        created: false,
        user: firebaseUser,
        profile: userSnap.data(),
      };
    }

    // =========================================================
    // REGISTER MODE
    // =========================================================
    // If the H&K profile already exists, this account was previously
    // registered and should use Login instead.
    if (userSnap.exists()) {
      await clearGoogleLoginSession();

      const alreadyRegisteredError =
        new Error(
          "This Google account is already registered in H&K Home Kafe. Please log in instead."
        );

      alreadyRegisteredError.code =
        "google/account-already-registered";

      throw alreadyRegisteredError;
    }

    // ONLY Register mode is allowed to create /users/{uid}.
    const profile =
      await createGuestProfile(
        firebaseUser,
        googleUser
      );

    return {
      cancelled: false,
      created: true,
      user: firebaseUser,
      profile,
    };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (
        error.code ===
        statusCodes.SIGN_IN_CANCELLED
      ) {
        return {
          cancelled: true,
          created: false,
          user: null,
        };
      }

      if (
        error.code ===
        statusCodes.DEVELOPER_ERROR
      ) {
        const setupError = new Error(
          "Google Sign-In configuration does not match this Android build. Check the Android package name, EAS keystore SHA-1, Firebase Android app, and google-services.json."
        );
        setupError.code =
          "google/developer-error";
        throw setupError;
      }

      if (
        error.code ===
        statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        const playServicesError =
          new Error(
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
    // Firebase logout in App.js should still continue even if Google has no
    // active native session.
    console.log(
      "Google native sign-out skipped:",
      error?.message || error
    );
  }
}
