const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";
const backendBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");

async function request(path, options = {}) {
  const { body, headers = {}, method = "GET", token } = options;
  const config = {
    method,
    headers: { ...headers },
  };

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (body instanceof FormData) {
    config.body = body;
  } else if (body !== undefined) {
    config.headers["Content-Type"] = "application/json";
    config.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, config);
  } catch {
    throw new Error("Unable to connect to the backend API. Please make sure the backend server is running.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

function getFileUrl(relativeUrl) {
  if (!relativeUrl) {
    return "";
  }

  if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
    return relativeUrl;
  }

  return `${backendBaseUrl}${relativeUrl}`;
}

export const api = {
  fetchCurrentApplicant(token) {
    return request("/applicant/me", { token });
  },
  checkMobileNumberAvailability(mobileNumber) {
    return request(`/auth/mobile-number-availability?mobileNumber=${encodeURIComponent(mobileNumber)}`);
  },
  checkAadhaarNumberAvailability(aadhaarNumber) {
    return request(`/auth/aadhaar-number-availability?aadhaarNumber=${encodeURIComponent(aadhaarNumber)}`);
  },
  lookupIndianPincode(pinCode) {
    return request(`/pincode/${pinCode}`);
  },
  register(payload) {
    return request("/auth/register", {
      method: "POST",
      body: payload,
    });
  },
  login(payload) {
    return request("/auth/login", {
      method: "POST",
      body: payload,
    });
  },
  resetPassword(payload) {
    return request("/auth/reset-password", {
      method: "POST",
      body: payload,
    });
  },
  verifyResetDetails(payload) {
    return request("/auth/verify-reset-details", {
      method: "POST",
      body: payload,
    });
  },
  sendForgotPasswordOtp(payload) {
    return request("/auth/forgot-password-otp", {
      method: "POST",
      body: payload,
    });
  },
  verifyOtp(payload) {
    return request("/auth/verify-otp", {
      method: "POST",
      body: payload,
    });
  },
  resetPasswordWithOtp(payload) {
    return request("/auth/reset-password-with-otp", {
      method: "POST",
      body: payload,
    });
  },
  logout(token) {
    return request("/auth/logout", {
      method: "POST",
      token,
    });
  },
  savePersonalDetails(token, payload) {
    return request("/applicant/personal", {
      method: "PUT",
      token,
      body: payload,
    });
  },
  saveRecruitmentDetails(token, payload) {
    return request("/applicant/recruitment", {
      method: "PUT",
      token,
      body: payload,
    });
  },
  saveEducationDetails(token, payload) {
    return request("/applicant/education", {
      method: "PUT",
      token,
      body: payload,
    });
  },
  savePreviousServiceDetails(token, payload) {
    return request("/applicant/service", {
      method: "PUT",
      token,
      body: payload,
    });
  },
  uploadDocument(token, field, file) {
    const formData = new FormData();
    formData.append("file", file);

    return request(`/applicant/documents/${field}`, {
      method: "POST",
      token,
      body: formData,
    });
  },
  deleteDocument(token, field) {
    return request(`/applicant/documents/${field}`, {
      method: "DELETE",
      token,
    });
  },
  completePayment(token, payload) {
    return request("/applicant/payment", {
      method: "POST",
      token,
      body: payload,
    });
  },
  submitApplication(token) {
    return request("/applicant/submit", {
      method: "POST",
      token,
    });
  },
};

export { apiBaseUrl, backendBaseUrl, getFileUrl };
