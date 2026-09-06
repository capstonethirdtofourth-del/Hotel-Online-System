import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  reload,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";
import { continueWithGoogle } from "../services/googleAuthService";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const busy = loading || googleLoading || resendLoading;

  const getLoginErrorMessage = (error) => {
    if (error.code === "auth/invalid-credential") {
      return "Invalid email or password.";
    }

    if (error.code === "auth/user-not-found") {
      return "No account found with that email.";
    }

    if (error.code === "auth/wrong-password") {
      return "Incorrect password.";
    }

    if (error.code === "auth/invalid-email") {
      return "Invalid email address.";
    }

    if (error.code === "auth/too-many-requests") {
      return "Too many attempts. Please wait a while and try again.";
    }

    return error?.message || "Something went wrong.";
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        "Error",
        "Please enter your email and password."
      );
      return;
    }

    try {
      setLoading(true);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = userCredential.user;

      // Refresh the Firebase user so emailVerified is current.
      await reload(user);

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await signOut(auth);

        Alert.alert(
          "Login Failed",
          "User profile not found."
        );
        return;
      }

      const userData = userSnap.data();

      // Only accounts registered through the new email/password
      // registration flow are required to verify their email.
      // Existing accounts and Google accounts are not unexpectedly locked out.
      if (
        userData?.emailVerificationRequired === true &&
        !user.emailVerified
      ) {
        await signOut(auth);

        Alert.alert(
          "Email Not Verified",
          "Please open the verification email we sent to you and verify your email address before logging in."
        );
        return;
      }

      navigation.replace("Main");
    } catch (error) {
      Alert.alert(
        "Login Failed",
        getLoginErrorMessage(error)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        "Enter Your Account",
        "Enter your email and password first, then tap Resend verification email."
      );
      return;
    }

    try {
      setResendLoading(true);

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = userCredential.user;

      await reload(user);

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await signOut(auth);

        Alert.alert(
          "Unable to Resend",
          "User profile not found."
        );
        return;
      }

      const userData = userSnap.data();

      if (userData?.emailVerificationRequired !== true) {
        await signOut(auth);

        Alert.alert(
          "Verification Not Required",
          "This account does not require email verification."
        );
        return;
      }

      if (user.emailVerified) {
        await signOut(auth);

        Alert.alert(
          "Already Verified",
          "Your email is already verified. You can log in now."
        );
        return;
      }

      await sendEmailVerification(user);
      await signOut(auth);

      Alert.alert(
        "Verification Email Sent",
        "A new verification email has been sent. Please check your inbox and spam folder."
      );
    } catch (error) {
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch (_) {}

      let message = getLoginErrorMessage(error);

      if (error.code === "auth/too-many-requests") {
        message =
          "Too many verification emails were requested. Please wait a while before trying again.";
      }

      Alert.alert(
        "Unable to Resend",
        message
      );
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);

      const result = await continueWithGoogle({
        mode: "login",
      });

      if (result.cancelled) return;

      navigation.replace("Main");
    } catch (error) {
      console.log("GOOGLE LOGIN ERROR:", error);

      Alert.alert(
        "Google Sign-In Failed",
        error?.message ||
          "Unable to sign in with Google."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoCard}>
          <Image
            source={require("../assets/images/logohotel.png")}
            style={styles.logoImage}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Login</Text>

          <Text style={styles.subtitle}>
            Sign in to manage your stay, food
            orders, and requests.
          </Text>

          <Text style={styles.label}>Email</Text>

          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor="#8A7768"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            editable={!busy}
          />

          <Text style={styles.label}>
            Password
          </Text>

          <View style={styles.passwordWrap}>
            <TextInput
              key={showPassword ? "password-visible" : "password-hidden"}
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor="#8A7768"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="password"
              textContentType="password"
              selectionColor="#6b4f3a"
              editable={!busy}
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword(!showPassword)
              }
              disabled={busy}
            >
              <Ionicons
                name={
                  showPassword
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={20}
                color="#777"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.loginBtn,
              busy && styles.disabledBtn,
            ]}
            onPress={handleLogin}
            disabled={busy}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginText}>
                Login
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendButton}
            onPress={handleResendVerification}
            disabled={busy}
          >
            {resendLoading ? (
              <ActivityIndicator
                size="small"
                color="#6b4f3a"
              />
            ) : (
              <Text style={styles.resendText}>
                Resend verification email
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              OR
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[
              styles.googleBtn,
              busy && styles.disabledBtn,
            ]}
            onPress={handleGoogle}
            disabled={busy}
            activeOpacity={0.86}
          >
            {googleLoading ? (
              <ActivityIndicator color="#6b4f3a" />
            ) : (
              <>
                <Ionicons
                  name="logo-google"
                  size={21}
                  color="#4285F4"
                />
                <Text style={styles.googleText}>
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Register")
            }
            disabled={busy}
          >
            <Text style={styles.registerLink}>
              Don’t have an account? Register
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const CREAM = "#FFF8E7";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CREAM,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  passwordWrap: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 18,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    marginRight: 10,
    color: "#222",
    fontSize: 16,
    paddingVertical: 0,
  },
  loginBtn: {
    backgroundColor: "#6b4f3a",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledBtn: {
    opacity: 0.65,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  resendButton: {
    minHeight: 36,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  resendText: {
    color: "#6b4f3a",
    fontSize: 13,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 13,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#d8d8d8",
  },
  dividerText: {
    color: "#888",
    fontSize: 11,
    fontWeight: "700",
    marginHorizontal: 12,
  },
  googleBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8d8d8",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleText: {
    color: "#3f3f3f",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 10,
  },
  registerLink: {
    marginTop: 18,
    textAlign: "center",
    color: "#555",
    fontSize: 14,
  },
  logoCard: {
    width: "100%",
    alignItems: "center",
    marginBottom: 4,
  },
  logoImage: {
    width: 100,
    height: 100,
  },
});
