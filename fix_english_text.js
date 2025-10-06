import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Critical translations that need to be fixed
const criticalTranslations = {
  'ru': {
    'routePlannerCosts': 'Расходы',
    'routePlannerCostAnalysis': 'Анализ расходов', 
    'routePlannerFuelCost': 'Стоимость топлива',
    'routePlannerTollCost': 'Стоимость проезда',
    'routePlannerTotalCost': 'Общая стоимость',
    'routePlannerCalculating': 'Вычисление',
    'routePlannerCostSettings': 'Настройки расходов',
    'routePlannerFuelPrice': 'Цена топлива',
    'routePlannerVehicleConsumption': 'Расход топлива',
    'routePlannerFuelLiters': 'Литры топлива',
    'routePlannerProfitabilityAnalysis': 'Анализ прибыльности',
    'routePlannerClientPrice': 'Цена клиента',
    'routePlannerProfit': 'Прибыль',
    'routePlannerPricePerKm': 'Цена за км',
    'routePlannerRoundTrip': 'Туда и обратно',
    'routePlannerYes': 'Да',
    'routePlannerNo': 'Нет',
    'routePlannerSaveRoute': 'Сохранить маршрут',
    'routePlannerSwitchingRoute': 'Переключение маршрута...',
    'routePlannerCurrencySymbol': '₽'
  },
  'de': {
    'routePlannerCosts': 'Kosten',
    'routePlannerCostAnalysis': 'Kostenanalyse',
    'routePlannerFuelCost': 'Kraftstoffkosten',
    'routePlannerTollCost': 'Mautkosten',
    'routePlannerTotalCost': 'Gesamtkosten',
    'routePlannerCalculating': 'Berechnung',
    'routePlannerCostSettings': 'Kosteneinstellungen',
    'routePlannerFuelPrice': 'Kraftstoffpreis',
    'routePlannerVehicleConsumption': 'Fahrzeugverbrauch',
    'routePlannerFuelLiters': 'Kraftstoff Liter',
    'routePlannerProfitabilityAnalysis': 'Rentabilitätsanalyse',
    'routePlannerClientPrice': 'Kundenpreis',
    'routePlannerProfit': 'Gewinn',
    'routePlannerPricePerKm': 'Preis pro km',
    'routePlannerRoundTrip': 'Hin und zurück',
    'routePlannerYes': 'Ja',
    'routePlannerNo': 'Nein',
    'routePlannerSaveRoute': 'Route speichern',
    'routePlannerSwitchingRoute': 'Route wechseln...',
    'routePlannerCurrencySymbol': '€'
  },
  'fr': {
    'routePlannerCosts': 'Coûts',
    'routePlannerCostAnalysis': 'Analyse des coûts',
    'routePlannerFuelCost': 'Coût du carburant',
    'routePlannerTollCost': 'Coût des péages',
    'routePlannerTotalCost': 'Coût total',
    'routePlannerCalculating': 'Calcul',
    'routePlannerCostSettings': 'Paramètres de coût',
    'routePlannerFuelPrice': 'Prix du carburant',
    'routePlannerVehicleConsumption': 'Consommation du véhicule',
    'routePlannerFuelLiters': 'Litres de carburant',
    'routePlannerProfitabilityAnalysis': 'Analyse de rentabilité',
    'routePlannerClientPrice': 'Prix client',
    'routePlannerProfit': 'Profit',
    'routePlannerPricePerKm': 'Prix par km',
    'routePlannerRoundTrip': 'Aller-retour',
    'routePlannerYes': 'Oui',
    'routePlannerNo': 'Non',
    'routePlannerSaveRoute': 'Enregistrer l\'itinéraire',
    'routePlannerSwitchingRoute': 'Changement d\'itinéraire...',
    'routePlannerCurrencySymbol': '€'
  },
  'es': {
    'routePlannerCosts': 'Costos',
    'routePlannerCostAnalysis': 'Análisis de costos',
    'routePlannerFuelCost': 'Costo de combustible',
    'routePlannerTollCost': 'Costo de peaje',
    'routePlannerTotalCost': 'Costo total',
    'routePlannerCalculating': 'Calculando',
    'routePlannerCostSettings': 'Configuración de costos',
    'routePlannerFuelPrice': 'Precio del combustible',
    'routePlannerVehicleConsumption': 'Consumo del vehículo',
    'routePlannerFuelLiters': 'Litros de combustible',
    'routePlannerProfitabilityAnalysis': 'Análisis de rentabilidad',
    'routePlannerClientPrice': 'Precio del cliente',
    'routePlannerProfit': 'Beneficio',
    'routePlannerPricePerKm': 'Precio por km',
    'routePlannerRoundTrip': 'Ida y vuelta',
    'routePlannerYes': 'Sí',
    'routePlannerNo': 'No',
    'routePlannerSaveRoute': 'Guardar ruta',
    'routePlannerSwitchingRoute': 'Cambiando ruta...',
    'routePlannerCurrencySymbol': '$'
  }
};

const l10nDir = path.join(__dirname, 'src', 'resources', 'l10n');

console.log('🔧 Fixing critical English text in key languages...\n');

Object.entries(criticalTranslations).forEach(([language, translations]) => {
  const filePath = path.join(l10nDir, `${language}.json`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    let fixedCount = 0;
    
    // Apply translations
    Object.entries(translations).forEach(([key, translation]) => {
      if (data[key] && data[key] === key.replace('routePlanner', '').replace(/([A-Z])/g, ' $1').trim()) {
        data[key] = translation;
        fixedCount++;
      }
    });
    
    if (fixedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`✅ ${language}: Fixed ${fixedCount} English texts`);
    } else {
      console.log(`✅ ${language}: Already translated`);
    }
  } catch (error) {
    console.error(`❌ Error updating ${language}.json:`, error.message);
  }
});

console.log('\n🎉 Critical translations fixed!');
