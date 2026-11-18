import { initializeApp } from 'firebase/app'
import { accountSlot } from './accounts'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore'

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
export const auth = getAuth(app)

/** Cache local em IndexedDB: o sistema abre rápido e continua gravando sem internet, enviando depois. */
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})
