import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, Alert } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';

export default function SignInScreen({ navigation }) {
  const { signIn, setActive, isLoaded } = useSignIn();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');

  const onSignInPress = async () => {
    if (!isLoaded) return;

    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });

      await setActive({ session: completeSignIn.createdSessionId });
    } catch (err) {
      Alert.alert('Error', err.errors ? err.errors[0].message : 'Sign in failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In to MyFitBody</Text>

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

      <Button title="Sign In" onPress={onSignInPress} />

      <View style={styles.footer}>
        <Text>Don't have an account? </Text>
        <Button title="Sign Up" onPress={() => navigation.navigate('SignUp')} />
      </View>
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
