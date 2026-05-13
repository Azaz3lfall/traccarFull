const normalizeEquipmentType = (value) => {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return 'desconhecido';
  if (text.includes('sat')) return 'satelital';
  if (text.includes('gsm')) return 'gsm';
  if (text.includes('tag')) return 'tag';
  return text;
};

const parseSignature = (signature) => String(signature || '')
  .split('+')
  .map((item) => normalizeEquipmentType(item))
  .filter(Boolean)
  .sort();

function mapVehicleSignature(vehicleEquipment) {
  const types = Array.isArray(vehicleEquipment)
    ? vehicleEquipment.map((item) => normalizeEquipmentType(item))
    : [];
  const equipmentCount = types.length;
  const sorted = types.slice().sort();
  const signature = sorted.join('+');
  return { types: sorted, signature, equipmentCount };
}

function selectBestRule(rules, vehicleSignature) {
  const parsedVehicle = parseSignature(vehicleSignature.signature);
  const candidates = (rules || []).filter((rule) => {
    const ruleTypes = parseSignature(rule.equipment_signature);
    if (!ruleTypes.length) return false;
    const countsMatch = Number(rule.equipment_count || 0) <= vehicleSignature.equipmentCount;
    const typesMatch = ruleTypes.every((item) => parsedVehicle.includes(item));
    return countsMatch && typesMatch;
  });

  candidates.sort((a, b) => {
    const byPriority = Number(a.priority || 999) - Number(b.priority || 999);
    if (byPriority !== 0) return byPriority;
    return Number(b.equipment_count || 0) - Number(a.equipment_count || 0);
  });

  return candidates[0] || null;
}

export function calculateClientMonthlyBilling({
  vehicles = [],
  plan,
  rules = [],
}) {
  const basePrice = Number(plan?.base_price || 0);
  let total = 0;

  const breakdown = vehicles.map((vehicle) => {
    const signatureData = mapVehicleSignature(vehicle.equipmentTypes || []);
    const matchedRule = selectBestRule(rules, signatureData);

    let monthlyPrice = basePrice;
    let discountPercent = 0;

    if (matchedRule) {
      monthlyPrice = Number(matchedRule.monthly_price || 0);
      discountPercent = Number(matchedRule.discount_percent || 0);
    }

    const discounted = monthlyPrice * (1 - (discountPercent / 100));
    total += discounted;

    return {
      vehicleId: vehicle.id,
      plate: vehicle.plate,
      equipmentTypes: signatureData.types,
      equipmentCount: signatureData.equipmentCount,
      matchedRuleId: matchedRule?.id || null,
      monthlyPrice,
      discountPercent,
      finalPrice: Number(discounted.toFixed(2)),
    };
  });

  return {
    total: Number(total.toFixed(2)),
    breakdown,
  };
}

export { normalizeEquipmentType };

