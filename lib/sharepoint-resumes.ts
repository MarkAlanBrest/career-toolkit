type ResumeMetadata = {
  studentName: string;
  address: string;
  program: string;
  graduationDate: string;
  skills: string[];
  certifications: string[];
};

type GraphError = {
  error?: { message?: string };
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`SharePoint is not configured: ${name} is missing.`);
  return value;
}

async function graphToken() {
  const tenantId = required("MS_TENANT_ID");
  const body = new URLSearchParams({
    client_id: required("MS_CLIENT_ID"),
    client_secret: required("MS_CLIENT_SECRET"),
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    },
  );
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || "Microsoft sign-in failed.");
  }
  return data.access_token as string;
}

async function graphRequest<T>(url: string, token: string, init: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const data = (await response.json()) as T & GraphError;
  if (!response.ok) {
    throw new Error(data.error?.message || `Microsoft Graph returned ${response.status}.`);
  }
  return data;
}

function safeFileName(name: string) {
  return name.replace(/[~"#%&*:<>?/\\{|}]/g, "-").replace(/\s+/g, " ").trim();
}

function graphPath(value: string) {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function sharePointDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Graduation date must be a valid date.");
  }

  // SharePoint stores date-only columns as date-times internally. Noon UTC
  // prevents the selected calendar date from moving backward in US time zones.
  return `${value}T12:00:00Z`;
}

export async function uploadResumeToSharePoint(file: File, metadata: ResumeMetadata) {
  const token = await graphToken();
  const siteId = required("SHAREPOINT_SITE_ID");
  const driveId = required("SHAREPOINT_DRIVE_ID");
  const folder = process.env.SHAREPOINT_RESUME_FOLDER || "";
  const destination = [folder, safeFileName(file.name)].filter(Boolean).join("/");
  const uploadUrl = `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/root:/${graphPath(destination)}:/content`;

  const driveItem = await graphRequest<{ id: string; webUrl?: string }>(uploadUrl, token, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: Buffer.from(await file.arrayBuffer()),
  });

  const fields = {
    [process.env.SP_FIELD_STUDENT_NAME || "Student_x0020_Name"]: metadata.studentName,
    [process.env.SP_FIELD_ADDRESS || "Address"]: metadata.address,
    [process.env.SP_FIELD_PROGRAM || "Program"]: metadata.program,
    [process.env.SP_FIELD_GRADUATION_DATE || "Graduation_x0020_Date"]:
      sharePointDateOnly(metadata.graduationDate),
    [process.env.SP_FIELD_SKILLS || "Skills"]: metadata.skills.join("\n"),
    [process.env.SP_FIELD_CERTIFICATIONS || "Certifications"]:
      metadata.certifications.join("\n"),
    [process.env.SP_FIELD_STATUS || "Status"]: "Pending Review",
  };

  await graphRequest(
    `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(driveItem.id)}/listItem/fields`,
    token,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    },
  );

  return { id: driveItem.id, webUrl: driveItem.webUrl };
}
