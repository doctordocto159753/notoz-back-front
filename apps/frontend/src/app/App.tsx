import { NotoProvider } from "./components/noto/store";
import { AppShell } from "./components/noto/AppShell";
import { Toaster } from "sonner";

export default function App() {
  return (
    <NotoProvider>
      <div className="h-screen w-screen overflow-hidden" style={{ fontFamily: "'Vazirmatn', system-ui, sans-serif" }}>
        <AppShell />
        <Toaster
          position="bottom-center"
          dir="rtl"
          toastOptions={{
            className: "!rounded-xl !border-divider !shadow-lg !font-[Vazirmatn]",
            style: {
              fontFamily: "'Vazirmatn', system-ui, sans-serif",
            },
          }}
          richColors
        />
      </div>
    </NotoProvider>
  );
}
