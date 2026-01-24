import { useTelegram } from "@/hooks/useTelegram";
import { useAppStore } from "@/stores/useAppStore";
import { TabBar } from "@/shared/ui/TabBar";
import CalendarScreen from "@/screens/CalendarScreen";
import ScheduleScreen from "@/screens/ScheduleScreen";
import ClientsScreen from "@/screens/ClientsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import BookingSheet from "@/features/booking/BookingSheet";

const App = () => {
  useTelegram();
  const activeScreen = useAppStore((state) => state.activeScreen);
  const setActiveScreen = useAppStore((state) => state.setActiveScreen);
  const bookingOpen = useAppStore((state) => state.bookingOpen);
  const closeBooking = useAppStore((state) => state.closeBooking);

  return (
    <div className="app-shell">
      {activeScreen === "calendar" && <CalendarScreen />}
      {activeScreen === "schedule" && <ScheduleScreen />}
      {activeScreen === "clients" && <ClientsScreen />}
      {activeScreen === "settings" && <SettingsScreen />}

      <BookingSheet open={bookingOpen} onClose={closeBooking} />
      <TabBar active={activeScreen} onChange={setActiveScreen} />
    </div>
  );
};

export default App;
