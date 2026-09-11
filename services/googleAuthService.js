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

// App.js uses these flags to avoid reacting to Firebase's temporary Google
// auth session before this service has decided whether the account is allowed.
let googleAuthFlowInProgress = false;
let googleAuthFlowPromise = null;
let resolveGoogleAuthFlow = null;
let googlePostSignOutRoute = null;

function configureGoogleOnce() {
  if (googleConfigured) return;

  GoogleOneTapSignIn.configure({
    webClientId: "autoDetect",
    offlineAccess: false,
    autoSelectOnSignIn: false,
  });

  googleConfigured = true;
}

function beginGoogleAuthFlow() {
  googleAuthFlowInProgress = true;
  googleAuthFlowPromise = new Promise((resolve) => {
    resolveGoogleAuthFlow = resolve;
  });
}

function endGoogleAuthFlow() {
  googleAuthFlowInProgress = false;
  if (resolveGoogleAuthFlow) resolveGoogleAuthFlow();
  resolveGoogleAuthFlow = null;
  googleAuthFlowPromise = null;
}

export function isGoogleAuthFlowInProgress() {
  return googleAuthFlowInProgress;
}

export async function waitForGoogleAuthFlowToFinish() {
  if (!googleAuthFlowInProgress || !googleAuthFlowPromise) return;
  await googleAuthFlowPromise;
}

export function consumeGooglePostSignOutRoute() {
  const route = googlePostSignOutRoute;
  googlePostSignOutRoute = null;
  return route;
}

async function createGuestProfile(firebaseUser, googleUser = null) {
  const userRef = doc(db, "users", firebaseUser.uid);

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

async function clearRejectedGoogleSession(routeName) {
  // Tell App.js which screen should stay visible after the forced sign-out.
  googlePostSignOutRoute = routeName;

  try {
    await signOut(auth);
  } catch (error) {
    console.log("Firebase sign-out skipped:", error?.message || error);
  }

  try {
    configureGoogleOnce();
    await GoogleOneTapSignIn.signOut();
  } catch (error) {
    console.log("Google native sign-out skipped:", error?.message || error);
  }
}

export async function continueWithGoogle({ mode = "login" } = {}) {
  configureGoogleOnce();

  if (!["login", "register"].includes(mode)) {
    throw new Error("Invalid Google authentication mode.");
  }

  beginGoogleAuthFlow();

  try {
    await GoogleOneTapSignIn.checkPlayServices();

    let response;

    if (mode === "register") {
      response = await GoogleOneTapSignIn.createAccount();

      if (isNoSavedCredentialFoundResponse(response)) {
        response = await GoogleOneTapSignIn.presentExplicitSignIn();
      }
    } else {
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
      throw new Error("Google Sign-In did not return a usable account.");
    }

    const { idToken, user: googleUser } = response.data;

    if (!idToken) {
      throw new Error(
        "Google did not return an ID token. Check google-services.json and your Firebase Google provider setup."
      );
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Firebase Auth changes state here. App.js now waits until this service
    // finishes deciding whether the H&K account is accepted or rejected.
    const userCredential = await signInWithCredential(
      auth,
      googleCredential
    );

    const firebaseUser = userCredential.user;
    const userRef = doc(db, "users", firebaseUser.uid);
    const userSnap = await getDoc(userRef);

    // LOGIN: the H&K profile must already exist. Never create it here.
    if (mode === "login") {
      if (!userSnap.exists()) {
        await clearRejectedGoogleSession("Login");

        const error = new Error(
          "This Google account is not registered in H&K Home Kafe. Please register first."
        );
        error.code = "google/account-not-registered";
        throw error;
      }

      return {
        cancelled: false,
        created: false,
        user: firebaseUser,
        profile: userSnap.data(),
      };
    }

    // REGISTER: if it already exists, sign back out and stay on Register.
    if (userSnap.exists()) {
      await clearRejectedGoogleSession("Register");

      const error = new Error(
        "This Google account is already registered in H&K Home Kafe. Please log in instead."
      );
      error.code = "google/account-already-registered";
      throw error;
    }

    // Only Register mode is allowed to create /users/{uid}.
    const profile = await createGuestProfile(firebaseUser, googleUser);

    return {
      cancelled: false,
      created: true,
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

      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        const playServicesError = new Error(
          "Google Play Services is unavailable or needs to be updated on this device."
        );
        playServicesError.code = "google/play-services-unavailable";
        throw playServicesError;
      }
    }

    throw error;
  } finally {
    // Release App.js after this Google decision is complete.
    endGoogleAuthFlow();
  }
}

export async function signOutGoogleSession() {
  try {
    configureGoogleOnce();
    await GoogleOneTapSignIn.signOut();
  } catch (error) {
    console.log("Google native sign-out skipped:", error?.message || error);
  }
}
