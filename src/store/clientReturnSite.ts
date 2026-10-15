type FaceRegistrationUrlOptions = {
  empCode: string;
  returnStep: ClientAuthReturnStep;
  publicKey?: string | null;
  returnTo?: string | null;
};

export type ClientAuthReturnStep = "face" | "forgotPassword";

const CLIENT_AUTH_RETURN_SESSION_KEY = "ess.client-auth.registration-return.v1";

const CLIENT_AUTH_RETURN_STEPS = new Set<ClientAuthReturnStep>([
  "face",
  "forgotPassword",
]);

export function buildFaceRegistrationUrl({
  empCode,
  returnStep,
  publicKey,
  returnTo,
}: FaceRegistrationUrlOptions): string {
  const registrationUrl = new URL("/registration/face", window.location.origin);
  registrationUrl.searchParams.set("employee_code", empCode);
  registrationUrl.searchParams.set("return_step", returnStep);
  registrationUrl.searchParams.set("fresh_login", "1");
  if (publicKey && returnTo) {
    registrationUrl.searchParams.set("public_key", publicKey);
    registrationUrl.searchParams.set("return_to", returnTo);
  }
  return `${registrationUrl.pathname}${registrationUrl.search}`;
}

export function rememberClientAuthReturn(options: FaceRegistrationUrlOptions): void {
  sessionStorage.setItem(CLIENT_AUTH_RETURN_SESSION_KEY, JSON.stringify(options));
}

export function getClientAuthReturn(): FaceRegistrationUrlOptions | null {
  if (window.location.pathname !== "/registration/face") return null;

  try {
    const stored = sessionStorage.getItem(CLIENT_AUTH_RETURN_SESSION_KEY);
    const value = stored
      ? (JSON.parse(stored) as Partial<FaceRegistrationUrlOptions>)
      : {};
    const params = new URLSearchParams(window.location.search);
    const empCode =
      (typeof value.empCode === "string" ? value.empCode.trim() : "") ||
      params.get("employee_code")?.trim() ||
      "";
    const returnStep =
      (value.returnStep as ClientAuthReturnStep | undefined) ||
      (params.get("return_step") as ClientAuthReturnStep | null);

    if (!/^\d{6}$/.test(empCode) || !returnStep || !CLIENT_AUTH_RETURN_STEPS.has(returnStep)) {
      sessionStorage.removeItem(CLIENT_AUTH_RETURN_SESSION_KEY);
      return null;
    }

    const publicKey =
      (typeof value.publicKey === "string" ? value.publicKey.trim() : "") ||
      params.get("public_key")?.trim() ||
      null;
    const returnTo =
      (typeof value.returnTo === "string" ? value.returnTo.trim() : "") ||
      params.get("return_to")?.trim() ||
      null;

    if (Boolean(publicKey) !== Boolean(returnTo)) {
      sessionStorage.removeItem(CLIENT_AUTH_RETURN_SESSION_KEY);
      return null;
    }

    return { empCode, returnStep, publicKey, returnTo };
  } catch {
    sessionStorage.removeItem(CLIENT_AUTH_RETURN_SESSION_KEY);
    return null;
  }
}

export function clearClientAuthReturn(): void {
  sessionStorage.removeItem(CLIENT_AUTH_RETURN_SESSION_KEY);
}

export function buildClientAuthReturnUrl({
  empCode,
  returnStep,
  publicKey,
  returnTo,
}: FaceRegistrationUrlOptions): string {
  const params = new URLSearchParams({
    login_step: returnStep,
    employee_code: empCode,
  });
  if (publicKey && returnTo) {
    params.set("public_key", publicKey);
    params.set("return_to", returnTo);
  }
  return `/client-auth/login?${params.toString()}`;
}
