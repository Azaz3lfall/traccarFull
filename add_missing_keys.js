import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Translations for the missing keys
const missingKeys = {
  'routePlannerWith': {
    'en': 'with',
    'pt_BR': 'com',
    'ru': 'с',
    'de': 'mit',
    'fr': 'avec',
    'es': 'con',
    'zh': '与',
    'ja': 'と',
    'ko': '와',
    'ar': 'مع',
    'hi': 'के साथ',
    'it': 'con',
    'nl': 'met',
    'sv': 'med',
    'da': 'med',
    'no': 'med',
    'fi': 'kanssa',
    'pl': 'z',
    'cs': 's',
    'hu': 'val',
    'ro': 'cu',
    'bg': 'с',
    'hr': 's',
    'sk': 's',
    'sl': 'z',
    'et': 'koos',
    'lv': 'ar',
    'lt': 'su',
    'uk': 'з',
    'be': 'з',
    'mk': 'со',
    'sr': 'са',
    'sq': 'me',
    'el': 'με',
    'tr': 'ile',
    'az': 'ilə',
    'kk': 'мен',
    'ky': 'менен',
    'uz': 'bilan',
    'mn': 'тай',
    'ka': 'თან',
    'hy': 'հետ',
    'he': 'עם',
    'fa': 'با',
    'ur': 'کے ساتھ',
    'bn': 'সাথে',
    'ta': 'உடன்',
    'te': 'తో',
    'ml': 'കൂടെ',
    'kn': 'ಜೊತೆ',
    'gu': 'સાથે',
    'pa': 'ਨਾਲ',
    'or': 'ସହିତ',
    'as': 'সহ',
    'ne': 'सँग',
    'si': 'සමග',
    'th': 'กับ',
    'lo': 'ກັບ',
    'km': 'ជាមួយ',
    'my': 'နှင့်',
    'ka': 'თან',
    'am': 'ከ',
    'sw': 'na',
    'zu': 'nga',
    'af': 'met',
    'is': 'með',
    'fo': 'við',
    'gl': 'con',
    'eu': 'rekin',
    'ca': 'amb',
    'cy': 'gyda',
    'ga': 'le',
    'mt': 'ma',
    'lb': 'mat',
    'rm': 'cun',
    'gd': 'le',
    'br': 'gant',
    'co': 'cù',
    'sc': 'cun',
    'vec': 'co',
    'nap': 'cu',
    'scn': 'cu',
    'lmo': 'cun',
    'pms': 'con',
    'lij': 'cun',
    'eml': 'cun',
    'rgn': 'cun',
    'lfn': 'con',
    'io': 'kun',
    'nov': 'kun',
    'jbo': 'se',
    'tok': 'kepeken',
    'eo': 'kun',
    'ia': 'con',
    'ie': 'con',
    'vo': 'ko',
    'io': 'kun',
    'nov': 'kun',
    'lfn': 'con',
    'jbo': 'se',
    'tok': 'kepeken',
    'eo': 'kun',
    'ia': 'con',
    'ie': 'con',
    'vo': 'ko'
  },
  'routePlannerPoints': {
    'en': 'points',
    'pt_BR': 'pontos',
    'ru': 'точками',
    'de': 'Punkten',
    'fr': 'points',
    'es': 'puntos',
    'zh': '点',
    'ja': 'ポイント',
    'ko': '포인트',
    'ar': 'نقاط',
    'hi': 'बिंदु',
    'it': 'punti',
    'nl': 'punten',
    'sv': 'punkter',
    'da': 'punkter',
    'no': 'punkter',
    'fi': 'pistettä',
    'pl': 'punktów',
    'cs': 'bodů',
    'hu': 'pont',
    'ro': 'puncte',
    'bg': 'точки',
    'hr': 'točaka',
    'sk': 'bodov',
    'sl': 'točk',
    'et': 'punkti',
    'lv': 'punkti',
    'lt': 'taškų',
    'uk': 'точками',
    'be': 'кропкамі',
    'mk': 'точки',
    'sr': 'тачака',
    'sq': 'pika',
    'el': 'σημεία',
    'tr': 'nokta',
    'az': 'nöqtə',
    'kk': 'нүктелер',
    'ky': 'чекиттер',
    'uz': 'nuqtalar',
    'mn': 'цэг',
    'ka': 'წერტილები',
    'hy': 'կետեր',
    'he': 'נקודות',
    'fa': 'نقاط',
    'ur': 'نکات',
    'bn': 'পয়েন্ট',
    'ta': 'புள்ளிகள்',
    'te': 'పాయింట్లు',
    'ml': 'പോയിന്റുകൾ',
    'kn': 'ಅಂಕಗಳು',
    'gu': 'પોઈન્ટ્સ',
    'pa': 'ਪੁਆਇੰਟ',
    'or': 'ପଏଣ୍ଟ',
    'as': 'পইণ্ট',
    'ne': 'पोइन्ट',
    'si': 'ලක්ෂ',
    'th': 'จุด',
    'lo': 'ຈຸດ',
    'km': 'ចំណុច',
    'my': 'အမှတ်',
    'ka': 'წერტილები',
    'am': 'ነጥቦች',
    'sw': 'pointi',
    'zu': 'amaphuzu',
    'af': 'punte',
    'is': 'stig',
    'fo': 'stig',
    'gl': 'puntos',
    'eu': 'puntuak',
    'ca': 'punts',
    'cy': 'pwyntiau',
    'ga': 'pointí',
    'mt': 'punti',
    'lb': 'Punkten',
    'rm': 'puncts',
    'gd': 'puingean',
    'br': 'poentoù',
    'co': 'punti',
    'sc': 'puntos',
    'vec': 'ponti',
    'nap': 'punti',
    'scn': 'punti',
    'lmo': 'pont',
    'pms': 'pont',
    'lij': 'ponti',
    'eml': 'pont',
    'rgn': 'pont',
    'lfn': 'puntos',
    'io': 'punti',
    'nov': 'punti',
    'jbo': 'punti',
    'tok': 'pini',
    'eo': 'punktoj',
    'ia': 'punctos',
    'ie': 'punctes',
    'vo': 'pünts',
    'io': 'punti',
    'nov': 'punti',
    'lfn': 'puntos',
    'jbo': 'punti',
    'tok': 'pini',
    'eo': 'punktoj',
    'ia': 'punctos',
    'ie': 'punctes',
    'vo': 'pünts'
  }
};

const l10nDir = path.join(__dirname, 'src', 'resources', 'l10n');

console.log('🔧 Adding missing translation keys to all languages...\n');

// Get all language files
const languageFiles = fs.readdirSync(l10nDir)
  .filter(file => file.endsWith('.json'))
  .sort();

languageFiles.forEach(filename => {
  const filePath = path.join(l10nDir, filename);
  const language = filename.replace('.json', '');
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    let addedCount = 0;
    
    // Add missing keys
    Object.keys(missingKeys).forEach(key => {
      if (!data[key]) {
        const translation = missingKeys[key][language] || missingKeys[key]['en'];
        data[key] = translation;
        addedCount++;
      }
    });
    
    if (addedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`✅ ${language}: Added ${addedCount} missing keys`);
    } else {
      console.log(`✅ ${language}: All keys already present`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${language}.json:`, error.message);
  }
});

console.log('\n🎉 All missing translation keys added!');
