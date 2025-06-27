import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert, Keyboard, TouchableWithoutFeedback } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { registerUser, loginUser } from "../utils/api";

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await loginUser({ username: email, password });
        const token = res.data?.access_token;
        if (token) {
          await AsyncStorage.setItem("access_token", token);
        }
        Alert.alert("Login successful");
        router.replace("/(tabs)");
      } else {
        await registerUser({ email, password, name });
        Alert.alert("Registration successful, please login");
        setIsLogin(true);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <Text style={styles.title}>{isLogin ? "Login" : "Register"}</Text>
        {!isLogin && (
          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Alice)"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            maxLength={32}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Email (e.g. alice@email.com)"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          maxLength={64}
        />
        <TextInput
          style={styles.input}
          placeholder="Password (at least 6 chars)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          onSubmitEditing={handleSubmit}
          maxLength={32}
        />
        <Button
          title={loading ? "Processing..." : isLogin ? "Login" : "Register"}
          onPress={handleSubmit}
          disabled={loading}
        />
        <Text style={styles.switch} onPress={() => setIsLogin(!isLogin)}>
          {isLogin ? "No account? Register" : "Already have an account? Login"}
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  switch: {
    marginTop: 16,
    color: "#007bff",
    textDecorationLine: "underline",
  },
});
