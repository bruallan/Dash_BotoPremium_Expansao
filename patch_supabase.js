const fs = require('fs');

let content = fs.readFileSync('api/index.ts', 'utf8');

// 1. Add supabase import at the top
const supabaseImport = `
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseUrl !== 'YOUR_SUPABASE_URL' && supabaseKey && supabaseKey !== 'YOUR_SUPABASE_SERVICE_ROLE_KEY') 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;
`;

if (!content.includes('@supabase/supabase-js')) {
    content = content.replace('import { initializeApp } from "firebase/app";', supabaseImport + '\nimport { initializeApp } from "firebase/app";');
}

// 2. Modify getStoredTokens
const getTokensBlockStart = content.indexOf('export async function getStoredTokens()');
const getTokensBlockEnd = content.indexOf('async function getStoredRefreshToken()');
const originalGetTokens = content.substring(getTokensBlockStart, getTokensBlockEnd);

const newGetTokens = `export async function getStoredTokens(): Promise<{ access_token?: string; refresh_token?: string } | null> {
  const now = Date.now();
  
  // Mem cache (5 mins)
  if (currentAccessToken && currentRefreshToken && (now - (global as any).lastTokenFetchTime < 5 * 60 * 1000)) {
    return {
      access_token: currentAccessToken,
      refresh_token: currentRefreshToken
    };
  }

  // --- NEW LOGIC: Try Supabase ---
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('api_credentials')
        .select('access_token, refresh_token')
        .eq('provider', 'conta_azul')
        .single();
        
      if (!error && data) {
        (global as any).lastTokenFetchTime = Date.now();
        currentAccessToken = data.access_token;
        currentRefreshToken = data.refresh_token;
        return {
           access_token: data.access_token || undefined,
           refresh_token: data.refresh_token || undefined
        };
      }
    } catch (e: any) {
      console.error("Erro ao ler tokens do Supabase:", e.message);
    }
  }

  if (!db) {
    if (currentAccessToken || currentRefreshToken) {
      return {
        access_token: currentAccessToken || undefined,
        refresh_token: currentRefreshToken || undefined
      };
    }
    return null;
  }

  try {
    const docSnap = await getDoc(doc(db, "tokens", "conta_azul"));
    (global as any).lastTokenFetchTime = Date.now();
    
    if (docSnap.exists()) {
      const tokenData = docSnap.data();
      if (tokenData && (tokenData.access_token || tokenData.refresh_token)) {
        currentAccessToken = tokenData.access_token || currentAccessToken;
        currentRefreshToken = tokenData.refresh_token || currentRefreshToken;
        return {
           access_token: currentAccessToken || undefined,
           refresh_token: currentRefreshToken || undefined
        };
      }
    }
  } catch (e: any) {
    console.error("Erro ao ler tokens do Firebase:", e.message);
  }
  
  // Fallback
  if (currentAccessToken || currentRefreshToken) {
    return {
      access_token: currentAccessToken || undefined,
      refresh_token: currentRefreshToken || undefined
    };
  }
  
  return null;
}

`;

content = content.replace(originalGetTokens, newGetTokens);


// 3. Modify saveTokens
const saveTokensBlockStart = content.indexOf('async function saveTokens(');
const saveTokensBlockEnd = content.indexOf('async function refreshToken()');
const originalSaveTokens = content.substring(saveTokensBlockStart, saveTokensBlockEnd);

const newSaveTokens = `async function saveTokens(accessToken: string, refreshToken: string) {
  currentAccessToken = accessToken;
  currentRefreshToken = refreshToken;
  console.log("--------------------------------------------------");
  console.log("EMERGENCY TOKEN LOG - CONTA AZUL");
  console.log("NEW REFRESH TOKEN:", refreshToken);
  console.log("DATE:", new Date().toISOString());
  console.log("--------------------------------------------------");

  // Send email notification
  sendEmailNotification(accessToken, refreshToken).catch(console.error);

  let successSupabase = false;

  // --- NEW LOGIC: Save to Supabase ---
  if (supabase) {
    try {
      const { error } = await supabase
        .from('api_credentials')
        .update({
          access_token: accessToken,
          refresh_token: refreshToken,
          updated_at: new Date().toISOString()
        })
        .eq('provider', 'conta_azul');
        
      if (!error) {
        console.log("Tokens saved successfully to Supabase.");
        successSupabase = true;
      } else {
        console.error("Failed to save tokens to Supabase:", error);
      }
    } catch (e) {
      console.error("Exception saving tokens to Supabase:", e);
    }
  }

  let success = successSupabase;
  let attempts = 0;
  const maxAttempts = 5;

  while (!success && attempts < maxAttempts) {
    attempts++;
    try {
      success = false;
      if (db) {
        try {
          await setDoc(doc(db, "tokens", "conta_azul"), {
            access_token: accessToken,
            refresh_token: refreshToken,
            updated_at: new Date().toISOString(),
          });
          success = true;
        } catch (dbErr) {
          console.error("Erro validando db Firebase:", dbErr);
        }
      }

      if (success) {
        console.log(\`Tokens saved successfully to Firebase on attempt \${attempts}.\`);
      } else {
        console.error(\`Attempt \${attempts}: Failed to save tokens to Firebase. Retrying...\`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } catch (e) {
      console.error(\`Attempt \${attempts}: Error saving tokens:\`, e);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!success && !successSupabase) {
    console.error("CRITICAL: FAILED TO SAVE TOKENS AFTER ALL ATTEMPTS.");
  }
}

`;

content = content.replace(originalSaveTokens, newSaveTokens);

fs.writeFileSync('api/index.ts', content);
