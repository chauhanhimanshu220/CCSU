import { Header } from "./Header";

export function PortalLayout({ children }) {
  return (
    <div className="portal-page">
      <Header showLogout={true} />

      <main className="portal-page__main">
        <div className="portal-page__container">{children}</div>
      </main>
    </div>
  );
}

export function PortalLoader({ kicker, title }) {
  return (
    <PortalLayout>
      <div className="loader-screen loader-screen--contained">
        <div className="surface-panel loader-card">
          {kicker ? <span className="page-kicker">{kicker}</span> : null}
          <h2 className="panel-title panel-title--loader">{title}</h2>
        </div>
      </div>
    </PortalLayout>
  );
}
