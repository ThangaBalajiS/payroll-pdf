import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ClientDetailPage from './pages/ClientDetailPage'
import EditClientPage from './pages/EditClientPage'
import PayrollMonthPage from './pages/PayrollMonthPage'

export default function App() {
  return (
    <HashRouter>
      <div className="app-container">
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            <div className="logo-icon">P</div>
            <span>ASN Payslip</span>
          </Link>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/clients/:id" element={<ClientDetailPage />} />
            <Route path="/clients/:id/edit" element={<EditClientPage />} />
            <Route path="/clients/:id/payroll/:monthId" element={<PayrollMonthPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
