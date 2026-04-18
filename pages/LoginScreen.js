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
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
        Alert.alert("Error", "Please enter your email and password.");
        return;
    }

    try {
        setLoading(true);

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password
        );

        const user = userCredential.user;
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            Alert.alert("Error", "User profile not found.");
        return;
        }

        navigation.replace("Main");
    } catch (error) {
        let message = "Something went wrong.";

        if (error.code === "auth/invalid-credential") {
        message = "Invalid email or password.";
        } else if (error.code === "auth/user-not-found") {
        message = "No account found with that email.";
        } else if (error.code === "auth/wrong-password") {
        message = "Incorrect password.";
        } else if (error.code === "auth/invalid-email") {
        message = "Invalid email address.";
        }

        Alert.alert("Login Failed", message);
    } finally {
        setLoading(false);
    }
    }

  return (
      <KeyboardAvoidingView
            style={styles.container}
            behavior={"padding"}
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
            Sign in to manage your stay, food orders, and requests.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
            <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
            />
            <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
            >
                <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#777"
                />
            </TouchableOpacity>
            </View>

            <TouchableOpacity
            style={[styles.loginBtn, loading && styles.disabledBtn]}
            onPress={handleLogin}
            disabled={loading}
            >
            {loading ? (
                <ActivityIndicator color="#fff" />
            ) : (
                <Text style={styles.loginText}>Login</Text>
            )}
            </TouchableOpacity>

            <TouchableOpacity
            onPress={() => navigation.navigate("Register")}
            disabled={loading}
            >
            <Text style={styles.registerLink}>
                Don’t have an account? Register
            </Text>
            </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#f7f7f7",
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
  },
  loginBtn: {
    backgroundColor: "#111",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledBtn: {
    opacity: 0.7,
  },
  loginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  registerLink: {
    marginTop: 16,
    textAlign: "center",
    color: "#555",
    fontSize: 14,
  },
  logoCard: {
    width: "100%",
    alignItems: "center"
  },
  logoImage: {
    width: 100,
    height: 100,
  }
});