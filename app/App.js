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
  const [sessions, setSessions] = useState([{ date: '2026-11-12', time: '15:30' }]);
  const [selectedDays, setSelectedDays] = useState([4]);
  const [message, setMessage] = useState('');
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('camera-reminder').then((saved) => {
      if (!saved) return;
      const reminder = JSON.parse(saved);
      setSessions(reminder.sessions || [{ date: reminder.date, time: reminder.time }]);
      setSelectedDays(reminder.selectedDays || [new Date(`${reminder.date}T00:00:00`).getDay()]);
      setMessage(reminder.message);
    });
    if (Platform.OS !== 'web') {
      Notifications.requestPermissionsAsync();
      if (Platform.OS === 'android') Notifications.setNotificationChannelAsync('camera-reminder', { name: 'Camera Reminder', importance: Notifications.AndroidImportance.MAX, sound: 'default', vibrationPattern: [0, 250, 250, 250] });
    }
  }, []);

  async function createReminder() {
    if (!selectedDays.length) {
      Alert.alert('Choose a class day', 'Select at least one day of the week.');
      return;
    }
    setThinking(true);
    setMessage('');
    try {
    const firstSession = sessions[0];
    const response = await fetch(AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: firstSession.date, time: firstSession.time }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error(data.error?.fix || 'The AI request failed.');
        throw new Error(data.error?.message || 'The AI request failed.');
      }
      setMessage(data.message);
      await AsyncStorage.setItem('camera-reminder', JSON.stringify({ sessions, selectedDays, message: data.message }));
      const dates = sessions.map((session) => new Date(`${session.date}T${session.time}:00`));
      if (dates.some((date) => Number.isNaN(date.getTime()))) throw new Error('Check each class date and time.');
      try {
        if (Platform.OS === 'web') return;
        await Notifications.cancelAllScheduledNotificationsAsync();
        const weeklyReminders = selectedDays.map((weekday) => Notifications.scheduleNotificationAsync({
          content: { title: 'CAMERA CHECK', body: data.message, sound: 'default', priority: Notifications.AndroidNotificationPriority.MAX, channelId: 'camera-reminder' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: weekday === 0 ? 1 : weekday + 1, hour: Number(firstSession.time.split(':')[0]), minute: Number(firstSession.time.split(':')[1]) },
        }));
        await Promise.all([...dates.map((date) => Notifications.scheduleNotificationAsync({
          content: { title: 'CAMERA CHECK', body: data.message, sound: 'default', priority: Notifications.AndroidNotificationPriority.MAX, channelId: 'camera-reminder' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
        })), ...weeklyReminders]);
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
        <Text style={styles.label}>Class dates and end times</Text>
        {sessions.map((session, index) => <View key={`session-${index}`} style={styles.sessionRow}>
          {Platform.OS === 'web' ? (
            <input aria-label={`Class date ${index + 1}`} type="date" value={session.date} onChange={(event) => setSessions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item))} style={styles.webDateInput} />
          ) : (
            <TextInput accessibilityLabel={`Class date ${index + 1}`} style={styles.input} value={session.date} onChangeText={(value) => setSessions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, date: value } : item))} placeholder="YYYY-MM-DD" />
          )}
          <TextInput accessibilityLabel={`Class time ${index + 1}`} style={styles.input} value={session.time} onChangeText={(value) => setSessions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, time: value } : item))} placeholder="HH:MM" />
          {sessions.length > 1 ? <Pressable accessibilityRole="button" onPress={() => setSessions((items) => items.filter((_, itemIndex) => itemIndex !== index))}><Text style={styles.removeText}>Remove</Text></Pressable> : null}
        </View>)}
        <Pressable accessibilityRole="button" onPress={() => setSessions((items) => [...items, { date: '', time: '' }])}><Text style={styles.addText}>+ Add another class</Text></Pressable>
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
        {message ? <View accessibilityLiveRegion="assertive" style={styles.card}><Text style={styles.cardTitle}>CAMERA CHECK — NOTICE</Text><Text style={styles.reminder}>{message}</Text></View> : null}
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
  sessionRow: { gap: 8, marginBottom: 4 },
  addText: { color: '#b8f36b', fontSize: 15, fontWeight: '800', marginTop: 2 },
  removeText: { color: '#f2a6a6', fontSize: 13, fontWeight: '700' },
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
  card: { backgroundColor: '#b8f36b', borderRadius: 16, padding: 20, marginTop: 16, borderWidth: 3, borderColor: '#f5f7ed' },
  cardTitle: { color: '#10231d', fontSize: 14, fontWeight: '900', letterSpacing: 1.5 },
  reminder: { color: '#10231d', fontSize: 27, lineHeight: 33, fontWeight: '900', marginTop: 8 },
  safety: { color: '#b8c8bd', fontSize: 13, lineHeight: 19, marginTop: 12 },
});
