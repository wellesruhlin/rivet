// The Proteus configurator engine, shared by the app and the tests.
import {createEngine} from '@ski-studio/configurator/engine';
import pack from './pack.js';

export const engine = createEngine(pack);
export {pack};
