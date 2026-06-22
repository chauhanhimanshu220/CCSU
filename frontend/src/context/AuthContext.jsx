import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../api";

const sessionStorageKey = "ccsu-recruitment-session";
const AuthContext = createContext(null);

function readStoredSession() {
  try {
    return JSON.parse(sessionStorage.getItem(sessionStorageKey) ?? "null");
  } catch {
    return null;
  }
}

function writeStoredSession(token, applicant) {
  sessionStorage.setItem(
    sessionStorageKey,
    JSON.stringify({
      token,
      applicant,
    })
  );
}

export function AuthProvider({ children }) {
  const storedSession = readStoredSession();
  const [token, setToken] = useState(storedSession?.token ?? "");
  const [applicant, setApplicant] = useState(storedSession?.applicant ?? null);
  const [loading, setLoading] = useState(Boolean(storedSession?.token));

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      return () => {
        cancelled = true;
      };
    }

    api
      .fetchCurrentApplicant(token)
      .then((response) => {
        if (cancelled) {
          return;
        }

        setApplicant(response.applicant);
        writeStoredSession(token, response.applicant);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        sessionStorage.removeItem(sessionStorageKey);
        setToken("");
        setApplicant(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  function setSession(nextToken, nextApplicant) {
    setToken(nextToken);
    setApplicant(nextApplicant);
    writeStoredSession(nextToken, nextApplicant);
  }

  function updateApplicant(nextApplicant) {
    setApplicant(nextApplicant);

    if (token) {
      writeStoredSession(token, nextApplicant);
    }
  }

  function clearSession() {
    sessionStorage.removeItem(sessionStorageKey);
    setLoading(false);
    setToken("");
    setApplicant(null);
  }

  async function logout() {
    const currentToken = token;

    clearSession();

    if (!currentToken) {
      return;
    }

    try {
      await api.logout(currentToken);
    } catch {
      // Intentionally ignored because the local session is already cleared.
    }
  }

  async function refreshApplicant() {
    if (!token) {
      return null;
    }

    const response = await api.fetchCurrentApplicant(token);
    updateApplicant(response.applicant);
    return response.applicant;
  }

  useEffect(() => {
    function handlePageShow(event) {
      if (event.persisted) {
        // If the page was restored from the back-forward cache, 
        // we need to make sure the session is still valid.
        // We'll trigger a refresh or clear if needed.
        if (!sessionStorage.getItem(sessionStorageKey)) {
          clearSession();
        }
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        applicant,
        clearSession,
        loading,
        logout,
        refreshApplicant,
        setSession,
        token,
        updateApplicant,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
