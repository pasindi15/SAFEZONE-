import React, { useEffect, useState } from "react";
import jsPDF from 'jspdf';

const ContactList = () => {
  const [contacts, setContacts] = useState([]);
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageType, setMessageType] = useState(''); // 'whatsapp' or 'gmail'
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/contact");
        const data = await res.json();
        setContacts(data.data || []);
      } catch (error) {
        console.error("Error fetching contacts:", error);
      }
    };
    fetchContacts();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      try {
        await fetch(`http://localhost:5000/api/contact/${id}`, {
          method: 'DELETE'
        });
        setContacts(contacts.filter(contact => contact._id !== id));
      } catch (error) {
        console.error("Error deleting contact:", error);
      }
    }
  };

  const generatePDF = async (contact) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 6;
    let y = margin;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SafeZone DMS', pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Contact Information Report', pageWidth / 2, y, { align: 'center' });
    
    y += 15;
    pdf.line(margin, y, pageWidth - margin, y); // Horizontal line
    y += 15;

    // Contact Details
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Contact Details', margin, y);
    y += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    // Contact info table
    const details = [
      ['Name:', contact.name || 'Not provided'],
      ['Email:', contact.email],
      ['Phone:', contact.phone],
      ['Submitted Date:', new Date(contact.createdAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })],
      ['Submitted Time:', new Date(contact.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })],
      ['Contact ID:', contact._id]
    ];

    details.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(label, margin, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(value, margin + 35, y);
      y += lineHeight;
    });

    y += 10;

    // Problem Section
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Problem Description', margin, y);
    y += 10;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    
    // Split problem text into lines
    const problemText = `"${contact.problem}"`;
    const splitText = pdf.splitTextToSize(problemText, pageWidth - 2 * margin);
    
    splitText.forEach((line) => {
      if (y > pageHeight - 30) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += lineHeight;
    });

    y += 15;

    // Footer
    if (y > pageHeight - 40) {
      pdf.addPage();
      y = margin;
    }

    pdf.line(margin, y, pageWidth - margin, y);
    y += 10;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.text(`Generated on ${currentDate} by SafeZone DMS`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    pdf.text('support@safezone.com | +1-800-SAFEZONE', pageWidth / 2, y, { align: 'center' });

    // Auto download PDF
    const fileName = `contact_${contact.name ? contact.name.replace(/\s+/g, '_') : 'anonymous'}_${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  };

  const handleDownload = (contact) => {
    generatePDF(contact);
  };

  const generateAllContactsPDF = async () => {
    if (contacts.length === 0) return;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const lineHeight = 6;
    let y = margin;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SafeZone DMS', pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('All Contacts Report', pageWidth / 2, y, { align: 'center' });
    
    y += 8;
    pdf.setFontSize(10);
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    pdf.text(`Total Contacts: ${contacts.length} | Generated: ${currentDate}`, pageWidth / 2, y, { align: 'center' });
    
    y += 10;
    pdf.line(margin, y, pageWidth - margin, y);
    y += 15;

    // Contacts
    contacts.forEach((contact, index) => {
      // Check if we need a new page
      if (y > pageHeight - 60) {
        pdf.addPage();
        y = margin;
      }

      // Contact header
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${index + 1}. ${contact.name || `Contact #${index + 1}`}`, margin, y);
      
      y += 8;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Submitted: ${new Date(contact.createdAt).toLocaleDateString()}`, pageWidth - margin - 50, y - 8);

      // Contact details
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      pdf.text(`Email: ${contact.email}`, margin + 5, y);
      y += lineHeight;
      pdf.text(`Phone: ${contact.phone}`, margin + 5, y);
      y += lineHeight + 2;

      // Problem
      pdf.setFont('helvetica', 'bold');
      pdf.text('Problem:', margin + 5, y);
      y += lineHeight;
      
      pdf.setFont('helvetica', 'italic');
      const problemText = `"${contact.problem}"`;
      const splitText = pdf.splitTextToSize(problemText, pageWidth - 2 * margin - 10);
      
      splitText.forEach((line) => {
        if (y > pageHeight - 30) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin + 5, y);
        y += lineHeight;
      });

      y += 10;
      
      // Separator line
      if (index < contacts.length - 1) {
        pdf.line(margin, y, pageWidth - margin, y);
        y += 10;
      }
    });

    // Footer
    if (y > pageHeight - 30) {
      pdf.addPage();
      y = margin;
    }

    pdf.line(margin, y + 5, pageWidth - margin, y + 5);
    y += 15;

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.text(`Generated by SafeZone DMS on ${currentDate}`, pageWidth / 2, y, { align: 'center' });
    y += 5;
    pdf.text('support@safezone.com | +1-800-SAFEZONE', pageWidth / 2, y, { align: 'center' });

    // Auto download PDF
    const fileName = `all_contacts_${new Date().getTime()}.pdf`;
    pdf.save(fileName);
  };

  const handleDownloadAll = () => {
    generateAllContactsPDF();
  };

  const handleWhatsApp = (contact) => {
    setSelectedContact(contact);
    setMessageType('whatsapp');
    // Pre-fill message with their problem details
    const template = `Hello ${contact.name},

Thank you for contacting us regarding your issue. We have received your submission:

"${contact.problem}"

We will get back to you soon with a solution. 

Best regards,
SafeZone Support Team`;
    setMessage(template);
    setShowMessageForm(true);
  };

  const handleGmail = (contact) => {
    setSelectedContact(contact);
    setMessageType('gmail');
    // Pre-fill subject and message with their problem details
    setSubject(`Response to your inquiry - ${contact.name}`);
    const template = `Dear ${contact.name},

Thank you for contacting SafeZone regarding your concern. We have received your submission on ${new Date(contact.createdAt).toLocaleDateString()}.

Your Problem/Issue:
"${contact.problem}"

We are reviewing your case and will provide you with a detailed response shortly. Our team is committed to resolving your issue as quickly as possible.

If you have any additional information or questions, please feel free to reply to this email.

Best regards,
SafeZone Support Team

Contact Information:
Phone: ${contact.phone}
Email: ${contact.email}
Submission Date: ${new Date(contact.createdAt).toLocaleString()}`;
    setMessage(template);
    setShowMessageForm(true);
  };

  const sendWhatsAppMessage = () => {
    if (selectedContact && message.trim()) {
      const encodedMessage = encodeURIComponent(message);
      const phoneNumber = selectedContact.phone.replace(/\D/g, '');
      window.open(`https://wa.me/${phoneNumber}?text=${encodedMessage}`, '_blank');
      setShowMessageForm(false);
      setMessage('');
    }
  };

  const sendGmailMessage = () => {
    if (selectedContact && message.trim()) {
      const encodedSubject = encodeURIComponent(subject);
      const encodedBody = encodeURIComponent(message);
      // Open Gmail compose in browser instead of default email client
      window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${selectedContact.email}&su=${encodedSubject}&body=${encodedBody}`, '_blank');
      setShowMessageForm(false);
      setMessage('');
      setSubject('');
    }
  };

  const closeMessageForm = () => {
    setShowMessageForm(false);
    setSelectedContact(null);
    setMessageType('');
    setMessage('');
    setSubject('');
  };

  const handleCall = (phone) => {
    window.open(`tel:${phone}`, '_blank');
  };

  const handlePrint = (contact) => {
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const referenceNumber = `SZ-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Official Contact Report - ${contact.name}</title>
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
          
          .problem-box {
            border: 2px solid #000;
            padding: 20px;
            margin: 25px 0;
            background-color: #fafafa;
          }
          
          .problem-text {
            font-style: italic;
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
          <div class="org-subtitle">Emergency Response & Contact Management Division</div>
          <div class="org-address">
            123 Emergency Response Boulevard, Crisis Management District<br>
            National Disaster Coordination Center, Emergency City, EC 12345<br>
            Tel: +1-800-SAFEZONE | Email: official@safezone.gov | Web: www.safezone.gov
          </div>
        </div>
        
        <div class="document-header">
          <div class="doc-title">Official Contact Information Report</div>
        </div>
        
        <div class="ref-info">
          <div>
            <span class="ref-number">Reference No: ${referenceNumber}</span><br>
            Contact ID: ${contact._id}
          </div>
          <div>
            <strong>Date Issued: ${currentDate}</strong><br>
            Classification: Official Use
          </div>
        </div>
        
        <div class="main-content">
          <div class="section-title">Contact Person Details</div>
          
          <table class="info-table">
            <tr>
              <th>Full Name</th>
              <td>${contact.name || 'Not Provided'}</td>
            </tr>
            <tr>
              <th>Email Address</th>
              <td>${contact.email}</td>
            </tr>
            <tr>
              <th>Phone Number</th>
              <td>${contact.phone}</td>
            </tr>
            <tr>
              <th>Submission Date</th>
              <td>${new Date(contact.createdAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</td>
            </tr>
            <tr>
              <th>Submission Time</th>
              <td>${new Date(contact.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                timeZoneName: 'short'
              })}</td>
            </tr>
            <tr>
              <th>Current Status</th>
              <td><strong>Under Review</strong></td>
            </tr>
          </table>
          
          <div class="section-title">Problem Description / Inquiry Details</div>
          
          <div class="problem-box">
            <div class="problem-text">
              "${contact.problem}"
            </div>
          </div>
          
          <div class="certification">
            <div class="cert-text">
              <strong>CERTIFICATION:</strong> This document certifies that the above information has been officially recorded in the SafeZone Disaster Management System database. This contact submission has been received and is currently under review by the appropriate department. All information contained herein is accurate as of the date of issuance and is subject to verification procedures as per SafeZone protocols.
            </div>
          </div>
        </div>
        
        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-text">System Administrator</div>
            <div class="designation">SafeZone Contact Management</div>
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
    `);
    
    printWindow.document.close();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
  };

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '900px',
    width: '100%',
    margin: '40px auto',
    padding: '30px',
    borderRadius: '20px',
    backgroundColor: '#ffffff',
    color: '#333',
    border: '1px solid #e0e0e0',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    boxSizing: 'border-box'
  };

  const titleStyle = {
    fontSize: '28px',
    fontWeight: '700',
    color: '#00bfff',
    marginBottom: '20px',
    textAlign: 'center',
    position: 'relative'
  };

  const titleAfterStyle = {
    content: '""',
    display: 'block',
    width: '70px',
    height: '3px',
    background: '#00bfff',
    margin: '8px auto 0',
    borderRadius: '5px'
  };

  const downloadAllBtnStyle = {
    backgroundColor: '#00bfff',
    color: '#fff',
    padding: '12px 18px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '25px',
    transition: 'background 0.3s ease'
  };

  const contactListStyle = {
    listStyle: 'none',
    width: '100%',
    padding: '0',
    margin: '0',
    display: 'grid',
    gap: '20px'
  };

  const contactItemStyle = {
    background: '#ffffff',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid rgba(200, 200, 200, 0.5)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '20px',
    width: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden'
  };

  const contactDetailsStyle = {
    flex: '1',
    minWidth: '0',
    maxWidth: 'calc(100% - 140px)',
    overflowWrap: 'break-word'
  };

  const contactPStyle = {
    margin: '6px 0',
    fontSize: '15px'
  };

  const contactSmallStyle = {
    display: 'block',
    marginTop: '8px',
    fontSize: '13px',
    color: 'rgba(0, 0, 0, 0.6)'
  };

  const actionsStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: '0',
    minWidth: '120px',
    maxWidth: '120px',
    width: '120px'
  };

  const buttonBaseStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: 'none',
    textDecoration: 'none',
    textAlign: 'center',
    display: 'block',
    margin: '0'
  };

  const downloadBtnStyle = {
    ...buttonBaseStyle,
    backgroundColor: 'transparent',
    border: '1px solid #00bfff',
    color: '#00bfff'
  };

  const whatsappBtnStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#25D366',
    color: '#fff'
  };

  const gmailBtnStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#ea4335',
    color: '#fff'
  };

  const callBtnStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#28a745',
    color: '#fff'
  };

  const deleteBtnStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#dc3545',
    color: '#fff'
  };

  const printBtnStyle = {
    ...buttonBaseStyle,
    backgroundColor: '#6c757d',
    color: '#fff'
  };

  // Message Form Styles
  const modalOverlayStyle = {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '1000'
  };

  const modalStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '15px',
    padding: '30px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
    position: 'relative'
  };

  const modalHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    paddingBottom: '15px',
    borderBottom: '2px solid #f0f0f0'
  };

  const modalTitleStyle = {
    fontSize: '20px',
    fontWeight: '600',
    color: '#333',
    margin: '0'
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#999',
    padding: '0',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const formGroupStyle = {
    marginBottom: '20px'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#555'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'border-color 0.3s ease'
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '200px',
    resize: 'vertical',
    fontFamily: 'inherit'
  };

  const contactInfoStyle = {
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  };

  const modalButtonsStyle = {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '25px'
  };

  const sendButtonStyle = {
    backgroundColor: messageType === 'whatsapp' ? '#25D366' : '#ea4335',
    color: '#fff',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  };

  const cancelButtonStyle = {
    backgroundColor: '#6c757d',
    color: '#fff',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease'
  };

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>
        Contact Reports
        <div style={titleAfterStyle}></div>
      </h2>
      
      {contacts.length > 0 && (
        <button 
          style={downloadAllBtnStyle}
          onClick={handleDownloadAll}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#00bfff96'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#00bfff'}
        >
          Download All Contacts
        </button>
      )}

      {contacts.length === 0 ? (
        <div style={{textAlign: 'center', padding: '60px 30px', color: '#6b7280'}}>
          <div style={{fontSize: '64px', marginBottom: '20px', opacity: '0.5'}}>📭</div>
          <p>No contact submissions yet</p>
        </div>
      ) : (
        <ul style={contactListStyle}>
          {contacts.map((contact) => (
            <li 
              key={contact._id} 
              style={contactItemStyle}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 6px 15px rgba(0, 191, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={contactDetailsStyle}>
                <p style={contactPStyle}><strong>Name:</strong> {contact.name}</p>
                <p style={contactPStyle}><strong>Email:</strong> {contact.email}</p>
                <p style={contactPStyle}><strong>Phone:</strong> {contact.phone}</p>
                <p style={contactPStyle}><strong>Problem:</strong> {contact.problem}</p>
                <small style={contactSmallStyle}>
                  Submitted: {new Date(contact.createdAt).toLocaleString()}
                </small>
              </div>
              
              <div style={actionsStyle}>
                <button 
                  style={downloadBtnStyle}
                  onClick={() => handleDownload(contact)}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#00bfff';
                    e.target.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = '#00bfff';
                  }}
                >
                  Download
                </button>
                
                <button 
                  style={whatsappBtnStyle}
                  onClick={() => handleWhatsApp(contact)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#1ebd5a'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#25D366'}
                >
                  WhatsApp
                </button>
                
                <button 
                  style={gmailBtnStyle}
                  onClick={() => handleGmail(contact)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#d33b2c'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#ea4335'}
                >
                  Gmail
                </button>
                
                <button 
                  style={callBtnStyle}
                  onClick={() => handleCall(contact.phone)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#218838'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
                >
                  Call
                </button>
                
                <button 
                  style={printBtnStyle}
                  onClick={() => handlePrint(contact)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
                >
                  Print
                </button>
                
                <button 
                  style={deleteBtnStyle}
                  onClick={() => handleDelete(contact._id)}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#c82333'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#dc3545'}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Message Form Modal */}
      {showMessageForm && selectedContact && (
        <div style={modalOverlayStyle} onClick={closeMessageForm}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeaderStyle}>
              <h3 style={modalTitleStyle}>
                Send {messageType === 'whatsapp' ? 'WhatsApp' : 'Email'} Message
              </h3>
              <button style={closeButtonStyle} onClick={closeMessageForm}>
                ×
              </button>
            </div>

            <div style={contactInfoStyle}>
              <strong>To: {selectedContact.name}</strong><br />
              {messageType === 'whatsapp' ? (
                <span>📱 {selectedContact.phone}</span>
              ) : (
                <span>📧 {selectedContact.email}</span>
              )}
              <br />
              <small style={{color: '#666', fontSize: '12px'}}>
                Submitted: {new Date(selectedContact.createdAt).toLocaleString()}
              </small>
            </div>

            {/* Display original problem */}
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffeaa7',
              borderRadius: '8px',
              padding: '15px',
              marginBottom: '20px'
            }}>
              <label style={{...labelStyle, color: '#856404', marginBottom: '8px'}}>
                📝  Problem Submitted:
              </label>
              <div style={{
                fontSize: '14px',
                color: '#856404',
                lineHeight: '1.5',
                fontStyle: 'italic',
                background: '#ffffff',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #ffeaa7'
              }}>
                "{selectedContact.problem}"
              </div>
            </div>

            {messageType === 'gmail' && (
              <div style={formGroupStyle}>
                <label style={labelStyle}>Subject:</label>
                <input
                  type="text"
                  style={inputStyle}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  onFocus={(e) => e.target.style.borderColor = '#00bfff'}
                  onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
                />
              </div>
            )}

            <div style={formGroupStyle}>
              <label style={labelStyle}>Message:</label>
              <textarea
                style={textareaStyle}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Type your ${messageType === 'whatsapp' ? 'WhatsApp' : 'email'} message here...`}
                onFocus={(e) => e.target.style.borderColor = '#00bfff'}
                onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
              />
            </div>

            <div style={modalButtonsStyle}>
              <button 
                style={cancelButtonStyle}
                onClick={closeMessageForm}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
              >
                Cancel
              </button>
              <button 
                style={sendButtonStyle}
                onClick={messageType === 'whatsapp' ? sendWhatsAppMessage : sendGmailMessage}
                disabled={!message.trim() || (messageType === 'gmail' && !subject.trim())}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = messageType === 'whatsapp' ? '#1ebd5a' : '#d33b2c';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = messageType === 'whatsapp' ? '#25D366' : '#ea4335';
                  }
                }}
              >
                Send {messageType === 'whatsapp' ? 'WhatsApp' : 'Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactList;
