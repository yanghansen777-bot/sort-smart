import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';

const HELPER_URL = 'http://192.168.86.29:3001/ask';
const AI_URL = Platform.OS === 'web' ? '/api/ask' : HELPER_URL;
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export default function App() {
  const [classDate, setClassDate] = useState('2026-11-12');
  const [classTime, setClassTime] = useState('15:30');
  const [selectedDays, setSelectedDays] = useState([4]);
  const [message, setMessage] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('camera-reminder').then((saved) => {
      if (!saved) return;
      const reminder = JSON.parse(saved);
      setClassDate(reminder.date);
      setClassTime(reminder.time);
      setSelectedDays(reminder.selectedDays || [new Date(`${reminder.date}T00:00:00`).getDay()]);
      setMessage(reminder.message);
    });
    if (Platform.OS !== 'web') Notifications.requestPermissionsAsync();
  }, []);

  async function createReminder() {
    if (!selectedDays.length) {
      Alert.alert('Choose a class day', 'Select at least one day of the week.');
      return;
    }
    setThinking(true);
    setMessage('');
    try {
      const response = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: classDate, time: classTime }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error(data.error?.fix || 'The AI request failed.');
        throw new Error(data.error?.message || 'The AI request failed.');
      }
      setMessage(data.message);
      await AsyncStorage.setItem('camera-reminder', JSON.stringify({ date: classDate, time: classTime, selectedDays, message: data.message }));
      const date = new Date(`${classDate}T${classTime}:00`);
      if (Number.isNaN(date.getTime())) throw new Error('date error');
      try {
        if (Platform.OS === 'web') return;
        await Notifications.cancelAllScheduledNotificationsAsync();
        await Promise.all(selectedDays.map((weekday) => Notifications.scheduleNotificationAsync({
          content: { title: 'Camera Reminder', body: data.message },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: weekday === 0 ? 1 : weekday + 1, hour: Number(classTime.split(':')[0]), minute: Number(classTime.split(':')[1]) },
        })));
      } catch {
        Alert.alert('Reminder saved', 'The reminder is ready, but notifications are turned off. Enable notifications for Expo Go in iPad Settings.');
      }
    } catch (error) {
      Alert.alert('Could not create the reminder', error.message);
    } finally {
      setThinking(false);
    }
  }

  return (
    <SafeAreaView style={[styles.container, Platform.OS === 'web' && styles.webOuter]}>
      <View style={[styles.content, Platform.OS === 'web' && styles.webPhone]}>
        <Text style={styles.eyebrow}>CAMERA REMINDER</Text>
        <Text style={styles.title}>Leave the camera ready for the next person.</Text>
        <Text style={styles.subhead}>Tell me when video production class ends. I’ll remember it for you.</Text>
        <Text style={styles.label}>Class date</Text>
        {Platform.OS === 'web' ? (
          <input aria-label="Class date" type="date" value={classDate} onChange={(event) => setClassDate(event.target.value)} style={styles.webDateInput} />
        ) : (
          <TextInput accessibilityLabel="Class date" style={styles.input} value={classDate} onChangeText={setClassDate} placeholder="YYYY-MM-DD" />
        )}
        <Text style={styles.label}>Class end time</Text>
        <TextInput accessibilityLabel="Class end time" style={styles.input} value={classTime} onChangeText={setClassTime} placeholder="HH:MM" />
        <Text style={styles.label}>Class days</Text>
        <View style={styles.daysRow}>
          {DAY_NAMES.map((day, index) => {
            const selected = selectedDays.includes(index);
            return <Pressable key={day} accessibilityRole="button" onPress={() => setSelectedDays((days) => selected ? days.filter((value) => value !== index) : [...days, index])} style={[styles.dayButton, selected && styles.daySelected]}><Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text></Pressable>;
          })}
        </View>
        <Pressable accessibilityRole="button" disabled={thinking} onPress={createReminder} style={[styles.button, thinking && styles.disabled]}>
          <Text style={styles.buttonText}>{thinking ? 'Thinking…' : 'Save weekly reminders'}</Text>
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
  webOuter: { backgroundColor: '#e7e4dc', alignItems: 'center' },
  webPhone: { width: 400, maxWidth: '100%', minHeight: '100vh', backgroundColor: '#10231d' },
  webDateInput: { backgroundColor: '#f5f7ed', borderRadius: 12, border: 'none', padding: 15, fontSize: 18, color: '#10231d', width: '100%', boxSizing: 'border-box' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  dayButton: { backgroundColor: '#294239', borderRadius: 10, paddingVertical: 11, flex: 1, alignItems: 'center' },
  daySelected: { backgroundColor: '#b8f36b' },
  dayText: { color: '#f5f7ed', fontWeight: '700', fontSize: 12 },
  dayTextSelected: { color: '#10231d' },
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
