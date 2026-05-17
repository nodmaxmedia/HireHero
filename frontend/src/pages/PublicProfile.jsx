import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { getPublicProfile } from "../services/api";
import { Users, Briefcase, Calendar, MapPin, Mail, BookOpen, Download } from "lucide-react";
import QRCode from "react-qr-code";

// Helper for date formatting
const formatDate = (dateString) => {
  if (!dateString) return "Present";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

const PublicProfile = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qrCopied, setQrCopied] = useState(false);
  const profileUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleDownloadQr = () => {
    const svg = document.getElementById('profile-qr-code');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `${userId}-qr.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(profileUrl).then(() => {
      setQrCopied(true);
      setTimeout(() => setQrCopied(false), 2000);
    });
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const data = await getPublicProfile(userId);
        setProfile(data);
      } catch (err) {
        setError("Profile not found or private.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  if (!profile) return null;

  const roleDisplay = profile.role === 'hr' ? 'HR Professional' : 
                      profile.role === 'employee' ? 'Employee' : 
                      'Job Seeker';

  const isCandidate = profile.role === 'candidate';

  return (
    <div className="min-h-screen bg-gray-50 font-inter">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-r from-[#013362] to-[#005193] text-white rounded-lg p-2 shadow-md">
              <Users className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-extrabold text-[#013362]">HireHero</h2>
          </Link>
          <Link to="/login" className="text-sm font-semibold text-[#005193] hover:underline">
            Join to Connect
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-6 space-y-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          <div className="relative">
            {profile.profile_pic_url ? (
              <img
                src={profile.profile_pic_url.startsWith("http") ? profile.profile_pic_url : `/api${profile.profile_pic_url}`}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border-4 border-blue-50 shadow-md"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-blue-100 flex items-center justify-center text-4xl text-blue-600 font-bold">
                {profile.first_name?.[0]}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold text-[#013362]">{profile.full_name}</h1>
            <p className="text-lg text-gray-600 font-medium mt-1">{roleDisplay}</p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-gray-500">
              {profile.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.location}</span>}
              {profile.email && <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {profile.email}</span>}
            </div>

            {profile.summary && (
              <p className="mt-4 text-gray-700 leading-relaxed max-w-2xl">
                {profile.summary}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleDownloadQr}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#005193] border border-[#005193] px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
              >
                <Download className="w-3 h-3" /> Save QR
              </button>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                {qrCopied ? '✓ Copied!' : '🔗 Copy Link'}
              </button>
            </div>
          </div>

          {/* QR Code Card */}
          <div className="flex flex-col items-center gap-3 shrink-0">
            <div className="bg-white border-2 border-gray-100 rounded-2xl p-3 shadow-sm">
              <QRCode
                id="profile-qr-code"
                value={profileUrl}
                size={120}
                fgColor="#013362"
                bgColor="#ffffff"
                level="M"
              />
            </div>
            {profile.resume_url && isCandidate && (
              <a
                href={profile.resume_url.startsWith("http") ? profile.resume_url : `/api${profile.resume_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-[#005193] text-white px-4 py-2 rounded-xl text-sm font-semibold shadow hover:opacity-90 transition w-full justify-center"
              >
                <Download className="w-4 h-4" /> Resume
              </a>
            )}
          </div>
        </div>

        {/* Only show Work Experience & Education for Candidates */}
        {isCandidate && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Work Experience */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-[#013362] mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5" /> Work Experience
              </h3>
              <div className="space-y-6">
                {profile.experiences?.length > 0 ? profile.experiences.map((exp, i) => (
                  <div key={i} className="border-l-2 border-gray-100 pl-4 relative">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-200"></div>
                    <h4 className="font-bold text-gray-800">{exp.title}</h4>
                    <div className="text-sm font-semibold text-[#005193]">{exp.company}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(exp.start_date)} - {formatDate(exp.end_date)}
                    </div>
                    {exp.description && <p className="text-sm text-gray-600 mt-2">{exp.description}</p>}
                  </div>
                )) : <p className="text-gray-500 italic text-sm">No work experience listed.</p>}
              </div>
            </div>

            {/* Education */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-bold text-[#013362] mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> Education
              </h3>
              <div className="space-y-6">
                {profile.educations?.length > 0 ? profile.educations.map((edu, i) => (
                  <div key={i} className="border-l-2 border-gray-100 pl-4 relative">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-200"></div>
                    <h4 className="font-bold text-gray-800">{edu.degree}</h4>
                    <div className="text-sm font-semibold text-[#005193]">{edu.institution}</div>
                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(edu.start_date)} - {formatDate(edu.end_date)}
                    </div>
                    {edu.description && <p className="text-sm text-gray-600 mt-2">{edu.description}</p>}
                  </div>
                )) : <p className="text-gray-500 italic text-sm">No education listed.</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PublicProfile;