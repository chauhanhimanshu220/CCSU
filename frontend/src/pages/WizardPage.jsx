import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api, getFileUrl } from "../api";
import { Modal } from "../components/Modal";
import { PortalLayout, PortalLoader } from "../components/PortalLayout";
import {
  CATEGORY_OPTIONS,
  EMPLOYMENT_NATURE_OPTIONS,
  GENDER_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PREVIOUS_SERVICE_REGISTRATION_OPTIONS,
  RECRUITMENT_POST_OPTIONS,
  STEP_ITEMS,
} from "../constants";
import { useAuth } from "../context/AuthContext";
import { generateCaptchaText, drawCaptcha } from "../utils";
import {
  createEmptyEducationDetails,
  createEmptyPersonalDetails,
  createEmptyRecruitmentDetails,
  createEmptyPreviousServiceDetails,
  createEmptyPreviousServiceEntry,
} from "../formDefaults";

function formatDateTime(value) {
  if (!value) {
    return "Not uploaded yet";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

const PERSONAL_DOMICILE_OPTIONS = ["Yes", "No"];
const PERSONAL_NATIONALITY_OPTIONS = ["Indian"];
const DOB_YEAR_OPTIONS = Array.from(
  { length: new Date().getFullYear() - 1949 },
  (_, index) => String(new Date().getFullYear() - index)
);
const DOB_MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
const DOB_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
const PERSONAL_NAME_FIELDS = new Set(["name", "fatherName", "motherName"]);
const PERSONAL_PINCODE_FIELDS = new Set(["correspondencePinCode", "permanentPinCode"]);
const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EDUCATION_MARK_FIELDS = new Set(["marksObtained", "maxMarks"]);
const EDUCATION_ROW_CONFIG = [
  {
    key: "highSchool",
    examName: "High School",
    institutionField: "board",
    required: true,
  },
  {
    key: "intermediate",
    examName: "Intermediate",
    institutionField: "board",
    required: true,
  },
  {
    key: "graduation",
    examName: "Graduation",
    examField: "course",
    institutionField: "university",
    required: false,
  },
  {
    key: "postGraduation",
    examName: "Post-Graduation",
    examField: "course",
    institutionField: "university",
    required: false,
  },
];

function normalizeInlineText(value) {
  return String(value ?? "").trim();
}

function formatPassingYearInput(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 4);
}

function formatEducationMarksInput(value) {
  const sanitized = String(value ?? "").replace(/[^\d.]/g, "");
  const [wholePart, ...decimalParts] = sanitized.split(".");
  const decimals = decimalParts.join("");

  return decimalParts.length > 0 ? `${wholePart}.${decimals.slice(0, 2)}` : wholePart;
}

function hasEducationRowStarted(block) {
  if (!block || typeof block !== "object") {
    return false;
  }

  return Object.entries(block).some(([key, value]) => {
    if (key === "enabled") return false; // Ignore enabled flag for mandatory check
    if (typeof value === "string" && value.trim().length > 0) return true;
    return false;
  });
}

function getEducationPercentage(block) {
  const totalMarks = Number.parseFloat(block?.maxMarks);
  const obtainedMarks = Number.parseFloat(block?.marksObtained);

  if (!Number.isFinite(totalMarks) || !Number.isFinite(obtainedMarks) || totalMarks <= 0 || obtainedMarks > totalMarks) {
    return "";
  }

  return ((obtainedMarks / totalMarks) * 100).toFixed(2);
}

function getEducationDivision(block) {
  const percentage = Number.parseFloat(getEducationPercentage(block));

  if (!Number.isFinite(percentage)) {
    return "";
  }

  if (percentage >= 60) {
    return "1st";
  }

  if (percentage >= 50) {
    return "2nd";
  }

  if (percentage >= 33) {
    return "3rd";
  }

  return "";
}

function getEducationMarksError(block, examName, institutionField, required, forceShow = false) {
  const rowStarted = hasEducationRowStarted(block);

  if (!required && !rowStarted) {
    return "";
  }

  const totalMarks = Number.parseFloat(block?.maxMarks);
  const obtainedMarks = Number.parseFloat(block?.marksObtained);

  if (Number.isFinite(totalMarks) && Number.isFinite(obtainedMarks)) {
    if (obtainedMarks > totalMarks) {
      return `${examName}: Obtained Marks cannot be greater than Total Marks.`;
    }
  }

  return "";
}

function getPassingYearGapError(educationDetails) {
  if (!educationDetails) return "";

  const hs = educationDetails.highSchool || educationDetails.HighSchool;
  const inter = educationDetails.intermediate || educationDetails.Intermediate;
  const grad = educationDetails.graduation || educationDetails.Graduation;
  const pg = educationDetails.postGraduation || educationDetails.PostGraduation;

  const highSchoolPassingYear = normalizeInlineText(hs?.passingYear);
  const intermediatePassingYear = normalizeInlineText(inter?.passingYear);
  const graduationPassingYear = normalizeInlineText(grad?.passingYear);
  const postGraduationPassingYear = normalizeInlineText(pg?.passingYear);

  const highSchoolYear = Number.parseInt(highSchoolPassingYear, 10);
  const intermediateYear = Number.parseInt(intermediatePassingYear, 10);
  const graduationYear = Number.parseInt(graduationPassingYear, 10);
  const postGraduationYear = Number.parseInt(postGraduationPassingYear, 10);

  // Order check: Post-Grad started but Grad not started
  if (hasEducationRowStarted(pg) && !hasEducationRowStarted(grad)) {
    return "Please Fill Graduation details first.";
  }

  if (Number.isInteger(highSchoolYear) && Number.isInteger(intermediateYear)) {
    if (intermediateYear - highSchoolYear < 2) {
      return "Invalid entry! Intermediate passing year must be at least 2 years after the High School passing year.";
    }
  }

  if (Number.isInteger(intermediateYear) && Number.isInteger(graduationYear)) {
    if (graduationYear - intermediateYear < 3) {
      return "Invalid Entry! Graduation passing year must be at least 3 year after the Intermediate passing year.";
    }
  }

  if (Number.isInteger(graduationYear) && Number.isInteger(postGraduationYear)) {
    if (postGraduationYear - graduationYear < 2) {
      return "Invalid Entry! Post Graduation passing year must be at least 2 year after the Graduation passing year.";
    }
  }

  return "";
}

function buildEducationPayload(formData) {
  const graduationStarted = hasEducationRowStarted(formData.graduation);
  const postGraduationStarted = hasEducationRowStarted(formData.postGraduation);

  return {
    ...formData,
    graduation: {
      ...formData.graduation,
      enabled: graduationStarted,
    },
    postGraduation: {
      ...formData.postGraduation,
      enabled: postGraduationStarted,
    },
  };
}

function getDateParts(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return {
      year: "",
      month: "",
      day: "",
    };
  }

  return {
    year: match[1],
    month: match[2],
    day: match[3],
  };
}

function buildDateValue(parts) {
  if (!parts.year || !parts.month || !parts.day) {
    return "";
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseDateValue(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

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

function getDateOfBirthError(value) {
  const normalizedValue = String(value ?? "").trim();

  if (!normalizedValue) {
    return "";
  }

  const dateOfBirth = parseDateValue(normalizedValue);

  if (!dateOfBirth) {
    return "Please enter a valid date of birth.";
  }

  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const hasHadBirthday =
    today.getMonth() > dateOfBirth.getMonth() ||
    (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate());

  if (!hasHadBirthday) {
    age -= 1;
  }

  return age < 18 ? "Age must be 18 years or above." : "";
}

function isCheckedValue(value) {
  return value === true || value === "true";
}

function getDigitsOnly(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function formatPinCodeInput(value) {
  return getDigitsOnly(value).slice(0, 6);
}

function sanitizeNameInput(value) {
  return String(value ?? "")
    .replace(/[^A-Za-z\s]/g, "")
    .replace(/\s{2,}/g, " ");
}

function formatAadhaarInput(value) {
  return getDigitsOnly(value)
    .slice(0, 12)
    .replace(/(\d{4})(?=\d)/g, "$1-");
}

function getAadhaarNumberError(value) {
  const aadhaarLength = getDigitsOnly(value).length;
  return aadhaarLength > 0 && aadhaarLength < 12
    ? "Aadhaar number must contain exactly 12 digits."
    : "";
}

function getMatchingMobileNumbersError(mobileValue, alternateMobileValue) {
  const mobileNumber = getDigitsOnly(mobileValue);
  const alternateMobileNumber = getDigitsOnly(alternateMobileValue);

  return mobileNumber.length === 10 &&
    alternateMobileNumber.length === 10 &&
    mobileNumber === alternateMobileNumber
    ? "Mobile No and Alternate Mobile No cannot be same."
    : "";
}

function getMobileNumberError(value, alternateValue = "") {
  const mobileLength = getDigitsOnly(value).length;

  if (mobileLength > 0 && mobileLength < 10) {
    return "Mobile number must contain exactly 10 digits.";
  }

  return getMatchingMobileNumbersError(value, alternateValue);
}

function getAlternateMobileNumberError(value, mobileValue = "") {
  const mobileLength = getDigitsOnly(value).length;

  if (mobileLength > 0 && mobileLength < 10) {
    return "Alternate mobile number must contain exactly 10 digits.";
  }

  return getMatchingMobileNumbersError(mobileValue, value);
}

function getDuplicateMobileNumberError(value, mobileNumberLookup) {
  const mobileNumber = getDigitsOnly(value);

  return mobileNumber.length === 10 &&
    mobileNumberLookup.status === "registered" &&
    mobileNumberLookup.mobileNumber === mobileNumber
    ? mobileNumberLookup.message || "This mobile number is already registered."
    : "";
}

function getDuplicateAadhaarNumberError(value, aadhaarNumberLookup) {
  const aadhaarNumber = getDigitsOnly(value);

  return aadhaarNumber.length === 12 &&
    aadhaarNumberLookup.status === "registered" &&
    aadhaarNumberLookup.aadhaarNumber === aadhaarNumber
    ? aadhaarNumberLookup.message || "This Aadhaar number is already registered."
    : "";
}

function getEmailAddressError(value) {
  const normalizedValue = String(value ?? "").trim();

  return normalizedValue && !EMAIL_ADDRESS_PATTERN.test(normalizedValue) ? "Invalid email address." : "";
}

function getPinCodeError(value) {
  const pinCodeLength = formatPinCodeInput(value).length;
  return pinCodeLength > 0 && pinCodeLength < 6 ? "PIN code must contain exactly 6 digits." : "";
}

function syncAadhaarValidity(inputElement, value) {
  inputElement.setCustomValidity(getAadhaarNumberError(value));
}

function syncMobileValidity(inputElement, value, alternateValue = "") {
  inputElement.setCustomValidity(getMobileNumberError(value, alternateValue));
}

function syncAlternateMobileValidity(inputElement, value, mobileValue = "") {
  inputElement.setCustomValidity(getAlternateMobileNumberError(value, mobileValue));
}

function syncEmailValidity(inputElement, value) {
  inputElement.setCustomValidity(getEmailAddressError(value));
}

function syncPinCodeValidity(inputElement, value) {
  inputElement.setCustomValidity(getPinCodeError(value));
}

function syncPersonalFormState(input = {}) {
  const base = createEmptyPersonalDetails();
  const next = {
    ...base,
    ...input,
  };
  const hasExplicitCorrespondenceState = Object.prototype.hasOwnProperty.call(input, "correspondenceState");
  const hasExplicitCorrespondenceDistrict = Object.prototype.hasOwnProperty.call(input, "correspondenceDistrict");
  const hasExplicitPermanentAddress = Object.prototype.hasOwnProperty.call(input, "permanentAddress");
  const hasExplicitPermanentPinCode = Object.prototype.hasOwnProperty.call(input, "permanentPinCode");
  const hasExplicitPermanentState = Object.prototype.hasOwnProperty.call(input, "permanentState");
  const hasExplicitPermanentDistrict = Object.prototype.hasOwnProperty.call(input, "permanentDistrict");
  const hasExplicitSameAsCorrespondence = Object.prototype.hasOwnProperty.call(input, "sameAsCorrespondence");
  next.name = next.name || next.fullName || "";
  const parsedDateParts = getDateParts(next.dateOfBirth);

  next.dateOfBirthYear = next.dateOfBirthYear ?? parsedDateParts.year;
  next.dateOfBirthMonth = next.dateOfBirthMonth ?? parsedDateParts.month;
  next.dateOfBirthDay = next.dateOfBirthDay ?? parsedDateParts.day;
  next.dateOfBirth = buildDateValue({
    year: next.dateOfBirthYear,
    month: next.dateOfBirthMonth,
    day: next.dateOfBirthDay,
  });

  const legacySingleAddress =
    Boolean(next.addressLine1 || next.city || next.state || next.pinCode) &&
    !next.correspondenceAddress &&
    !next.permanentAddress;

  next.mobileNumber = String(next.mobileNumber ?? "").replace(/\D/g, "");
  next.alternateMobileNumber = String(next.alternateMobileNumber ?? "").replace(/\D/g, "");
  next.aadhaarNumber = formatAadhaarInput(next.aadhaarNumber);

  next.correspondenceAddressLine1 = String(next.correspondenceAddressLine1 ?? "");
  next.correspondenceAddressLine2 = String(next.correspondenceAddressLine2 ?? "");
  next.correspondenceCity = String(next.correspondenceCity ?? "");
  next.correspondenceAddress = next.correspondenceAddressLine1
    ? `${next.correspondenceAddressLine1} ${next.correspondenceAddressLine2}`.trim()
    : next.correspondenceAddress || next.addressLine2 || next.addressLine1 || "";
  next.correspondencePinCode = String(next.correspondencePinCode || next.pinCode || "").replace(/\D/g, "");
  next.correspondenceState = hasExplicitCorrespondenceState
    ? String(next.correspondenceState ?? "")
    : next.correspondenceState || next.state || "";
  next.correspondenceDistrict = hasExplicitCorrespondenceDistrict
    ? String(next.correspondenceDistrict ?? "")
    : next.correspondenceDistrict || next.city || "";

  const rawPermanentAddressLine1 = String(next.permanentAddressLine1 ?? "");
  const rawPermanentAddressLine2 = String(next.permanentAddressLine2 ?? "");
  const rawPermanentCity = String(next.permanentCity ?? "");
  const rawPermanentAddress = rawPermanentAddressLine1
    ? `${rawPermanentAddressLine1} ${rawPermanentAddressLine2}`.trim()
    : hasExplicitPermanentAddress
      ? String(next.permanentAddress ?? "")
      : next.permanentAddress || next.addressLine1 || "";
  const rawPermanentPinCode = hasExplicitPermanentPinCode
    ? formatPinCodeInput(next.permanentPinCode)
    : String(next.permanentPinCode || next.pinCode || "").replace(/\D/g, "");
  const rawPermanentState = hasExplicitPermanentState
    ? String(next.permanentState ?? "")
    : next.permanentState || next.state || "";
  const rawPermanentDistrict = hasExplicitPermanentDistrict
    ? String(next.permanentDistrict ?? "")
    : next.permanentDistrict || next.city || "";
  next.sameAsCorrespondence = hasExplicitSameAsCorrespondence
    ? isCheckedValue(next.sameAsCorrespondence)
    : legacySingleAddress ||
      Boolean(
        next.correspondenceAddress &&
          next.correspondenceAddress === rawPermanentAddress &&
          next.correspondencePinCode === rawPermanentPinCode &&
          next.correspondenceState === rawPermanentState &&
          next.correspondenceDistrict === rawPermanentDistrict
      );
  next.isUpDomicile =
    next.isUpDomicile ||
    (String(next.domicileState || "").toLowerCase() === "uttar pradesh"
      ? "Yes"
      : next.domicileState
        ? "No"
        : "");

  if (next.sameAsCorrespondence) {
    next.permanentAddressLine1 = next.correspondenceAddressLine1;
    next.permanentAddressLine2 = next.correspondenceAddressLine2;
    next.permanentCity = next.correspondenceCity;
    next.permanentAddress = next.correspondenceAddress;
    next.permanentPinCode = next.correspondencePinCode;
    next.permanentState = next.correspondenceState;
    next.permanentDistrict = next.correspondenceDistrict;
  } else {
    next.permanentAddressLine1 = rawPermanentAddressLine1;
    next.permanentAddressLine2 = rawPermanentAddressLine2;
    next.permanentCity = rawPermanentCity;
    next.permanentAddress = rawPermanentAddress;
    next.permanentPinCode = rawPermanentPinCode;
    next.permanentState = rawPermanentState;
    next.permanentDistrict = rawPermanentDistrict;
  }

  next.addressLine1 = next.permanentAddress || "";
  next.addressLine2 = next.correspondenceAddress || "";
  next.city = next.permanentDistrict || "";
  next.state = next.permanentState || "";
  next.pinCode = String(next.permanentPinCode || "").replace(/\D/g, "");
  next.domicileState =
    next.isUpDomicile === "Yes"
      ? "Uttar Pradesh"
      : next.permanentState || next.correspondenceState || next.domicileState || "";

  return next;
}

function syncRecruitmentFormState(input = {}) {
  const base = createEmptyRecruitmentDetails();

  return {
    advertisementNumber: normalizeInlineText(input.advertisementNumber) || base.advertisementNumber,
    postAppliedFor: normalizeInlineText(input.postAppliedFor) || base.postAppliedFor,
  };
}

function getEmptyPreviousServiceEntry() {
  return createEmptyPreviousServiceEntry();
}

function parseServiceDateValue(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);

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

function getTotalExperienceValue(dateOfJoining, dateOfRelieving) {
  const joiningDate = parseServiceDateValue(dateOfJoining);
  const relievingDate = parseServiceDateValue(dateOfRelieving);

  if (!joiningDate || !relievingDate || relievingDate < joiningDate) {
    return "";
  }

  let years = relievingDate.getFullYear() - joiningDate.getFullYear();
  let months = relievingDate.getMonth() - joiningDate.getMonth();
  let days = relievingDate.getDate() - joiningDate.getDate();

  if (days < 0) {
    months -= 1;
    const previousMonth = new Date(relievingDate.getFullYear(), relievingDate.getMonth(), 0);
    days += previousMonth.getDate();
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];

  if (years > 0) {
    parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  }

  if (months > 0) {
    parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  }

  if (days > 0) {
    parts.push(`${days} ${days === 1 ? "day" : "days"}`);
  }

  return parts.length === 0 ? "0 days" : parts.join(" ");
}

function syncPreviousServiceFormState(input = {}) {
  const base = createEmptyPreviousServiceDetails();
  const next = {
    ...base,
    ...input,
  };
  const experiences = Array.isArray(next.experiences) && next.experiences.length > 0
    ? next.experiences
    : [getEmptyPreviousServiceEntry()];

  return {
    registrationType: String(next.registrationType ?? "").trim(),
    experiences: experiences.map((entry) => ({
      ...getEmptyPreviousServiceEntry(),
      ...entry,
      organizationName: String(entry?.organizationName ?? ""),
      departmentName: String(entry?.departmentName ?? ""),
      designation: String(entry?.designation ?? ""),
      natureOfEmployment: String(entry?.natureOfEmployment ?? ""),
      dateOfJoining: String(entry?.dateOfJoining ?? ""),
      dateOfRelieving: String(entry?.dateOfRelieving ?? entry?.dateOfLeaving ?? ""),
      totalExperience: getTotalExperienceValue(entry?.dateOfJoining, entry?.dateOfRelieving ?? entry?.dateOfLeaving),
    })),
  };
}

function hasPreviousServiceEntryStarted(entry = {}) {
  return Boolean(
    normalizeInlineText(entry.organizationName) ||
    normalizeInlineText(entry.departmentName) ||
    normalizeInlineText(entry.designation) ||
    normalizeInlineText(entry.natureOfEmployment) ||
    normalizeInlineText(entry.dateOfJoining) ||
    normalizeInlineText(entry.dateOfRelieving)
  );
}

function getPreviousServiceEntryError(entry, registrationType) {
  if (registrationType !== "Experience") {
    return "";
  }

  if (!hasPreviousServiceEntryStarted(entry)) {
    return "";
  }

  if (
    !normalizeInlineText(entry.organizationName) ||
    !normalizeInlineText(entry.departmentName) ||
    !normalizeInlineText(entry.designation) ||
    !normalizeInlineText(entry.natureOfEmployment) ||
    !normalizeInlineText(entry.dateOfJoining) ||
    !normalizeInlineText(entry.dateOfRelieving)
  ) {
    return "Please complete all fields for this experience record.";
  }

  const joiningDate = parseServiceDateValue(entry.dateOfJoining);
  const relievingDate = parseServiceDateValue(entry.dateOfRelieving);

  if (!joiningDate || !relievingDate) {
    return "Please enter valid joining and relieving dates.";
  }

  if (relievingDate < joiningDate) {
    return "Date of Relieving cannot be earlier than Date of Joining.";
  }

  return "";
}

function getExperiencesOverlapError(experiences) {
  const parsed = experiences
    .map((exp, index) => {
      const start = parseServiceDateValue(exp.dateOfJoining);
      const end = parseServiceDateValue(exp.dateOfRelieving);
      return { start, end, index };
    })
    .filter((exp) => exp.start && exp.end);

  for (let i = 0; i < parsed.length; i++) {
    for (let j = i + 1; j < parsed.length; j++) {
      const a = parsed[i];
      const b = parsed[j];

      // Overlap logic: (StartA <= EndB) and (EndA >= StartB)
      if (a.start <= b.end && a.end >= b.start) {
        return `Experience ${a.index + 1} and Experience ${j + 1} have overlapping dates. Please correct them.`;
      }
    }
  }

  return "";
}

function buildPreviousServicePayload(formData) {
  return {
    registrationType: normalizeInlineText(formData.registrationType),
    experiences: (formData.experiences ?? [])
      .map((entry) => ({
        organizationName: normalizeInlineText(entry.organizationName),
        departmentName: normalizeInlineText(entry.departmentName),
        designation: normalizeInlineText(entry.designation),
        natureOfEmployment: normalizeInlineText(entry.natureOfEmployment),
        dateOfJoining: normalizeInlineText(entry.dateOfJoining),
        dateOfRelieving: normalizeInlineText(entry.dateOfRelieving),
        totalExperience: getTotalExperienceValue(entry.dateOfJoining, entry.dateOfRelieving),
      }))
      .filter((entry) => hasPreviousServiceEntryStarted(entry)),
  };
}

function PersonalInfoFieldRow({ label, htmlFor, required = false, className = "", errorMessage = "", children }) {
  const rowClassName = className ? `legacy-personal-field ${className}` : "legacy-personal-field";

  return (
    <div className={rowClassName}>
      <label className="legacy-personal-label" htmlFor={htmlFor}>
        <span>{label}</span>
        {required ? <span className="legacy-personal-asterisk">*</span> : null}
      </label>
      <div className="legacy-personal-control">
        {children}
        {errorMessage ? <div className="legacy-personal-error">{errorMessage}</div> : null}
      </div>
    </div>
  );
}

function RegistrationSummary({ registrationNumber }) {
  return (
    <div className="summary-box registration-summary">
      <div className="detail-row">
        <span>Registration Number</span>
        <span>{registrationNumber}</span>
      </div>
    </div>
  );
}

function RecruitmentFormSection({ formData, onChange, onSubmit, registrationNumber, saving }) {
  return (
    <div className="section-stack section-stack--personal">
      <div className="section-header">
        <div>
          <span className="page-kicker">Step 2</span>
          <h1 className="page-title page-title--section">Recruitment Details</h1>
        </div>
        <RegistrationSummary registrationNumber={registrationNumber} />
      </div>

      <form className="legacy-personal-page" onSubmit={onSubmit}>
        <div className="legacy-personal-card">
          <div className="legacy-personal-card-head" style={{ display: "flex", justifyContent: "flex-end" }}>
            <span className="legacy-personal-mandatory">(*) Mandatory Fields</span>
          </div>

          <div className="legacy-personal-grid">
            <div className="legacy-personal-column">
              <PersonalInfoFieldRow htmlFor="advertisementNumber" label="Advertisement No." required>
                <input id="advertisementNumber" readOnly value={formData.advertisementNumber} />
                <div className="helper-text">This advertisement number is pre-filled for the current recruitment.</div>
              </PersonalInfoFieldRow>
            </div>

            <div className="legacy-personal-column">
              <PersonalInfoFieldRow htmlFor="postAppliedFor" label="Post Applied for" required>
                <select id="postAppliedFor" value={formData.postAppliedFor} onChange={onChange("postAppliedFor")} required>
                  {RECRUITMENT_POST_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </PersonalInfoFieldRow>
            </div>
          </div>

          <div className="legacy-personal-actions">
            <button className="legacy-personal-submit" disabled={saving} type="submit">
              {saving ? "Saving..." : "Save & Next"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function PersonalFormSection({
  correspondencePinLookup,
  disabledMobile,
  formData,
  mobileNumberLookup,
  onChange,
  onDatePartChange,
  onSubmit,
  permanentPinLookup,
  registrationNumber,
  saving,
  showRegistrationMeta,
  aadhaarNumberLookup,
}) {
  const dobParts = {
    year: formData.dateOfBirthYear ?? getDateParts(formData.dateOfBirth).year,
    month: formData.dateOfBirthMonth ?? getDateParts(formData.dateOfBirth).month,
    day: formData.dateOfBirthDay ?? getDateParts(formData.dateOfBirth).day,
  };
  const permanentAddressLocked = Boolean(formData.sameAsCorrespondence);
  const duplicateMobileNumberError = getDuplicateMobileNumberError(formData.mobileNumber, mobileNumberLookup);
  const mobileNumberError = disabledMobile
    ? ""
    : getMobileNumberError(formData.mobileNumber, formData.alternateMobileNumber) || duplicateMobileNumberError;
  const alternateMobileNumberError = getAlternateMobileNumberError(
    formData.alternateMobileNumber,
    formData.mobileNumber
  );
  const duplicateAadhaarNumberError = getDuplicateAadhaarNumberError(formData.aadhaarNumber, aadhaarNumberLookup);
  const aadhaarNumberError = getAadhaarNumberError(formData.aadhaarNumber) || duplicateAadhaarNumberError;
  const emailAddressError = getEmailAddressError(formData.emailAddress);
  const dateOfBirthError = getDateOfBirthError(formData.dateOfBirth);
  const correspondencePinCodeError =
    correspondencePinLookup.status === "error"
      ? correspondencePinLookup.error
      : getPinCodeError(formData.correspondencePinCode);
  const permanentPinCodeError = permanentAddressLocked
    ? ""
    : permanentPinLookup.status === "error"
      ? permanentPinLookup.error
      : getPinCodeError(formData.permanentPinCode);

  return (
    <div className="section-stack section-stack--personal">
      <div className="section-header">
        <div>
          {showRegistrationMeta ? <span className="page-kicker">Step 1</span> : null}
          <h1 className="page-title page-title--section">Personal Details</h1>
        </div>
        {showRegistrationMeta ? <RegistrationSummary registrationNumber={registrationNumber} /> : null}
      </div>

      <form className="legacy-personal-page" onSubmit={onSubmit}>
        <div className="legacy-personal-card">
          <div className="legacy-personal-card-head" style={{ display: "flex", justifyContent: "flex-end" }}>
            <span className="legacy-personal-mandatory">(*) Mandatory Fields</span>
          </div>

          <div className="legacy-personal-grid">
            <div className="legacy-personal-column">
              <PersonalInfoFieldRow htmlFor="name" label="Name" required>
                <input
                  id="name"
                  value={formData.name}
                  onChange={onChange("name")}
                  pattern="[A-Za-z ]+"
                  required
                />
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow htmlFor="motherName" label="Mother's Name" required>
                <input
                  id="motherName"
                  value={formData.motherName}
                  onChange={onChange("motherName")}
                  pattern="[A-Za-z ]+"
                  required
                />
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow
                htmlFor="dob-day"
                label="Date of Birth"
                required
                errorMessage={dateOfBirthError}
              >
                <div className="legacy-personal-dob">
                  <select id="dob-day" value={dobParts.day} onChange={onDatePartChange("day")} required>
                    <option value="">DD</option>
                    {DOB_DAY_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <select id="dob-month" value={dobParts.month} onChange={onDatePartChange("month")} aria-label="Birth month" required>
                    <option value="">Month</option>
                    {DOB_MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select id="dob-year" value={dobParts.year} onChange={onDatePartChange("year")} aria-label="Birth year" required>
                    <option value="">YYYY</option>
                    {DOB_YEAR_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow
                htmlFor="mobileNumber"
                label="Mobile No"
                required
                errorMessage={mobileNumberError}
              >
                <input
                  id="mobileNumber"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.mobileNumber}
                  disabled={disabledMobile}
                  onChange={onChange("mobileNumber")}
                  onInvalid={(event) =>
                    syncMobileValidity(event.target, event.target.value, formData.alternateMobileNumber)
                  }
                  onInput={(event) =>
                    syncMobileValidity(event.target, event.target.value, formData.alternateMobileNumber)
                  }
                  pattern="[0-9]{10}"
                  required
                />
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow htmlFor="emailAddress" label="Email ID" required errorMessage={emailAddressError}>
                <input
                  id="emailAddress"
                  type="email"
                  value={formData.emailAddress}
                  onChange={onChange("emailAddress")}
                  onInvalid={(event) => syncEmailValidity(event.target, event.target.value)}
                  onInput={(event) => syncEmailValidity(event.target, event.target.value)}
                  required
                />
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow htmlFor="nationality" label="Nationality" required>
                <select id="nationality" value={formData.nationality} onChange={onChange("nationality")} required>
                  {PERSONAL_NATIONALITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow htmlFor="domicileCertificateNumber" label="Domicile Cert. #">
                <input
                  id="domicileCertificateNumber"
                  value={formData.domicileCertificateNumber}
                  onChange={onChange("domicileCertificateNumber")}
                  required={formData.isUpDomicile === "Yes"}
                />
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow
                htmlFor="isEws"
                label="Economically Weaker Section (EWS)"
                required
              >
                <select id="isEws" value={formData.isEws} onChange={onChange("isEws")} required>
                  <option value="Yes">YES</option>
                  <option value="No">NO</option>
                </select>
              </PersonalInfoFieldRow>
            </div>

            <div className="legacy-personal-column">
              <PersonalInfoFieldRow htmlFor="fatherName" label="Father's Name" required>
                <input
                  id="fatherName"
                  value={formData.fatherName}
                  onChange={onChange("fatherName")}
                  pattern="[A-Za-z ]+"
                  required
                />
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow htmlFor="gender" label="Gender" required>
                <select id="gender" value={formData.gender} onChange={onChange("gender")} required>
                  <option value="">SELECT</option>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.toUpperCase()}
                    </option>
                  ))}
                </select>
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow
                htmlFor="aadhaarNumber"
                label="Aadhaar No."
                required
                errorMessage={aadhaarNumberError}
              >
                <input
                  id="aadhaarNumber"
                  inputMode="numeric"
                  maxLength={14}
                  value={formData.aadhaarNumber}
                  onChange={onChange("aadhaarNumber")}
                  onInvalid={(event) => syncAadhaarValidity(event.target, event.target.value)}
                  onInput={(event) => syncAadhaarValidity(event.target, event.target.value)}
                  pattern="[0-9]{4}-[0-9]{4}-[0-9]{4}"
                  required
                />
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow
                htmlFor="alternateMobileNumber"
                label="Alternate Mobile No"
                errorMessage={alternateMobileNumberError}
              >
                <input
                  id="alternateMobileNumber"
                  inputMode="numeric"
                  maxLength={10}
                  value={formData.alternateMobileNumber}
                  onChange={onChange("alternateMobileNumber")}
                  onInvalid={(event) =>
                    syncAlternateMobileValidity(event.target, event.target.value, formData.mobileNumber)
                  }
                  onInput={(event) =>
                    syncAlternateMobileValidity(event.target, event.target.value, formData.mobileNumber)
                  }
                  pattern="[0-9]{10}"
                />
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow htmlFor="category" label="Category" required>
                <select id="category" value={formData.category} onChange={onChange("category")} required>
                  <option value="">SELECT</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.toUpperCase()}
                    </option>
                  ))}
                </select>
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow
                className="legacy-personal-field-wide"
                htmlFor="isUpDomicile"
                label="Whether a Permanent Domicile of Uttar Pradesh"
                required
              >
                <select id="isUpDomicile" value={formData.isUpDomicile} onChange={onChange("isUpDomicile")} required>
                  <option value="">SELECT</option>
                  {PERSONAL_DOMICILE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option.toUpperCase()}
                    </option>
                  ))}
                </select>
              </PersonalInfoFieldRow>

              <PersonalInfoFieldRow
                htmlFor="personWithDisability"
                label="Person with Disability"
                required
              >
                <select id="personWithDisability" value={formData.personWithDisability} onChange={onChange("personWithDisability")} required>
                  <option value="Yes">YES</option>
                  <option value="No">NO</option>
                </select>
              </PersonalInfoFieldRow>
            </div>
          </div>

          <section className="legacy-personal-address-section">
            <h2>Correspondence Address</h2>
            <div className="legacy-personal-address-grid">
              <div className="legacy-personal-address-column">
                <PersonalInfoFieldRow
                  htmlFor="correspondenceAddressLine1"
                  label="Address Line 1"
                  required
                >
                  <input
                    id="correspondenceAddressLine1"
                    value={formData.correspondenceAddressLine1}
                    onChange={onChange("correspondenceAddressLine1")}
                    required
                  />
                </PersonalInfoFieldRow>
                <PersonalInfoFieldRow
                  htmlFor="correspondenceAddressLine2"
                  label="Address Line 2"
                >
                  <input
                    id="correspondenceAddressLine2"
                    value={formData.correspondenceAddressLine2}
                    onChange={onChange("correspondenceAddressLine2")}
                  />
                </PersonalInfoFieldRow>
                <PersonalInfoFieldRow
                  htmlFor="correspondenceCity"
                  label="City / Town"
                  required
                >
                  <input
                    id="correspondenceCity"
                    value={formData.correspondenceCity}
                    onChange={onChange("correspondenceCity")}
                    required
                  />
                </PersonalInfoFieldRow>
              </div>
              <div className="legacy-personal-address-column legacy-personal-address-stack">
                <PersonalInfoFieldRow
                  htmlFor="correspondencePinCode"
                  label="Pin code"
                  required
                  errorMessage={correspondencePinCodeError}
                >
                  <input
                    id="correspondencePinCode"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={formData.correspondencePinCode}
                    onChange={onChange("correspondencePinCode")}
                    onInvalid={(event) => syncPinCodeValidity(event.target, event.target.value)}
                    onInput={(event) => syncPinCodeValidity(event.target, event.target.value)}
                    required
                  />
                  {correspondencePinLookup.status === "loading" ? (
                    <div className="helper-text">State and district are being fetched from the PIN code.</div>
                  ) : null}
                  {correspondencePinLookup.status === "success" ? (
                    <div className="helper-text">State and district auto-filled from the PIN code.</div>
                  ) : null}
                </PersonalInfoFieldRow>
                <PersonalInfoFieldRow htmlFor="correspondenceState" label="State" required>
                  <input
                    id="correspondenceState"
                    type="text"
                    value={formData.correspondenceState}
                    readOnly
                    required
                  />
                </PersonalInfoFieldRow>
                <PersonalInfoFieldRow htmlFor="correspondenceDistrict" label="District" required>
                  <input
                    id="correspondenceDistrict"
                    type="text"
                    value={formData.correspondenceDistrict}
                    readOnly
                    required
                  />
                </PersonalInfoFieldRow>
              </div>
            </div>
          </section>

          <label className="legacy-personal-checkbox">
            <input
              checked={Boolean(formData.sameAsCorrespondence)}
              onChange={onChange("sameAsCorrespondence")}
              type="checkbox"
            />
            <span>Select if permanent address is same as correspondence address.</span>
          </label>

          <section className="legacy-personal-address-section legacy-personal-address-section-last">
            <h2>Permanent Address</h2>
            <div className="legacy-personal-address-grid">
              <div className="legacy-personal-address-column">
                <PersonalInfoFieldRow
                  htmlFor="permanentAddressLine1"
                  label="Address Line 1"
                  required
                >
                  <input
                    id="permanentAddressLine1"
                    value={formData.permanentAddressLine1}
                    onChange={onChange("permanentAddressLine1")}
                    disabled={permanentAddressLocked}
                    required
                  />
                </PersonalInfoFieldRow>
                <PersonalInfoFieldRow
                  htmlFor="permanentAddressLine2"
                  label="Address Line 2"
                >
                  <input
                    id="permanentAddressLine2"
                    value={formData.permanentAddressLine2}
                    onChange={onChange("permanentAddressLine2")}
                    disabled={permanentAddressLocked}
                  />
                </PersonalInfoFieldRow>
                <PersonalInfoFieldRow
                  htmlFor="permanentCity"
                  label="City / Town"
                  required
                >
                  <input
                    id="permanentCity"
                    value={formData.permanentCity}
                    onChange={onChange("permanentCity")}
                    disabled={permanentAddressLocked}
                    required
                  />
                </PersonalInfoFieldRow>
              </div>
              <div className="legacy-personal-address-column legacy-personal-address-stack">
                <PersonalInfoFieldRow
                  htmlFor="permanentPinCode"
                  label="Pin code"
                  required
                  errorMessage={permanentPinCodeError}
                >
                  <input
                    id="permanentPinCode"
                    maxLength={6}
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    value={formData.permanentPinCode}
                    onChange={onChange("permanentPinCode")}
                    onInvalid={(event) => syncPinCodeValidity(event.target, event.target.value)}
                    onInput={(event) => syncPinCodeValidity(event.target, event.target.value)}
                    disabled={permanentAddressLocked}
                    required
                  />
                  {!permanentAddressLocked && permanentPinLookup.status === "loading" ? (
                    <div className="helper-text">State and district are being fetched from the PIN code.</div>
                  ) : null}
                  {!permanentAddressLocked && permanentPinLookup.status === "success" ? (
                    <div className="helper-text">State and district auto-filled from the PIN code.</div>
                  ) : null}
                </PersonalInfoFieldRow>
                <PersonalInfoFieldRow htmlFor="permanentState" label="State" required>
                  <input
                    id="permanentState"
                    type="text"
                    value={formData.permanentState}
                    readOnly
                    required
                  />
                </PersonalInfoFieldRow>
                <PersonalInfoFieldRow htmlFor="permanentDistrict" label="District" required>
                  <input
                    id="permanentDistrict"
                    type="text"
                    value={formData.permanentDistrict}
                    readOnly
                    required
                  />
                </PersonalInfoFieldRow>
              </div>
            </div>
          </section>

          <div className="legacy-personal-actions">
            <button className="legacy-personal-submit" disabled={saving} type="submit">
              {saving
                ? "Saving..."
                : showRegistrationMeta
                  ? "Save & Next"
                  : "Register & Continue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function EducationTableRow({ index, row, values, onBlockChange, passingYearGapError, formData }) {
  const hsYear = Number.parseInt(normalizeInlineText(formData?.highSchool?.passingYear), 10);
  const intYear = Number.parseInt(normalizeInlineText(formData?.intermediate?.passingYear), 10);
  const gradYear = Number.parseInt(normalizeInlineText(formData?.graduation?.passingYear), 10);
  const pgYear = Number.parseInt(normalizeInlineText(formData?.postGraduation?.passingYear), 10);

  let isSpecificGapError = false;
  if (row.key === "intermediate") {
    isSpecificGapError = Number.isInteger(hsYear) && Number.isInteger(intYear) && (intYear - hsYear < 2);
  } else if (row.key === "graduation") {
    isSpecificGapError = Number.isInteger(intYear) && Number.isInteger(gradYear) && (gradYear - intYear < 3);
  } else if (row.key === "postGraduation") {
    const isGapError = Number.isInteger(gradYear) && Number.isInteger(pgYear) && (pgYear - gradYear < 2);
    const pgBlock = formData?.postGraduation || formData?.PostGraduation;
    const gradBlock = formData?.graduation || formData?.Graduation;
    const isSequenceError = hasEducationRowStarted(pgBlock) && !hasEducationRowStarted(gradBlock);
    isSpecificGapError = isGapError || isSequenceError;
  }
  const institutionValue = values?.[row.institutionField] ?? "";
  const examValue = values?.[row.examField] ?? "";
  const percentage = getEducationPercentage(values);
  const division = getEducationDivision(values);
  const hasExamValue = Boolean(normalizeInlineText(examValue));
  const hasUniValue = Boolean(normalizeInlineText(institutionValue));
  const hasYearValue = Boolean(normalizeInlineText(values?.passingYear));
  const hasTotalValue = Boolean(normalizeInlineText(values?.maxMarks));
  const hasObtainedValue = Boolean(normalizeInlineText(values?.marksObtained));
  const rowIsRequired = row.required || hasEducationRowStarted(values);

  const isGapErrorAtRow = isSpecificGapError; // Current row has a gap or sequence issue
  const isSequenceErrorAtRow = Boolean(passingYearGapError) && passingYearGapError.includes("Fill Graduation details first");

  return (
    <tr>
      <td>
        <span className="education-sheet__static education-sheet__static--center">
          {index + 1}
          {rowIsRequired && <span style={{ color: "#d32f2f", marginLeft: "4px", fontWeight: "bold" }}>*</span>}
        </span>
      </td>
      <td>
        {row.examField ? (
          <input
            aria-label={`${row.examName} exam name`}
            className={`education-sheet__input ${isGapErrorAtRow && hasExamValue ? "education-sheet__input--error" : ""}`}
            maxLength={120}
            onChange={(event) => onBlockChange(row.key, row.examField, event.target.value)}
            required={rowIsRequired}
            value={examValue}
          />
        ) : (
          <span className="education-sheet__static">{row.examName}</span>
        )}
      </td>
      <td>
        <input
          aria-label={`${row.examName} board or university`}
          className={`education-sheet__input ${isGapErrorAtRow && hasUniValue ? "education-sheet__input--error" : ""}`}
          maxLength={120}
          onChange={(event) => onBlockChange(row.key, row.institutionField, event.target.value)}
          required={rowIsRequired}
          value={institutionValue}
        />
      </td>
      <td>
        <div className="education-sheet__field">
          <input
            aria-describedby={isGapErrorAtRow && hasYearValue ? `${row.key}-passing-year-error` : undefined}
            aria-label={`${row.examName} passing year`}
            aria-invalid={isGapErrorAtRow && hasYearValue}
            className={`education-sheet__input ${isGapErrorAtRow && hasYearValue ? "education-sheet__input--error" : ""}`}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => onBlockChange(row.key, "passingYear", event.target.value)}
            pattern="[0-9]{4}"
            required={rowIsRequired}
            value={values?.passingYear ?? ""}
          />
        </div>
      </td>
      <td>
        <input
          aria-label={`${row.examName} total marks`}
          className={`education-sheet__input ${isGapErrorAtRow && hasTotalValue ? "education-sheet__input--error" : ""}`}
          inputMode="decimal"
          maxLength={10}
          onChange={(event) => onBlockChange(row.key, "maxMarks", event.target.value)}
          required={rowIsRequired}
          value={values?.maxMarks ?? ""}
        />
      </td>
      <td>
        <input
          aria-label={`${row.examName} obtained marks`}
          className={`education-sheet__input ${isGapErrorAtRow && hasObtainedValue ? "education-sheet__input--error" : ""}`}
          inputMode="decimal"
          maxLength={10}
          onChange={(event) => onBlockChange(row.key, "marksObtained", event.target.value)}
          required={rowIsRequired}
          value={values?.marksObtained ?? ""}
        />
      </td>
      <td>
        <span className="education-sheet__static education-sheet__static--readonly">
          {division || "--"}
        </span>
      </td>
      <td>
        <span className="education-sheet__static education-sheet__static--readonly">
          {percentage ? `${percentage}%` : "--"}
        </span>
      </td>
    </tr>
  );
}

function EducationFormSection({ formData, onBlockChange, onSubmit, registrationNumber, saving }) {
  const passingYearGapError = getPassingYearGapError(formData);
  const marksError = EDUCATION_ROW_CONFIG
    .map((row) => getEducationMarksError(formData[row.key], row.examName, row.institutionField, row.required, false))
    .find((error) => error !== "");

  const displayError = passingYearGapError || marksError;

  return (
    <form className="section-stack" onSubmit={onSubmit}>
      <div className="section-header">
        <div>
          <span className="page-kicker">Step 3</span>
          <h1 className="page-title page-title--section">Educational Details</h1>
        </div>
        <RegistrationSummary registrationNumber={registrationNumber} />
      </div>

      {displayError ? (
        <div style={{ color: "#d32f2f", marginBottom: "1.5rem", fontWeight: "500" }}>
          {displayError}
        </div>
      ) : null}

      <div className="section-card education-sheet-card">
        <div style={{ textAlign: "right", marginBottom: "10px" }}>
          <span className="legacy-personal-mandatory">(*) Mandatory Fields</span>
        </div>
        <div className="education-sheet-wrap">
          <table className="education-sheet">
            <thead>
              <tr>
                <th scope="col">SR No.</th>
                <th scope="col">Exam Name</th>
                <th scope="col">Board/University</th>
                <th scope="col">Passing Year</th>
                <th scope="col">Total Marks</th>
                <th scope="col">Obtained Marks</th>
                <th scope="col">Division</th>
                <th scope="col">Percentage</th>
              </tr>
            </thead>
            <tbody>
              {EDUCATION_ROW_CONFIG.map((row, index) => (
                <EducationTableRow
                  index={index}
                  key={row.key}
                  onBlockChange={onBlockChange}
                  passingYearGapError={passingYearGapError}
                  row={row}
                  values={formData[row.key]}
                  formData={formData}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="button-row education-actions">
        <button className="button primary" disabled={saving || Boolean(displayError)} type="submit">
          {saving ? "Saving..." : "Save & Next"}
        </button>
      </div>
    </form>
  );
}

function PreviousServiceSection({
  formData,
  onAddExperience,
  onExperienceChange,
  onRemoveExperience,
  onRegistrationTypeChange,
  onSubmit,
  registrationNumber,
  saving,
}) {
  const showExperienceFields = formData.registrationType === "Experience";

  return (
    <form className="section-stack" onSubmit={onSubmit}>
      <div className="section-header">
        <div>
          <span className="page-kicker">Step 4</span>
          <h1 className="page-title page-title--section">Previous Service Details</h1>
        </div>
        <RegistrationSummary registrationNumber={registrationNumber} />
      </div>

      <div className="section-card service-sheet-card">
        <div style={{ textAlign: "right", marginBottom: "10px" }}>
          <span className="legacy-personal-mandatory">(*) Mandatory Fields</span>
        </div>
        <div className="service-registration-row">
          <div className="service-registration-copy">
            <strong>Registration Type <span style={{ color: "#d32f2f" }}>*</span></strong>
            <p>Select whether you are applying as a fresher or with prior experience.</p>
          </div>

          <div className="service-registration-options">
            {PREVIOUS_SERVICE_REGISTRATION_OPTIONS.map((option) => (
              <label className="service-checkbox" key={option}>
                <input
                  checked={formData.registrationType === option}
                  type="checkbox"
                  onChange={() => onRegistrationTypeChange(option)}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        {showExperienceFields ? (
          <div className="service-entry-stack">
            {formData.experiences.map((entry, index) => {
              const entryError = getPreviousServiceEntryError(entry, formData.registrationType);

              return (
                <div className="service-entry-card" key={`experience-${index + 1}`}>
                  <div className="service-entry-card__header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Experience {index + 1}</strong>
                    {index > 0 && (
                      <button 
                        type="button" 
                        onClick={() => onRemoveExperience(index)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#d32f2f", padding: 0 }}
                        title="Remove Experience"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>

                  <div className="form-grid service-entry-grid">
                    <div className="field-group">
                      <label htmlFor={`organizationName-${index}`}>Organization Name <span style={{ color: "#d32f2f" }}>*</span></label>
                      <input
                        id={`organizationName-${index}`}
                        value={entry.organizationName}
                        onChange={onExperienceChange(index, "organizationName")}
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor={`departmentName-${index}`}>Department Name <span style={{ color: "#d32f2f" }}>*</span></label>
                      <input
                        id={`departmentName-${index}`}
                        value={entry.departmentName}
                        onChange={onExperienceChange(index, "departmentName")}
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor={`designation-${index}`}>Post / Designation <span style={{ color: "#d32f2f" }}>*</span></label>
                      <input
                        id={`designation-${index}`}
                        value={entry.designation}
                        onChange={onExperienceChange(index, "designation")}
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor={`natureOfEmployment-${index}`}>Nature of Employment <span style={{ color: "#d32f2f" }}>*</span></label>
                      <select
                        id={`natureOfEmployment-${index}`}
                        value={entry.natureOfEmployment}
                        onChange={onExperienceChange(index, "natureOfEmployment")}
                      >
                        <option value="">Select</option>
                        {EMPLOYMENT_NATURE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="field-group">
                      <label htmlFor={`dateOfJoining-${index}`}>Date of Joining <span style={{ color: "#d32f2f" }}>*</span></label>
                      <input
                        id={`dateOfJoining-${index}`}
                        type="date"
                        value={entry.dateOfJoining}
                        onChange={onExperienceChange(index, "dateOfJoining")}
                      />
                    </div>

                    <div className="field-group">
                      <label htmlFor={`dateOfRelieving-${index}`}>Date of Relieving <span style={{ color: "#d32f2f" }}>*</span></label>
                      <input
                        id={`dateOfRelieving-${index}`}
                        type="date"
                        value={entry.dateOfRelieving}
                        onChange={onExperienceChange(index, "dateOfRelieving")}
                      />
                    </div>

                    <div className="field-group full">
                      <label htmlFor={`totalExperience-${index}`}>Total Experience</label>
                      <input
                        id={`totalExperience-${index}`}
                        readOnly
                        value={entry.totalExperience}
                      />
                    </div>
                  </div>

                  {entryError ? <div className="education-sheet__error">{entryError}</div> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="button-row service-actions">
        {showExperienceFields ? (
          <button className="button subtle" type="button" onClick={onAddExperience}>
            Add More Experience
          </button>
        ) : null}

        <button className="button primary" disabled={saving} type="submit">
          {saving ? "Saving..." : "Save & Next"}
        </button>
      </div>
    </form>
  );
}

function DocumentSection({
  applicant,
  onDelete,
  onFileChange,
  onUpload,
  onNext,
  removingField,
  registrationNumber,
  uploadingField,
  selectedFiles,
  fileErrors,
}) {
  const requiredUploadsDone = applicant.documentChecklist
    .filter((item) => item.required)
    .every((item) => item.uploaded);

  const categories = [
    {
      title: "Personal Details Document Upload",
      keys: ["passportPhoto", "signature", "aadhaarCard", "categoryCertificate", "domicileCertificate", "ewsCertificate", "disabilityCertificate"],
    },
    {
      title: "Educational Certificate Upload",
      keys: ["highSchoolCertificate", "intermediateCertificate", "graduationCertificate", "postGraduationCertificate"],
    },
    {
      title: "Previous Service Document Upload",
      keys: ["experienceCertificate", "relievingLetter", "salarySlips", "otherExperienceCertificate", "otherRelievingLetter"],
    },
  ];

  return (
    <div className="section-stack">
      <div className="section-header">
        <div>
          <span className="page-kicker">Step 5</span>
          <h1 className="page-title page-title--section">Document Upload</h1>
        </div>
        <RegistrationSummary registrationNumber={registrationNumber} />
      </div>

      <div style={{ textAlign: "right", marginBottom: "15px" }}>
        <span className="legacy-personal-mandatory">(*) Mandatory Fields</span>
      </div>

      <div className="document-categories">
        {categories.map((category, catIndex) => {
          const categoryItems = applicant.documentChecklist.filter((item) => {
            if (!category.keys.includes(item.key)) return false;

            if (item.key === "disabilityCertificate" && applicant.personalDetails?.personWithDisability !== "Yes") {
              return false;
            }

            if (item.key === "ewsCertificate" && applicant.personalDetails?.isEws !== "Yes") {
              return false;
            }

            if (item.key === "categoryCertificate" && applicant.personalDetails?.category?.toUpperCase() === "GENERAL") {
              return false;
            }

            if (item.key === "graduationCertificate" && !hasEducationRowStarted(applicant.educationDetails?.graduation)) {
              return false;
            }

            if (item.key === "postGraduationCertificate" && !hasEducationRowStarted(applicant.educationDetails?.postGraduation)) {
              return false;
            }

            const previousServiceKeys = ["experienceCertificate", "relievingLetter", "salarySlips", "otherExperienceCertificate", "otherRelievingLetter"];
            if (previousServiceKeys.includes(item.key)) {
              if (applicant.educationDetails?.previousServiceDetails?.registrationType !== "Experience") {
                return false;
              }

              const otherServiceKeys = ["otherExperienceCertificate", "otherRelievingLetter"];
              if (otherServiceKeys.includes(item.key)) {
                const experiences = applicant.educationDetails?.previousServiceDetails?.experiences || [];
                if (experiences.length < 2) {
                  return false;
                }
              }
            }

            return true;
          });

          return (
            <div className="document-category" key={catIndex}>
              <h2 className="document-category__title">{category.title}</h2>
              {categoryItems.length > 0 ? (
                <div className="upload-grid">
                  {categoryItems.map((item) => {
                    const selectedFile = selectedFiles[item.key];
                    const previewFile = selectedFile || (item.uploaded ? item : null);
                    const isPdf = selectedFile
                      ? selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf")
                      : item.uploaded && item.fileName?.toLowerCase().endsWith(".pdf");

                    const previewUrl = selectedFile
                      ? URL.createObjectURL(selectedFile)
                      : item.uploaded
                        ? getFileUrl(item.url)
                        : null;

                    const isPhoto = item.key === "passportPhoto";
                    const isSignature = item.key === "signature";
                    const isImageOnly = isPhoto || isSignature;
                    const acceptFormats = isImageOnly ? ".png,.jpg,.jpeg" : ".pdf,.png,.jpg,.jpeg,.webp";
                    const formatInstruction = isImageOnly ? "1. JPG, JPEG, PNG formats are allowed." : "1. PDF, JPG, JPEG, PNG formats are allowed.";
                    let sizeInstruction = "2. Maximum Size of file should be 100KB.";
                    if (isPhoto) sizeInstruction = "2. Maximum Size of file should be 50KB.";
                    if (isSignature) sizeInstruction = "2. Maximum Size of file should be 30KB.";

                    return (
                      <div className="upload-card" key={item.key}>
                        <div className="upload-card__header">
                          {item.label} {item.required && <span style={{ color: "#d32f2f", marginLeft: "4px" }}>*</span>}
                        </div>
                        <div className="upload-card__body">
                          <div className="upload-card__preview">
                            {previewUrl ? (
                              isPdf ? (
                                <a
                                  href={previewUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    width: "100%",
                                    height: "100%",
                                    textDecoration: "none",
                                    color: "inherit",
                                  }}
                                >
                                  <iframe
                                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      border: "none",
                                      pointerEvents: "none",
                                      position: "absolute",
                                      top: 0,
                                      left: 0,
                                      zIndex: 1,
                                    }}
                                    title="PDF Preview"
                                  />
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      alignItems: "center",
                                      gap: "8px",
                                      position: "relative",
                                      zIndex: 0,
                                    }}
                                  >
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                      <polyline points="14 2 14 8 20 8"></polyline>
                                      <line x1="16" y1="13" x2="8" y2="13"></line>
                                      <line x1="16" y1="17" x2="8" y2="17"></line>
                                      <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    <span style={{ fontSize: "10px", fontWeight: "700", color: "#d32f2f" }}>VIEW PDF</span>
                                  </div>
                                </a>
                              ) : (
                                <a href={previewUrl} target="_blank" rel="noreferrer" style={{ width: "100%", height: "100%", display: "block" }}>
                                  <img src={previewUrl} alt={item.label} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                                </a>
                              )
                            ) : (
                              <div
                                style={{
                                  color: "#7c98b6",
                                  fontWeight: "600",
                                  fontSize: "12px",
                                  textAlign: "center",
                                  padding: "0 10px",
                                }}
                              >
                                {item.label}
                              </div>
                            )}
                          </div>
                          <div className="upload-card__controls">
                            {!item.uploaded && (
                              <>
                                <div className="upload-card__file-row">
                                  <input
                                    className="upload-card__file-input"
                                    id={`upload-${item.key}`}
                                    type="file"
                                    accept={acceptFormats}
                                    onChange={(event) => onFileChange(item.key, event.target.files?.[0], event)}
                                  />
                                </div>
                                {fileErrors?.[item.key] && (
                                  <div style={{ color: "#d32f2f", fontSize: "11px", fontWeight: "600", marginBottom: "8px" }}>
                                    {fileErrors[item.key]}
                                  </div>
                                )}
                              </>
                            )}
                            <div className="button-row" style={{ gap: "8px" }}>
                              {!item.uploaded && (
                                <button
                                  className="upload-card__btn-upload"
                                  disabled={uploadingField === item.key || !selectedFile}
                                  type="button"
                                  onClick={() => onUpload(item.key, selectedFile)}
                                >
                                  {uploadingField === item.key ? "Uploading..." : "Upload"}
                                </button>
                              )}
                              {item.uploaded && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <div style={{ color: "green", fontSize: "12px", fontWeight: "600" }}>
                                    ✓ Uploaded: {item.fileName}
                                  </div>
                                  <button
                                    className="upload-card__btn-upload"
                                    style={{ background: "#666", borderColor: "#555" }}
                                    disabled={removingField === item.key}
                                    type="button"
                                    onClick={() => onDelete(item.key)}
                                  >
                                    {removingField === item.key ? "..." : "Remove"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="upload-card__instructions">
                            <div>{formatInstruction}</div>
                            <div>{sizeInstruction}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="section-card section-card--empty">
                  <p>No documents required in this section for your current profile.</p>
                </div>
              )}
            </div>
          );
        })}

        {/* Catch-all for any documents not explicitly categorized */}
        {applicant.documentChecklist.some(item => !categories.flatMap(c => c.keys).includes(item.key)) && (
          <div className="document-category">
            <h2 className="document-category__title">Other Documents</h2>
            <div className="upload-grid" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {applicant.documentChecklist
                .filter(item => !categories.flatMap(c => c.keys).includes(item.key))
                .map((item) => (
                  <div className={`upload-card ${item.required ? "required" : ""}`} key={item.key}>
                    <div className="upload-meta">
                      <div>
                        <strong>{item.label}</strong>
                        <div className="helper-text">
                          {item.required
                            ? "Required for final submission."
                            : "Optional unless enabled by profile."}
                        </div>
                      </div>
                      <span className={`status-badge ${item.uploaded ? "complete" : "pending"}`}>
                        {item.uploaded ? "Uploaded" : "Pending"}
                      </span>
                    </div>

                    {item.uploaded ? (
                      <div className="summary-box">
                        <div className="detail-row">
                          <span>File</span>
                          <span>{item.fileName}</span>
                        </div>
                        <div className="detail-row">
                          <span>Uploaded At</span>
                          <span>{formatDateTime(item.uploadedAt)}</span>
                        </div>
                        <div className="button-row" style={{ marginTop: "0.8rem" }}>
                          <a
                            className="button subtle"
                            href={getFileUrl(item.url)}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View File
                          </a>
                          <button
                            className="button danger"
                            disabled={removingField === item.key}
                            type="button"
                            onClick={() => onDelete(item.key)}
                          >
                            {removingField === item.key ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="button-row">
                      <label className="button secondary" htmlFor={`upload-${item.key}`}>
                        {uploadingField === item.key
                          ? "Uploading..."
                          : item.uploaded
                            ? "Replace File"
                            : "Upload File"}
                      </label>
                      <input
                        id={`upload-${item.key}`}
                        hidden
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={(event) => onFileChange(item.key, event.target.files?.[0])}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="button-row" style={{ justifyContent: "flex-end" }}>
        <button
          className="button primary"
          disabled={!requiredUploadsDone}
          type="button"
          onClick={onNext}
        >
          Save & Next
        </button>
      </div>
    </div>
  );
}

function PaymentSection({
  applicant,
  formData,
  onChange,
  onSubmitPayment,
  onFinalSubmit,
  registrationNumber,
  saving,
  submitting,
}) {
  const paymentDone = applicant.paymentStatus === "completed";
  const canvasRef = useRef(null);
  const [captchaValue, setCaptchaValue] = useState(() => generateCaptchaText());
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");

  useEffect(() => {
    if (!paymentDone && canvasRef.current && captchaValue) {
      drawCaptcha(canvasRef.current, captchaValue);
    }
  }, [paymentDone, captchaValue]);

  function refreshCaptcha(keepError = false) {
    setCaptchaValue(generateCaptchaText());
    setCaptchaInput("");
    if (!keepError) {
      setCaptchaError("");
    }
  }

  function handlePaymentClick(e) {
    e.preventDefault();
    if (captchaInput.trim().toUpperCase() !== captchaValue) {
      setCaptchaError("Invalid Captcha");
      refreshCaptcha(true);
      return;
    }
    setCaptchaError("");
    onSubmitPayment(e);
  }

  return (
    <div className="section-stack">
      <div className="section-header">
        <div>
          <span className="page-kicker">Step 6</span>
          <h1 className="page-title page-title--section">
            Payment
          </h1>
        </div>
        <RegistrationSummary registrationNumber={registrationNumber} />
      </div>

      <div className="section-card">
        <h3>Application Fee</h3>
        <div className="detail-list" style={{ marginTop: "1rem" }}>
          <div className="detail-row">
            <span>Amount</span>
            <span>Rs. {applicant.feeAmount}</span>
          </div>
        </div>
      </div>

      <div className="section-card">
        <h3>Applicant Information</h3>
        <div className="detail-list" style={{ marginTop: "1rem" }}>
          <div className="detail-row">
            <span>Registration Number</span>
            <span>{registrationNumber}</span>
          </div>
          <div className="detail-row">
            <span>Applicant Name</span>
            <span>{applicant.personalDetails?.name}</span>
          </div>
          <div className="detail-row">
            <span>Mobile No.</span>
            <span>{applicant.personalDetails?.mobileNumber}</span>
          </div>
          <div className="detail-row">
            <span>Email ID</span>
            <span>{applicant.personalDetails?.emailAddress}</span>
          </div>
        </div>

        {!paymentDone && (
          <form 
            onSubmit={handlePaymentClick} 
            style={{ 
              marginTop: "2rem", 
              paddingTop: "1.5rem", 
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end"
            }}
          >
            {/* Captcha Section */}
            <div className="portal-login__field" style={{ maxWidth: "360px", width: "100%" }}>
              <label htmlFor="paymentCaptcha">Captcha</label>
              <canvas
                ref={canvasRef}
                className="portal-login__captcha"
                width="360"
                height="62"
                onClick={refreshCaptcha}
                title="Click captcha to refresh"
                style={{ cursor: "pointer", border: "1px solid #cfd6dd", borderRadius: "6px", background: "#e4e7eb", width: "100%", height: "62px", display: "block" }}
              />
              <p className="portal-login__hint" style={{ fontSize: "12px", color: "#66707a", marginTop: "8px" }}>Click the captcha box to refresh the code.</p>
            </div>

            <div className="portal-login__field" style={{ maxWidth: "360px", width: "100%", marginTop: "1rem" }}>
              <label htmlFor="paymentCaptchaInput">Enter Captcha</label>
              <input
                id="paymentCaptchaInput"
                type="text"
                placeholder="Type captcha text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                required
                style={{ width: "100%", padding: "12px 14px", border: "1px solid #cfd6dd", borderRadius: "6px", fontSize: "15px" }}
              />
              {captchaError && (
                <div style={{ color: "#d32f2f", fontSize: "14px", marginTop: "4px" }}>
                  {captchaError}
                </div>
              )}
            </div>

            <div className="button-row" style={{ justifyContent: "flex-end", marginTop: "2rem" }}>
              <button className="button primary" disabled={saving} type="submit">
                {saving ? "Processing..." : "Make Payment"}
              </button>
            </div>
          </form>
        )}
        {paymentDone && (
          <div 
            style={{ 
              marginTop: "2rem", 
              paddingTop: "1.5rem", 
              borderTop: "1px solid #e2e8f0" 
            }}
          >
            <h3 style={{ color: "#16a34a" }}>Payment Completed Successfully.</h3>
            <p style={{ marginTop: "0.5rem", color: "#4b5563" }}>
              Your Application is not complete. Please click on <strong>Final Submit</strong> button to complete your Application.
            </p>

            <div className="button-row" style={{ justifyContent: "flex-end", marginTop: "2rem" }}>
              <button className="button primary" disabled={submitting} type="button" onClick={onFinalSubmit}>
                {submitting ? "Submitting..." : "Final Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function WizardPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { applicant, clearSession, loading, logout, setSession, token, updateApplicant } = useAuth();
  const [personalForm, setPersonalForm] = useState(() => syncPersonalFormState(createEmptyPersonalDetails()));
  const [recruitmentForm, setRecruitmentForm] = useState(() => syncRecruitmentFormState());
  const [educationForm, setEducationForm] = useState(createEmptyEducationDetails);
  const [previousServiceForm, setPreviousServiceForm] = useState(() =>
    syncPreviousServiceFormState(createEmptyPreviousServiceDetails())
  );
  const [paymentForm, setPaymentForm] = useState({
    payerName: "",
    paymentMethod: "Online",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState("");
  const [selectedFiles, setSelectedFiles] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [removingField, setRemovingField] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [credentialsModal, setCredentialsModal] = useState(null);
  const [submitModal, setSubmitModal] = useState(null);
  const [experienceToDelete, setExperienceToDelete] = useState(null);
  const [correspondencePinLookup, setCorrespondencePinLookup] = useState({
    status: "idle",
    error: "",
  });
  const [permanentPinLookup, setPermanentPinLookup] = useState({
    status: "idle",
    error: "",
  });
  const [mobileNumberLookup, setMobileNumberLookup] = useState({
    status: "idle",
    message: "",
    mobileNumber: "",
  });
  const [aadhaarNumberLookup, setAadhaarNumberLookup] = useState({
    status: "idle",
    message: "",
    aadhaarNumber: "",
  });
  const [domicileConflict, setDomicileConflict] = useState(null);

  const rawMode = searchParams.get("mode") ?? (token ? "resume" : "register");
  const rawStep = searchParams.get("step") ?? "personal";
  const activeStep = STEP_ITEMS.some((item) => item.key === rawStep) ? rawStep : "personal";
  const mode = ["register", "resume", "edit"].includes(rawMode) ? rawMode : "register";

  const stepState = useMemo(() => {
    if (!applicant) {
      return [];
    }

    const completion = applicant.completion || {};

    return STEP_ITEMS.map((item) => ({
      ...item,
      completed:
        item.key === "personal"
          ? completion.personal
          : item.key === "recruitment"
            ? completion.recruitment
          : item.key === "education"
            ? completion.education
            : item.key === "service"
              ? completion.service
            : item.key === "documents"
              ? completion.documents
              : completion.payment,
    }));
  }, [applicant]);

  useEffect(() => {
    if (!applicant) {
      // This effect intentionally rehydrates local wizard state from the active session snapshot.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPersonalForm(syncPersonalFormState(createEmptyPersonalDetails()));
      setRecruitmentForm(syncRecruitmentFormState());
      setEducationForm(createEmptyEducationDetails());
      setPreviousServiceForm(syncPreviousServiceFormState(createEmptyPreviousServiceDetails()));
      return;
    }

    setPersonalForm(syncPersonalFormState(applicant.personalDetails));
    setRecruitmentForm(syncRecruitmentFormState(applicant.recruitmentDetails));
    setEducationForm(applicant.educationDetails || createEmptyEducationDetails());
    setPreviousServiceForm(syncPreviousServiceFormState(applicant.educationDetails?.previousServiceDetails));
    setPaymentForm((current) => ({
      payerName:
        current.payerName ||
        applicant.personalDetails?.name ||
        applicant.personalDetails?.fullName ||
        "",
      paymentMethod: current.paymentMethod || PAYMENT_METHOD_OPTIONS[0],
    }));
  }, [applicant]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!token) {
      if (mode !== "register") {
        navigate("/", { replace: true });
        return;
      }

      if (activeStep !== "personal") {
        setSearchParams({ mode: "register", step: "personal" }, { replace: true });
      }
      return;
    }

    if (applicant?.applicationStatus === "submitted" && mode === "resume") {
      navigate("/dashboard", { replace: true });
      return;
    }

    // Step-by-step progress enforcement
    if (applicant) {
      const activeIndex = STEP_ITEMS.findIndex((item) => item.key === activeStep);
      if (activeIndex > 0) {
        const previousStep = STEP_ITEMS[activeIndex - 1];
        const isPreviousCompleted = stepState.find((s) => s.key === previousStep.key)?.completed ?? false;

        if (!isPreviousCompleted) {
          const firstIncomplete = STEP_ITEMS.find((item) => {
            const completed = stepState.find((s) => s.key === item.key)?.completed ?? false;
            return !completed;
          });

          if (firstIncomplete && firstIncomplete.key !== activeStep) {
            setSearchParams({ mode, step: firstIncomplete.key }, { replace: true });
          }
        }
      }
    }
  }, [activeStep, applicant, loading, mode, navigate, setSearchParams, token, stepState]);

  useEffect(() => {
    const pinCode = formatPinCodeInput(personalForm.correspondencePinCode);

    if (!pinCode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCorrespondencePinLookup({
        status: "idle",
        error: "",
      });

      setPersonalForm((current) => {
        if (!current.correspondenceState && !current.correspondenceDistrict) {
          return current;
        }

        if (formatPinCodeInput(current.correspondencePinCode)) {
          return current;
        }

        return syncPersonalFormState({
          ...current,
          correspondenceState: "",
          correspondenceDistrict: "",
        });
      });
      return;
    }

    if (pinCode.length < 6) {
      setCorrespondencePinLookup({
        status: "typing",
        error: "",
      });

      setPersonalForm((current) => {
        if (!current.correspondenceState && !current.correspondenceDistrict) {
          return current;
        }

        if (formatPinCodeInput(current.correspondencePinCode).length >= 6) {
          return current;
        }

        return syncPersonalFormState({
          ...current,
          correspondenceState: "",
          correspondenceDistrict: "",
        });
      });
      return;
    }

    let ignore = false;

    setCorrespondencePinLookup({
      status: "loading",
      error: "",
    });

    api
      .lookupIndianPincode(pinCode)
      .then((response) => {
        if (ignore) {
          return;
        }

        setPersonalForm((current) => {
          if (formatPinCodeInput(current.correspondencePinCode) !== pinCode) {
            return current;
          }

          if (
            current.correspondenceState === response.state &&
            current.correspondenceDistrict === response.district
          ) {
            return current;
          }

          return syncPersonalFormState({
            ...current,
            correspondenceState: response.state,
            correspondenceDistrict: response.district,
          });
        });

        setCorrespondencePinLookup({
          status: "success",
          error: "",
        });
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        setPersonalForm((current) => {
          if (formatPinCodeInput(current.correspondencePinCode) !== pinCode) {
            return current;
          }

          if (!current.correspondenceState && !current.correspondenceDistrict) {
            return current;
          }

          return syncPersonalFormState({
            ...current,
            correspondenceState: "",
            correspondenceDistrict: "",
          });
        });

        setCorrespondencePinLookup({
          status: "error",
          error: error.message || "Unable to fetch location for this PIN code.",
        });
      });

    return () => {
      ignore = true;
    };
  }, [personalForm.correspondencePinCode]);

  useEffect(() => {
    if (personalForm.sameAsCorrespondence) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPermanentPinLookup({
        status: "idle",
        error: "",
      });
      return;
    }

    const pinCode = formatPinCodeInput(personalForm.permanentPinCode);

    if (!pinCode) {
      setPermanentPinLookup({
        status: "idle",
        error: "",
      });

      setPersonalForm((current) => {
        if (!current.permanentState && !current.permanentDistrict) {
          return current;
        }

        if (formatPinCodeInput(current.permanentPinCode) || current.sameAsCorrespondence) {
          return current;
        }

        return syncPersonalFormState({
          ...current,
          permanentState: "",
          permanentDistrict: "",
        });
      });
      return;
    }

    if (pinCode.length < 6) {
      setPermanentPinLookup({
        status: "typing",
        error: "",
      });

      setPersonalForm((current) => {
        if (!current.permanentState && !current.permanentDistrict) {
          return current;
        }

        if (formatPinCodeInput(current.permanentPinCode).length >= 6 || current.sameAsCorrespondence) {
          return current;
        }

        return syncPersonalFormState({
          ...current,
          permanentState: "",
          permanentDistrict: "",
        });
      });
      return;
    }

    let ignore = false;

    setPermanentPinLookup({
      status: "loading",
      error: "",
    });

    api
      .lookupIndianPincode(pinCode)
      .then((response) => {
        if (ignore) {
          return;
        }

        setPersonalForm((current) => {
          if (formatPinCodeInput(current.permanentPinCode) !== pinCode || current.sameAsCorrespondence) {
            return current;
          }

          if (current.permanentState === response.state && current.permanentDistrict === response.district) {
            return current;
          }

          return syncPersonalFormState({
            ...current,
            permanentState: response.state,
            permanentDistrict: response.district,
          });
        });

        setPermanentPinLookup({
          status: "success",
          error: "",
        });
      })
      .catch((error) => {
        if (ignore) {
          return;
        }

        setPersonalForm((current) => {
          if (formatPinCodeInput(current.permanentPinCode) !== pinCode || current.sameAsCorrespondence) {
            return current;
          }

          if (!current.permanentState && !current.permanentDistrict) {
            return current;
          }

          return syncPersonalFormState({
            ...current,
            permanentState: "",
            permanentDistrict: "",
          });
        });

        setPermanentPinLookup({
          status: "error",
          error: error.message || "Unable to fetch location for this PIN code.",
        });
      });

    return () => {
      ignore = true;
    };
  }, [personalForm.permanentPinCode, personalForm.sameAsCorrespondence]);

  useEffect(() => {
    if (activeStep !== "personal") return;

    const { isUpDomicile, permanentState } = personalForm;
    if (!permanentState) return;

    if (isUpDomicile === "Yes" && permanentState !== "Uttar Pradesh") {
      setDomicileConflict("Hello! Your domicile state is Uttar Pradesh. You cannot enter Another State address in the Permanent Address. Please enter the correct pincode in the Permanent Address.");
      setPersonalForm((current) =>
        syncPersonalFormState({
          ...current,
          sameAsCorrespondence: false,
          permanentAddressLine1: "",
          permanentAddressLine2: "",
          permanentCity: "",
          permanentPinCode: "",
          permanentState: "",
          permanentDistrict: "",
        })
      );
    } else if (isUpDomicile === "No" && permanentState === "Uttar Pradesh") {
      setDomicileConflict("Hello! Your domicile state is not Uttar Pradesh. You cannot enter Uttar Pradesh State address in the Permanent Address. Please enter the correct pincode in the Permanent Address.");
      setPersonalForm((current) =>
        syncPersonalFormState({
          ...current,
          sameAsCorrespondence: false,
          permanentAddressLine1: "",
          permanentAddressLine2: "",
          permanentCity: "",
          permanentPinCode: "",
          permanentState: "",
          permanentDistrict: "",
        })
      );
    }
  }, [personalForm.isUpDomicile, personalForm.permanentState, activeStep]);

  useEffect(() => {
    if (token) {
      setMobileNumberLookup({
        status: "idle",
        message: "",
        mobileNumber: "",
      });
      return;
    }

    const mobileNumber = getDigitsOnly(personalForm.mobileNumber);


    if (!mobileNumber) {
      setMobileNumberLookup({
        status: "idle",
        message: "",
        mobileNumber: "",
      });
      return;
    }

    if (mobileNumber.length < 10) {
      setMobileNumberLookup({
        status: "typing",
        message: "",
        mobileNumber,
      });
      return;
    }

    let ignore = false;

    setMobileNumberLookup((current) =>
      current.status === "registered" &&
      current.mobileNumber === mobileNumber
        ? current
        : {
            status: "checking",
            message: "",
            mobileNumber,
          }
    );

    api
      .checkMobileNumberAvailability(mobileNumber)
      .then((response) => {
        if (ignore) {
          return;
        }

        setMobileNumberLookup({
          status: response.isRegistered ? "registered" : "available",
          message: response.message || "",
          mobileNumber,
        });
      })
      .catch(() => {
        if (ignore) {
          return;
        }

        setMobileNumberLookup({
          status: "error",
          message: "",
          mobileNumber,
        });
      });

    return () => {
      ignore = true;
    };
  }, [personalForm.mobileNumber, token]);

  const aadhaarNumber = getDigitsOnly(personalForm.aadhaarNumber);

  useEffect(() => {
    if (token) {
      setAadhaarNumberLookup({
        status: "idle",
        message: "",
        aadhaarNumber: "",
      });
      return;
    }

    if (!aadhaarNumber) {
      setAadhaarNumberLookup({
        status: "idle",
        message: "",
        aadhaarNumber: "",
      });
      return;
    }

    if (aadhaarNumber.length < 12) {
      setAadhaarNumberLookup({
        status: "typing",
        message: "",
        aadhaarNumber,
      });
      return;
    }

    let ignore = false;

    setAadhaarNumberLookup((current) =>
      current.status === "registered" &&
      current.aadhaarNumber === aadhaarNumber
        ? current
        : {
            status: "checking",
            message: "",
            aadhaarNumber,
          }
    );

    api
      .checkAadhaarNumberAvailability(aadhaarNumber)
      .then((response) => {
        if (ignore) {
          return;
        }

        setAadhaarNumberLookup({
          status: response.isRegistered ? "registered" : "available",
          message: response.message || "",
          aadhaarNumber,
        });
      })
      .catch(() => {
        if (ignore) {
          return;
        }

        setAadhaarNumberLookup({
          status: "error",
          message: "",
          aadhaarNumber,
        });
      });

    return () => {
      ignore = true;
    };
  }, [aadhaarNumber, token]);


  if (loading) {
    return <PortalLoader kicker="Application Wizard" title="Preparing your form flow..." />;
  }

  if (!token && mode !== "register") {
    return <Navigate to="/" replace />;
  }

  function moveTo(nextStep, nextMode = mode) {
    setErrorMessage("");
    setSuccessMessage("");
    setSearchParams({ mode: nextMode, step: nextStep });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updatePersonalField(field) {
    return (event) => {
      const rawValue = event.target.type === "checkbox" ? event.target.checked : event.target.value;
      const value =
        field === "aadhaarNumber"
          ? formatAadhaarInput(rawValue)
          : PERSONAL_PINCODE_FIELDS.has(field)
            ? formatPinCodeInput(rawValue)
          : PERSONAL_NAME_FIELDS.has(field)
            ? sanitizeNameInput(rawValue)
            : rawValue;

      if (field === "aadhaarNumber") {
        syncAadhaarValidity(event.target, value);
      } else if (PERSONAL_PINCODE_FIELDS.has(field)) {
        syncPinCodeValidity(event.target, value);
      }

      setPersonalForm((current) => {
        if (field === "sameAsCorrespondence") {
          return syncPersonalFormState({
            ...current,
            sameAsCorrespondence: value,
            permanentAddress: value ? current.correspondenceAddress : "",
            permanentPinCode: value ? current.correspondencePinCode : "",
            permanentState: value ? current.correspondenceState : "",
            permanentDistrict: value ? current.correspondenceDistrict : "",
          });
        }

        return syncPersonalFormState({
          ...current,
          [field]: value,
        });
      });
    };
  }

  function updatePersonalDatePart(part) {
    return (event) => {
      const value = event.target.value;

      setPersonalForm((current) => {
        const nextDateParts = {
          year: current.dateOfBirthYear ?? getDateParts(current.dateOfBirth).year,
          month: current.dateOfBirthMonth ?? getDateParts(current.dateOfBirth).month,
          day: current.dateOfBirthDay ?? getDateParts(current.dateOfBirth).day,
          [part]: value,
        };

        return syncPersonalFormState({
          ...current,
          dateOfBirthYear: nextDateParts.year,
          dateOfBirthMonth: nextDateParts.month,
          dateOfBirthDay: nextDateParts.day,
          dateOfBirth: buildDateValue(nextDateParts),
        });
      });
    };
  }

  function updateRecruitmentField(field) {
    return (event) => {
      const value = event.target.value;

      setRecruitmentForm((current) => ({
        ...current,
        [field]: value,
      }));
    };
  }

  function updateEducationBlock(section, field, value) {
    const nextValue =
      field === "passingYear"
        ? formatPassingYearInput(value)
        : EDUCATION_MARK_FIELDS.has(field)
          ? formatEducationMarksInput(value)
          : value;

    setEducationForm((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: nextValue,
      },
    }));
  }

  function updatePreviousServiceRegistrationType(registrationType) {
    setPreviousServiceForm((current) => ({
      ...current,
      registrationType: current.registrationType === registrationType ? "" : registrationType,
    }));
  }

  function updatePreviousServiceExperience(index, field) {
    return (event) => {
      const value = event.target.value;

      setPreviousServiceForm((current) => {
        const experiences = current.experiences.map((entry, entryIndex) =>
          entryIndex !== index
            ? entry
            : {
                ...entry,
                [field]: value,
              }
        );

        return syncPreviousServiceFormState({
          ...current,
          experiences,
        });
      });
    };
  }

  function addPreviousServiceExperience() {
    setPreviousServiceForm((current) =>
      syncPreviousServiceFormState({
        ...current,
        experiences: [...current.experiences, getEmptyPreviousServiceEntry()],
      })
    );
  }

  function confirmRemoveExperience(index) {
    setExperienceToDelete(index);
  }

  function removePreviousServiceExperience() {
    if (experienceToDelete === null) return;
    setPreviousServiceForm((current) => {
      const newExperiences = [...current.experiences];
      newExperiences.splice(experienceToDelete, 1);
      return syncPreviousServiceFormState({
        ...current,
        experiences: newExperiences.length ? newExperiences : [getEmptyPreviousServiceEntry()],
      });
    });
    setExperienceToDelete(null);
  }

  async function handlePersonalSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const aadhaarNumberError = getAadhaarNumberError(personalForm.aadhaarNumber);

      if (aadhaarNumberError) {
        throw new Error(aadhaarNumberError);
      }

      const dateOfBirthError = getDateOfBirthError(personalForm.dateOfBirth);

      if (dateOfBirthError) {
        throw new Error(dateOfBirthError);
      }

      const matchingMobileNumbersError = getMatchingMobileNumbersError(
        personalForm.mobileNumber,
        personalForm.alternateMobileNumber
      );

      if (matchingMobileNumbersError) {
        throw new Error(matchingMobileNumbersError);
      }

      const duplicateMobileNumberError = getDuplicateMobileNumberError(personalForm.mobileNumber, mobileNumberLookup);

      if (duplicateMobileNumberError) {
        throw new Error(duplicateMobileNumberError);
      }

      const duplicateAadhaarNumberError = getDuplicateAadhaarNumberError(personalForm.aadhaarNumber, aadhaarNumberLookup);

      if (duplicateAadhaarNumberError) {
        throw new Error(duplicateAadhaarNumberError);
      }

      if (!token) {
        const response = await api.register({ personalDetails: personalForm });
        // After registration, we don't log the user in automatically anymore.
        // They must use the credentials shown in the modal to login manually.
        setCredentialsModal(response.credentials);
        setSuccessMessage("Registration created. Generated credentials are ready to copy.");
        return;
      }

      const response = await api.savePersonalDetails(token, { personalDetails: personalForm });
      updateApplicant(response.applicant);
      setSuccessMessage("Personal details saved successfully.");
      moveTo("recruitment");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRecruitmentSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      if (!normalizeInlineText(recruitmentForm.advertisementNumber) || !normalizeInlineText(recruitmentForm.postAppliedFor)) {
        throw new Error("Please complete all required recruitment details.");
      }

      const response = await api.saveRecruitmentDetails(token, { recruitmentDetails: recruitmentForm });
      updateApplicant(response.applicant);
      setSuccessMessage("Recruitment details saved successfully.");
      moveTo("education");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEducationSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const educationPayload = buildEducationPayload(educationForm);
      const invalidRow = EDUCATION_ROW_CONFIG.find((row) =>
        getEducationMarksError(
          educationPayload[row.key],
          row.examName,
          row.institutionField,
          row.required,
          true
        )
      );

      if (invalidRow) {
        throw new Error(
          getEducationMarksError(
            educationPayload[invalidRow.key],
            invalidRow.examName,
            invalidRow.institutionField,
            invalidRow.required,
            true
          )
        );
      }

      const passingYearGapError = getPassingYearGapError(educationPayload);

      if (passingYearGapError) {
        throw new Error(passingYearGapError);
      }

      const response = await api.saveEducationDetails(token, { educationDetails: educationPayload });
      updateApplicant(response.applicant);
      setSuccessMessage("Educational details saved successfully.");
      moveTo("service");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePreviousServiceSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const servicePayload = buildPreviousServicePayload(previousServiceForm);

      if (!servicePayload.registrationType) {
        throw new Error("Please select a registration type.");
      }

      if (servicePayload.registrationType === "Experience") {
        if (servicePayload.experiences.length === 0) {
          throw new Error("Please add at least one complete experience record.");
        }

        const invalidEntry = servicePayload.experiences.find((entry) =>
          getPreviousServiceEntryError(entry, servicePayload.registrationType)
        );

        if (invalidEntry) {
          throw new Error(getPreviousServiceEntryError(invalidEntry, servicePayload.registrationType));
        }

        const overlapError = getExperiencesOverlapError(servicePayload.experiences);
        if (overlapError) {
          throw new Error(overlapError);
        }
      }

      const response = await api.savePreviousServiceDetails(token, {
        previousServiceDetails: servicePayload,
      });
      updateApplicant(response.applicant);
      setSuccessMessage("Previous service details saved successfully.");
      moveTo("documents");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDocumentUpload(field, file) {
    if (!file) {
      return;
    }

    setUploadingField(field);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await api.uploadDocument(token, field, file);
      updateApplicant(response.applicant);
      setSuccessMessage(`${field} uploaded successfully.`);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setUploadingField("");
      setSelectedFiles(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  const handleFileChange = (field, file, event) => {
    if (!file) return;

    const sizeInKb = file.size / 1024;

    if (field === "passportPhoto") {
      if (sizeInKb > 50) {
        setFileErrors(prev => ({ ...prev, [field]: "File size must not exceed 50 KB." }));
        if (event && event.target) {
          event.target.value = "";
        }
        return;
      }
    } else if (field === "signature") {
      if (sizeInKb > 30) {
        setFileErrors(prev => ({ ...prev, [field]: "File size must not exceed 30 KB." }));
        if (event && event.target) {
          event.target.value = "";
        }
        return;
      }
    } else {
      if (sizeInKb > 100) {
        setFileErrors(prev => ({ ...prev, [field]: "File size must not exceed 100 KB." }));
        if (event && event.target) {
          event.target.value = "";
        }
        return;
      }
    }

    setFileErrors(prev => ({ ...prev, [field]: "" }));
    setSelectedFiles(prev => ({ ...prev, [field]: file }));
  };

  async function handleDocumentDelete(field) {
    setRemovingField(field);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await api.deleteDocument(token, field);
      updateApplicant(response.applicant);
      setSuccessMessage("Document removed successfully.");
      
      const fileInput = document.getElementById(`upload-${field}`);
      if (fileInput) {
        fileInput.value = "";
      }
      setSelectedFiles(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setRemovingField("");
    }
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        ...paymentForm,
        payerName: applicant.personalDetails?.name || applicant.personalDetails?.fullName || "Applicant"
      };
      const response = await api.completePayment(token, payload);
      updateApplicant(response.applicant);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleFinalSubmit() {
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const returnTarget =
        applicant?.applicationStatus === "submitted" || mode === "edit" ? "dashboard" : "login";
      const response = await api.submitApplication(token);
      updateApplicant(response.applicant);
      setSubmitModal({
        message:
          returnTarget === "dashboard"
            ? "Application updated successfully."
            : "Application submitted successfully.",
        returnTarget,
      });
      setSuccessMessage("Final submit completed successfully.");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseSubmitModal() {
    if (!submitModal) {
      return;
    }

    const target = submitModal.returnTarget;
    setSubmitModal(null);

    if (target === "dashboard") {
      navigate("/dashboard", { replace: true });
      return;
    }

    await logout();
    navigate("/", { replace: true });
  }

  function handleCredentialCut() {
    setCredentialsModal(null);
    clearSession();
    navigate("/", { replace: true });
  }

  async function handleCopyCredentials() {
    if (!credentialsModal) {
      return;
    }

    try {
      const credentialsText = `Registration Number: ${credentialsModal.loginId}\nPassword: ${credentialsModal.password}`;
      await navigator.clipboard.writeText(credentialsText);
      setSuccessMessage("Credentials copied to clipboard.");
    } catch {
      setErrorMessage("Clipboard access blocked. Please note the credentials manually.");
    }
  }

  const wizardSummaryApplicant = applicant ?? {
    loginId: "Will be generated after Step 1",
    completion: {},
  };
  const hasGeneratedRegistrationNumber = Boolean(applicant?.loginId);
  const useLegacyPersonalMode = activeStep === "personal" && !token;

  return (
    <PortalLayout>
      <div className="page-shell page-shell--wizard">
        <div className={`wizard-shell ${useLegacyPersonalMode ? "legacy-personal-mode" : ""}`}>
          <div className="wizard-grid">
            <aside className="surface-panel stepper-panel">
              {token ? (
                <div className="button-row stepper-actions stepper-actions--top">
                  <button className="button subtle home-icon-btn" type="button" onClick={() => navigate("/dashboard")} title="Back to Dashboard">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="button-row stepper-actions stepper-actions--top">
                  <button className="button subtle home-icon-btn" type="button" onClick={() => navigate("/")} title="Back to Login">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                      <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                  </button>
                </div>
              )}

              <div className="step-list">
                {STEP_ITEMS.map((item, index) => {
                  const completed = stepState.find((entry) => entry.key === item.key)?.completed ?? false;
                  
                  const isFirstStep = index === 0;
                  const previousStep = !isFirstStep ? STEP_ITEMS[index - 1] : null;
                  const isPreviousCompleted = previousStep 
                    ? (stepState.find((s) => s.key === previousStep.key)?.completed ?? false) 
                    : true;

                  const disabled = (!token && !isFirstStep) || !isPreviousCompleted;

                  return (
                    <button
                      key={item.key}
                      className={`step-card ${activeStep === item.key ? "active" : ""} ${completed ? "complete" : ""}`}
                      disabled={disabled}
                      type="button"
                      onClick={() => moveTo(item.key)}
                    >
                      <div className="step-index">{completed ? "\u2713" : index + 1}</div>
                      <strong>{item.label}</strong>
                      <small>{item.hint}</small>
                    </button>
                  );
                })}
              </div>

            </aside>

            <main className="surface-panel content-panel">
              {errorMessage ? <div className="alert error">{errorMessage}</div> : null}
              {successMessage ? <div className="alert success">{successMessage}</div> : null}

              {activeStep === "personal" ? (
                <PersonalFormSection
                  correspondencePinLookup={correspondencePinLookup}
                  disabledMobile={Boolean(token)}
                  formData={personalForm}
                  mobileNumberLookup={mobileNumberLookup}
                  onChange={updatePersonalField}
                  onDatePartChange={updatePersonalDatePart}
                  onSubmit={handlePersonalSubmit}
                  permanentPinLookup={permanentPinLookup}
                  registrationNumber={wizardSummaryApplicant.loginId}
                  saving={saving}
                  showRegistrationMeta={hasGeneratedRegistrationNumber}
                  aadhaarNumberLookup={aadhaarNumberLookup}
                />
              ) : null}

              {activeStep === "recruitment" && applicant ? (
                <RecruitmentFormSection
                  formData={recruitmentForm}
                  onChange={updateRecruitmentField}
                  onSubmit={handleRecruitmentSubmit}
                  registrationNumber={wizardSummaryApplicant.loginId}
                  saving={saving}
                />
              ) : null}

              {activeStep === "education" && applicant ? (
                <EducationFormSection
                  formData={educationForm}
                  onBlockChange={updateEducationBlock}
                  onSubmit={handleEducationSubmit}
                  registrationNumber={wizardSummaryApplicant.loginId}
                  saving={saving}
                />
              ) : null}

              {activeStep === "service" && applicant ? (
                <PreviousServiceSection
                  formData={previousServiceForm}
                  onAddExperience={addPreviousServiceExperience}
                  onExperienceChange={updatePreviousServiceExperience}
                  onRemoveExperience={confirmRemoveExperience}
                  onRegistrationTypeChange={updatePreviousServiceRegistrationType}
                  onSubmit={handlePreviousServiceSubmit}
                  registrationNumber={wizardSummaryApplicant.loginId}
                  saving={saving}
                />
              ) : null}

              {activeStep === "documents" && applicant ? (
                <DocumentSection
                  applicant={applicant}
                  onDelete={handleDocumentDelete}
                  onFileChange={handleFileChange}
                  onUpload={handleDocumentUpload}
                  onNext={() => moveTo("payment")}
                  removingField={removingField}
                  registrationNumber={wizardSummaryApplicant.loginId}
                  uploadingField={uploadingField}
                  selectedFiles={selectedFiles}
                  fileErrors={fileErrors}
                />
              ) : null}

              {activeStep === "payment" && applicant ? (
                <PaymentSection
                  applicant={applicant}
                  formData={paymentForm}
                  onChange={(field) => (event) =>
                    setPaymentForm((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  onFinalSubmit={handleFinalSubmit}
                  onSubmitPayment={handlePaymentSubmit}
                  registrationNumber={wizardSummaryApplicant.loginId}
                  saving={saving}
                  submitting={submitting}
                />
              ) : null}
            </main>
          </div>
        </div>

        {credentialsModal ? (
          <Modal onClose={handleCredentialCut} title="Registration successful" showCloseButton>
            <h3 className="panel-title panel-title--modal modal-success-title">You have registered Successfully.</h3>
            <p>
              Your registration number or password has been generated and sent to your registered mobile number or email address.
              Please click the &apos;Continue&apos; button to proceed with the next steps.
            </p>
            <div className="credential-grid">
              <div className="credential-row">
                <span>Registration Number</span>
                <code>{credentialsModal.loginId}</code>
              </div>
              <div className="credential-row">
                <span>Password</span>
                <code>{credentialsModal.password}</code>
              </div>
            </div>
            <div className="button-row modal-actions modal-actions--right">
              <button
                className="button primary"
                type="button"
                onClick={handleCredentialCut}
              >
                Continue
              </button>
            </div>
          </Modal>
        ) : null}

        {submitModal ? (
          <Modal onClose={handleCloseSubmitModal} title="Submit successful">

            <h3 className="panel-title panel-title--modal">Submission completed</h3>
            <p>{submitModal.message}</p>
            <div className="button-row modal-actions modal-actions--right">
              <button className="button primary" type="button" onClick={handleCloseSubmitModal}>
                Close
              </button>
            </div>
          </Modal>
        ) : null}

        {experienceToDelete !== null && (
          <Modal onClose={() => setExperienceToDelete(null)} title="Delete Experience">
            <h3 className="panel-title panel-title--modal">Confirm Deletion</h3>
            <p>Do you want to delete experience {experienceToDelete + 1}?</p>
            <div className="button-row modal-actions modal-actions--right">
              <button className="button primary" type="button" onClick={removePreviousServiceExperience}>
                Yes
              </button>
              <button className="button secondary" type="button" onClick={() => setExperienceToDelete(null)}>
                No
              </button>
            </div>
          </Modal>
        )}

        {domicileConflict && (
          <Modal onClose={() => setDomicileConflict(null)} title="Domicile Conflict">
            <h3 className="panel-title panel-title--modal" style={{ fontSize: "1.1rem", lineHeight: "1.5" }}>
              {domicileConflict}
            </h3>
            <div className="button-row modal-actions modal-actions--right" style={{ marginTop: "2rem" }}>
              <button className="button primary" type="button" onClick={() => setDomicileConflict(null)}>
                Close
              </button>
            </div>
          </Modal>
        )}
      </div>
    </PortalLayout>
  );
}
