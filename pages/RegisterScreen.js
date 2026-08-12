import React, { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Image,
  Platform,
  ScrollView,
} from "react-native";
import {
  createUserWithEmailAndPassword,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";
import { continueWithGoogle } from "../services/googleAuthService";

export default function RegisterScreen({
  navigation,
}) {
  const [fullName, setFullName] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [phone, setPhone] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);
  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const busy = loading || googleLoading;

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert(
        "Validation Error",
        "Full name is required."
      );
      return false;
    }

    if (!email.trim()) {
      Alert.alert(
        "Validation Error",
        "Email is required."
      );
      return false;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid email."
      );
      return false;
    }

    if (!phone.trim()) {
      Alert.alert(
        "Validation Error",
        "Phone number is required."
      );
      return false;
    }

    if (phone.length < 10) {
      Alert.alert(
        "Validation Error",
        "Please enter a valid phone number."
      );
      return false;
    }

    if (!password) {
      Alert.alert(
        "Validation Error",
        "Password is required."
      );
      return false;
    }

    if (password.length < 6) {
      Alert.alert(
        "Validation Error",
        "Password must be at least 6 characters."
      );
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        "Validation Error",
        "Passwords do not match."
      );
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user = userCredential.user;

      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          fullName: fullName.trim(),
          email: email
            .trim()
            .toLowerCase(),
          phone: phone.trim(),
          role: "guest",
          createdAt: serverTimestamp(),
        }
      );

      Alert.alert(
        "Success",
        "Account created successfully!",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.replace("Login"),
          },
        ]
      );
    } catch (error) {
      console.log(
        "REGISTER ERROR CODE:",
        error.code
      );
      console.log(
        "REGISTER ERROR MESSAGE:",
        error.message
      );

      let message =
        error?.message ||
        "Unable to create the account.";

      if (
        error.code ===
        "auth/email-already-in-use"
      ) {
        message =
          "An account already uses this email.";
      } else if (
        error.code ===
        "auth/invalid-email"
      ) {
        message =
          "Please enter a valid email address.";
      } else if (
        error.code ===
        "auth/weak-password"
      ) {
        message =
          "Please use a stronger password.";
      }

      Alert.alert(
        "Registration Failed",
        message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);

      const result =
        await continueWithGoogle({
          mode: "register",
        });

      if (result.cancelled) return;

      if (result.created) {
        Alert.alert(
          "Google Account Connected",
          "Your H&K guest account has been created using your Google account.",
          [
            {
              text: "Continue",
              onPress: () =>
                navigation.replace("Main"),
            },
          ]
        );
      } else {
        // The Google account already has an H&K profile, so treat the
        // action as a normal sign-in instead of creating a duplicate.
        navigation.replace("Main");
      }
    } catch (error) {
      console.log(
        "GOOGLE REGISTER ERROR:",
        error
      );

      Alert.alert(
        "Google Registration Failed",
        error?.message ||
          "Unable to continue with Google."
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : "height"
      }
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
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
          <Text style={styles.title}>
            Guest Registration
          </Text>

          <Text style={styles.subtitle}>
            Create an account to order food,
            request services, and manage
            bookings.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
            editable={!busy}
          />

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
            editable={!busy}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!busy}
          />

          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              editable={!busy}
            />

            <TouchableOpacity
              onPress={() =>
                setShowPassword(
                  !showPassword
                )
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

          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Confirm Password"
              secureTextEntry={
                !showConfirmPassword
              }
              value={confirmPassword}
              onChangeText={
                setConfirmPassword
              }
              editable={!busy}
            />

            <TouchableOpacity
              onPress={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
              disabled={busy}
            >
              <Ionicons
                name={
                  showConfirmPassword
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
              styles.button,
              busy && styles.disabledButton,
            ]}
            onPress={handleRegister}
            disabled={busy}
          >
            {loading ? (
              <ActivityIndicator
                color="#fff"
              />
            ) : (
              <Text
                style={styles.buttonText}
              >
                Register
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View
              style={styles.dividerLine}
            />
            <Text style={styles.dividerText}>
              OR
            </Text>
            <View
              style={styles.dividerLine}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.googleButton,
              busy && styles.disabledButton,
            ]}
            onPress={handleGoogle}
            disabled={busy}
            activeOpacity={0.86}
          >
            {googleLoading ? (
              <ActivityIndicator
                color="#6b4f3a"
              />
            ) : (
              <>
                <Ionicons
                  name="logo-google"
                  size={21}
                  color="#4285F4"
                />
                <Text
                  style={
                    styles.googleButtonText
                  }
                >
                  Continue with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.googleHint}>
            Google will provide your name and
            email. You can add a phone number
            to your profile later.
          </Text>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate("Login")
            }
            disabled={busy}
          >
            <Text style={styles.loginText}>
              Already have an account? Login
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
    padding: 20,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: "#6b4f3a",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.65,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 17,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#d1d5db",
  },
  dividerText: {
    color: "#8a8a8a",
    fontSize: 11,
    fontWeight: "700",
    marginHorizontal: 12,
  },
  googleButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleButtonText: {
    color: "#3f3f3f",
    fontWeight: "700",
    fontSize: 15,
    marginLeft: 10,
  },
  googleHint: {
    color: "#777",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 9,
  },
  loginText: {
    marginTop: 18,
    textAlign: "center",
    fontWeight: "600",
  },
  logoCard: {
    width: "100%",
    alignItems: "center",
  },
  logoImage: {
    width: 100,
    height: 100,
  },
  passwordWrap: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
  },
});
