// The Praxis configurator engine, shared by the /custom route, the bag and tests.
import {createEngine} from '@ski-studio/configurator/engine';
import pack from './pack.js';

export const engine = createEngine(pack);
export {pack};
