import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IoniconName) {
  return ({ color }: { color: string }) => (
    <Ionicons name={name} size={22} color={color} />
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 64 + insets.bottom;

  return (
    <Tabs
      screenListeners={{
        tabPress: () => Haptics.selectionAsync(),
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#000',
          borderTopColor: '#1C1C1E',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom + 8,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#555',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'CAPTURE',
          tabBarIcon: tabIcon('camera-outline'),
        }}
      />
      <Tabs.Screen
        name="memory"
        options={{
          title: 'MEMORY',
          tabBarIcon: tabIcon('bookmark-outline'),
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: 'ASK',
          tabBarIcon: tabIcon('chatbubble-outline'),
        }}
      />
      <Tabs.Screen
        name="reconstruct"
        options={{
          title: 'RECONSTRUCT',
          tabBarIcon: tabIcon('layers-outline'),
        }}
      />
    </Tabs>
  );
}
