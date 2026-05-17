import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import LandingPage from './pages/LandingPage'
import Register from './pages/Register'
import { AuthProvider } from './context/AuthContext'
import DashboardHR from './pages/DashboardHR';
import DashboardApplicant from './pages/DashboardApplicant';
import PublicProfile from './pages/PublicProfile'
import HRGenAI from './pages/HRGenAI'
import AddEmployee from './pages/AddEmployee'
import PostJob from './pages/PostJob'
import GenerateReports from './pages/GenerateReports'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route path="/"        element={<LandingPage />} />
          <Route path="/login"   element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/profile/:userId" element={<PublicProfile />} />

          {/* HR-only routes */}
          <Route path="/dashboard-hr" element={
            <ProtectedRoute role="hr"><DashboardHR /></ProtectedRoute>
          } />
          <Route path="/hr-genai" element={
            <ProtectedRoute role="hr"><HRGenAI /></ProtectedRoute>
          } />
          <Route path="/add-employee" element={
            <ProtectedRoute role="hr"><AddEmployee /></ProtectedRoute>
          } />
          <Route path="/post-job" element={
            <ProtectedRoute role="hr"><PostJob /></ProtectedRoute>
          } />
          <Route path="/generate-report" element={
            <ProtectedRoute role="hr"><GenerateReports /></ProtectedRoute>
          } />

          {/* Candidate-only routes */}
          <Route path="/dashboard-applicant" element={
            <ProtectedRoute role="candidate"><DashboardApplicant /></ProtectedRoute>
          } />
        </Routes>
      </div>
    </AuthProvider>
  )
}
