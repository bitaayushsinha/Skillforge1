export const getCertificateHTML = (arg1, courseName, dateString, certId = '', qrCodeUrl = '') => {
  let certificate = {};
  if (typeof arg1 === 'object' && arg1 !== null) {
    certificate = {
      learnerName: arg1.learner_name || arg1.learnerName || arg1.name || 'SkillForge Learner',
      courseName: arg1.course_name || arg1.courseName || arg1.title || 'SkillForge Course',
      dateString: arg1.issue_date || arg1.dateString || arg1.date || 'N/A',
      certId: arg1.certificate_id || arg1.certId || arg1.cert_id || '',
      qr_code_path: arg1.qr_code_path || arg1.qrCodeUrl || arg1.qr || ''
    };
  } else {
    certificate = {
      learnerName: arg1 || 'SkillForge Learner',
      courseName: courseName || 'SkillForge Course',
      dateString: dateString || 'N/A',
      certId: certId || '',
      qr_code_path: qrCodeUrl || ''
    };
  }

  // Ensure absolute URL for QR code so it renders reliably in print mode and previews
  const rawQr = certificate.qr_code_path || '';
  const qrSrc = rawQr 
    ? (rawQr.startsWith('http') ? rawQr : `http://localhost:8000${rawQr.startsWith('/') ? '' : '/'}${rawQr}`) 
    : (certificate.certId ? `http://localhost:8000/uploads/qrcodes/${certificate.certId}.png` : '');

  certificate.qr_code_path = qrSrc;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>SkillForge Certificate of Completion</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Georgia', 'Times New Roman', serif;
    background: #0d0d0d;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  .certificate {
    width: 1000px;
    height: 700px;
    background: #0d0d0d;
    border: 2px solid #1fc9c3;
    position: relative;
    padding: 40px;
    color: #f5f5f5;
    overflow: visible;
  }
  .certificate::before {
    content: "";
    position: absolute;
    top: 18px; left: 18px; right: 18px; bottom: 18px;
    border: 1px solid #1fc9c3;
    opacity: 0.5;
    pointer-events: none;
  }
  .corner {
    position: absolute;
    width: 60px;
    height: 60px;
    border: 3px solid #1fc9c3;
  }
  .corner.tl { top: 0; left: 0; border-right: none; border-bottom: none; }
  .corner.tr { top: 0; right: 0; border-left: none; border-bottom: none; }
  .corner.bl { bottom: 0; left: 0; border-right: none; border-top: none; }
  .corner.br { bottom: 0; right: 0; border-left: none; border-top: none; }

  .inner {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding-top: 10px;
  }

  .logo-row {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 4px;
  }
  .brand-name {
    font-family: 'Arial', sans-serif;
    font-weight: 800;
    font-size: 26px;
    letter-spacing: 3px;
    color: #ffffff;
  }

  .cert-title {
    font-size: 44px;
    font-weight: bold;
    color: #1fc9c3;
    letter-spacing: 4px;
    margin-top: 18px;
    text-transform: uppercase;
  }
  .cert-subtitle {
    font-size: 16px;
    letter-spacing: 6px;
    color: #cfcfcf;
    margin-top: 4px;
    text-transform: uppercase;
  }

  .awarded-to {
    margin-top: 28px;
    font-size: 16px;
    color: #b8b8b8;
    letter-spacing: 2px;
    text-transform: uppercase;
  }

  .recipient-name {
    margin-top: 10px;
    font-size: 38px;
    font-family: 'Brush Script MT', 'Segoe Script', cursive;
    color: #ffffff;
    border-bottom: 1px solid #1fc9c3;
    padding-bottom: 8px;
    min-width: 420px;
  }

  .description {
    margin-top: 22px;
    font-size: 16px;
    line-height: 1.7;
    color: #dcdcdc;
    max-width: 680px;
  }
  .description .course-name {
    color: #1fc9c3;
    font-weight: bold;
  }

  .bottom-row {
    margin-top: auto;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0 20px;
  }

  .sign-block, .date-block {
    text-align: center;
    width: 200px;
  }
  .sign-line {
    border-top: 1px solid #1fc9c3;
    margin-bottom: 6px;
    padding-top: 12px;
  }
  .sign-label {
    font-size: 13px;
    letter-spacing: 2px;
    color: #b8b8b8;
    text-transform: uppercase;
    font-family: 'Arial', sans-serif;
  }

  .seal {
    width: 90px;
    height: 90px;
    border: 3px solid #1fc9c3;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1fc9c3;
    font-family: 'Arial', sans-serif;
    font-size: 11px;
    letter-spacing: 1px;
    text-align: center;
    flex-direction: column;
    box-shadow: 0 0 15px rgba(31, 201, 195, 0.2);
  }

  .qr-section {
    text-align: center;
  }

  .qr-section img {
    width: 90px;
    height: 90px;
    object-fit: contain;
    display: block;
    margin: 0 auto;
  }

  .qr-section p {
    font-size: 10px;
    margin-top: 4px;
    color: #b8b8b8;
    font-family: 'Arial', sans-serif;
    letter-spacing: 1px;
  }

  .website {
    margin-top: 14px;
    font-size: 12px;
    color: #6f6f6f;
    letter-spacing: 1px;
    font-family: 'Arial', sans-serif;
  }
</style>
</head>
<body>

<div class="certificate">
  <div class="corner tl"></div>
  <div class="corner tr"></div>
  <div class="corner bl"></div>
  <div class="corner br"></div>

  <div class="inner">
    <div class="logo-row">
      <svg width="46" height="46" viewBox="0 0 303 296" xmlns="http://www.w3.org/2000/svg">
        <g fill="none" stroke="#1fc9c3" stroke-width="14">
          <path d="M70 70 H95 V200 H70 Z" fill="#1fc9c3" stroke="none"/>
          <path d="M150 95 C130 78, 100 78, 80 90 V200 C100 188, 130 188, 150 205 Z" fill="none"/>
          <path d="M150 95 C170 78, 200 78, 220 90 V200 C200 188, 170 188, 150 205 Z" fill="none"/>
          <rect x="120" y="225" width="60" height="12" fill="#1fc9c3" stroke="none"/>
          <rect x="140" y="237" width="20" height="14" fill="#1fc9c3" stroke="none"/>
        </g>
        <g fill="#1fc9c3">
          <rect x="235" y="55" width="16" height="16"/>
          <rect x="255" y="55" width="16" height="16"/>
          <rect x="235" y="75" width="16" height="16"/>
          <rect x="255" y="35" width="16" height="16"/>
        </g>
      </svg>
      <div class="brand-name">SKILL FORGE</div>
    </div>

    <div class="cert-title">Certificate</div>
    <div class="cert-subtitle">of Completion</div>

    <div class="awarded-to">This certificate is proudly presented to</div>

    <div class="recipient-name">${certificate.learnerName}</div>

    <div class="description">
      For successfully completing the course
      <span class="course-name">"${certificate.courseName}"</span>
      and demonstrating dedication, skill, and commitment throughout the program.
    </div>

    <div class="bottom-row">
      <div class="date-block">
        <div class="sign-line"></div>
        <div class="sign-label">Date: ${certificate.dateString}</div>
        ${certificate.certId ? `<div style="font-size: 11px; color: #888; margin-top: 4px; font-family: 'Arial', sans-serif;">ID: ${certificate.certId}</div>` : ''}
      </div>

      <div class="seal">
        <div>SKILL</div>
        <div>FORGE</div>
        <div>CERTIFIED</div>
      </div>

      <div class="sign-block">
        <div style="font-family: 'Brush Script MT', 'Segoe Script', cursive; font-size: 24px; color: #1fc9c3; margin-top: -25px; margin-bottom: 4px;">Alex Morgan</div>
        <div class="sign-line"></div>
        <div class="sign-label">Authorized Signature</div>
      </div>

      ${certificate.qr_code_path ? `
      <div class="qr-section">
        <img src="${certificate.qr_code_path}" alt="QR Code" />
        <p>SCAN TO VERIFY</p>
      </div>
      ` : ''}
    </div>

    <div class="website">www.skillforge.com</div>
  </div>
</div>

</body>
</html>
`;
};
