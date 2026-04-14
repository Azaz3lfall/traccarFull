export const DEFAULT_DEVICE_MODELS = ['AtlasTrax', 'J16', 'EC33', 'E3+', 'k-tag', 'Oneblock', 'JC181', 'JC400', 'JC450', 'Nanotag'];

const normalizeModel = (value) => (value == null ? '' : String(value).trim());

export const dedupeDeviceModels = (models) => {
  const seen = new Set();
  return models.filter((model) => {
    const key = normalizeModel(model).toLowerCase();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const getDeviceModelOptions = (models = []) => dedupeDeviceModels([
  ...DEFAULT_DEVICE_MODELS,
  ...models.map(normalizeModel),
]);
