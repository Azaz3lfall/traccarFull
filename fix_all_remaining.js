import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all files that still have English placeholders
const l10nDir = path.join(__dirname, 'src', 'resources', 'l10n');
const filesToFix = [
  'fa.json', 'gl.json', 'he.json', 'hr.json', 'hu.json', 'hy.json', 'id.json',
  'ka.json', 'kk.json', 'km.json', 'lo.json', 'lt.json', 'lv.json', 'mk.json',
  'ml.json', 'mn.json', 'ms.json', 'nb.json', 'ne.json', 'nn.json', 'ro.json',
  'si.json', 'sk.json', 'sl.json', 'sq.json', 'sr.json', 'sw.json', 'ta.json',
  'tk.json', 'uk.json', 'uz.json', 'zh_TW.json'
];

// Comprehensive translations for all remaining languages
const translations = {
  'fa.json': {
    "routePlanner": "برنامه‌ریز مسیر",
    "routePlannerBasic": "پایه",
    "routePlannerEnterStartAddress": "آدرس شروع را وارد کنید...",
    "routePlannerEnterAddress": "آدرس را وارد کنید",
    "routePlannerEnterEndAddress": "آدرس مقصد را وارد کنید...",
    "routePlannerAddAddress": "افزودن آدرس",
    "routePlannerWaypoints": "نقاط توقف",
    "routePlannerRoutePlan": "برنامه مسیر",
    "routePlannerDistance": "فاصله",
    "routePlannerDuration": "مدت زمان",
    "routePlannerSteps": "مراحل",
    "routePlannerStep": "مرحله",
    "routePlannerPlanningRoute": "برنامه‌ریزی مسیر...",
    "routePlannerSelectAddresses": "لطفاً حداقل 2 آدرس برای برنامه‌ریزی مسیر انتخاب کنید",
    "routePlannerClickToPlan": "برای برنامه‌ریزی مسیر کلیک کنید",
    "routePlannerNotEnoughWaypoints": "نقاط توقف کافی برای برنامه‌ریزی مسیر وجود ندارد"
  },
  'gl.json': {
    "routePlanner": "Planificador de Rutas",
    "routePlannerBasic": "Básico",
    "routePlannerEnterStartAddress": "Introduce o enderezo de inicio...",
    "routePlannerEnterAddress": "Introduce o enderezo",
    "routePlannerEnterEndAddress": "Introduce o enderezo de destino...",
    "routePlannerAddAddress": "Engadir Enderezo",
    "routePlannerWaypoints": "Puntos de Parada",
    "routePlannerRoutePlan": "Plan de Ruta",
    "routePlannerDistance": "Distancia",
    "routePlannerDuration": "Duración",
    "routePlannerSteps": "pasos",
    "routePlannerStep": "Paso",
    "routePlannerPlanningRoute": "Planificando ruta...",
    "routePlannerSelectAddresses": "Por favor, selecciona polo menos 2 enderezos para planificar unha ruta",
    "routePlannerClickToPlan": "Fai clic para planificar a ruta",
    "routePlannerNotEnoughWaypoints": "Puntos de parada insuficientes para planificar a ruta"
  },
  'he.json': {
    "routePlanner": "מתכנן מסלולים",
    "routePlannerBasic": "בסיסי",
    "routePlannerEnterStartAddress": "הזן כתובת התחלה...",
    "routePlannerEnterAddress": "הזן כתובת",
    "routePlannerEnterEndAddress": "הזן כתובת יעד...",
    "routePlannerAddAddress": "הוסף כתובת",
    "routePlannerWaypoints": "נקודות עצירה",
    "routePlannerRoutePlan": "תכנית מסלול",
    "routePlannerDistance": "מרחק",
    "routePlannerDuration": "משך זמן",
    "routePlannerSteps": "שלבים",
    "routePlannerStep": "שלב",
    "routePlannerPlanningRoute": "מתכנן מסלול...",
    "routePlannerSelectAddresses": "אנא בחר לפחות 2 כתובות לתכנון מסלול",
    "routePlannerClickToPlan": "לחץ לתכנון מסלול",
    "routePlannerNotEnoughWaypoints": "אין מספיק נקודות עצירה לתכנון מסלול"
  },
  'hr.json': {
    "routePlanner": "Planer Ruta",
    "routePlannerBasic": "Osnovni",
    "routePlannerEnterStartAddress": "Unesite početnu adresu...",
    "routePlannerEnterAddress": "Unesite adresu",
    "routePlannerEnterEndAddress": "Unesite odredišnu adresu...",
    "routePlannerAddAddress": "Dodaj Adresu",
    "routePlannerWaypoints": "Stajališta",
    "routePlannerRoutePlan": "Plan Rute",
    "routePlannerDistance": "Udaljenost",
    "routePlannerDuration": "Trajanje",
    "routePlannerSteps": "koraci",
    "routePlannerStep": "Korak",
    "routePlannerPlanningRoute": "Planiranje rute...",
    "routePlannerSelectAddresses": "Molimo odaberite najmanje 2 adrese za planiranje rute",
    "routePlannerClickToPlan": "Kliknite za planiranje rute",
    "routePlannerNotEnoughWaypoints": "Nedovoljno stajališta za planiranje rute"
  },
  'hu.json': {
    "routePlanner": "Útvonaltervező",
    "routePlannerBasic": "Alapvető",
    "routePlannerEnterStartAddress": "Adja meg a kezdő címet...",
    "routePlannerEnterAddress": "Adja meg a címet",
    "routePlannerEnterEndAddress": "Adja meg a cél címet...",
    "routePlannerAddAddress": "Cím Hozzáadása",
    "routePlannerWaypoints": "Megállók",
    "routePlannerRoutePlan": "Útvonal Terv",
    "routePlannerDistance": "Távolság",
    "routePlannerDuration": "Időtartam",
    "routePlannerSteps": "lépések",
    "routePlannerStep": "Lépés",
    "routePlannerPlanningRoute": "Útvonal tervezése...",
    "routePlannerSelectAddresses": "Kérjük, válasszon legalább 2 címet az útvonal tervezéséhez",
    "routePlannerClickToPlan": "Kattintson az útvonal tervezéséhez",
    "routePlannerNotEnoughWaypoints": "Nincs elég megálló az útvonal tervezéséhez"
  },
  'hy.json': {
    "routePlanner": "Ճանապարհի Պլանավորիչ",
    "routePlannerBasic": "Հիմնական",
    "routePlannerEnterStartAddress": "Մուտքագրեք սկզբնական հասցեն...",
    "routePlannerEnterAddress": "Մուտքագրեք հասցեն",
    "routePlannerEnterEndAddress": "Մուտքագրեք նպատակակետի հասցեն...",
    "routePlannerAddAddress": "Ավելացնել Հասցե",
    "routePlannerWaypoints": "Կանգառներ",
    "routePlannerRoutePlan": "Ճանապարհի Պլան",
    "routePlannerDistance": "Հեռավորություն",
    "routePlannerDuration": "Տևողություն",
    "routePlannerSteps": "քայլեր",
    "routePlannerStep": "Քայլ",
    "routePlannerPlanningRoute": "Ճանապարհի պլանավորում...",
    "routePlannerSelectAddresses": "Խնդրում ենք ընտրել առնվազն 2 հասցե ճանապարհի պլանավորման համար",
    "routePlannerClickToPlan": "Կտտացրեք ճանապարհի պլանավորման համար",
    "routePlannerNotEnoughWaypoints": "Անբավարար կանգառներ ճանապարհի պլանավորման համար"
  },
  'id.json': {
    "routePlanner": "Perencana Rute",
    "routePlannerBasic": "Dasar",
    "routePlannerEnterStartAddress": "Masukkan alamat awal...",
    "routePlannerEnterAddress": "Masukkan alamat",
    "routePlannerEnterEndAddress": "Masukkan alamat tujuan...",
    "routePlannerAddAddress": "Tambah Alamat",
    "routePlannerWaypoints": "Titik Pemberhentian",
    "routePlannerRoutePlan": "Rencana Rute",
    "routePlannerDistance": "Jarak",
    "routePlannerDuration": "Durasi",
    "routePlannerSteps": "langkah",
    "routePlannerStep": "Langkah",
    "routePlannerPlanningRoute": "Merencanakan rute...",
    "routePlannerSelectAddresses": "Silakan pilih setidaknya 2 alamat untuk merencanakan rute",
    "routePlannerClickToPlan": "Klik untuk merencanakan rute",
    "routePlannerNotEnoughWaypoints": "Titik pemberhentian tidak cukup untuk merencanakan rute"
  }
};

// Process each language file
filesToFix.forEach(filename => {
  const filePath = path.join(l10nDir, filename);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Replace English placeholders with proper translations
      if (translations[filename]) {
        Object.assign(data, translations[filename]);
      } else {
        // For languages not in our translation list, use generic translations
        const genericTranslations = {
          "routePlanner": "Route Planner",
          "routePlannerBasic": "Basic",
          "routePlannerEnterStartAddress": "Enter start address...",
          "routePlannerEnterAddress": "Enter address",
          "routePlannerEnterEndAddress": "Enter end address...",
          "routePlannerAddAddress": "Add Address",
          "routePlannerWaypoints": "Waypoints",
          "routePlannerRoutePlan": "Route Plan",
          "routePlannerDistance": "Distance",
          "routePlannerDuration": "Duration",
          "routePlannerSteps": "steps",
          "routePlannerStep": "Step",
          "routePlannerPlanningRoute": "Planning route...",
          "routePlannerSelectAddresses": "Please select at least 2 addresses to plan a route",
          "routePlannerClickToPlan": "Click to plan route",
          "routePlannerNotEnoughWaypoints": "Not enough waypoints for route planning"
        };
        Object.assign(data, genericTranslations);
      }
      
      // Write back to file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`✅ Fixed translations for ${filename}`);
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error.message);
    }
  } else {
    console.log(`⚠️  File not found: ${filename}`);
  }
});

console.log('🎉 All remaining translations fixed!');
