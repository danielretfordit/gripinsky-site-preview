// Одноразовый перенос картинок прототипа в src/assets с понятными именами.
// Запуск: node scripts/setup-assets.mjs
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SRC = 'docs/reference/prototype/images';
const DRAFTS = 'docs/reference/drafts/assets';
const OUT = 'src/assets';

// хэш из прототипа -> путь в src/assets
const MAP = {
  f86493dd36b3853fa43fd315271eee5d: 'brand/logo.png',
  e831c73a8a53f6a1b8b39b4a1622b5ee: 'brand/texture.png',
  b8138ba1a14090edd5849f239ca844b1: 'brand/icon-3dsmax.png',
  be6daf114ad307a95f1980199a0fad44: 'brand/icon-corona.png',
  '4d4c57c20158f16eae551dc5550d12ac': 'works/rossoshansky-gostinaya.jpg',
  f715ab1d609e65f87ec8665f9b046f77: 'works/rossoshansky-gostinaya-model.jpg',
  '4cd85a326f7be066c2574014f277da4c': 'works/zaytseva-dom-v-lesu.jpg',
  c12f00a39b2c4e28479487026ea00280: 'works/zaytseva-dom-v-lesu-model.jpg',
  a50708c44d05f545344fe03b40b99f65: 'works/korotovskaya-shale.jpg',
  ffb8d7c51e2c498d0953e60f390b217f: 'works/lapin-dom-u-ozera.jpg',
  '8ededbc38624a0e3fa70eff0389b469b': 'works/knyazev-ulitsa.jpg',
  '8b175f6b1fd5b8a1350ac9c457e5b33e': 'works/bolshunova-ostrov-1.jpg',
  '3aa593e85e3addce92ec4076efc50dc5': 'works/bolshunova-ostrov-2.jpg',
  e7d728f01cce15a1f48355a421a91e73: 'works/bolshunova-ostrov-3.jpg',
  '5db990c892ccebdfe0eb0f74118c0849': 'works/bolshunova-banya-1.jpg',
  '003954448089b90fe8788439fe145375': 'works/bolshunova-banya-2.jpg',
  '5a322f4167eec762bbd208535f183b8c': 'works/bolshunova-banya-3.jpg',
  cf90abd7b4b1e5eaf9416b70e623693f: 'works/bolshunova-banya-4.jpg',
  '39224fde905d51cc4aa9022381bb2038': 'works/bolshunova-banya-5.jpg',
  '955eb476fe80ddfdca9257a26debefda': 'works/bolshunova-doroga-domoy.jpg',
  '63718df65ddba7285ea89a06d6a79005': 'works/sorokin-pirog-1.jpg',
  '4cba32104484d76b5a48a0a14ae39b05': 'works/sorokin-pirog-2.jpg',
  bab22b363c382f027d5f6c45545f2391: 'works/tveritin-villa-1.jpg',
  '4c592c35094a5075adc35e1dd43135cb': 'works/tveritin-villa-2.jpg',
  '4b6452d39cc1ca63ec841d664c4384a2': 'works/tveritin-villa-3.jpg',
  a71aa5e76c6457f3a3c2bdad1d77225a: 'works/tveritin-druzhba.jpg',
  '20f2bbf68e430f638d23fc3d520c2d1a': 'works/tveritin-otel-1.jpg',
  adc792f59e30df83f1469eb0e6da58eb: 'works/tveritin-otel-2.jpg',
  ab839ac2d8a7addf8d7aa725e7b969bf: 'works/tveritin-otel-3.jpg',
  dd365f9bc5ad8793442543ae359fe775: 'works/filimonova-spalnya.jpg',
  '20225b960e66911b61bc1395ec2a341f': 'people/filimonova.jpg',
  a9c77d93ed59472c3286c6ed3d0e1d0c: 'works/kamola-kuhnya.jpg',
  ae290d0070f99cf0761938bdd15d8390: 'works/filatov-interer.jpg',
  f8b0f016e2fd760bb795984ddce41b29: 'works/budnik-osenniy-dom-1.jpg',
  '2835a2ed7683407d0cca7995de43fa66': 'works/budnik-osenniy-dom-2.jpg',
  '9bb106a4bc0764474bda7f44ce7313ba': 'works/budnik-osenniy-dom-model.jpg',
  '029f4026638bd72be8ec1213301449a1': 'works/akopyan-kreslo.jpg',
  '82472afff58638061b60e131c6cec8eb': 'works/chaukina-skorpion.jpg',
  a67d060708a0fa39c87f3a7ebeb04b3b: 'works/merkulova-kuhnya.jpg',
  '854108481a20187e85641b03565a1bca': 'works/professiya-interer.jpg',
  '4e4a15585d1d7103f82ee47280de036f': 'works/pavlova-dom-v-lesu.jpg',
  '3bb39ff6d6080557fbc841de9133cedf': 'works/professiya-stoki.jpg',
  '11d482a3d10f6adf3783aeedbd1b3e27': 'works/yakupova-vorota.jpg',
  a7cb02f73c8b014895ebc9e28aabd769: 'works/smirnova-derevo.jpg',
  '522500e36c75196173c15de20e454e6f': 'works/kondratenko-interer.jpg',
  // Используются только в черновике главной: назначение уточняется на этапе 5
  '12cbfcfc07aac38df5e95b759efc8e94': 'home/home-12cbfcfc.jpg',
  '1ae8eb3e86a441f89284aa9214c6f5ff': 'home/home-1ae8eb3e.jpg',
  '3402f620c802239147410a229d0396a9': 'home/home-3402f620.jpg',
  '97561e8116023d86f8aaf6fd98816027': 'home/home-97561e81.jpg',
};

let n = 0;
for (const [hash, target] of Object.entries(MAP)) {
  const ext = target.endsWith('.png') ? 'png' : 'jpg';
  let src = join(SRC, `${hash}.${ext}`);
  if (!existsSync(src)) src = join(DRAFTS, `${hash}.${ext}`);
  if (!existsSync(src)) {
    console.error('Нет файла', hash);
    process.exitCode = 1;
    continue;
  }
  const dst = join(OUT, target);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  n++;
}
console.log(`Скопировано: ${n}`);
