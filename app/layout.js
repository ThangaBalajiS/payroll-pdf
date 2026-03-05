import "./globals.css";

export const metadata = {
  title: "ASN Payslip - Payroll Processing",
  description: "Manage clients, upload payroll CSVs, and generate PDF payslips",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <nav className="navbar">
            <a href="/" className="navbar-brand">
              <div className="logo-icon">P</div>
              <span>ASN Payslip</span>
            </a>
          </nav>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
