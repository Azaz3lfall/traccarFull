// Removed unused theme imports
import { loadImage, prepareIcon, prepareIconWithShadow } from './mapUtil';

/* import directionSvg from '../../resources/images/direction.svg';
import backgroundSvg from '../../resources/images/background.svg';
import deviceNameBgSvg from '../../resources/images/device-name-bg.svg';
import animalSvg from '../../resources/images/icon/animal.svg';
import bicycleSvg from '../../resources/images/icon/bicycle.svg';
import boatSvg from '../../resources/images/icon/boat.svg';
import busSvg from '../../resources/images/icon/bus.svg';
import carSvg from '../../resources/images/icon/car.svg';
import camperSvg from '../../resources/images/icon/camper.svg';
import craneSvg from '../../resources/images/icon/crane.svg';
import defaultSvg from '../../resources/images/icon/default.svg';
import startSvg from '../../resources/images/icon/start.svg';
import finishSvg from '../../resources/images/icon/finish.svg';
import helicopterSvg from '../../resources/images/icon/helicopter.svg';
import motorcycleSvg from '../../resources/images/icon/motorcycle.svg';
import personSvg from '../../resources/images/icon/person.svg';
import planeSvg from '../../resources/images/icon/plane.svg';
import scooterSvg from '../../resources/images/icon/scooter.svg';
import shipSvg from '../../resources/images/icon/ship.svg';
import tractorSvg from '../../resources/images/icon/tractor.svg';
import trailerSvg from '../../resources/images/icon/trailer.svg';
import trainSvg from '../../resources/images/icon/train.svg';
import tramSvg from '../../resources/images/icon/tram.svg';
import truckSvg from '../../resources/images/icon/truck.svg';
import vanSvg from '../../resources/images/icon/van.svg'; */

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
  trailer: trailerSvg,
  train: trainSvg,
  tram: tramSvg,
  trolleybus: trolleybusSvg,
  truck: truckSvg,
  van: vanSvg,
};

export const mapIconKey = (category) => {
  switch (category) {
    case 'offroad':
    case 'pickup':
      return 'car';
    case 'trolleybus':
      return 'bus';
    default:
      return mapIcons.hasOwnProperty(category) ? category : 'default';
  }
};

export const mapImages = {};

// Theme colors are no longer needed since we're not tinting icons

export default async () => {
  console.log('Loading map images...');
  const background = await loadImage(backgroundSvg);
  mapImages.background = await prepareIcon(background);
  mapImages.direction = await prepareIconWithShadow(await loadImage(directionSvg));
  mapImages['device-name-bg'] = await prepareIcon(background, await loadImage(deviceNameBgSvg));
  
  console.log('Loading device icons...');
  await Promise.all(Object.keys(mapIcons).map(async (category) => {
    const results = [];
    ['info', 'success', 'error', 'neutral'].forEach((color) => {
      results.push(loadImage(mapIcons[category]).then((icon) => {
        mapImages[`${category}-${color}`] = prepareIconWithShadow(icon);
      }));
    });
    await Promise.all(results);
  }));
  
  console.log('Map images loaded:', Object.keys(mapImages));
};
