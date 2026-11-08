// Writes sim/maxe1.xml and sim/maxe1-map.json from src/sim3d/maxe1-model.js
// (the same model the app uses), for the Python training kit.
import {writeFileSync} from 'fs';
import {buildMJCF, MAXE1_JOINT_MAP, MAXE1_DEFAULT} from '../src/sim3d/maxe1-model.js';
const params = process.argv[2] ? JSON.parse(process.argv[2]) : {};
writeFileSync('sim/maxe1.xml', buildMJCF(params));
writeFileSync('sim/maxe1-map.json', JSON.stringify({params: Object.assign({}, MAXE1_DEFAULT, params), joints: MAXE1_JOINT_MAP}, null, 2));
console.log('sim/maxe1.xml, sim/maxe1-map.json');
