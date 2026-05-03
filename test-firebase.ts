import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import fs from "fs";

const configPath = "./firebase-applet-config.json";
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFirebase() {
  await setDoc(doc(db, "tokens", "conta_azul"), {
    access_token: "test1",
    refresh_token: "test2"
  });
  const docSnap = await getDoc(doc(db, "tokens", "conta_azul"));
  console.log("Written data: ", docSnap.data());
}

testFirebase().catch(console.error);
