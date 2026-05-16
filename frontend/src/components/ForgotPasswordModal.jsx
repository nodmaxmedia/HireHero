import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, KeyRound, Lock, CheckCircle2, ArrowLeft, RefreshCw } from 'lucide-react';
import PasswordInput from './PasswordInput';
import { forgotPassword, verifyOtp, resetPassword } from '../services/api';

const OTP_RESEND_SECONDS = 60;

export default function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState('email'); // 'email' | 'otp' | 'reset' | 'done'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);

  const otpRefs = useRef([]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Countdown for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // ── Step 1: Request OTP ──────────────────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setStep('otp');
      setResendTimer(OTP_RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── OTP input helpers ────────────────────────────────────────────────────
  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
  };

  // ── Step 2: Verify OTP ───────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the complete 6-digit OTP.'); return; }
    setLoading(true);
    try {
      await verifyOtp(email, code);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setError('');
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    try {
      await forgotPassword(email);
      setResendTimer(OTP_RESEND_SECONDS);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: Reset Password ───────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await resetPassword(email, otp.join(''), newPassword);
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = { email: 0, otp: 1, reset: 2, done: 3 };
  const stepLabels = ['Email', 'OTP', 'Reset'];

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
    >
      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden">

        {/* Top bar: close button in its own row */}
        <div className="flex justify-end px-5 pt-5">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step progress */}
        {step !== 'done' && (
          <div className="px-8 pt-2 pb-4">
            <div className="flex items-center gap-2">
              {stepLabels.map((label, i) => (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                      ${i < stepIndex[step]
                        ? 'bg-[#013362] border-[#013362] text-white'
                        : i === stepIndex[step]
                          ? 'bg-white border-[#013362] text-[#013362]'
                          : 'bg-white border-gray-300 text-gray-400'}`}>
                      {i < stepIndex[step] ? '✓' : i + 1}
                    </div>
                    <span className={`text-[10px] font-medium ${i === stepIndex[step] ? 'text-[#013362]' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </div>
                  {i < stepLabels.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-4 rounded ${i < stepIndex[step] ? 'bg-[#013362]' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        <div className="px-8 pb-8 pt-2">

          {/* ── Email step ── */}
          {step === 'email' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 rounded-xl p-3">
                  <Mail className="h-6 w-6 text-[#013362]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#013362]">Forgot Password?</h2>
                  <p className="text-sm text-gray-500">Enter your registered email to receive an OTP</p>
                </div>
              </div>

              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-700 font-medium">Email Address</label>
                  <input
                    type="email"
                    autoFocus
                    placeholder="you@example.com"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#005193]"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#013362] to-[#005193] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-60"
                >
                  {loading ? 'Sending OTP…' : 'Send OTP →'}
                </button>
              </form>
            </>
          )}

          {/* ── OTP step ── */}
          {step === 'otp' && (
            <>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-blue-50 rounded-xl p-3">
                  <KeyRound className="h-6 w-6 text-[#013362]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#013362]">Enter OTP</h2>
                  <p className="text-sm text-gray-500">
                    Sent to <span className="font-medium text-gray-700">{email}</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-5">Check your inbox (and spam). OTP expires in 10 minutes.</p>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={el => (otpRefs.current[idx] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      className="w-11 text-center text-xl font-bold border-2 rounded-lg focus:outline-none focus:border-[#005193] focus:ring-2 focus:ring-[#005193]/30 transition border-gray-300"
                      style={{ height: '52px' }}
                    />
                  ))}
                </div>

                {error && <p className="text-red-500 text-sm text-center">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#013362] to-[#005193] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-60"
                >
                  {loading ? 'Verifying…' : 'Verify OTP →'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setError(''); setOtp(['','','','','','']); }}
                    className="flex items-center gap-1 text-gray-500 hover:text-[#013362] transition"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendTimer > 0 || loading}
                    className="flex items-center gap-1 text-[#013362] font-semibold hover:underline disabled:text-gray-400 disabled:no-underline transition"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ── Reset step ── */}
          {step === 'reset' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 rounded-xl p-3">
                  <Lock className="h-6 w-6 text-[#013362]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#013362]">Set New Password</h2>
                  <p className="text-sm text-gray-500">Choose a strong password (min. 6 characters)</p>
                </div>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <PasswordInput
                  label="New Password"
                  name="newPassword"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  showStrength
                  autoFocus
                />
                <PasswordInput
                  label="Confirm Password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#013362] to-[#005193] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-60"
                >
                  {loading ? 'Resetting…' : 'Reset Password →'}
                </button>
              </form>
            </>
          )}

          {/* ── Done step ── */}
          {step === 'done' && (
            <div className="py-6 flex flex-col items-center text-center gap-4">
              <div className="bg-green-50 rounded-full p-5">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-[#013362]">Password Reset!</h2>
              <p className="text-gray-500 text-sm max-w-xs">
                Your password has been updated successfully. You can now log in with your new password.
              </p>
              <button
                onClick={onClose}
                className="mt-2 w-full bg-gradient-to-r from-[#013362] to-[#005193] text-white py-3 rounded-lg font-semibold hover:opacity-90 transition"
              >
                Back to Login
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
