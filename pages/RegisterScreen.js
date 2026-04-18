import React, { useState } from "react";
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
  ImageBackground
} from "react-native";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../FirebaseConfig";

export default function RegisterScreen({ navigation }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert("Validation Error", "Full name is required.");
      return false;
    }

    if (!email.trim()) {
      Alert.alert("Validation Error", "Email is required.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Validation Error", "Please enter a valid email.");
      return false;
    }

    if (!phone.trim()) {
      Alert.alert("Validation Error", "Phone number is required.");
      return false;
    }

    if (phone.length < 10) {
      Alert.alert("Validation Error", "Please enter a valid phone number.");
      return false;
    }

    if (!password) {
      Alert.alert("Validation Error", "Password is required.");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Validation Error", "Password must be at least 6 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Validation Error", "Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: "guest",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Account created successfully!", [
        {
          text: "OK",
          onPress: () => navigation.replace("Login"),
        },
      ]);
    } catch (error) {
      console.log("REGISTER ERROR CODE:", error.code);
      console.log("REGISTER ERROR MESSAGE:", error.message);

      Alert.alert(
        "Registration Failed",
        `${error.code}\n${error.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
      <KeyboardAvoidingView
        behavior={"padding"}
        style={styles.container}
      >
          <View style={styles.logoCard}>
            <Image
                source={require("../assets/images/logohotel.png")}
                style={styles.logoImage}
            />
        </View>
        <View style={styles.card}>
          <Text style={styles.title}>Guest Registration</Text>
          <Text style={styles.subtitle}>
            Create an account to order food, request services, and manage bookings.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={fullName}
            onChangeText={setFullName}
          />

          <TextInput
            style={styles.input}
            placeholder="Email Address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginText}>
              Already have an account? Login
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f7f7",
    justifyContent: "center",
    padding: 20,
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
    backgroundColor: "#000000",
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
  loginText: {
    marginTop: 18,
    textAlign: "center",
    fontWeight: "600",
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