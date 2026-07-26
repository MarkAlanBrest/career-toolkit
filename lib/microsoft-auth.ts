"use client";

import {
  AccountInfo,
  AuthenticationResult,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from "@azure/msal-browser";

const TENANT_ID = "0af0069e-980c-4b7d-ae8b-d125a29432c2";
const CLIENT_ID = "6a63b8e7-5fe1-4ff1-aba0-921e0de3e36b";
const PRODUCTION_ORIGIN = "https://safety-training-platform-eight.vercel.app";
const GRAPH_SCOPES = ["https://graph.microsoft.com/Sites.Selected"];

let clientPromise: Promise<PublicClientApplication> | undefined;
let interactionPromise: Promise<AuthenticationResult> | undefined;

function runInteraction(operation: () => Promise<AuthenticationResult>) {
  if (!interactionPromise) {
    interactionPromise = operation().finally(() => {
      interactionPromise = undefined;
    });
  }
  return interactionPromise;
}

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
      await client.handleRedirectPromise();
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
  const result = await runInteraction(() =>
    client.loginPopup({
      scopes: GRAPH_SCOPES,
      prompt: "select_account",
      overrideInteractionInProgress: true,
    }),
  );
  client.setActiveAccount(result.account);
  return result.account;
}

export async function microsoftAccessToken(
  account: AccountInfo,
  allowInteraction = true,
) {
  const client = await microsoftClient();
  try {
    const result = await client.acquireTokenSilent({
      account,
      scopes: GRAPH_SCOPES,
    });
    return result.accessToken;
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) throw error;
    if (!allowInteraction) return "";
    const result = await runInteraction(() =>
      client.acquireTokenPopup({
        account,
        scopes: GRAPH_SCOPES,
        overrideInteractionInProgress: true,
      }),
    );
    return result.accessToken;
  }
}

export async function signOutOfMicrosoft() {
  const client = await microsoftClient();
  const account = client.getActiveAccount() || client.getAllAccounts()[0];
  await client.logoutPopup({ account });
}

export type MicrosoftAccount = AccountInfo;
