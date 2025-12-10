import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Alert } from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';

export default function SignUpScreen({ navigation }) {
  const { isLoaded, signUp, setActive } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      setPendingVerification(true);
    } catch (err) {
      Alert.alert('Error', err.errors ? err.errors[0].message : 'Sign up failed');
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      await setActive({ session: completeSignUp.createdSessionId });
    } catch (err) {
      Alert.alert('Error', err.errors ? err.errors[0].message : 'Verification failed');
    }
  };

  return (
    <View style={styles.container}>
      {!pendingVerification ? (
        <>
          <Text style={styles.title}>Sign Up for MyFitBody</Text>

          <TextInput
            autoCapitalize="none"
            value={emailAddress}
            placeholder="Email"
            onChangeText={(email) => setEmailAddress(email)}
            style={styles.input}
          />

          <TextInput
            value={password}
            placeholder="Password"
            secureTextEntry
            onChangeText={(password) => setPassword(password)}
            style={styles.input}
          />

          <Button title="Sign Up" onPress={onSignUpPress} />

          <View style={styles.footer}>
            <Text>Already have an account? </Text>
            <Button title="Sign In" onPress={() => navigation.navigate('SignIn')} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to {emailAddress}
          </Text>

          <TextInput
            value={code}
            placeholder="Enter verification code"
            onChangeText={(code) => setCode(code)}
            style={styles.input}
            keyboardType="number-pad"
          />

          <Button title="Verify Email" onPress={onVerifyPress} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 15,
    borderRadius: 5,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
});
