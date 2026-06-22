import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Header } from "../components/Header";
import { PortalLoader } from "../components/PortalLayout";
import "./dashboard-page.css";

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    const normalizedValue = String(value).trim();
    const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }

    return normalizedValue || "Not available";
  }

  return new Intl.DateTimeFormat("en-GB").format(date).replace(/\//g, "-");
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  }).format(date).replace(/\//g, "-");
}

function val(v) {
  return v && String(v).trim() ? String(v).trim() : "—";
}

function handlePrintApplication(applicant) {
  const p = applicant.personalDetails || {};
  const r = applicant.recruitmentDetails || {};
  const e = applicant.educationDetails || {};
  const hs = e.highSchool || {};
  const inter = e.intermediate || {};
  const grad = e.graduation || {};
  const pg = e.postGraduation || {};
  const prev = e.previousServiceDetails || {};
  const experiences = prev.experiences || [];

  const educationRow = (label, block) => {
    if (!block || typeof block !== "object") return "";
    const hasData = Object.entries(block).some(
      ([k, v]) => k !== "enabled" && String(v || "").trim()
    );
    if (!hasData) return "";
    const totalMarks = Number.parseFloat(block.maxMarks);
    const obtainedMarks = Number.parseFloat(block.marksObtained);
    let division = "";
    if (Number.isFinite(totalMarks) && Number.isFinite(obtainedMarks) && totalMarks > 0 && obtainedMarks <= totalMarks) {
      const percentage = (obtainedMarks / totalMarks) * 100;
      if (percentage >= 60) division = "1st";
      else if (percentage >= 50) division = "2nd";
      else if (percentage >= 33) division = "3rd";
    }

    return `
      <tr>
        <td>${label}</td>
        <td>${val(block.board || block.university)}</td>
        <td>${val(block.course)}</td>
        <td>${val(block.marksObtained)}</td>
        <td>${val(block.maxMarks)}</td>
        <td>${val(block.passingYear)}</td>
        <td>${val(division)}</td>
      </tr>`;
  };

  const experienceRows = experiences
    .map(
      (exp, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${val(exp.organizationName)}</td>
        <td>${val(exp.designation)}</td>
        <td>${val(exp.natureOfEmployment)}</td>
        <td>${val(exp.dateOfJoining)}</td>
        <td>${val(exp.dateOfRelieving)}</td>
        <td>${val(exp.totalExperience)}</td>
      </tr>`
    )
    .join("");

  const docs = applicant.documents || {};
  const photoUrl = docs.passportPhoto?.url || "";
  const signatureUrl = docs.signature?.url || "";

  const printHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Application Form — ${val(applicant.loginId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 24px; }
    h1 { font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 6px; }
    h2 { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 18px; font-weight: 600; text-align: center; margin-bottom: 20px; color: #333; }
    .header-box { text-align: center; padding: 12px; margin-bottom: 24px; }
    .section { margin-bottom: 20px; border: 1px solid #aaa; border-radius: 4px; overflow: hidden; }
    .section-title { background: #1e4d8c; color: #fff; padding: 6px 12px; font-size: 13px; font-weight: 700; }
    .detail-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .detail-table td { padding: 6px 12px; border: 1px solid #ddd; vertical-align: top; font-size: 11px; }
    .detail-table td:nth-child(1), .detail-table td:nth-child(3) { font-weight: 600; color: #444; background: #f7f9fc; width: 25%; }
    .detail-table td:nth-child(2), .detail-table td:nth-child(4) { width: 25%; }
    .edu-table { width: 100%; border-collapse: collapse; }
    .edu-table th { background: #f0f4fa; font-weight: 700; padding: 6px 8px; border: 1px solid #ccc; font-size: 11px; }
    .edu-table td { padding: 6px 8px; border: 1px solid #ccc; font-size: 11px; }
    .footer { margin-top: 40px; text-align: right; font-size: 11px; color: #555; }
    .applied-post { font-size: 14px; font-weight: 600; color: #333; margin-top: 4px; margin-bottom: 12px; }
    .reg-badge { display: inline-block; background: #1e4d8c; color: #fff; font-size: 13px; font-weight: 700; padding: 4px 16px; border-radius: 3px; margin-bottom: 8px; }
    .photo-container { width: 80px; height: 100px; border: 1px solid #ccc; margin: 0 auto; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fafafa; }
    .photo-container img { max-width: 100%; max-height: 100%; object-fit: cover; }
    .signature-container { width: 120px; height: 50px; border: 1px solid #ccc; margin: 0 auto; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fafafa; }
    .signature-container img { max-width: 100%; max-height: 100%; object-fit: contain; }
    @media print {
      body { padding: 10px; }
      button { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-box">
    <h1>Chaudhary Charan Singh University, Meerut</h1>
    <div class="subtitle">Recruitment Application</div>
    <div class="applied-post">Applied Post - ${val(r.postAppliedFor)}</div>
    <div class="reg-badge">Registration Number: ${val(applicant.loginId)}</div>
  </div>

  <!-- Personal Details -->
  <div class="section">
    <div class="section-title">Personal Details</div>
    <table class="detail-table">
      <tr>
        <td>Full Name</td><td>${val(p.name || p.fullName)}</td>
        <td rowspan="4" colspan="2" style="text-align: center; vertical-align: middle; background: #fff;">
          <div style="font-weight: 600; margin-bottom: 6px; font-size: 10px; color: #333;">Applicant Photo</div>
          <div class="photo-container" style="margin-bottom: 12px; width: 90px; height: 110px;">
            ${photoUrl ? `<img src="${photoUrl}" alt="Photo" />` : '<span style="font-size:8px;color:#999;">NOT UPLOADED</span>'}
          </div>
          <div style="font-weight: 600; margin-bottom: 6px; font-size: 10px; color: #333;">Applicant Signature</div>
          <div class="signature-container" style="width: 140px; height: 45px;">
            ${signatureUrl ? `<img src="${signatureUrl}" alt="Signature" />` : '<span style="font-size:8px;color:#999;">NOT UPLOADED</span>'}
          </div>
        </td>
      </tr>
      <tr>
        <td>Father's Name</td><td>${val(p.fatherName)}</td>
      </tr>
      <tr>
        <td>Mother's Name</td><td>${val(p.motherName)}</td>
      </tr>
      <tr>
        <td>Date of Birth</td><td>${val(p.dateOfBirth)}</td>
      </tr>
      <tr>
        <td>Gender</td><td>${val(p.gender)}</td>
        <td>Category</td><td>${val(p.category)}</td>
      </tr>
      <tr>
        <td>Nationality</td><td>${val(p.nationality)}</td>
        <td>Aadhaar Number</td><td>${val(p.aadhaarNumber)}</td>
      </tr>
      <tr>
        <td>Mobile Number</td><td>${val(p.mobileNumber)}</td>
        <td>Alternate Mobile Number</td><td>${val(p.alternateMobileNumber)}</td>
      </tr>
      <tr>
        <td>Email Address</td><td>${val(p.emailAddress)}</td>
        <td>Domicile (UP)</td><td>${val(p.isUpDomicile)}</td>
      </tr>
      <tr>
        <td>Domicile Certificate No.</td><td>${val(p.domicileCertificateNumber)}</td>
        <td>Person with Disability</td><td>${val(p.personWithDisability)}</td>
      </tr>
      <tr>
        <td>EWS</td><td>${val(p.isEws)}</td>
        <td></td><td></td>
      </tr>
      <tr>
        <td colspan="1">Correspondence Address Line 1</td><td colspan="3">${val(p.correspondenceAddressLine1)}</td>
      </tr>
      <tr>
        <td colspan="1">Correspondence Address Line 2</td><td colspan="3">${val(p.correspondenceAddressLine2)}</td>
      </tr>
      <tr>
        <td>Correspondence City / Town</td><td>${val(p.correspondenceCity)}</td>
        <td>Correspondence District</td><td>${val(p.correspondenceDistrict)}</td>
      </tr>
      <tr>
        <td>Correspondence State</td><td>${val(p.correspondenceState)}</td>
        <td>Correspondence Pin Code</td><td>${val(p.correspondencePinCode)}</td>
      </tr>
      <tr>
        <td colspan="1">Permanent Address Line 1</td><td colspan="3">${val(p.permanentAddressLine1)}</td>
      </tr>
      <tr>
        <td colspan="1">Permanent Address Line 2</td><td colspan="3">${val(p.permanentAddressLine2)}</td>
      </tr>
      <tr>
        <td>Permanent City / Town</td><td>${val(p.permanentCity)}</td>
        <td>Permanent District</td><td>${val(p.permanentDistrict)}</td>
      </tr>
      <tr>
        <td>Permanent State</td><td>${val(p.permanentState)}</td>
        <td>Permanent Pin Code</td><td>${val(p.permanentPinCode)}</td>
      </tr>
    </table>
  </div>

  <!-- Recruitment Details -->
  <div class="section" style="page-break-before: always;">
    <div class="section-title">Recruitment / Post Details</div>
    <table class="detail-table">
      <tr>
        <td>Advertisement No.</td><td>${val(r.advertisementNumber)}</td>
        <td>Post Applied For</td><td>${val(r.postAppliedFor)}</td>
      </tr>
    </table>
  </div>

  <!-- Education Details -->
  <div class="section">
    <div class="section-title">Educational Details</div>
    <table class="edu-table">
      <thead>
        <tr>
          <th>Exam</th>
          <th>Board / University</th>
          <th>Course / Subject</th>
          <th>Marks Obtained</th>
          <th>Max Marks</th>
          <th>Passing Year</th>
          <th>Division</th>
        </tr>
      </thead>
      <tbody>
        ${educationRow("High School", hs)}
        ${educationRow("Intermediate", inter)}
        ${educationRow("Graduation", grad)}
        ${educationRow("Post-Graduation", pg)}
      </tbody>
    </table>
  </div>

  <!-- Previous Service -->
  ${
    experiences.length > 0
      ? `<div class="section">
    <div class="section-title">Previous Service Details</div>
    <p style="padding:6px 12px;font-size:11px;color:#555;">Registration Type: ${val(prev.registrationType)}</p>
    <table class="edu-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Employer Name</th>
          <th>Designation</th>
          <th>Nature of Employment</th>
          <th>Date of Joining</th>
          <th>Date of Relieving</th>
          <th>Total Experience</th>
        </tr>
      </thead>
      <tbody>${experienceRows}</tbody>
    </table>
  </div>`
      : ""
  }

  <!-- Payment -->
  <div class="section">
    <div class="section-title">Payment Details</div>
    <table class="detail-table">
      <tr>
        <td>Application Fee</td><td>Rs. ${val(applicant.feeAmount)}</td>
        <td>Payment Status</td><td style="text-transform: capitalize;">${val(applicant.paymentStatus)}</td>
      </tr>
    </table>
  </div>

  <!-- Application Status -->
  <div class="section">
    <div class="section-title">Application Status</div>
    <table class="detail-table">
      <tr>
        <td>Registration on</td><td>${formatDateTime(applicant.createdAt)}</td>
        <td>Payment on</td><td>${formatDateTime(applicant.paymentDetails?.paidAt)}</td>
      </tr>
      <tr>
        <td>Final Submit</td><td>${formatDateTime(applicant.submittedAt)}</td>
        <td></td><td></td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>Registration Number: <strong>${val(applicant.loginId)}</strong></p>
    <p>Printed on: ${new Date().toLocaleString("en-IN")}</p>
  </div>

  <script>
    window.onload = function() { window.print(); };
  </script>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(printHtml);
  win.document.close();
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { applicant, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  if (loading || !applicant) {
    return <PortalLoader kicker="Dashboard" title="Loading your application snapshot..." />;
  }

  const isSubmitted = applicant.applicationStatus === "submitted";

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate("/", { replace: true });
  }

  function handleContinueSavedApplication() {
    navigate(`/apply?mode=resume&step=${applicant.resumeStep}`);
  }

  function handleApplyForPost() {
    if (isSubmitted) {
      navigate("/apply?mode=edit&step=personal");
      return;
    }
    handleContinueSavedApplication();
  }

  const studentName = applicant.personalDetails.name || applicant.personalDetails.fullName || "Candidate";
  const fatherName = applicant.personalDetails.fatherName || "Not available";
  const mobileNumber = applicant.personalDetails.mobileNumber || "Not available";
  const dateOfBirth = formatDate(applicant.personalDetails.dateOfBirth);

  return (
    <div className="dashboard-landing">
      <Header showLogout={true} />

      <main className="dashboard-landing__main">
        <section className="dashboard-landing__record">
          <div className="dashboard-landing__table-wrap">
            <table className="dashboard-landing__table">
              <thead>
                <tr>
                  <th scope="col">Registration No</th>
                  <th scope="col">Student Name</th>
                  <th scope="col">Father Name</th>
                  <th scope="col">Date of Birth</th>
                  <th scope="col">Mobile</th>
                  {isSubmitted ? (
                    <th scope="col">Print</th>
                  ) : (
                    <th scope="col">Edit</th>
                  )}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td data-label="Registration No">{applicant.loginId}</td>
                  <td data-label="Student Name">{studentName}</td>
                  <td data-label="Father Name">{fatherName}</td>
                  <td data-label="Date of Birth">{dateOfBirth}</td>
                  <td data-label="Mobile">{mobileNumber}</td>
                  {isSubmitted ? (
                    <td data-label="Print">
                      <button
                        className="dashboard-landing__edit-link"
                        type="button"
                        onClick={() => handlePrintApplication(applicant)}
                      >
                        Print Application
                      </button>
                    </td>
                  ) : (
                    <td data-label="Edit">
                      <button
                        className="dashboard-landing__edit-link"
                        type="button"
                        onClick={() => navigate("/apply?mode=edit&step=personal")}
                      >
                        Edit Personal Information
                      </button>
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {!isSubmitted && (
            <div className="dashboard-landing__actions">
              <button className="button primary dashboard-landing__primary" type="button" onClick={handleApplyForPost}>
                Apply for Post
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
