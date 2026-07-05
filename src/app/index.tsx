import * as FileSystem from 'expo-file-system/legacy';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

const FLAG = `${FileSystem.documentDirectory}onboarding_done`;

export default function Root() {
  const [checked, setChecked] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    FileSystem.getInfoAsync(FLAG).then(info => {
      setDone(info.exists);
      setChecked(true);
    });
  }, []);

  if (!checked) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  return <Redirect href={done ? '/login' : '/onboarding'} />;
}
