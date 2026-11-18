import { initializeApp } from 'firebase/app'
import { accountSlot } from './accounts'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import { connectFirestoreEmulator, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

// A configuração do Firebase para web é pública por natureza (não é senha).
// Quem protege os dados são o login e as regras do Firestore (veja firestore.rules).
const firebaseConfig = {
  apiKey: 'AIzaSyDSVo5f7p6-mTEPPifVPqjhAIaUnueUCYQ',
  authDomain: 'cantina-5a4c5.firebaseapp.com',
  projectId: 'cantina-5a4c5',
  storageBucket: 'cantina-5a4c5.firebasestorage.app',
  messagingSenderId: '114701017722',
  appId: '1:114701017722:web:4f5425c012be32e43c11c3',
}

// Cada conta em paralelo é um app do Firebase com nome próprio (login e cache separados). Sem conta: o app padrão de sempre.
export const app = accountSlot ? initializeApp(firebaseConfig, `conta-${accountSlot}`) : initializeApp(firebaseConfig)
/**
 * App Check (opcional): barra robôs e usos do banco que não vêm deste site. Só liga se a chave do reCAPTCHA v3
 * estiver configurada (VITE_RECAPTCHA_SITE_KEY, na Vercel). Sem a chave, nada muda.
 */
const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
if (siteKey) {
  if (import.meta.env.DEV) (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
  initializeAppCheck(app, { provider: new ReCaptchaV3Provider(siteKey), isTokenAutoRefreshEnabled: true })
}

export const auth = getAuth(app)

/** Cache local em IndexedDB: o sistema abre rápido e continua gravando sem internet, enviando depois. */
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

// Só para testes locais: VITE_USE_EMULATORS=1 aponta para os emuladores do Firebase em vez do banco de verdade.
if (import.meta.env.VITE_USE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8085)
}
