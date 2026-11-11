import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

const HELPER_URL = 'http://192.168.86.29:3001/ask';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function App() {
  const [classDate, setClassDate] = useState('2026-11-12');
  const [classTime, setClassTime] = useState('15:30');
  const [message, setMessage] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('camera-reminder').then((saved) => {
      if (!saved) return;
      const reminder = JSON.parse(saved);
      setClassDate(reminder.date);
      setClassTime(reminder.time);
      setMessage(reminder.message);
    });
    Notifications.requestPermissionsAsync();
  }, []);

  async function createReminder() {
    setThinking(true);
    setMessage('');
    try {
      const response = await fetch(HELPER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: classDate, time: classTime }),
      });
      if (!response.ok) throw new Error('helper error');
      const data = await response.json();
      setMessage(data.message);
      await AsyncStorage.setItem('camera-reminder', JSON.stringify({ date: classDate, time: classTime, message: data.message }));
      const date = new Date(`${classDate}T${classTime}:00`);
      if (Number.isNaN(date.getTime())) throw new Error('date error');
      try {
        await Notifications.scheduleNotificationAsync({
          content: { title: 'Camera Reminder', body: data.message },
          trigger: { date },
        });
      } catch {
        Alert.alert('Reminder saved', 'The reminder is ready, but notifications are turned off. Enable notifications for Expo Go in iPad Settings.');
      }
    } catch {
      Alert.alert('Could not create the reminder', 'Please check your OpenAI key, Wi-Fi, and that the helper is running.');
    } finally {
      setThinking(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>CAMERA REMINDER</Text>
        <Text style={styles.title}>Leave the camera ready for the next person.</Text>
        <Text style={styles.subhead}>Tell me when video production class ends. I’ll remember it for you.</Text>
        <Text style={styles.label}>Class date</Text>
        <TextInput accessibilityLabel="Class date" style={styles.input} value={classDate} onChangeText={setClassDate} placeholder="YYYY-MM-DD" />
        <Text style={styles.label}>Class end time</Text>
        <TextInput accessibilityLabel="Class end time" style={styles.input} value={classTime} onChangeText={setClassTime} placeholder="HH:MM" />
        <Pressable accessibilityRole="button" disabled={thinking} onPress={createReminder} style={[styles.button, thinking && styles.disabled]}>
          <Text style={styles.buttonText}>{thinking ? 'Thinking…' : 'Remind me'}</Text>
        </Pressable>
        {message ? <View style={styles.card}><Text style={styles.cardTitle}>YOUR REMINDER</Text><Text style={styles.reminder}>{message}</Text></View> : null}
        <Text style={styles.safety}>Safety first: turn the camera off, ask the teacher if you need help, and follow the camera manual.</Text>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10231d',
  },
  content: { padding: 24, gap: 12 },
  eyebrow: { color: '#b8f36b', fontWeight: '800', letterSpacing: 2, fontSize: 13 },
  title: { color: '#f5f7ed', fontSize: 32, fontWeight: '800', lineHeight: 37, marginTop: 6 },
  subhead: { color: '#c7d3cb', fontSize: 17, lineHeight: 24, marginBottom: 16 },
  label: { color: '#f5f7ed', fontSize: 15, fontWeight: '700', marginTop: 4 },
  input: { backgroundColor: '#f5f7ed', borderRadius: 12, padding: 15, fontSize: 18, color: '#10231d' },
  button: { backgroundColor: '#b8f36b', borderRadius: 12, padding: 17, alignItems: 'center', marginTop: 8 },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#10231d', fontWeight: '800', fontSize: 18 },
  card: { backgroundColor: '#f5f7ed', borderRadius: 16, padding: 18, marginTop: 16 },
  cardTitle: { color: '#51705c', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 },
  reminder: { color: '#10231d', fontSize: 24, lineHeight: 30, fontWeight: '800', marginTop: 8 },
  safety: { color: '#b8c8bd', fontSize: 13, lineHeight: 19, marginTop: 12 },
});
