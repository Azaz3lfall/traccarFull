import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all files that still have English placeholders
const l10nDir = path.join(__dirname, 'src', 'resources', 'l10n');
const filesWithEnglish = [];

// Check each language file
const languageFiles = fs.readdirSync(l10nDir).filter(file => file.endsWith('.json'));

languageFiles.forEach(filename => {
  const filePath = path.join(l10nDir, filename);
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('"routePlannerSelectAddresses": "Please select at least 2 addresses to plan a route"')) {
    filesWithEnglish.push(filename);
  }
});

console.log(`Found ${filesWithEnglish.length} files with English placeholders:`);
filesWithEnglish.forEach(file => console.log(`  - ${file}`));

// Comprehensive translations for remaining languages
const translations = {
  'af.json': {
    "routePlanner": "Roete Beplanner",
    "routePlannerBasic": "Basies",
    "routePlannerEnterStartAddress": "Voer begin adres in...",
    "routePlannerEnterAddress": "Voer adres in",
    "routePlannerEnterEndAddress": "Voer eind adres in...",
    "routePlannerAddAddress": "Voeg Adres By",
    "routePlannerWaypoints": "Wegpunte",
    "routePlannerRoutePlan": "Roete Plan",
    "routePlannerDistance": "Afstand",
    "routePlannerDuration": "Duur",
    "routePlannerSteps": "stappe",
    "routePlannerStep": "Stap",
    "routePlannerPlanningRoute": "Beplan roete...",
    "routePlannerSelectAddresses": "Kies asseblief ten minste 2 adresse om 'n roete te beplan",
    "routePlannerClickToPlan": "Klik om roete te beplan",
    "routePlannerNotEnoughWaypoints": "Nie genoeg wegpunte vir roete beplanning nie"
  },
  'az.json': {
    "routePlanner": "Marşrut Planlayıcı",
    "routePlannerBasic": "Əsas",
    "routePlannerEnterStartAddress": "Başlanğıc ünvanını daxil edin...",
    "routePlannerEnterAddress": "Ünvanı daxil edin",
    "routePlannerEnterEndAddress": "Təyinat ünvanını daxil edin...",
    "routePlannerAddAddress": "Ünvan Əlavə Et",
    "routePlannerWaypoints": "Dayanacaq Nöqtələri",
    "routePlannerRoutePlan": "Marşrut Planı",
    "routePlannerDistance": "Məsafə",
    "routePlannerDuration": "Müddət",
    "routePlannerSteps": "addımlar",
    "routePlannerStep": "Addım",
    "routePlannerPlanningRoute": "Marşrut planlanır...",
    "routePlannerSelectAddresses": "Marşrut planlamaq üçün ən azı 2 ünvan seçin",
    "routePlannerClickToPlan": "Planlamaq üçün klikləyin",
    "routePlannerNotEnoughWaypoints": "Marşrut planlamaq üçün kifayət qədər dayanacaq nöqtəsi yoxdur"
  },
  'bg.json': {
    "routePlanner": "Планировчик на маршрути",
    "routePlannerBasic": "Основен",
    "routePlannerEnterStartAddress": "Въведете начален адрес...",
    "routePlannerEnterAddress": "Въведете адрес",
    "routePlannerEnterEndAddress": "Въведете крайен адрес...",
    "routePlannerAddAddress": "Добави адрес",
    "routePlannerWaypoints": "Междинни точки",
    "routePlannerRoutePlan": "План на маршрута",
    "routePlannerDistance": "Разстояние",
    "routePlannerDuration": "Продължителност",
    "routePlannerSteps": "стъпки",
    "routePlannerStep": "Стъпка",
    "routePlannerPlanningRoute": "Планиране на маршрут...",
    "routePlannerSelectAddresses": "Моля, изберете поне 2 адреса за планиране на маршрут",
    "routePlannerClickToPlan": "Кликнете за планиране на маршрут",
    "routePlannerNotEnoughWaypoints": "Недостатъчно междинни точки за планиране на маршрут"
  },
  'bn.json': {
    "routePlanner": "রুট প্ল্যানার",
    "routePlannerBasic": "বেসিক",
    "routePlannerEnterStartAddress": "শুরু করার ঠিকানা লিখুন...",
    "routePlannerEnterAddress": "ঠিকানা লিখুন",
    "routePlannerEnterEndAddress": "গন্তব্যের ঠিকানা লিখুন...",
    "routePlannerAddAddress": "ঠিকানা যোগ করুন",
    "routePlannerWaypoints": "পথের বিন্দু",
    "routePlannerRoutePlan": "রুট পরিকল্পনা",
    "routePlannerDistance": "দূরত্ব",
    "routePlannerDuration": "সময়কাল",
    "routePlannerSteps": "ধাপ",
    "routePlannerStep": "ধাপ",
    "routePlannerPlanningRoute": "রুট পরিকল্পনা করা হচ্ছে...",
    "routePlannerSelectAddresses": "রুট পরিকল্পনার জন্য কমপক্ষে ২টি ঠিকানা নির্বাচন করুন",
    "routePlannerClickToPlan": "রুট পরিকল্পনার জন্য ক্লিক করুন",
    "routePlannerNotEnoughWaypoints": "রুট পরিকল্পনার জন্য পর্যাপ্ত পথের বিন্দু নেই"
  },
  'ca.json': {
    "routePlanner": "Planificador de Rutes",
    "routePlannerBasic": "Bàsic",
    "routePlannerEnterStartAddress": "Introduïu l'adreça d'inici...",
    "routePlannerEnterAddress": "Introduïu l'adreça",
    "routePlannerEnterEndAddress": "Introduïu l'adreça de destinació...",
    "routePlannerAddAddress": "Afegir Adreça",
    "routePlannerWaypoints": "Punts de Parada",
    "routePlannerRoutePlan": "Pla de Ruta",
    "routePlannerDistance": "Distància",
    "routePlannerDuration": "Durada",
    "routePlannerSteps": "passos",
    "routePlannerStep": "Pas",
    "routePlannerPlanningRoute": "Planificant ruta...",
    "routePlannerSelectAddresses": "Si us plau, seleccioneu almenys 2 adreces per planificar una ruta",
    "routePlannerClickToPlan": "Feu clic per planificar ruta",
    "routePlannerNotEnoughWaypoints": "Punts de parada insuficients per planificar ruta"
  },
  'cs.json': {
    "routePlanner": "Plánovač Tras",
    "routePlannerBasic": "Základní",
    "routePlannerEnterStartAddress": "Zadejte počáteční adresu...",
    "routePlannerEnterAddress": "Zadejte adresu",
    "routePlannerEnterEndAddress": "Zadejte cílovou adresu...",
    "routePlannerAddAddress": "Přidat Adresu",
    "routePlannerWaypoints": "Zastávky",
    "routePlannerRoutePlan": "Plán Trasy",
    "routePlannerDistance": "Vzdálenost",
    "routePlannerDuration": "Doba",
    "routePlannerSteps": "kroky",
    "routePlannerStep": "Krok",
    "routePlannerPlanningRoute": "Plánování trasy...",
    "routePlannerSelectAddresses": "Prosím, vyberte alespoň 2 adresy pro plánování trasy",
    "routePlannerClickToPlan": "Klikněte pro plánování trasy",
    "routePlannerNotEnoughWaypoints": "Nedostatek zastávek pro plánování trasy"
  },
  'da.json': {
    "routePlanner": "Ruteplanlægger",
    "routePlannerBasic": "Grundlæggende",
    "routePlannerEnterStartAddress": "Indtast startadresse...",
    "routePlannerEnterAddress": "Indtast adresse",
    "routePlannerEnterEndAddress": "Indtast destinationsadresse...",
    "routePlannerAddAddress": "Tilføj Adresse",
    "routePlannerWaypoints": "Mellemstoppe",
    "routePlannerRoutePlan": "Ruteplan",
    "routePlannerDistance": "Afstand",
    "routePlannerDuration": "Varighed",
    "routePlannerSteps": "trin",
    "routePlannerStep": "Trin",
    "routePlannerPlanningRoute": "Planlægger rute...",
    "routePlannerSelectAddresses": "Vælg venligst mindst 2 adresser for at planlægge en rute",
    "routePlannerClickToPlan": "Klik for at planlægge rute",
    "routePlannerNotEnoughWaypoints": "Ikke nok mellemstoppe til ruteplanlægning"
  },
  'el.json': {
    "routePlanner": "Σχεδιαστής Διαδρομών",
    "routePlannerBasic": "Βασικό",
    "routePlannerEnterStartAddress": "Εισάγετε διεύθυνση έναρξης...",
    "routePlannerEnterAddress": "Εισάγετε διεύθυνση",
    "routePlannerEnterEndAddress": "Εισάγετε διεύθυνση προορισμού...",
    "routePlannerAddAddress": "Προσθήκη Διεύθυνσης",
    "routePlannerWaypoints": "Σημεία Στάσης",
    "routePlannerRoutePlan": "Σχέδιο Διαδρομής",
    "routePlannerDistance": "Απόσταση",
    "routePlannerDuration": "Διάρκεια",
    "routePlannerSteps": "βήματα",
    "routePlannerStep": "Βήμα",
    "routePlannerPlanningRoute": "Σχεδιασμός διαδρομής...",
    "routePlannerSelectAddresses": "Παρακαλώ επιλέξτε τουλάχιστον 2 διευθύνσεις για σχεδιασμό διαδρομής",
    "routePlannerClickToPlan": "Κάντε κλικ για σχεδιασμό διαδρομής",
    "routePlannerNotEnoughWaypoints": "Ανεπαρκή σημεία στάσης για σχεδιασμό διαδρομής"
  }
};

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
