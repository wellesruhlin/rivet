import {tableProduct} from '@maker/ref-parsons';
import {skiProduct} from '../../on3p-custom-shop/src/product-adapter.js';
export const products=new Map([tableProduct,skiProduct].map(p=>[p.id,p]));
