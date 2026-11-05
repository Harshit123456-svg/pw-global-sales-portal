export const GOOGLE_APPS_SCRIPT_TEMPLATE = `
/**
 * ==============================================================================
 * PHYSICSWALLAH GLOBAL - ADMISSIONS & SALES GOOGLE SHEET INTEGRATION (IST + AUDIT)
 * ==============================================================================
 * 
 * INSTRUCTIONS TO DEPLOY:
 * 1. Open Google Sheets (https://sheets.new) in your Google account.
 * 2. Name your sheet: "PW Global - Admissions Master Sheet".
 * 3. Click "Extensions" > "Apps Script".
 * 4. Select all existing text in the editor, delete it, and paste this entire code.
 * 5. Click "Deploy" (blue button at top right) > "New deployment".
 * 6. Click the gear icon (⚙️) next to "Select type", and choose "Web app".
 * 7. Configure EXACTLY as follows:
 *    - Description: "PW Global Sales Webhook"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (⚠️ CRITICAL: Must be "Anyone", NOT "Only myself" or restricted to domain to prevent HTTP 401)
 * 8. Click "Deploy" > Click "Authorize access" > Choose your Google account > 
 *    Click "Advanced" > Click "Go to PW Global Sales Webhook (unsafe)" > Click "Allow".
 * 9. Copy the "Web app URL" (⚠️ Must end with "/exec", do NOT copy the "/dev" test URL).
 * 10. Paste into PW Global Portal Settings and click "Test & Save Connection"!
 * 
 * FEATURES:
 * - Timestamps are automatically converted & saved in Indian Standard Time (IST - UTC+05:30).
 * - Automatic Sorting: The newest admissions are always kept at the top of the sheet (Row 2)!
 * - Authenticity Audit: Highlights whether the parent genuinely signed from their own mobile device
 *   or if it was submitted from the counsellor's machine.
 */

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: "ok",
    result: "success",
    message: "PhysicsWallah Global Admissions Webhook is ONLINE, HEALTHY & ACCESSIBLE!",
    timestampIST: Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a 'IST'")
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = {};
    
    if (e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    } else if (e.parameter) {
      data = e.parameter;
    }
    
    // Auto-create header row if sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Booking ID", 
        "Sale Date (IST)", 
        "Academic Year", 
        "Sales Representative", 
        "Source of Lead (Internal)",
        "Authenticity Audit (Who Filled)", 
        "Parent Device & IP Audit",
        "Student Name", 
        "Father Name", 
        "Grade", 
        "Student Email (Access Locked)", 
        "Parent Email",
        "Parent Phone", 
        "Origin Country", 
        "Country of Residence", 
        "City",
        "Program Selection", 
        "Group Hours", 
        "Course Start Date", 
        "Course End Date",
        "Product Enrolled (Batch)", 
        "Course Price", 
        "Sold Price", 
        "Discount", 
        "Discount %",
        "Full Paid?", 
        "Amount Paid", 
        "Due Amount", 
        "Due Date",
        "Terms Accepted?", 
        "Parent Legal Signature", 
        "Signed At (IST)",
        "Current School", 
        "Mock Score", 
        "Target Score", 
        "Target Month", 
        "Target School",
        "Admission Status", 
        "Timestamp (IST)"
      ]);
      
      // Professional styling for header
      var headerRange = sheet.getRange(1, 1, 1, 39);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#0f172a");
      headerRange.setFontColor("#ffffff");
      sheet.setFrozenRows(1);
    }
    
    // Format IST Timestamp
    var istTimestamp = data.submissionTimestampIST || Utilities.formatDate(new Date(), "Asia/Kolkata", "dd/MM/yyyy, hh:mm:ss a 'IST'");

    // Determine row insertion (Insert after header so newest bookings are at the very top!)
    var newRow = [
      data.id || "",
      data.saleDate || "",
      data.academicYear || "",
      data.salesRepresentative || "",
      data.sourceOfLead || "",
      data.authenticityBadge || (data.status === "completed" ? "Verified" : "Pending Signature"),
      data.deviceAuditInfo || "",
      data.studentName || "",
      data.fatherName || "",
      data.grade || "",
      data.studentEmail || "",
      data.parentEmail || "",
      data.parentPhone || "",
      data.originCountry || "",
      data.countryOfResidence || "",
      data.city || "",
      data.programSelection || "",
      data.groupHours || "",
      data.courseStartDate || "",
      data.courseEndDate || "",
      data.productEnrolled || "",
      data.coursePrice || 0,
      data.soldPrice || 0,
      data.discount || 0,
      (data.discountPercent || 0) + "%",
      data.fullAmountPaid || "",
      data.amountPaid || 0,
      data.dueAmount || 0,
      data.dueDate || "",
      data.termsAccepted ? "YES" : "NO",
      data.parentLegalSignature || "",
      data.signedAtIST || "",
      data.currentSchool || "",
      data.mockTestScore || "",
      data.targetScore || "",
      data.targetExamMonth || "",
      data.targetSchool || "",
      data.status === "completed" ? "CONFIRMED" : "PENDING_PARENT_SIGNATURE",
      istTimestamp
    ];

    // Insert row right below header (Row 2) so latest entries are always on top!
    sheet.insertRowAfter(1);
    sheet.getRange(2, 1, 1, newRow.length).setValues([newRow]);

    // Color code authenticity
    var auditCell = sheet.getRange(2, 6);
    if ((data.authenticityBadge || "").indexOf("Genuine") !== -1) {
      auditCell.setBackground("#dcfce7").setFontColor("#166534").setFontWeight("bold");
    } else if ((data.authenticityBadge || "").indexOf("Same IP") !== -1) {
      auditCell.setBackground("#fee2e2").setFontColor("#991b1b").setFontWeight("bold");
    }

    return ContentService.createTextOutput(JSON.stringify({ result: "success", id: data.id, sorted: "newest_on_top" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
`.trim();
