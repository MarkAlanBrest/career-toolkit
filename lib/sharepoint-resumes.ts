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

export type StoredResume = {
  id: string;
  name: string;
  webUrl: string;
  studentName: string;
  address: string;
  location: string;
  program: string;
  graduationDate: string;
  status: string;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`SharePoint is not configured: ${name} is missing.`);
  return value;
}

async function graphToken(delegatedToken?: string) {
  if (delegatedToken) return delegatedToken;

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

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function graduationMonth(value: string) {
  const match = value.match(/^(20\d{2})-(0[1-9]|1[0-2])(?:-\d{2})?$/);
  if (!match) throw new Error("Graduation date must include a valid month and year.");
  return { year: match[1], month: match[2] };
}

function fileNameWithGraduationDate(name: string, graduationDate: string) {
  const { year, month } = graduationMonth(graduationDate);
  const label = `${MONTH_NAMES[Number(month) - 1]} ${year}`;
  const extensionMatch = name.match(/(\.[^.]+)$/);
  const extension = extensionMatch?.[1] || "";
  const stem = extension ? name.slice(0, -extension.length) : name;

  if (stem.replace(/,/g, "").toLowerCase().includes(label.toLowerCase())) {
    return safeFileName(name);
  }
  return safeFileName(`${stem} - ${label}${extension}`);
}

function graphPath(value: string) {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function sharePointDateOnly(value: string) {
  const { year, month } = graduationMonth(value);

  // SharePoint stores date-only columns as date-times internally. Noon UTC
  // prevents the selected calendar date from moving backward in US time zones.
  return `${year}-${month}-01T12:00:00Z`;
}

export async function uploadResumeToSharePoint(
  file: File,
  metadata: ResumeMetadata,
  delegatedToken?: string,
) {
  const token = await graphToken(delegatedToken);
  const siteId = required("SHAREPOINT_SITE_ID");
  const driveId = required("SHAREPOINT_DRIVE_ID");
  const folder = process.env.SHAREPOINT_RESUME_FOLDER || "";
  const destination = [
    folder,
    fileNameWithGraduationDate(file.name, metadata.graduationDate),
  ].filter(Boolean).join("/");
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

function locationFromAddress(address: string) {
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return address;
  const state = parts.at(-1)?.match(/^([A-Za-z]{2})\b/)?.[1]?.toUpperCase();
  return state ? `${parts.at(-2)}, ${state}` : address;
}

export async function listResumesFromSharePoint(
  delegatedToken?: string,
): Promise<StoredResume[]> {
  const token = await graphToken(delegatedToken);
  const siteId = required("SHAREPOINT_SITE_ID");
  const driveId = required("SHAREPOINT_DRIVE_ID");
  const folder = process.env.SHAREPOINT_RESUME_FOLDER || "";
  const rootPath = folder
    ? `/root:/${graphPath(folder)}:/children`
    : "/root/children";
  const url =
    `https://graph.microsoft.com/v1.0/sites/${encodeURIComponent(siteId)}` +
    `/drives/${encodeURIComponent(driveId)}${rootPath}` +
    "?$expand=listItem($expand=fields)&$top=999";

  const data = await graphRequest<{
    value?: Array<{
      id: string;
      name: string;
      webUrl?: string;
      file?: unknown;
      listItem?: { fields?: Record<string, unknown> };
    }>;
  }>(url, token, { method: "GET" });

  const studentField = process.env.SP_FIELD_STUDENT_NAME || "Student_x0020_Name";
  const addressField = process.env.SP_FIELD_ADDRESS || "Address";
  const programField = process.env.SP_FIELD_PROGRAM || "Program";
  const graduationField =
    process.env.SP_FIELD_GRADUATION_DATE || "Graduation_x0020_Date";
  const statusField = process.env.SP_FIELD_STATUS || "Status";

  return (data.value || [])
    .filter((item) => item.file)
    .map((item) => {
      const fields = item.listItem?.fields || {};
      const address = String(fields[addressField] || "");
      return {
        id: item.id,
        name: item.name,
        webUrl: item.webUrl || "",
        studentName: String(fields[studentField] || ""),
        address,
        location: locationFromAddress(address),
        program: String(fields[programField] || ""),
        graduationDate: String(fields[graduationField] || "").slice(0, 7),
        status: String(fields[statusField] || ""),
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}
