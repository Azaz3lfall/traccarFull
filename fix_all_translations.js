import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Comprehensive translations for all remaining languages
const translations = {
  'ar.json': {
    "routePlanner": "مخطط المسارات",
    "routePlannerBasic": "أساسي",
    "routePlannerEnterStartAddress": "أدخل عنوان البداية...",
    "routePlannerEnterAddress": "أدخل العنوان",
    "routePlannerEnterEndAddress": "أدخل عنوان الوجهة...",
    "routePlannerAddAddress": "إضافة عنوان",
    "routePlannerWaypoints": "نقاط التوقف",
    "routePlannerRoutePlan": "خطة المسار",
    "routePlannerDistance": "المسافة",
    "routePlannerDuration": "المدة",
    "routePlannerSteps": "خطوات",
    "routePlannerStep": "خطوة",
    "routePlannerPlanningRoute": "تخطيط المسار...",
    "routePlannerSelectAddresses": "يرجى اختيار عنوانين على الأقل لتخطيط مسار",
    "routePlannerClickToPlan": "انقر لتخطيط المسار",
    "routePlannerNotEnoughWaypoints": "نقاط التوقف غير كافية لتخطيط المسار"
  },
  'hi.json': {
    "routePlanner": "रूट प्लानर",
    "routePlannerBasic": "बेसिक",
    "routePlannerEnterStartAddress": "प्रारंभिक पता दर्ज करें...",
    "routePlannerEnterAddress": "पता दर्ज करें",
    "routePlannerEnterEndAddress": "गंतव्य पता दर्ज करें...",
    "routePlannerAddAddress": "पता जोड़ें",
    "routePlannerWaypoints": "रास्ते के बिंदु",
    "routePlannerRoutePlan": "रूट योजना",
    "routePlannerDistance": "दूरी",
    "routePlannerDuration": "अवधि",
    "routePlannerSteps": "चरण",
    "routePlannerStep": "चरण",
    "routePlannerPlanningRoute": "रूट की योजना बना रहे हैं...",
    "routePlannerSelectAddresses": "रूट की योजना के लिए कम से कम 2 पते चुनें",
    "routePlannerClickToPlan": "रूट की योजना के लिए क्लिक करें",
    "routePlannerNotEnoughWaypoints": "रूट की योजना के लिए पर्याप्त रास्ते के बिंदु नहीं हैं"
  },
  'nl.json': {
    "routePlanner": "Routeplanner",
    "routePlannerBasic": "Basis",
    "routePlannerEnterStartAddress": "Voer startadres in...",
    "routePlannerEnterAddress": "Voer adres in",
    "routePlannerEnterEndAddress": "Voer bestemmingsadres in...",
    "routePlannerAddAddress": "Adres Toevoegen",
    "routePlannerWaypoints": "Tussenstops",
    "routePlannerRoutePlan": "Routeplan",
    "routePlannerDistance": "Afstand",
    "routePlannerDuration": "Duur",
    "routePlannerSteps": "stappen",
    "routePlannerStep": "Stap",
    "routePlannerPlanningRoute": "Route plannen...",
    "routePlannerSelectAddresses": "Selecteer minimaal 2 adressen om een route te plannen",
    "routePlannerClickToPlan": "Klik om route te plannen",
    "routePlannerNotEnoughWaypoints": "Niet genoeg tussenstops voor routeplanning"
  },
  'sv.json': {
    "routePlanner": "Ruttplanerare",
    "routePlannerBasic": "Grundläggande",
    "routePlannerEnterStartAddress": "Ange startadress...",
    "routePlannerEnterAddress": "Ange adress",
    "routePlannerEnterEndAddress": "Ange destinationsadress...",
    "routePlannerAddAddress": "Lägg till Adress",
    "routePlannerWaypoints": "Vägpunkter",
    "routePlannerRoutePlan": "Ruttplan",
    "routePlannerDistance": "Avstånd",
    "routePlannerDuration": "Varaktighet",
    "routePlannerSteps": "steg",
    "routePlannerStep": "Steg",
    "routePlannerPlanningRoute": "Planerar rutt...",
    "routePlannerSelectAddresses": "Välj minst 2 adresser för att planera en rutt",
    "routePlannerClickToPlan": "Klicka för att planera rutt",
    "routePlannerNotEnoughWaypoints": "Inte tillräckligt med vägpunkter för ruttplanering"
  },
  'pl.json': {
    "routePlanner": "Planista Tras",
    "routePlannerBasic": "Podstawowy",
    "routePlannerEnterStartAddress": "Wprowadź adres początkowy...",
    "routePlannerEnterAddress": "Wprowadź adres",
    "routePlannerEnterEndAddress": "Wprowadź adres docelowy...",
    "routePlannerAddAddress": "Dodaj Adres",
    "routePlannerWaypoints": "Punkty Trasy",
    "routePlannerRoutePlan": "Plan Trasy",
    "routePlannerDistance": "Odległość",
    "routePlannerDuration": "Czas trwania",
    "routePlannerSteps": "kroki",
    "routePlannerStep": "Krok",
    "routePlannerPlanningRoute": "Planowanie trasy...",
    "routePlannerSelectAddresses": "Wybierz co najmniej 2 adresy, aby zaplanować trasę",
    "routePlannerClickToPlan": "Kliknij, aby zaplanować trasę",
    "routePlannerNotEnoughWaypoints": "Niewystarczająca liczba punktów trasy do planowania"
  },
  'tr.json': {
    "routePlanner": "Rota Planlayıcı",
    "routePlannerBasic": "Temel",
    "routePlannerEnterStartAddress": "Başlangıç adresini girin...",
    "routePlannerEnterAddress": "Adres girin",
    "routePlannerEnterEndAddress": "Hedef adresini girin...",
    "routePlannerAddAddress": "Adres Ekle",
    "routePlannerWaypoints": "Durak Noktaları",
    "routePlannerRoutePlan": "Rota Planı",
    "routePlannerDistance": "Mesafe",
    "routePlannerDuration": "Süre",
    "routePlannerSteps": "adımlar",
    "routePlannerStep": "Adım",
    "routePlannerPlanningRoute": "Rota planlanıyor...",
    "routePlannerSelectAddresses": "Rota planlamak için en az 2 adres seçin",
    "routePlannerClickToPlan": "Rota planlamak için tıklayın",
    "routePlannerNotEnoughWaypoints": "Rota planlama için yeterli durak noktası yok"
  },
  'th.json': {
    "routePlanner": "ตัววางแผนเส้นทาง",
    "routePlannerBasic": "พื้นฐาน",
    "routePlannerEnterStartAddress": "ป้อนที่อยู่เริ่มต้น...",
    "routePlannerEnterAddress": "ป้อนที่อยู่",
    "routePlannerEnterEndAddress": "ป้อนที่อยู่ปลายทาง...",
    "routePlannerAddAddress": "เพิ่มที่อยู่",
    "routePlannerWaypoints": "จุดแวะ",
    "routePlannerRoutePlan": "แผนเส้นทาง",
    "routePlannerDistance": "ระยะทาง",
    "routePlannerDuration": "ระยะเวลา",
    "routePlannerSteps": "ขั้นตอน",
    "routePlannerStep": "ขั้นตอน",
    "routePlannerPlanningRoute": "กำลังวางแผนเส้นทาง...",
    "routePlannerSelectAddresses": "กรุณาเลือกที่อยู่อย่างน้อย 2 ที่อยู่เพื่อวางแผนเส้นทาง",
    "routePlannerClickToPlan": "คลิกเพื่อวางแผนเส้นทาง",
    "routePlannerNotEnoughWaypoints": "จุดแวะไม่เพียงพอสำหรับการวางแผนเส้นทาง"
  },
  'vi.json': {
    "routePlanner": "Lập Kế Hoạch Tuyến Đường",
    "routePlannerBasic": "Cơ Bản",
    "routePlannerEnterStartAddress": "Nhập địa chỉ bắt đầu...",
    "routePlannerEnterAddress": "Nhập địa chỉ",
    "routePlannerEnterEndAddress": "Nhập địa chỉ đích...",
    "routePlannerAddAddress": "Thêm Địa Chỉ",
    "routePlannerWaypoints": "Điểm Dừng",
    "routePlannerRoutePlan": "Kế Hoạch Tuyến Đường",
    "routePlannerDistance": "Khoảng Cách",
    "routePlannerDuration": "Thời Gian",
    "routePlannerSteps": "bước",
    "routePlannerStep": "Bước",
    "routePlannerPlanningRoute": "Đang lập kế hoạch tuyến đường...",
    "routePlannerSelectAddresses": "Vui lòng chọn ít nhất 2 địa chỉ để lập kế hoạch tuyến đường",
    "routePlannerClickToPlan": "Nhấp để lập kế hoạch tuyến đường",
    "routePlannerNotEnoughWaypoints": "Không đủ điểm dừng để lập kế hoạch tuyến đường"
  }
};

const l10nDir = path.join(__dirname, 'src', 'resources', 'l10n');

// Process each language file
Object.keys(translations).forEach(filename => {
  const filePath = path.join(l10nDir, filename);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Replace English placeholders with proper translations
      Object.assign(data, translations[filename]);
      
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

console.log('🎉 Translation fixes completed!');
