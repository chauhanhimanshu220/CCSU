import { useEffect, useRef, useState } from "react";
import { Header } from "../components/Header";

import { Navigate, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../context/AuthContext";
import { Modal } from "../components/Modal";
import { generateCaptchaText, drawCaptcha } from "../utils";
import "./login-page.css";

function createEmptyLoginForm() {
  return {
    loginId: "",
    password: "",
    captchaInput: "",
  };
}

function createEmptyResetForm() {
  return {
    registrationNumber: "",
    mobileNumber: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  };
}



export function LoginPage() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const loginIdRef = useRef(null);
  const passwordRef = useRef(null);
  const { applicant, loading, setSession, token } = useAuth();
  const [formData, setFormData] = useState(createEmptyLoginForm);
  const [captchaValue, setCaptchaValue] = useState(() => generateCaptchaText());
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetFormData, setResetFormData] = useState(createEmptyResetForm);
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [detailsError, setDetailsError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetStep, setResetStep] = useState("input"); // "input", "otp", "password"
  const [identifier, setIdentifier] = useState("");

  useEffect(() => {
    if (!captchaValue || !canvasRef.current) {
      return;
    }

    drawCaptcha(canvasRef.current, captchaValue);
  }, [captchaValue]);

  useEffect(() => {
    function clearCredentialFields() {
      setFormData((current) =>
        current.loginId || current.password
          ? {
              ...current,
              loginId: "",
              password: "",
            }
          : current
      );

      if (loginIdRef.current) {
        loginIdRef.current.value = "";
      }

      if (passwordRef.current) {
        passwordRef.current.value = "";
      }
    }

    const timeoutId = window.setTimeout(clearCredentialFields, 150);
    window.addEventListener("pageshow", clearCredentialFields);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("pageshow", clearCredentialFields);
    };
  }, []);

  useEffect(() => {
    if (!showResetModal) return;

    const { registrationNumber, mobileNumber } = resetFormData;
    if (registrationNumber && mobileNumber.length === 10) {
      const timeoutId = setTimeout(async () => {
        try {
          await api.verifyResetDetails({ registrationNumber, mobileNumber });
          setDetailsError("");
        } catch (error) {
          if (error.message === "Invalid details") {
            setDetailsError("Invalid details");
          } else {
            setDetailsError("");
          }
        }
      }, 500);

      return () => {
        clearTimeout(timeoutId);
      };
    } else if (detailsError) {
      // Use a timeout or check if it's already empty to avoid sync setState in effect if needed, 
      // but here we just check if it needs clearing.
      setDetailsError("");
    }
  }, [resetFormData.registrationNumber, resetFormData.mobileNumber, showResetModal, detailsError]);

  if (token && applicant && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  function refreshCaptcha() {
    setCaptchaValue(generateCaptchaText());
    setFormData((current) => ({
      ...current,
      captchaInput: "",
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    if (formData.captchaInput.trim().toUpperCase() !== captchaValue) {
      setErrorMessage("Captcha does not match. Please try again.");
      refreshCaptcha();
      setSubmitting(false);
      return;
    }

    try {
      const response = await api.login({
        loginId: formData.loginId,
        password: formData.password,
      });
      setSession(response.token, response.applicant);
      setSuccessMessage("Login successful. Redirecting to dashboard...");
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(error.message);
      refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSendOtp() {
    const id = resetFormData.registrationNumber || resetFormData.mobileNumber;
    if (!id) {
      setResetError("Please enter Registration Number OR Registered Mobile Number.");
      return;
    }

    setResetSubmitting(true);
    setResetError("");
    setResetSuccess("");

    try {
      await api.sendForgotPasswordOtp({ identifier: id });
      setIdentifier(id);
      setResetStep("otp");
      setResetSuccess("OTP has been sent to your registered email address.");
    } catch (error) {
      setResetError(error.message);
    } finally {
      setResetSubmitting(false);
    }
  }

  async function handleVerifyOtp() {
    if (!resetFormData.otp || resetFormData.otp.length !== 6) {
      setResetError("Please enter a valid 6-digit OTP.");
      return;
    }

    setResetSubmitting(true);
    setResetError("");
    setResetSuccess("");

    try {
      await api.verifyOtp({ identifier, otp: resetFormData.otp });
      setResetStep("password");
      setResetSuccess("OTP verified successfully. Please create a new password.");
    } catch (error) {
      setResetError(error.message);
    } finally {
      setResetSubmitting(false);
    }
  }

  async function handleResetSubmit(event) {
    event.preventDefault();
    setResetSubmitting(true);
    setResetError("");
    setResetSuccess("");

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,12}$/;
    if (!passwordRegex.test(resetFormData.newPassword)) {
      setResetError("Password must be 8-12 characters long and contain uppercase, lowercase, numbers, and symbols.");
      setResetSubmitting(false);
      return;
    }

    if (resetFormData.newPassword !== resetFormData.confirmPassword) {
      setResetError("Passwords do not match.");
      setResetSubmitting(false);
      return;
    }

    try {
      const response = await api.resetPasswordWithOtp({
        identifier,
        otp: resetFormData.otp,
        newPassword: resetFormData.newPassword,
        confirmPassword: resetFormData.confirmPassword,
      });
      setResetSuccess(response.message);
      window.alert(response.message);
      setTimeout(() => {
        setShowResetModal(false);
        setResetStep("input");
      }, 500);
    } catch (error) {
      setResetError(error.message);
    } finally {
      setResetSubmitting(false);
    }
  }


  return (
    <div className="portal-login">
      <Header showLogout={false} />

      <main className="portal-login__main">
        <div className="portal-login__container">
          <section className="portal-login__panel">
            <div className="portal-login__left">
              <button
                className="portal-login__register"
                type="button"
                onClick={() => navigate("/apply?mode=register&step=personal")}
              >
                Click Here For New Registration
              </button>

              <div className="portal-login__section">
                <h2>Important Notes!</h2>
                <p>Please use your registered registration number or mobile number and password to continue your application process.</p>
                <p>Ensure that the personal and academic details entered on the portal match your official documents.</p>
                <p>Keep a copy of your registration details and check the notice bar for further updates issued by the university.</p>
              </div>
            </div>

            <div className="portal-login__right">
              <div className="portal-login__card">
                <h2>Applicant Login</h2>
                <p className="portal-login__subtitle">
                  If you are already registered, kindly login with your Registration Number / Registered Mobile Number &amp; Password.
                </p>

                <form className="portal-login__form" autoComplete="off" onSubmit={handleSubmit}>
                  <div className="portal-login__autofill-trap" aria-hidden="true">
                    <input tabIndex="-1" type="text" name="username" autoComplete="username" />
                    <input tabIndex="-1" type="password" name="current-password" autoComplete="current-password" />
                  </div>

                  <div className="portal-login__field">
                    <label htmlFor="loginId">Registration Number / Registered Mobile Number</label>
                    <input
                      ref={loginIdRef}
                      id="loginId"
                      name="candidateRegistrationNumber"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Enter registration number or registered mobile number"
                      value={formData.loginId}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          loginId: event.target.value.toUpperCase(),
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="portal-login__field">
                    <label htmlFor="password">Password</label>
                    <div className="portal-login__input-wrapper">
                      <input
                        ref={passwordRef}
                        id="password"
                        name="candidatePortalPassword"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Enter password"
                        value={formData.password}
                        onChange={(event) =>
                          setFormData((current) => ({
                            ...current,
                            password: event.target.value,
                          }))
                        }
                        required
                      />
                      <button
                        type="button"
                        className="portal-login__toggle-password"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="portal-login__field">
                    <label htmlFor="captchaInput">Captcha</label>
                    <canvas
                      ref={canvasRef}
                      className="portal-login__captcha"
                      width="360"
                      height="62"
                      onClick={refreshCaptcha}
                      title="Click captcha to refresh"
                    />
                    <p className="portal-login__hint">Click the captcha box to refresh the code.</p>
                  </div>

                  <div className="portal-login__field">
                    <label htmlFor="captchaInput">Enter Captcha</label>
                    <input
                      id="captchaInput"
                      type="text"
                      placeholder="Type captcha text"
                      value={formData.captchaInput}
                      onChange={(event) =>
                        setFormData((current) => ({
                          ...current,
                          captchaInput: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  {errorMessage ? <div className="portal-login__message portal-login__message--error">{errorMessage}</div> : null}
                  {successMessage ? <div className="portal-login__message portal-login__message--success">{successMessage}</div> : null}

                  <div className="portal-login__actions">
                    <button className="portal-login__submit" disabled={submitting} type="submit">
                      {submitting ? "Logging in..." : "Login"}
                    </button>
                  </div>

                    <div className="portal-login__forgot">
                      <a
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          setResetFormData(createEmptyResetForm());
                          setResetError("");
                          setResetSuccess("");
                          setResetStep("input");
                          setShowResetModal(true);
                        }}
                      >
                        Forgotten password?
                      </a>
                    </div>
                </form>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showResetModal ? (
        <Modal onClose={() => setShowResetModal(false)} title="Reset Password" showCloseButton>
          <div className="portal-login__reset-modal">
            <h3 className="panel-title panel-title--modal">Forgotten password?</h3>
            <p 
              className="portal-login__subtitle"
              style={(resetStep === "password" || resetStep === "otp") ? { color: "var(--success)", fontWeight: "600" } : {}}
            >
              {resetStep === "password" 
                ? "OTP verified successfully. Please create a new password."
                : resetStep === "otp"
                  ? "OTP has been sent to your registered email address."
                  : "Please enter your registration details to create a new password."}
            </p>

            <form className="portal-login__form" onSubmit={(e) => e.preventDefault()}>
              {resetStep === "input" && (
                <>
                  <div className="portal-login__field">
                    <label htmlFor="reset-reg">Registration Number</label>
                    <input
                      id="reset-reg"
                      type="text"
                      placeholder="Enter registration number"
                      value={resetFormData.registrationNumber}
                      onChange={(event) =>
                        setResetFormData((current) => ({
                          ...current,
                          registrationNumber: event.target.value.toUpperCase(),
                          mobileNumber: "",
                        }))
                      }
                    />
                  </div>

                  <div className="portal-login__or-divider">
                    <div className="portal-login__or-circle">OR</div>
                  </div>

                  <div className="portal-login__field">
                    <label htmlFor="reset-mobile">Registered Mobile Number</label>
                    <input
                      id="reset-mobile"
                      type="text"
                      inputMode="numeric"
                      maxLength={10}
                      pattern="[0-9]{10}"
                      placeholder="Enter 10 digit mobile number"
                      value={resetFormData.mobileNumber}
                      onChange={(event) =>
                        setResetFormData((current) => ({
                          ...current,
                          mobileNumber: event.target.value.replace(/\D/g, ""),
                          registrationNumber: "",
                        }))
                      }
                    />
                  </div>

                  {resetError ? <div className="portal-login__message portal-login__message--error">{resetError}</div> : null}
                  {resetSuccess ? <div className="portal-login__message portal-login__message--success">{resetSuccess}</div> : null}

                  <div className="portal-login__actions portal-login__actions--center">
                    <button 
                      className="portal-login__submit" 
                      type="button"
                      disabled={resetSubmitting}
                      onClick={handleSendOtp}
                    >
                      {resetSubmitting ? "Sending..." : "Send OTP"}
                    </button>
                  </div>
                </>
              )}

              {resetStep === "otp" && (
                <>
                  <div className="portal-login__field">
                    <label htmlFor="reset-otp">Enter OTP</label>
                    <input
                      id="reset-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 6 digit OTP"
                      value={resetFormData.otp}
                      onChange={(event) =>
                        setResetFormData((current) => ({
                          ...current,
                          otp: event.target.value.replace(/\D/g, ""),
                        }))
                      }
                    />
                  </div>

                  {resetError ? <div className="portal-login__message portal-login__message--error">{resetError}</div> : null}

                  <div className="portal-login__actions portal-login__actions--center">
                    <button 
                      className="portal-login__submit" 
                      type="button"
                      disabled={resetSubmitting}
                      onClick={handleVerifyOtp}
                    >
                      {resetSubmitting ? "Verifying..." : "Submit OTP"}
                    </button>
                  </div>
                </>
              )}

              {resetStep === "password" && (
                <>
                  <div className="portal-login__field">
                    <label htmlFor="reset-new-pass">Create New Password</label>
                    <p className="portal-login__hint" style={{ marginTop: "-4px", marginBottom: "8px", color: "var(--danger)" }}>
                      Password must be 8 to 12 characters long and contain uppercase, lowercase letters, numbers & symbols.
                    </p>
                    <div className="portal-login__input-wrapper">
                      <input
                        id="reset-new-pass"
                        type={showNewPassword ? "text" : "password"}
                        maxLength={12}
                        placeholder="Enter new password"
                        value={resetFormData.newPassword}
                        onChange={(event) => {
                          const val = event.target.value;
                          setResetFormData((current) => ({
                            ...current,
                            newPassword: val,
                          }));
                        }}
                        required
                      />
                      <button
                        type="button"
                        className="portal-login__toggle-password"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="portal-login__field">
                    <label htmlFor="reset-confirm-pass">Confirm Password</label>
                    <div className="portal-login__input-wrapper">
                      <input
                        id="reset-confirm-pass"
                        type={showConfirmPassword ? "text" : "password"}
                        maxLength={12}
                        placeholder="Confirm new password"
                        value={resetFormData.confirmPassword}
                        onChange={(event) => {
                          const val = event.target.value;
                          setResetFormData((current) => ({
                            ...current,
                            confirmPassword: val,
                          }));
                        }}
                        required
                      />
                      <button
                        type="button"
                        className="portal-login__toggle-password"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                            <line x1="1" y1="1" x2="23" y2="23"></line>
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {resetError ? <div className="portal-login__message portal-login__message--error">{resetError}</div> : null}


                  <div className="portal-login__actions portal-login__actions--center">
                    <button 
                      className="portal-login__submit" 
                      disabled={resetSubmitting} 
                      type="button"
                      onClick={handleResetSubmit}
                    >
                      {resetSubmitting ? "Updating..." : "Create New Password"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
