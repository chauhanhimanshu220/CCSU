const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const express = require("express");
const multer = require("multer");
const {
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
} = require("./src/applicantService");

const app = express();
const port = Number(process.env.PORT || 4000);
const uploadsDirectory = path.resolve(__dirname, "uploads");
const pincodeLookupCache = new Map();
fs.mkdirSync(uploadsDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, uploadsDirectory);
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(httpError(400, "Only PDF, JPG, PNG, and WEBP files are allowed."));
  },
});

app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  })
);
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(uploadsDirectory));

function getTokenFromRequest(request) {
  const authorizationHeader = request.headers.authorization ?? "";
  return authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice("Bearer ".length)
    : "";
}

function requireAuth(request, _response, next) {
  const token = getTokenFromRequest(request);

  if (!token) {
    next(httpError(401, "Authentication is required."));
    return;
  }

  const applicant = getApplicantByToken(token);

  if (!applicant) {
    next(httpError(401, "Session expired. Please login again."));
    return;
  }

  request.authToken = token;
  request.applicant = applicant;
  next();
}

function isValidIndianPincode(pinCode) {
  return /^[1-9][0-9]{5}$/.test(String(pinCode ?? "").trim());
}

function summarizePincodeLocation(postOffices) {
  if (!Array.isArray(postOffices) || postOffices.length === 0) {
    return null;
  }

  const rankedLocations = Array.from(
    postOffices.reduce((locations, office) => {
      const state = String(office?.State ?? office?.Circle ?? "").trim();
      const district = String(office?.District ?? office?.Block ?? office?.Division ?? "").trim();

      if (!state || !district) {
        return locations;
      }

      const key = `${state}|||${district}`;
      const existingLocation = locations.get(key);

      locations.set(key, {
        state,
        district,
        count: (existingLocation?.count ?? 0) + 1,
      });

      return locations;
    }, new Map()).values()
  ).sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.district.localeCompare(right.district) || left.state.localeCompare(right.state);
  });

  if (rankedLocations.length > 0) {
    return {
      state: rankedLocations[0].state,
      district: rankedLocations[0].district,
    };
  }

  const fallbackOffice = postOffices.find((office) => office?.State || office?.District || office?.Division);

  if (!fallbackOffice) {
    return null;
  }

  return {
    state: String(fallbackOffice.State ?? fallbackOffice.Circle ?? "").trim(),
    district: String(
      fallbackOffice.District ?? fallbackOffice.Block ?? fallbackOffice.Division ?? ""
    ).trim(),
  };
}

async function lookupIndianPincode(pinCode) {
  if (pincodeLookupCache.has(pinCode)) {
    return pincodeLookupCache.get(pinCode);
  }

  const response = await fetch(`https://api.postalpincode.in/pincode/${pinCode}`);

  if (!response.ok) {
    throw httpError(502, "PIN code lookup service is unavailable right now.");
  }

  const payload = await response.json();
  const result = Array.isArray(payload) ? payload[0] : null;
  const location = summarizePincodeLocation(result?.PostOffice);

  if (!result || result.Status !== "Success" || !location?.state || !location?.district) {
    throw httpError(404, "No location found for this PIN code.");
  }

  const normalizedLocation = {
    pinCode,
    state: location.state,
    district: location.district,
  };

  pincodeLookupCache.set(pinCode, normalizedLocation);
  return normalizedLocation;
}

app.get("/api/health", (_request, response) => {
  response.json({
    ok: true,
    message: "Recruitment portal API is running.",
  });
});

app.get("/api/pincode/:pinCode", async (request, response, next) => {
  try {
    const normalizedPinCode = String(request.params.pinCode ?? "").replace(/\D/g, "");

    if (!isValidIndianPincode(normalizedPinCode)) {
      throw httpError(400, "Please enter a valid 6-digit Indian PIN code.");
    }

    const location = await lookupIndianPincode(normalizedPinCode);

    response.json(location);
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/register", (request, response, next) => {
  try {
    const result = createApplicant(request.body.personalDetails ?? request.body);
    response.status(201).json({
      message: "Registration created successfully.",
      token: result.token,
      credentials: {
        applicationId: result.applicant.applicationId,
        loginId: result.applicant.loginId,
        password: result.password,
      },
      applicant: result.applicant,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", (request, response, next) => {
  try {
    const result = loginApplicant(request.body.loginId, request.body.password);
    response.json({
      message: "Login successful.",
      token: result.token,
      applicant: result.applicant,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/logout", requireAuth, (request, response, next) => {
  try {
    logoutApplicant(request.authToken);
    response.json({
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/applicant/me", requireAuth, (request, response) => {
  response.json({
    applicant: request.applicant,
  });
});

app.put("/api/applicant/personal", requireAuth, (request, response, next) => {
  try {
    const applicant = updatePersonalDetails(request.applicant.recordId, request.body.personalDetails ?? request.body);
    response.json({
      message: "Personal details saved successfully.",
      applicant,
    });
  } catch (error) {
    next(error);
  }
});

app.put("/api/applicant/education", requireAuth, (request, response, next) => {
  try {
    const applicant = updateEducationDetails(
      request.applicant.recordId,
      request.body.educationDetails ?? request.body
    );
    response.json({
      message: "Educational details saved successfully.",
      applicant,
    });
  } catch (error) {
    next(error);
  }
});

app.post(
  "/api/applicant/documents/:field",
  requireAuth,
  upload.single("file"),
  (request, response, next) => {
    try {
      if (!request.file) {
        throw httpError(400, "Please choose a file to upload.");
      }

      const applicant = saveDocument(request.applicant.recordId, request.params.field, request.file);
      response.json({
        message: "Document uploaded successfully.",
        applicant,
      });
    } catch (error) {
      if (request.file?.path) {
        fs.unlink(request.file.path, () => {});
      }
      next(error);
    }
  }
);

app.delete("/api/applicant/documents/:field", requireAuth, (request, response, next) => {
  try {
    const applicant = deleteDocument(request.applicant.recordId, request.params.field);
    response.json({
      message: "Document removed successfully.",
      applicant,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/applicant/payment", requireAuth, (request, response, next) => {
  try {
    const applicant = completePayment(request.applicant.recordId, request.body);
    response.json({
      message: "Payment completed successfully.",
      applicant,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/applicant/submit", requireAuth, (request, response, next) => {
  try {
    const applicant = submitApplication(request.applicant.recordId);
    response.json({
      message: "Application submitted successfully.",
      applicant,
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    response.status(400).json({
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "File size must be 5 MB or smaller."
          : error.message,
    });
    return;
  }

  response.status(error.statusCode || 500).json({
    message: error.message || "Unexpected backend error.",
  });
});

app.listen(port, () => {
  console.log(`Recruitment portal backend running on http://localhost:${port}`);
});
