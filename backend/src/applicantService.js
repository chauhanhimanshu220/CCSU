const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { db, parseJson, stringifyJson } = require("./db");
const { DOCUMENT_FIELDS, PERSONAL_REQUIRED_FIELDS } = require("./constants");

const uploadsDirectory = path.resolve(__dirname, "..", "uploads");
const PERSONAL_NAME_FIELDS = [
  { key: "name", label: "Name" },
  { key: "fatherName", label: "Father's Name" },
  { key: "motherName", label: "Mother's Name" },
];

const insertApplicantStatement = db.prepare(`
  INSERT INTO applicants (
    application_id,
    login_id,
    password_hash,
    session_token,
    personal_details,
    education_details,
    documents,
    payment_status,
    payment_details,
    application_status,
    current_step,
    created_at,
    updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateIdentifiersStatement = db.prepare(`
  UPDATE applicants
  SET application_id = ?, login_id = ?, updated_at = ?
  WHERE id = ?
`);

const findApplicantByIdStatement = db.prepare(`
  SELECT * FROM applicants WHERE id = ?
`);

const findApplicantByTokenStatement = db.prepare(`
  SELECT * FROM applicants WHERE session_token = ?
`);

const findApplicantByLoginStatement = db.prepare(`
  SELECT * FROM applicants WHERE login_id = ?
`);

const updateApplicantStatement = db.prepare(`
  UPDATE applicants
  SET
    personal_details = ?,
    education_details = ?,
    documents = ?,
    payment_status = ?,
    payment_details = ?,
    application_status = ?,
    current_step = ?,
    updated_at = ?,
    submitted_at = ?
  WHERE id = ?
`);

const updateTokenStatement = db.prepare(`
  UPDATE applicants
  SET session_token = ?, updated_at = ?
  WHERE id = ?
`);

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function isoNow() {
  return new Date().toISOString();
}

function parseDateOfBirth(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalizeText(value));

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

function getAgeInYears(dateOfBirth, today = new Date()) {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate());

  if (!hasHadBirthday) {
    age -= 1;
  }

  return age;
}

function getDateOfBirthError(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return "";
  }

  const dateOfBirth = parseDateOfBirth(normalizedValue);

  if (!dateOfBirth) {
    return "Please enter a valid date of birth.";
  }

  return getAgeInYears(dateOfBirth) < 18 ? "Age must be 18 years or above." : "";
}

function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generatePassword() {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
}

function generateToken() {
  return crypto.randomBytes(24).toString("hex");
}

function createEmptyPersonalDetails() {
  return {
    name: "",
    fatherName: "",
    motherName: "",
    aadhaarNumber: "",
    dateOfBirth: "",
    mobileNumber: "",
    alternateMobileNumber: "",
    emailAddress: "",
    gender: "",
    nationality: "Indian",
    category: "",
    isUpDomicile: "",
    domicileCertificateNumber: "",
    domicileState: "",
    correspondenceAddress: "",
    correspondencePinCode: "",
    correspondenceState: "",
    correspondenceDistrict: "",
    sameAsCorrespondence: false,
    permanentAddress: "",
    permanentPinCode: "",
    permanentState: "",
    permanentDistrict: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
  };
}

function createEmptyEducationDetails() {
  return {
    highSchool: {
      board: "",
      passingYear: "",
      marksObtained: "",
      maxMarks: "",
    },
    intermediate: {
      board: "",
      passingYear: "",
      marksObtained: "",
      maxMarks: "",
    },
    graduation: {
      university: "",
      course: "",
      passingYear: "",
      marksObtained: "",
      maxMarks: "",
    },
    postGraduation: {
      enabled: false,
      university: "",
      course: "",
      passingYear: "",
      marksObtained: "",
      maxMarks: "",
    },
    additionalQualification: "",
  };
}

function createEmptyPaymentDetails() {
  return {
    amount: 0,
    paymentMethod: "",
    payerName: "",
    transactionId: "",
    paidAt: "",
  };
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeNumericText(value) {
  return String(value ?? "").replace(/[^\d.]/g, "").trim();
}

function normalizeBoolean(value) {
  return value === true || value === "true";
}

function isAlphabeticName(value) {
  return /^[A-Za-z]+(?:\s+[A-Za-z]+)*$/.test(normalizeText(value));
}

function firstNonEmptyText(...values) {
  for (const value of values) {
    const normalized = normalizeText(value);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

function sanitizePersonalDetails(input = {}) {
  const base = createEmptyPersonalDetails();
  const legacyAddress = normalizeText(input.addressLine1);
  const legacyCity = normalizeText(input.city);
  const legacyState = normalizeText(input.state);
  const legacyPinCode = normalizeText(input.pinCode).replace(/\D/g, "");
  const hasModernAddressValues = Boolean(
    normalizeText(input.correspondenceAddress) ||
      normalizeText(input.permanentAddress) ||
      normalizeText(input.correspondenceDistrict) ||
      normalizeText(input.permanentDistrict)
  );

  const correspondenceAddress = firstNonEmptyText(input.correspondenceAddress, input.addressLine2, legacyAddress);
  const correspondencePinCode = firstNonEmptyText(input.correspondencePinCode, legacyPinCode).replace(/\D/g, "");
  const correspondenceState = firstNonEmptyText(input.correspondenceState, legacyState);
  const correspondenceDistrict = firstNonEmptyText(input.correspondenceDistrict, legacyCity);

  let sameAsCorrespondence = normalizeBoolean(input.sameAsCorrespondence);

  if (!hasModernAddressValues && legacyAddress) {
    sameAsCorrespondence = true;
  }

  let permanentAddress = firstNonEmptyText(input.permanentAddress, legacyAddress, correspondenceAddress);
  let permanentPinCode = firstNonEmptyText(input.permanentPinCode, legacyPinCode).replace(/\D/g, "");
  let permanentState = firstNonEmptyText(input.permanentState, legacyState, correspondenceState);
  let permanentDistrict = firstNonEmptyText(input.permanentDistrict, legacyCity, correspondenceDistrict);

  if (sameAsCorrespondence) {
    permanentAddress = correspondenceAddress;
    permanentPinCode = correspondencePinCode;
    permanentState = correspondenceState;
    permanentDistrict = correspondenceDistrict;
  }

  const normalizedDomicileChoice = firstNonEmptyText(
    input.isUpDomicile,
    normalizeText(input.domicileState).toLowerCase() === "uttar pradesh"
      ? "Yes"
      : normalizeText(input.domicileState)
        ? "No"
        : ""
  );
  const domicileState =
    normalizedDomicileChoice === "Yes"
      ? "Uttar Pradesh"
      : firstNonEmptyText(input.domicileState, permanentState, correspondenceState, "Outside Uttar Pradesh");

  return {
    ...base,
    name: firstNonEmptyText(input.name, input.fullName),
    fatherName: normalizeText(input.fatherName),
    motherName: normalizeText(input.motherName),
    aadhaarNumber: normalizeText(input.aadhaarNumber).replace(/\D/g, ""),
    dateOfBirth: normalizeText(input.dateOfBirth),
    mobileNumber: normalizeText(input.mobileNumber).replace(/\D/g, ""),
    alternateMobileNumber: normalizeText(input.alternateMobileNumber).replace(/\D/g, ""),
    emailAddress: normalizeText(input.emailAddress).toLowerCase(),
    gender: normalizeText(input.gender),
    nationality: firstNonEmptyText(input.nationality, "Indian"),
    category: normalizeText(input.category),
    isUpDomicile: normalizedDomicileChoice,
    domicileCertificateNumber: normalizeText(input.domicileCertificateNumber),
    domicileState,
    correspondenceAddress,
    correspondencePinCode,
    correspondenceState,
    correspondenceDistrict,
    sameAsCorrespondence,
    permanentAddress,
    permanentPinCode,
    permanentState,
    permanentDistrict,
    addressLine1: permanentAddress,
    addressLine2: correspondenceAddress,
    city: permanentDistrict,
    state: permanentState,
    pinCode: permanentPinCode,
  };
}

function sanitizeAcademicBlock(input = {}, fieldMap) {
  return Object.fromEntries(
    Object.entries(fieldMap).map(([key, type]) => {
      if (type === "numeric") {
        return [key, normalizeNumericText(input[key])];
      }

      return [key, normalizeText(input[key])];
    })
  );
}

function sanitizeEducationDetails(input = {}) {
  const empty = createEmptyEducationDetails();
  const postGraduationEnabled = Boolean(
    input.postGraduation?.enabled || input.postGraduation?.university || input.postGraduation?.course
  );

  return {
    ...empty,
    highSchool: sanitizeAcademicBlock(input.highSchool, {
      board: "text",
      passingYear: "text",
      marksObtained: "numeric",
      maxMarks: "numeric",
    }),
    intermediate: sanitizeAcademicBlock(input.intermediate, {
      board: "text",
      passingYear: "text",
      marksObtained: "numeric",
      maxMarks: "numeric",
    }),
    graduation: sanitizeAcademicBlock(input.graduation, {
      university: "text",
      course: "text",
      passingYear: "text",
      marksObtained: "numeric",
      maxMarks: "numeric",
    }),
    postGraduation: {
      enabled: postGraduationEnabled,
      ...sanitizeAcademicBlock(input.postGraduation, {
        university: "text",
        course: "text",
        passingYear: "text",
        marksObtained: "numeric",
        maxMarks: "numeric",
      }),
    },
    additionalQualification: normalizeText(input.additionalQualification),
  };
}

function validatePersonalDetails(personalDetails) {
  const missingFields = PERSONAL_REQUIRED_FIELDS.filter(
    (field) => !normalizeText(personalDetails[field])
  );

  if (missingFields.length > 0) {
    throw httpError(400, "Please complete all required personal details.");
  }

  const dateOfBirthError = getDateOfBirthError(personalDetails.dateOfBirth);

  if (dateOfBirthError) {
    throw httpError(400, dateOfBirthError);
  }

  if (!/^\d{12}$/.test(personalDetails.aadhaarNumber)) {
    throw httpError(400, "Invalid Aadhaar number.");
  }

  if (!/^\d{10}$/.test(personalDetails.mobileNumber)) {
    throw httpError(400, "Mobile number must contain exactly 10 digits.");
  }

  if (personalDetails.alternateMobileNumber && !/^\d{10}$/.test(personalDetails.alternateMobileNumber)) {
    throw httpError(400, "Alternate mobile number must contain exactly 10 digits.");
  }

  if (
    personalDetails.alternateMobileNumber &&
    personalDetails.mobileNumber === personalDetails.alternateMobileNumber
  ) {
    throw httpError(400, "Mobile No and Alternate Mobile No cannot be same.");
  }

  for (const field of PERSONAL_NAME_FIELDS) {
    if (!isAlphabeticName(personalDetails[field.key])) {
      throw httpError(400, `${field.label} must contain only letters and spaces.`);
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalDetails.emailAddress)) {
    throw httpError(400, "Invalid email address.");
  }

  if (!/^\d{6}$/.test(personalDetails.pinCode)) {
    throw httpError(400, "PIN code must contain exactly 6 digits.");
  }
}

function validateAcademicBlock(block, label) {
  const requiredKeys = Object.keys(block).filter((key) => key !== "enabled");
  const hasMissingValue = requiredKeys.some((key) => !normalizeText(block[key]));

  if (hasMissingValue) {
    throw httpError(400, `${label} details are incomplete.`);
  }
}

function validateEducationDetails(educationDetails) {
  validateAcademicBlock(educationDetails.highSchool, "High school");
  validateAcademicBlock(educationDetails.intermediate, "Intermediate");
  validateAcademicBlock(educationDetails.graduation, "Graduation");
  validatePassingYearGap(
    educationDetails.highSchool.passingYear,
    educationDetails.intermediate.passingYear
  );

  if (educationDetails.postGraduation.enabled) {
    validateAcademicBlock(educationDetails.postGraduation, "Post-graduation");
  }
}

function validatePassingYearGap(highSchoolPassingYear, intermediatePassingYear) {
  const highSchoolYear = Number.parseInt(highSchoolPassingYear, 10);
  const intermediateYear = Number.parseInt(intermediatePassingYear, 10);

  if (!Number.isInteger(highSchoolYear) || !Number.isInteger(intermediateYear)) {
    return;
  }

  if (intermediateYear - highSchoolYear < 2) {
    throw httpError(400, "Invalid entry! Intermediate passing year must be at least 2 years after the High School passing year.");
  }
}

function calculateFee(category) {
  const normalizedCategory = normalizeText(category).toLowerCase();

  if (["sc", "st", "pwd"].includes(normalizedCategory)) {
    return 900;
  }

  return 1500;
}

function withRowDefaults(row) {
  const personalDetails = sanitizePersonalDetails(
    parseJson(row.personal_details, createEmptyPersonalDetails())
  );

  const educationDefaults = createEmptyEducationDetails();
  const educationDetails = {
    ...educationDefaults,
    ...parseJson(row.education_details, educationDefaults),
  };

  educationDetails.highSchool = {
    ...educationDefaults.highSchool,
    ...(educationDetails.highSchool ?? {}),
  };
  educationDetails.intermediate = {
    ...educationDefaults.intermediate,
    ...(educationDetails.intermediate ?? {}),
  };
  educationDetails.graduation = {
    ...educationDefaults.graduation,
    ...(educationDetails.graduation ?? {}),
  };
  educationDetails.postGraduation = {
    ...educationDefaults.postGraduation,
    ...(educationDetails.postGraduation ?? {}),
  };

  const documents = parseJson(row.documents, {});
  const paymentDetails = {
    ...createEmptyPaymentDetails(),
    ...parseJson(row.payment_details, createEmptyPaymentDetails()),
  };

  return {
    ...row,
    personalDetails,
    educationDetails,
    documents,
    paymentDetails,
  };
}

function getRequiredDocumentKeys(snapshot) {
  const required = [
    "highSchoolMarksheet",
    "intermediateMarksheet",
    "graduationMarksheet",
    "idProof",
    "domicileProof",
  ];

  if (snapshot.educationDetails.postGraduation.enabled) {
    required.push("postGraduationMarksheet");
  }

  if (!["general", ""].includes(snapshot.personalDetails.category.toLowerCase())) {
    required.push("categoryCertificate");
  }

  return required;
}

function isPersonalComplete(personalDetails) {
  return (
    PERSONAL_REQUIRED_FIELDS.every((field) => Boolean(normalizeText(personalDetails[field]))) &&
    !getDateOfBirthError(personalDetails.dateOfBirth)
  );
}

function isEducationComplete(educationDetails) {
  const mandatoryBlocks = [
    educationDetails.highSchool,
    educationDetails.intermediate,
    educationDetails.graduation,
  ];

  const mandatoryValid = mandatoryBlocks.every((block) =>
    Object.keys(block).every((key) => Boolean(normalizeText(block[key])))
  );

  if (!mandatoryValid) {
    return false;
  }

  if (!educationDetails.postGraduation.enabled) {
    return true;
  }

  return Object.keys(educationDetails.postGraduation)
    .filter((key) => key !== "enabled")
    .every((key) => Boolean(normalizeText(educationDetails.postGraduation[key])));
}

function areDocumentsComplete(snapshot) {
  const requiredKeys = getRequiredDocumentKeys(snapshot);
  return requiredKeys.every((key) => Boolean(snapshot.documents[key]?.url));
}

function buildApplicantPayload(row) {
  const snapshot = withRowDefaults(row);
  const requiredDocumentKeys = getRequiredDocumentKeys(snapshot);
  const completion = {
    personal: isPersonalComplete(snapshot.personalDetails),
    education: isEducationComplete(snapshot.educationDetails),
    documents: areDocumentsComplete(snapshot),
    payment: snapshot.payment_status === "completed",
    submitted: snapshot.application_status === "submitted",
  };

  const resumeStep = completion.submitted
    ? "submitted"
    : !completion.personal
      ? "personal"
      : !completion.education
        ? "education"
        : !completion.documents
          ? "documents"
          : "payment";

  const documentChecklist = DOCUMENT_FIELDS.map((field) => ({
    ...field,
    required: requiredDocumentKeys.includes(field.key),
    uploaded: Boolean(snapshot.documents[field.key]?.url),
    fileName: snapshot.documents[field.key]?.originalName ?? "",
    url: snapshot.documents[field.key]?.url ?? "",
    uploadedAt: snapshot.documents[field.key]?.uploadedAt ?? "",
  }));

  return {
    recordId: snapshot.id,
    applicationId: snapshot.application_id,
    loginId: snapshot.login_id,
    personalDetails: snapshot.personalDetails,
    educationDetails: snapshot.educationDetails,
    documents: snapshot.documents,
    documentChecklist,
    paymentStatus: snapshot.payment_status,
    paymentDetails: snapshot.paymentDetails,
    applicationStatus: snapshot.application_status,
    currentStep: snapshot.current_step,
    resumeStep,
    completion,
    feeAmount: calculateFee(snapshot.personalDetails.category),
    createdAt: snapshot.created_at,
    updatedAt: snapshot.updated_at,
    submittedAt: snapshot.submitted_at,
  };
}

function persistApplicant(snapshot) {
  updateApplicantStatement.run(
    stringifyJson(snapshot.personalDetails),
    stringifyJson(snapshot.educationDetails),
    stringifyJson(snapshot.documents),
    snapshot.payment_status,
    stringifyJson(snapshot.paymentDetails),
    snapshot.application_status,
    snapshot.current_step,
    snapshot.updated_at,
    snapshot.submitted_at,
    snapshot.id
  );

  return buildApplicantPayload(findApplicantByIdStatement.get(snapshot.id));
}

function deleteStoredUpload(documentRecord) {
  const fileName = documentRecord?.storedName;

  if (!fileName) {
    return;
  }

  const absolutePath = path.join(uploadsDirectory, path.basename(fileName));
  fs.unlink(absolutePath, () => {});
}

function ensureDocumentField(field) {
  const allowed = DOCUMENT_FIELDS.some((item) => item.key === field);

  if (!allowed) {
    throw httpError(400, "Unknown document field.");
  }
}

function createApplicant(personalInput) {
  const personalDetails = sanitizePersonalDetails(personalInput);
  validatePersonalDetails(personalDetails);

  const now = isoNow();
  const password = generatePassword();
  const token = generateToken();
  const temporaryId = `TEMP-${Date.now()}-${Math.round(Math.random() * 100000)}`;

  const insertResult = insertApplicantStatement.run(
    temporaryId,
    temporaryId,
    hashPassword(password),
    token,
    stringifyJson(personalDetails),
    stringifyJson(createEmptyEducationDetails()),
    stringifyJson({}),
    "pending",
    stringifyJson(createEmptyPaymentDetails()),
    "draft",
    "education",
    now,
    now
  );

  const recordId = Number(insertResult.lastInsertRowid);
  const serial = String(recordId).padStart(4, "0");
  const yearSuffix = new Date().getFullYear().toString().slice(-2);
  const applicationId = `APP${yearSuffix}${String(recordId).padStart(6, "0")}`;
  const loginId = `CCSU${yearSuffix}${serial}`;

  updateIdentifiersStatement.run(applicationId, loginId, now, recordId);

  return {
    token,
    password,
    applicant: buildApplicantPayload(findApplicantByIdStatement.get(recordId)),
  };
}

function loginApplicant(loginId, password) {
  const row = findApplicantByLoginStatement.get(normalizeText(loginId));

  if (!row || row.password_hash !== hashPassword(password)) {
    throw httpError(401, "Invalid login ID or password.");
  }

  const token = generateToken();
  const now = isoNow();
  updateTokenStatement.run(token, now, row.id);

  return {
    token,
    applicant: buildApplicantPayload(findApplicantByIdStatement.get(row.id)),
  };
}

function logoutApplicant(token) {
  const row = findApplicantByTokenStatement.get(token);

  if (!row) {
    return;
  }

  updateTokenStatement.run(null, isoNow(), row.id);
}

function getApplicantByToken(token) {
  const row = findApplicantByTokenStatement.get(token);
  return row ? buildApplicantPayload(row) : null;
}

function updatePersonalDetails(recordId, personalInput) {
  const row = findApplicantByIdStatement.get(recordId);

  if (!row) {
    throw httpError(404, "Applicant record not found.");
  }

  const snapshot = withRowDefaults(row);
  const updatedPersonalDetails = sanitizePersonalDetails({
    ...snapshot.personalDetails,
    ...personalInput,
    mobileNumber: snapshot.personalDetails.mobileNumber,
  });

  if (
    normalizeText(personalInput.mobileNumber) &&
    normalizeText(personalInput.mobileNumber).replace(/\D/g, "") !== snapshot.personalDetails.mobileNumber
  ) {
    throw httpError(400, "Mobile number cannot be edited once registration is created.");
  }

  validatePersonalDetails(updatedPersonalDetails);

  snapshot.personalDetails = updatedPersonalDetails;
  snapshot.current_step = "education";
  snapshot.updated_at = isoNow();

  return persistApplicant(snapshot);
}

function updateEducationDetails(recordId, educationInput) {
  const row = findApplicantByIdStatement.get(recordId);

  if (!row) {
    throw httpError(404, "Applicant record not found.");
  }

  const snapshot = withRowDefaults(row);
  const updatedEducationDetails = sanitizeEducationDetails(educationInput);
  validateEducationDetails(updatedEducationDetails);

  snapshot.educationDetails = updatedEducationDetails;
  snapshot.current_step = "documents";
  snapshot.updated_at = isoNow();

  return persistApplicant(snapshot);
}

function saveDocument(recordId, field, file) {
  ensureDocumentField(field);

  const row = findApplicantByIdStatement.get(recordId);

  if (!row) {
    throw httpError(404, "Applicant record not found.");
  }

  const snapshot = withRowDefaults(row);
  deleteStoredUpload(snapshot.documents[field]);

  snapshot.documents[field] = {
    originalName: file.originalname,
    storedName: path.basename(file.filename),
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: isoNow(),
    url: `/uploads/${encodeURIComponent(path.basename(file.filename))}`,
  };
  snapshot.current_step = areDocumentsComplete(snapshot) ? "payment" : "documents";
  snapshot.updated_at = isoNow();

  return persistApplicant(snapshot);
}

function deleteDocument(recordId, field) {
  ensureDocumentField(field);

  const row = findApplicantByIdStatement.get(recordId);

  if (!row) {
    throw httpError(404, "Applicant record not found.");
  }

  const snapshot = withRowDefaults(row);
  deleteStoredUpload(snapshot.documents[field]);
  delete snapshot.documents[field];
  snapshot.current_step = "documents";
  snapshot.updated_at = isoNow();

  return persistApplicant(snapshot);
}

function completePayment(recordId, paymentInput = {}) {
  const row = findApplicantByIdStatement.get(recordId);

  if (!row) {
    throw httpError(404, "Applicant record not found.");
  }

  const snapshot = withRowDefaults(row);

  if (!isPersonalComplete(snapshot.personalDetails)) {
    throw httpError(400, "Complete personal details before payment.");
  }

  if (!isEducationComplete(snapshot.educationDetails)) {
    throw httpError(400, "Complete educational details before payment.");
  }

  if (!areDocumentsComplete(snapshot)) {
    throw httpError(400, "Upload all required documents before payment.");
  }

  const payerName = normalizeText(paymentInput.payerName);
  const paymentMethod = normalizeText(paymentInput.paymentMethod);

  if (!payerName || !paymentMethod) {
    throw httpError(400, "Payer name and payment method are required.");
  }

  snapshot.payment_status = "completed";
  snapshot.paymentDetails = {
    amount: calculateFee(snapshot.personalDetails.category),
    paymentMethod,
    payerName,
    transactionId: `TXN-${Date.now()}`,
    paidAt: isoNow(),
  };
  snapshot.current_step = "payment";
  snapshot.updated_at = isoNow();

  return persistApplicant(snapshot);
}

function submitApplication(recordId) {
  const row = findApplicantByIdStatement.get(recordId);

  if (!row) {
    throw httpError(404, "Applicant record not found.");
  }

  const snapshot = withRowDefaults(row);

  if (!isPersonalComplete(snapshot.personalDetails)) {
    throw httpError(400, "Personal details are incomplete.");
  }

  if (!isEducationComplete(snapshot.educationDetails)) {
    throw httpError(400, "Educational details are incomplete.");
  }

  if (!areDocumentsComplete(snapshot)) {
    throw httpError(400, "Required documents are missing.");
  }

  if (snapshot.payment_status !== "completed") {
    throw httpError(400, "Payment is pending.");
  }

  snapshot.application_status = "submitted";
  snapshot.current_step = "submitted";
  snapshot.updated_at = isoNow();
  snapshot.submitted_at = isoNow();

  return persistApplicant(snapshot);
}

module.exports = {
  completePayment,
  createApplicant,
  deleteDocument,
  getApplicantByToken,
  httpError,
  loginApplicant,
  logoutApplicant,
  saveDocument,
  submitApplication,
  updateEducationDetails,
  updatePersonalDetails,
};
