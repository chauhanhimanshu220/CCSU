import {
  DEFAULT_RECRUITMENT_ADVERTISEMENT_NUMBER,
  RECRUITMENT_POST_OPTIONS,
} from "./constants";

export function createEmptyPersonalDetails() {
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
    personWithDisability: "No",
    isEws: "No",
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
    correspondenceAddressLine1: "",
    correspondenceAddressLine2: "",
    correspondenceCity: "",
    permanentAddressLine1: "",
    permanentAddressLine2: "",
    permanentCity: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pinCode: "",
  };
}

export function createEmptyRecruitmentDetails() {
  return {
    advertisementNumber: DEFAULT_RECRUITMENT_ADVERTISEMENT_NUMBER,
    postAppliedFor: RECRUITMENT_POST_OPTIONS[0] ?? "",
  };
}

export function createEmptyPreviousServiceEntry() {
  return {
    organizationName: "",
    departmentName: "",
    designation: "",
    natureOfEmployment: "",
    dateOfJoining: "",
    dateOfRelieving: "",
    totalExperience: "",
  };
}

export function createEmptyPreviousServiceDetails() {
  return {
    registrationType: "",
    experiences: [createEmptyPreviousServiceEntry()],
  };
}

export function createEmptyEducationDetails() {
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
    previousServiceDetails: createEmptyPreviousServiceDetails(),
    additionalQualification: "",
  };
}
