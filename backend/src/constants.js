const DOCUMENT_FIELDS = [
  { key: "highSchoolMarksheet", label: "High School Marksheet" },
  { key: "intermediateMarksheet", label: "Intermediate Marksheet" },
  { key: "graduationMarksheet", label: "Graduation Marksheet" },
  { key: "postGraduationMarksheet", label: "Post-Graduation Marksheet" },
  { key: "idProof", label: "Government ID Proof" },
  { key: "categoryCertificate", label: "Category Certificate" },
  { key: "domicileProof", label: "Domicile Proof" },
];

const PERSONAL_REQUIRED_FIELDS = [
  "name",
  "fatherName",
  "motherName",
  "dateOfBirth",
  "mobileNumber",
  "emailAddress",
  "gender",
  "category",
  "domicileState",
  "addressLine1",
  "city",
  "state",
  "pinCode",
];

module.exports = {
  DOCUMENT_FIELDS,
  PERSONAL_REQUIRED_FIELDS,
};
