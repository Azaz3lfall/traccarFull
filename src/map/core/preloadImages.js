import { loadImage, prepareIcon, prepareIconWithShadow, prepareIconWithTint } from './mapUtil';

import directionSvg from "../../resources/images/direction.svg";
import startSvg from "../../resources/images/icon/start.svg";
import finishSvg from "../../resources/images/icon/finish.svg";

import bicycleSvg from "../../resources/images/newIcons/bicycle.png";
import boatSvg from "../../resources/images/newIcons/boat.png";
import busSvg from "../../resources/images/newIcons/bus.png";
import carSvg from "../../resources/images/newIcons/car.png";
import camperSvg from "../../resources/images/newIcons/camper.png";
import craneSvg from "../../resources/images/newIcons/crane.png";
import helicopterSvg from "../../resources/images/newIcons/helicopter.png";
import motorcycleSvg from "../../resources/images/newIcons/motorcycle.png";
import offroadSvg from "../../resources/images/newIcons/offroad.png";
import personSvg from "../../resources/images/newIcons/person.png";
import pickupSvg from "../../resources/images/newIcons/pickup.png";
import planeSvg from "../../resources/images/newIcons/plane.png";
import scooterSvg from "../../resources/images/newIcons/scooter.png";
import shipSvg from "../../resources/images/newIcons/ship.png";
import tractorSvg from "../../resources/images/newIcons/tractor.png";
import trainSvg from "../../resources/images/newIcons/train.png";
import trailerSvg from '../../resources/images/icon/trailer.svg';
import tramSvg from "../../resources/images/newIcons/tram.png";
import trolleybusSvg from "../../resources/images/newIcons/trolleybus.png";
import truckSvg from "../../resources/images/newIcons/truck.png";
import vanSvg from "../../resources/images/newIcons/van.png";
import defaultSvg from "../../resources/images/newIcons/default.png";
import animalSvg from "../../resources/images/newIcons/animal.png";
import tagSvg from "../../resources/images/newIcons/marker_tag.png";

import backgroundSvg from "../../resources/images/newBackground.png";
import deviceNameBgSvg from "../../resources/images/device-name-bg.svg";

export const mapIcons = {
  animal: animalSvg,
  bicycle: bicycleSvg,
  boat: boatSvg,
  bus: busSvg,
  car: carSvg,
  camper: camperSvg,
  crane: craneSvg,
  default: defaultSvg,
  finish: finishSvg,
  helicopter: helicopterSvg,
  motorcycle: motorcycleSvg,
  offroad: offroadSvg,
  person: personSvg,
  pickup: pickupSvg,
  plane: planeSvg,
  scooter: scooterSvg,
  ship: shipSvg,
  start: startSvg,
  tractor: tractorSvg,
  tag: tagSvg,
  trailer: trailerSvg,
  train: trainSvg,
  tram: tramSvg,
  trolleybus: trolleybusSvg,
  truck: truckSvg,
  van: vanSvg,
};

export const mapIconKey = (category) => {
  if (!category) return 'default';
  return mapIcons.hasOwnProperty(category) ? category : 'default';
};

export const mapImages = {};

let preloadPromise = null;

// States available as marker image variants
const MARKER_STATES = ['driving', 'online', 'idle', 'offline', 'static'];

// Tint color applied per state (hex)
const STATE_TINT = {
  driving: '#16A34A',  // green
  online:  '#2563EB',  // blue
  idle:    '#CA8A04',  // yellow/amber
  offline: '#DC2626',  // red
  static:  '#6B7280',  // gray
};

// Which base marker image to load for each state
const STATE_BASE_IMAGE = {
  driving: 'driving',
  online:  'online',
  idle:    'online',   // no dedicated idle image → use online variant
  offline: 'offline',
  static:  'static',
};

// Old color name → new state name (backward compat)
const COLOR_TO_STATE = {
  success: 'driving',
  info:    'online',
  error:   'offline',
  neutral: 'static',
};

// For categories that exist in mapIcons but have no public/markers files → use newIcons fallback
const NO_MARKER_CATEGORIES = new Set(['camper', 'trailer', 'start', 'finish']);

// Fallback to another state image when a specific one doesn't exist for a category
const STATE_FALLBACK = {
  train:      { driving: 'online', static: 'online' },
  tram:       { driving: 'online' },
  trolleybus: { driving: 'online' },
};

export default async () => {
  if (preloadPromise) return preloadPromise;

  preloadPromise = (async () => {
    try {
      const background = await loadImage(backgroundSvg);
      mapImages.background = await prepareIcon(background);
      mapImages.direction = await prepareIconWithShadow(await loadImage(directionSvg));
      mapImages['device-name-bg'] = await prepareIcon(background, await loadImage(deviceNameBgSvg));

      // Pre-load default icon as immediate fallback
      const defaultIconImg = await loadImage(mapIcons.default);
      const defaultData = prepareIconWithShadow(defaultIconImg);

      Object.keys(mapIcons).forEach((category) => {
        MARKER_STATES.forEach((state) => {
          mapImages[`${category}-${state}`] = defaultData;
        });
        Object.keys(COLOR_TO_STATE).forEach((color) => {
          mapImages[`${category}-${color}`] = defaultData;
        });
      });

      await Promise.all(Object.keys(mapIcons).map(async (category) => {
        try {
          if (category === 'tag') {
            const icon = await loadImage('/markers/marker_tag.png');
            const rendered = prepareIconWithShadow(icon);
            MARKER_STATES.forEach((state) => { mapImages[`${category}-${state}`] = rendered; });
            Object.keys(COLOR_TO_STATE).forEach((color) => { mapImages[`${category}-${color}`] = rendered; });
            return;
          }

          if (NO_MARKER_CATEGORIES.has(category)) {
            const icon = await loadImage(mapIcons[category]);
            MARKER_STATES.forEach((state) => {
              mapImages[`${category}-${state}`] = prepareIconWithTint(icon, STATE_TINT[state] || null);
            });
            Object.keys(COLOR_TO_STATE).forEach((color) => {
              const state = COLOR_TO_STATE[color];
              mapImages[`${category}-${color}`] = mapImages[`${category}-${state}`];
            });
            return;
          }

          const typeFallback = STATE_FALLBACK[category] || {};

          await Promise.all(MARKER_STATES.map(async (state) => {
            const baseVariant = STATE_BASE_IMAGE[state] || state;
            const actualVariant = typeFallback[baseVariant] || baseVariant;
            const url = `/markers/marker_${category}_${actualVariant}.png`;
            let icon;
            try {
              icon = await loadImage(url);
            } catch {
              icon = await loadImage(mapIcons[category]);
            }
            mapImages[`${category}-${state}`] = prepareIconWithTint(icon, STATE_TINT[state] || null);
            // Register old color alias
            const colorAlias = Object.entries(COLOR_TO_STATE).find(([, v]) => v === state)?.[0];
            if (colorAlias) mapImages[`${category}-${colorAlias}`] = mapImages[`${category}-${state}`];
          }));
        } catch (error) {
          console.error(`Error loading icons for category ${category}:`, error);
        }
      }));
    } catch (globalError) {
      console.error('Error in preloadImages:', globalError);
    }
  })();

  return preloadPromise;
};
