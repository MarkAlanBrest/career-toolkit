"use client";

import {
  AccountInfo,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";

const TENANT_ID = "0af0069e-980c-4b7d-ae8b-d125a29432c2";
const CLIENT_ID = "6a63b8e7-5fe1-4ff1-aba0-921e0de3e36b";
const PRODUCTION_ORIGIN = "https://safety-training-platform-eight.vercel.app";
const GRAPH_SCOPES = ["https://graph.microsoft.com/Sites.Selected"];

let clientPromise: Promise<PublicClientApplication> | undefined;

export function microsoftClient() {
  if (!clientPromise) {
    clientPromise = (async () => {
      const redirectUri =
        typeof window === "undefined" ? PRODUCTION_ORIGIN : window.location.origin;
      const client = new PublicClientApplication({
        auth: {
          clientId: CLIENT_ID,
          authority: `https://login.microsoftonline.com/${TENANT_ID}`,
          redirectUri,
          postLogoutRedirectUri: redirectUri,
        },
        cache: {
          cacheLocation: "localStorage",
        },
      });
      await client.initialize();
      return client;
    })();
  }
  return clientPromise;
}

export async function currentMicrosoftAccount() {
  const client = await microsoftClient();
  return client.getActiveAccount() || client.getAllAccounts()[0] || null;
}

export async function signInToMicrosoft() {
  const client = await microsoftClient();
  const result = await client.loginPopup({
    scopes: GRAPH_SCOPES,
    prompt: "select_account",
  });
  client.setActiveAccount(result.account);
  return result.account;
}

export async function microsoftAccessToken(account: AccountInfo) {
  const client = await microsoftClient();
  try {
    const result = await client.acquireTokenSilent({
      account,
      scopes: GRAPH_SCOPES,
    });
    return result.accessToken;
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) throw error;
    const result = await client.acquireTokenPopup({
      account,
      scopes: GRAPH_SCOPES,
    });
    return result.accessToken;
  }
}

export async function signOutOfMicrosoft() {
  const client = await microsoftClient();
  const account = client.getActiveAccount() || client.getAllAccounts()[0];
  await client.logoutPopup({ account });
}

export type MicrosoftAccount = AccountInfo;
