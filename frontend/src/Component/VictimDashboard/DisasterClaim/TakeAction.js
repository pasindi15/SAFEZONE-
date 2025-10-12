import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import axios from '../../../api/axios';
import AdminNav from '../../../Components/NavBar/adminNav';

export default function TakeAction() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // State management
  const [claim, setClaim] = useState(null);
  const [actionForm, setActionForm] = useState({
    actionType: '',
    priority: 'medium',
    description: '',
    financialRecommendation: '',
    compensationAmount: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [showFinancialForm, setShowFinancialForm] = useState(false);
  const [financialMessage, setFinancialMessage] = useState('');

  // Load claim data
  useEffect(() => {
    const loadClaim = () => {
      try {
        // Try to get from localStorage first
        const storedClaim = localStorage.getItem('selectedClaim');
        if (storedClaim) {
          const claimData = JSON.parse(storedClaim);
          setClaim(claimData);
          
          // Pre-fill form with claim data
          setActionForm(prev => ({
            ...prev,
            compensationAmount: claimData.estimatedLoss || ''
          }));
        }
        setLoading(false);
      } catch (error) {
        console.error('Error loading claim:', error);
        setLoading(false);
      }
    };

    loadClaim();
  }, [id]);

  // Generate PDF report with CSS styling
  const generateReport = () => {
    if (!claim) return;

    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric', 
      month: 'long',
      day: 'numeric'
    });
    
    const referenceNumber = `SZ-DC-${claim._id?.slice(-8).toUpperCase() || 'UNKNOWN'}`;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Official Damage Claim Report - ${claim.name}</title>
      <style>
        @media print {
          @page {
            margin: 0.75in;
            size: A4;
          }
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.6;
          color: #000;
          background: #fff;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          font-size: 14px;
        }
        
        .letterhead {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 25px;
          border-bottom: 3px double #000;
          position: relative;
        }
        
        .government-seal {
          width: 80px;
          height: 80px;
          background: linear-gradient(45deg, #1e3a8a, #3b82f6);
          border-radius: 50%;
          margin: 0 auto 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 24px;
          border: 3px solid #000;
        }
        
        .org-name {
          font-size: 24px;
          font-weight: bold;
          color: #000;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        
        .org-subtitle {
          font-size: 16px;
          color: #333;
          margin-bottom: 15px;
          font-style: italic;
        }
        
        .org-address {
          font-size: 12px;
          color: #555;
          line-height: 1.4;
        }
        
        .document-header {
          margin: 30px 0;
          text-align: center;
        }
        
        .doc-title {
          font-size: 20px;
          font-weight: bold;
          color: #000;
          text-transform: uppercase;
          text-decoration: underline;
          margin-bottom: 10px;
        }
        
        .ref-info {
          display: flex;
          justify-content: space-between;
          margin: 25px 0;
          font-size: 12px;
          color: #333;
        }
        
        .ref-number {
          font-weight: bold;
        }
        
        .main-content {
          margin: 40px 0;
          line-height: 1.8;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          color: #000;
          margin: 25px 0 15px 0;
          text-transform: uppercase;
          border-bottom: 1px solid #000;
          padding-bottom: 5px;
        }
        
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 14px;
        }
        
        .info-table th,
        .info-table td {
          border: 1px solid #000;
          padding: 12px;
          text-align: left;
          vertical-align: top;
        }
        
        .info-table th {
          background-color: #f0f0f0;
          font-weight: bold;
          width: 30%;
        }
        
        .damage-box {
          border: 2px solid #dc2626;
          padding: 20px;
          margin: 25px 0;
          background-color: #fef2f2;
        }
        
        .damage-text {
          font-style: italic;
          line-height: 1.8;
          text-align: justify;
        }
        
        .action-box {
          border: 2px solid #059669;
          padding: 20px;
          margin: 25px 0;
          background-color: #f0fdf4;
        }
        
        .action-text {
          line-height: 1.8;
          text-align: justify;
        }
        
        .certification {
          margin: 40px 0 30px 0;
          padding: 20px;
          border: 1px solid #000;
          background-color: #f9f9f9;
        }
        
        .cert-text {
          text-align: justify;
          font-size: 13px;
          line-height: 1.6;
        }
        
        .signature-section {
          margin-top: 60px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        
        .signature-box {
          width: 250px;
          text-align: center;
        }
        
        .signature-line {
          border-bottom: 2px solid #000;
          height: 60px;
          margin-bottom: 10px;
          position: relative;
        }
        
        .signature-text {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .designation {
          font-size: 11px;
          color: #333;
          font-style: italic;
        }
        
        .date-stamp {
          border: 2px solid #000;
          padding: 15px;
          text-align: center;
          width: 150px;
          margin-left: auto;
        }
        
        .date-label {
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .date-value {
          font-size: 14px;
          font-weight: bold;
        }
        
        .footer-info {
          margin-top: 50px;
          font-size: 10px;
          text-align: center;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 15px;
        }
        
        .confidential {
          position: absolute;
          top: 20px;
          right: 0;
          transform: rotate(15deg);
          color: #dc2626;
          font-weight: bold;
          font-size: 18px;
          border: 2px solid #dc2626;
          padding: 5px 10px;
          background: rgba(255, 255, 255, 0.9);
        }
        
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .status-approved { background: #d1fae5; color: #065f46; }
        .status-rejected { background: #fee2e2; color: #991b1b; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-investigation { background: #dbeafe; color: #1e40af; }
        
        @media print {
          body {
            padding: 20px;
          }
          
          .signature-section {
            page-break-inside: avoid;
          }
          
          .certification {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="confidential">OFFICIAL</div>
      
      <div class="letterhead">
        <div class="government-seal">SZ</div>
        <div class="org-name">SafeZone Disaster Management System</div>
        <div class="org-subtitle">Damage Claims Assessment & Processing Division</div>
        <div class="org-address">
          123 Emergency Response Boulevard, Crisis Management District<br>
          National Disaster Coordination Center, Emergency City, EC 12345<br>
          Tel: +1-800-SAFEZONE | Email: claims@safezone.gov | Web: www.safezone.gov
        </div>
      </div>
      
      <div class="document-header">
        <div class="doc-title">Official Damage Claim Assessment Report</div>
      </div>
      
      <div class="ref-info">
        <div>
          <span class="ref-number">Reference No: ${referenceNumber}</span><br>
          Claim ID: ${claim._id || 'N/A'}
        </div>
        <div>
          <strong>Date Issued: ${currentDate}</strong><br>
          Classification: Official Use
        </div>
      </div>
      
      <div class="main-content">
        <div class="section-title">Claimant Information</div>
        
        <table class="info-table">
          <tr>
            <th>Full Name</th>
            <td>${claim.name || 'Not Provided'}</td>
          </tr>
          <tr>
            <th>National ID (NIC)</th>
            <td>${claim.nic || 'Not Provided'}</td>
          </tr>
          <tr>
            <th>Email Address</th>
            <td>${claim.email || 'Not Provided'}</td>
          </tr>
          <tr>
            <th>Phone Number</th>
            <td>${claim.phone || 'Not Provided'}</td>
          </tr>
          <tr>
            <th>Address</th>
            <td>${claim.address || 'Not Provided'}</td>
          </tr>
          <tr>
            <th>Location of Damage</th>
            <td>${claim.currentLocation || 'Not Provided'}</td>
          </tr>
          <tr>
            <th>Claim Submitted</th>
            <td>${new Date(claim.reportedAt || claim.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</td>
          </tr>
          <tr>
            <th>Submission Time</th>
            <td>${new Date(claim.reportedAt || claim.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              timeZoneName: 'short'
            })}</td>
          </tr>
        </table>
        
        <div class="section-title">Damage Details & Assessment</div>
        
        <table class="info-table">
          <tr>
            <th>Type of Damage</th>
            <td>${claim.damageType || 'Not Specified'}</td>
          </tr>
          <tr>
            <th>Estimated Loss Value</th>
            <td><strong>${claim.estimatedLoss || 'Not Assessed'}</strong></td>
          </tr>
          <tr>
            <th>Date of Occurrence</th>
            <td>${claim.occurredAt ? new Date(claim.occurredAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }) : 'Not Specified'}</td>
          </tr>
          <tr>
            <th>Current Status</th>
            <td>
              <span class="status-badge ${actionForm.actionType ? `status-${actionForm.actionType.toLowerCase().replace(/\s+/g, '-')}` : 'status-pending'}">
                ${actionForm.actionType || 'Under Review'}
              </span>
            </td>
          </tr>
          <tr>
            <th>Priority Level</th>
            <td><strong>${actionForm.priority ? actionForm.priority.toUpperCase() : 'MEDIUM'}</strong></td>
          </tr>
        </table>
        
        <div class="section-title">Damage Description</div>
        
        <div class="damage-box">
          <div class="damage-text">
            "${claim.description || 'No detailed description provided by claimant.'}"
          </div>
        </div>
        
        ${actionForm.actionType ? `
        <div class="section-title">Official Action Taken</div>
        
        <table class="info-table">
          <tr>
            <th>Action Type</th>
            <td><strong>${actionForm.actionType}</strong></td>
          </tr>
          <tr>
            <th>Assessment Date</th>
            <td>${currentDate}</td>
          </tr>
          <tr>
            <th>Approved Compensation</th>
            <td>${actionForm.compensationAmount || 'Not Applicable'}</td>
          </tr>
          <tr>
            <th>Processing Priority</th>
            <td>${actionForm.priority.toUpperCase()}</td>
          </tr>
        </table>
        
        <div class="action-box">
          <div class="action-text">
            <strong>Assessment Decision:</strong> ${actionForm.description || 'No action description provided.'}
          </div>
          ${actionForm.financialRecommendation ? `
          <br><br>
          <div class="action-text">
            <strong>Financial Recommendation:</strong> ${actionForm.financialRecommendation}
          </div>
          ` : ''}
          ${actionForm.notes ? `
          <br><br>
          <div class="action-text">
            <strong>Internal Processing Notes:</strong> ${actionForm.notes}
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <div class="certification">
          <div class="cert-text">
            <strong>CERTIFICATION:</strong> This document certifies that the above damage claim has been officially processed by the SafeZone Disaster Management System. The assessment has been conducted in accordance with established protocols and guidelines. This report serves as an official record of the claim evaluation and any actions taken. All information contained herein is accurate as of the date of issuance and has been verified by authorized personnel.
          </div>
        </div>
      </div>
      
      <div class="signature-section">
        <div class="signature-box">
          <div class="signature-line"></div>
          <div class="signature-text">Claims Assessor</div>
          <div class="designation">SafeZone Claims Processing Division</div>
        </div>
        
        <div class="date-stamp">
          <div class="date-label">OFFICIAL SEAL</div>
          <div class="date-value">${currentDate}</div>
        </div>
      </div>
      
      <div class="footer-info">
        This is an automatically generated official document from SafeZone DMS.<br>
        For verification, contact: verification@safezone.gov | Reference: ${referenceNumber}<br>
        © SafeZone Disaster Management System - All Rights Reserved
      </div>
    </body>
    </html>
    `;

    // Create a new window and write the HTML content
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  // Send email to victim
  const sendEmailToVictim = () => {
    if (!claim) return;

    const subject = `Update on Your Damage Claim - Reference: ${claim._id}`;
    const message = `Dear ${claim.name},

We are writing to update you on the status of your damage claim submitted on ${new Date(claim.reportedAt || claim.createdAt).toLocaleDateString()}.

CLAIM DETAILS:
- Claim ID: ${claim._id}
- Damage Type: ${claim.damageType}
- Estimated Loss: ${claim.estimatedLoss}
- Location: ${claim.currentLocation}

ACTION TAKEN:
- Status: ${actionForm.actionType}
- Priority Level: ${actionForm.priority}
${actionForm.compensationAmount ? `- Approved Compensation: ${actionForm.compensationAmount}` : ''}

${actionForm.description}

NEXT STEPS:
${actionForm.financialRecommendation}

If you have any questions or need clarification about this decision, please don't hesitate to contact our support team.

Thank you for your patience during this process.

Best regards,
SafeZone Disaster Management Team
Email: support@safezone.lk
Phone: +94 11 234 5678`;

    const emailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(claim.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(emailUrl, '_blank');
  };

  // Send to financial unit
  const sendToFinancialUnit = () => {
    if (!claim) return;
    
    // Set default message with claim details
    const defaultMessage = `Dear Financial Unit,

A damage claim requires your review and financial processing.

CLAIM INFORMATION:
- Claim ID: ${claim._id}
- Claimant: ${claim.name}
- NIC: ${claim.nic}
- Contact: ${claim.email} | ${claim.phone}

DAMAGE DETAILS:
- Type: ${claim.damageType}
- Estimated Loss: ${claim.estimatedLoss}
- Date Occurred: ${claim.occurredAt ? new Date(claim.occurredAt).toLocaleDateString() : 'N/A'}
- Location: ${claim.currentLocation}

RECOMMENDED ACTION:
- Action Type: ${actionForm.actionType || 'Not specified'}
- Priority: ${actionForm.priority}
- Recommended Compensation: ${actionForm.compensationAmount || 'Not specified'}
- Financial Recommendation: ${actionForm.financialRecommendation || 'Not specified'}

ASSESSMENT NOTES:
${actionForm.description || 'No assessment notes provided'}

INTERNAL NOTES:
${actionForm.notes || 'No internal notes'}

Please review this claim and process the financial aspects accordingly.

Best regards,
Disaster Management Team
SafeZone DMS`;

    setFinancialMessage(defaultMessage);
    setShowFinancialForm(true);
  };

  // Actually send the financial email
  const handleFinancialSubmit = () => {
    if (!financialMessage.trim()) {
      alert('Please enter a message before sending.');
      return;
    }

    const subject = `Financial Review Required - Damage Claim ${claim._id}`;
    const financialEmail = 'finance@safezone.lk'; // You can make this configurable
    const emailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(financialEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(financialMessage)}`;
    
    window.open(emailUrl, '_blank');
    setShowFinancialForm(false);
    setFinancialMessage('');
  };

  // Complete action
  const completeAction = async () => {
    if (!actionForm.actionType || !actionForm.description) {
      alert('Please fill in required fields (Action Type and Description)');
      return;
    }

    setLoading(true);

    try {
      // Map action types to database status values
      const getActionStatus = (actionType) => {
        const statusMap = {
          'Approved': 'approved',
          'Rejected': 'rejected', 
          'Under Investigation': 'under_review',
          'Requires Documentation': 'under_review',
          'Assessment Scheduled': 'under_review',
          'Compensation Approved': 'approved'
        };
        return statusMap[actionType] || 'under_review';
      };

      // Determine financial status based on action type
      const getFinancialStatus = (actionType) => {
        if (actionType === 'Compensation Approved' || actionType === 'Approved') {
          return 'sent_to_financial';
        }
        if (actionType === 'Rejected') {
          return 'not_sent';
        }
        return 'not_sent';
      };

      // Update action status in database
      await axios.patch(`/damage/${claim._id}/action`, {
        actionStatus: getActionStatus(actionForm.actionType),
        actionTakenBy: 'Admin', // You can get this from user context
        actionNotes: actionForm.description,
        actionType: actionForm.actionType,
        financialStatus: getFinancialStatus(actionForm.actionType),
        financialAmount: actionForm.compensationAmount ? Number(actionForm.compensationAmount) : undefined,
        financialNotes: actionForm.financialRecommendation
      });

      // Store claim status and action details in localStorage (for backward compatibility)
      const claimStatuses = JSON.parse(localStorage.getItem('claimStatuses') || '{}');
      claimStatuses[claim._id] = {
        status: actionForm.actionType, // Store the display name
        actionDate: new Date().toISOString(),
        priority: actionForm.priority,
        compensationAmount: actionForm.compensationAmount,
        description: actionForm.description,
        financialRecommendation: actionForm.financialRecommendation,
        notes: actionForm.notes
      };
      localStorage.setItem('claimStatuses', JSON.stringify(claimStatuses));

      // Also mark as reviewed (for backward compatibility)
      const reviewedIds = JSON.parse(localStorage.getItem('reviewedClaimIds') || '[]');
      if (!reviewedIds.includes(claim._id)) {
        reviewedIds.push(claim._id);
        localStorage.setItem('reviewedClaimIds', JSON.stringify(reviewedIds));
      }

      // Automatically send email to victim
      try {
        sendEmailToVictim();
      } catch (error) {
        console.error('Error sending email to victim:', error);
        // Continue with the process even if email fails
      }

      alert(`Action completed successfully! Claim status has been updated to: ${actionForm.actionType}. An email notification has been sent to the victim. The status will now sync across all devices.`);
      navigate('/victim/claim/records');

    } catch (error) {
      console.error('Error updating claim status:', error);
      alert('Error updating claim status in database. Changes saved locally only.');
      
      // Fallback to localStorage only
      const claimStatuses = JSON.parse(localStorage.getItem('claimStatuses') || '{}');
      claimStatuses[claim._id] = {
        status: actionForm.actionType,
        actionDate: new Date().toISOString(),
        priority: actionForm.priority,
        compensationAmount: actionForm.compensationAmount,
        description: actionForm.description,
        financialRecommendation: actionForm.financialRecommendation,
        notes: actionForm.notes
      };
      localStorage.setItem('claimStatuses', JSON.stringify(claimStatuses));
      
      navigate('/victim/claim/records');
    } finally {
      setLoading(false);
    }
  };

  // Inline styles
  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '24px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'white',
      padding: '24px 32px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      marginBottom: '32px',
      border: '1px solid #e2e8f0'
    },
    headerTitle: {
      margin: 0,
      color: '#1e293b',
      fontSize: '2rem',
      fontWeight: 700,
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    btn: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '14px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      textDecoration: 'none',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      position: 'relative',
      overflow: 'hidden'
    },
    btnBack: {
      background: 'linear-gradient(135deg, #64748b, #475569)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(100,116,139,0.3)'
    },
    content: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '24px',
      maxWidth: '1200px',
      margin: '0 auto'
    },
    claimDetailsSection: {
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      padding: '24px',
      borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(59, 130, 246, 0.1)',
      border: '1px solid #e2e8f0',
      marginBottom: '24px',
      position: 'relative',
      overflow: 'hidden'
    },
    claimDetailsBorder: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)'
    },
    claimDetailsTitle: {
      color: '#1e293b',
      marginBottom: '20px',
      fontSize: '1.4rem',
      fontWeight: 700,
      textAlign: 'center',
      position: 'relative',
      paddingBottom: 0
    },
    claimInfo: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
      marginTop: '8px'
    },
    infoItem: {
      background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
      padding: '20px',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
      border: '1px solid #f1f5f9',
      position: 'relative',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      overflow: 'hidden'
    },
    infoItemBorder: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '4px',
      height: '100%',
      background: 'linear-gradient(180deg, #3b82f6, #1d4ed8)',
      transition: 'width 0.3s ease'
    },
    infoLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: 700,
      color: '#64748b',
      fontSize: '12px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      marginBottom: '8px'
    },
    infoValue: {
      display: 'block',
      color: '#1e293b',
      fontWeight: 600,
      fontSize: '16px',
      lineHeight: 1.4,
      wordBreak: 'break-word'
    },
    formActionsContainer: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '32px',
      marginTop: '24px'
    },
    formSection: {
      background: 'white',
      padding: '24px 28px',
      borderRadius: '16px',
      boxShadow: '0 6px 25px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0',
      height: 'fit-content'
    },
    formTitle: {
      color: '#1e293b',
      marginBottom: '20px',
      fontSize: '1.3rem',
      fontWeight: 600,
      position: 'relative',
      paddingBottom: '10px'
    },
    formTitleBorder: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      width: '50px',
      height: '3px',
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      borderRadius: '2px'
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    },
    formGroup: {
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    },
    formLabel: {
      fontWeight: 600,
      color: '#374151',
      marginBottom: '6px',
      fontSize: '13px',
      textTransform: 'uppercase',
      letterSpacing: '0.3px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    formLabelBar: {
      width: '3px',
      height: '14px',
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      borderRadius: '2px'
    },
    formInput: {
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '10px',
      fontSize: '14px',
      fontFamily: 'inherit',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      background: '#fafbfc',
      color: '#1f2937'
    },
    actionsSection: {
      background: 'white',
      padding: '28px',
      borderRadius: '16px',
      boxShadow: '0 6px 25px rgba(0,0,0,0.06)',
      border: '1px solid #e2e8f0',
      height: 'fit-content',
      position: 'sticky',
      top: '24px'
    },
    actionsTitle: {
      color: '#1e293b',
      marginBottom: '20px',
      fontSize: '1.3rem',
      fontWeight: 600,
      position: 'relative',
      paddingBottom: '10px',
      textAlign: 'center'
    },
    actionsTitleBorder: {
      position: 'absolute',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '50px',
      height: '3px',
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      borderRadius: '2px'
    },
    actionButtons: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '16px'
    },
    btnReport: {
      background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
      border: '2px solid transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '16px 24px',
      fontSize: '15px',
      fontWeight: 600,
      textAlign: 'center',
      minHeight: '56px'
    },
    btnFinancial: {
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: 'white',
      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
      border: '2px solid transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px',
      padding: '16px 24px',
      fontSize: '15px',
      fontWeight: 600,
      textAlign: 'center',
      minHeight: '56px'
    },
    btnSubmit: {
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8, #1e40af)',
      color: 'white',
      width: '100%',
      marginTop: '12px',
      fontSize: '16px',
      fontWeight: 700,
      padding: '16px 24px',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      boxShadow: '0 8px 20px rgba(59, 130, 246, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.2)',
      border: 'none',
      borderRadius: '30px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'serif',
      textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
      cursor: 'pointer',
      transition: 'all 0.4s ease'
    },
    loading: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      textAlign: 'center',
      border: '1px solid #e2e8f0',
      color: '#64748b',
      fontSize: '1.2rem',
      fontWeight: 500
    },
    error: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      textAlign: 'center',
      border: '1px solid #e2e8f0'
    },
    errorTitle: {
      color: '#dc2626',
      marginBottom: '16px',
      fontSize: '1.5rem',
      fontWeight: 700
    },
    errorText: {
      color: '#64748b',
      marginBottom: '24px',
      fontSize: '1.1rem'
    },
    errorButton: {
      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      color: 'white',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '14px',
      transition: 'all 0.3s ease'
    },
    // Financial Form Modal Styles
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    },
    modalContent: {
      background: 'white',
      borderRadius: '20px',
      padding: '32px',
      maxWidth: '800px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      border: '1px solid #e2e8f0'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #e2e8f0'
    },
    modalTitle: {
      fontSize: '1.5rem',
      fontWeight: 700,
      color: '#1e293b',
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: '#64748b',
      padding: '8px',
      borderRadius: '8px',
      transition: 'all 0.3s ease'
    },
    modalBody: {
      marginBottom: '24px'
    },
    modalLabel: {
      display: 'block',
      fontWeight: 600,
      color: '#374151',
      marginBottom: '8px',
      fontSize: '14px'
    },
    modalTextarea: {
      width: '100%',
      minHeight: '400px',
      padding: '16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '14px',
      fontFamily: 'inherit',
      lineHeight: 1.6,
      resize: 'vertical',
      transition: 'all 0.3s ease',
      background: '#fafbfc'
    },
    modalFooter: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end'
    },
    btnCancel: {
      background: 'linear-gradient(135deg, #64748b, #475569)',
      color: 'white',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '14px',
      transition: 'all 0.3s ease'
    },
    btnSend: {
      background: 'linear-gradient(135deg, #059669, #047857)',
      color: 'white',
      padding: '12px 24px',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '14px',
      transition: 'all 0.3s ease'
    }
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Loading claim data...</div>
      </div>
    );
  }

  if (!claim) {
    return (
      <div style={styles.page}>
        <div style={styles.error}>
          <h2 style={styles.errorTitle}>Claim Not Found</h2>
          <p style={styles.errorText}>Unable to load claim data. Please try again.</p>
          <button style={styles.errorButton} onClick={() => navigate('/victim/claim/records')}>
            Back to Claims
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Admin Header */}
      <AdminNav />
      
      <div style={styles.page}>
        <header style={styles.header}>
          <h1 style={styles.headerTitle}>Take Action on Claim</h1>
          <button 
            style={{...styles.btn, ...styles.btnBack}}
            onClick={() => navigate('/victim/claim/records')}
          >
            ← Back to Claims
          </button>
        </header>

      <div style={styles.content}>
        {/* Claim Details Section */}
        <section style={styles.claimDetailsSection}>
          <div style={styles.claimDetailsBorder}></div>
          <h2 style={styles.claimDetailsTitle}>Claim Details</h2>
          <div style={styles.claimInfo}>
            <div style={styles.infoItem}>
              <div style={styles.infoItemBorder}></div>
              <div style={styles.infoLabel}>
                <div style={{width: '8px', height: '8px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '50%', flexShrink: 0}}></div>
                Claimant
              </div>
              <span style={styles.infoValue}>{claim.name}</span>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoItemBorder}></div>
              <div style={styles.infoLabel}>
                <div style={{width: '8px', height: '8px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '50%', flexShrink: 0}}></div>
                Email
              </div>
              <span style={styles.infoValue}>{claim.email}</span>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoItemBorder}></div>
              <div style={styles.infoLabel}>
                <div style={{width: '8px', height: '8px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', borderRadius: '50%', flexShrink: 0}}></div>
                Phone
              </div>
              <span style={styles.infoValue}>{claim.phone}</span>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoItemBorder}></div>
              <div style={styles.infoLabel}>
                <div style={{width: '8px', height: '8px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', borderRadius: '50%', flexShrink: 0}}></div>
                Damage Type
              </div>
              <span style={styles.infoValue}>{claim.damageType}</span>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoItemBorder}></div>
              <div style={styles.infoLabel}>
                <div style={{width: '8px', height: '8px', background: 'linear-gradient(135deg, #06b6d4, #0891b2)', borderRadius: '50%', flexShrink: 0}}></div>
                Estimated Loss
              </div>
              <span style={styles.infoValue}>{claim.estimatedLoss}</span>
            </div>
            <div style={styles.infoItem}>
              <div style={styles.infoItemBorder}></div>
              <div style={styles.infoLabel}>
                <div style={{width: '8px', height: '8px', background: 'linear-gradient(135deg, #84cc16, #65a30d)', borderRadius: '50%', flexShrink: 0}}></div>
                Submitted
              </div>
              <span style={styles.infoValue}>
                {new Date(claim.reportedAt || claim.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </section>

        {/* Form and Actions Container */}
        <div style={styles.formActionsContainer}>
          {/* Action Form Section */}
          <section style={styles.formSection}>
            <div style={{position: 'relative'}}>
              <h2 style={styles.formTitle}>Action Details</h2>
              <div style={styles.formTitleBorder}></div>
            </div>
            <form style={styles.form} onSubmit={(e) => { e.preventDefault(); completeAction(); }}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <div style={styles.formLabelBar}></div>
                  Action Type *
                </label>
                <select
                  style={styles.formInput}
                  value={actionForm.actionType}
                  onChange={(e) => setActionForm({...actionForm, actionType: e.target.value})}
                  required
                >
                  <option value="">Select action type...</option>
                  <option value="Approved">Approve Claim</option>
                  <option value="Rejected">Reject Claim</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Requires Documentation">Requires Additional Documentation</option>
                  <option value="Assessment Scheduled">Assessment Scheduled</option>
                  <option value="Compensation Approved">Compensation Approved</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <div style={styles.formLabelBar}></div>
                  Priority Level
                </label>
                <select
                  style={styles.formInput}
                  value={actionForm.priority}
                  onChange={(e) => setActionForm({...actionForm, priority: e.target.value})}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <div style={styles.formLabelBar}></div>
                  Compensation Amount
                </label>
                <input
                  style={styles.formInput}
                  type="text"
                  value={actionForm.compensationAmount}
                  onChange={(e) => setActionForm({...actionForm, compensationAmount: e.target.value})}
                  placeholder="Enter approved compensation amount"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <div style={styles.formLabelBar}></div>
                  Action Description *
                </label>
                <textarea
                  style={{...styles.formInput, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', lineHeight: 1.5}}
                  value={actionForm.description}
                  onChange={(e) => setActionForm({...actionForm, description: e.target.value})}
                  placeholder="Describe the action taken and rationale..."
                  rows={4}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <div style={styles.formLabelBar}></div>
                  Financial Recommendation
                </label>
                <textarea
                  style={{...styles.formInput, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', lineHeight: 1.5}}
                  value={actionForm.financialRecommendation}
                  onChange={(e) => setActionForm({...actionForm, financialRecommendation: e.target.value})}
                  placeholder="Provide recommendations for financial processing..."
                  rows={3}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  <div style={styles.formLabelBar}></div>
                  Internal Notes
                </label>
                <textarea
                  style={{...styles.formInput, resize: 'vertical', minHeight: '80px', fontFamily: 'inherit', lineHeight: 1.5}}
                  value={actionForm.notes}
                  onChange={(e) => setActionForm({...actionForm, notes: e.target.value})}
                  placeholder="Add any internal notes..."
                  rows={3}
                />
              </div>

              <div style={styles.formGroup}>
                <button 
                  type="submit"
                  style={styles.btnSubmit}
                >
                  Submit Action
                </button>
              </div>
            </form>
          </section>
          
          {/* Actions Section */}
          <section style={styles.actionsSection}>
            <div style={{position: 'relative'}}>
              <h2 style={styles.actionsTitle}>Available Actions</h2>
              <div style={styles.actionsTitleBorder}></div>
            </div>
            <div style={styles.actionButtons}>
              <button 
                style={{...styles.btn, ...styles.btnReport}}
                onClick={generateReport}
              >
                📄 Generate PDF Report
              </button>
              
              <button 
                style={{...styles.btn, ...styles.btnFinancial}}
                onClick={sendToFinancialUnit}
              >
                💰 Send to Financial Unit
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>

    {/* Financial Form Modal */}
    {showFinancialForm && (
      <div style={styles.modal} onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowFinancialForm(false);
          setFinancialMessage('');
        }
      }}>
        <div style={styles.modalContent}>
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Send to Financial Unit</h2>
            <button 
              style={styles.closeButton}
              onClick={() => {
                setShowFinancialForm(false);
                setFinancialMessage('');
              }}
              onMouseEnter={(e) => e.target.style.background = '#f1f5f9'}
              onMouseLeave={(e) => e.target.style.background = 'none'}
            >
              ×
            </button>
          </div>
          
          <div style={styles.modalBody}>
            <label style={styles.modalLabel}>
              Compose Message to Financial Unit:
            </label>
            <textarea
              style={styles.modalTextarea}
              value={financialMessage}
              onChange={(e) => setFinancialMessage(e.target.value)}
              placeholder="Enter your message to the financial unit..."
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          
          <div style={styles.modalFooter}>
            <button 
              style={styles.btnCancel}
              onClick={() => {
                setShowFinancialForm(false);
                setFinancialMessage('');
              }}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              Cancel
            </button>
            <button 
              style={styles.btnSend}
              onClick={handleFinancialSubmit}
              onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
            >
              📧 Send Email
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}