// TODO: improve the pdf ui later
import * as Print from "expo-print";
import { Appointment } from "../services/appointments";

const PRIMARY = "#B8F05A";
const PRIMARY_DARK = "#8BC34A";

export async function generateBillPdf(appointment: Appointment) {
  const html = `
    <html>
      <head>
        <style>
          body {
            font-family: 'Helvetica', sans-serif;
            padding: 40px;
            color: #1a1a1a;
            margin: 0;
          }
          .header {
            background-color: ${PRIMARY};
            padding: 24px 30px;
            margin: -40px -40px 30px -40px;
          }
          .header h1 {
            font-size: 22px;
            margin: 0 0 4px 0;
            color: #000;
            letter-spacing: 1px;
          }
          .header p {
            font-size: 12px;
            color: #333;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
          }
          .section-header td {
            background-color: ${PRIMARY};
            color: #000;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            padding: 10px 14px;
            border: 1px solid ${PRIMARY_DARK};
          }
          th {
            background-color: #f8f8f8;
            font-size: 12px;
            font-weight: 600;
            padding: 10px 14px;
            border: 1px solid #e0e0e0;
            text-align: left;
            width: 35%;
            color: #444;
          }
          td {
            font-size: 12px;
            padding: 10px 14px;
            border: 1px solid #e0e0e0;
            text-align: left;
            color: #1a1a1a;
          }
          .total-row td {
            font-weight: 700;
            background-color: #f0ffd6;
            border-color: ${PRIMARY_DARK};
          }
          .footer {
            margin-top: 30px;
            padding-top: 16px;
            border-top: 2px solid ${PRIMARY};
            font-size: 10px;
            color: #888;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PAYMENT RECEIPT</h1>
          <p>Appointment ID: ${appointment.id}</p>
        </div>

        <table>
          <tr class="section-header">
            <td colspan="2">DOCTOR INFORMATION</td>
          </tr>
          <tr>
            <th>Name</th>
            <td>Dr. ${appointment.doctor?.firstName || ""} ${appointment.doctor?.lastName || ""}</td>
          </tr>
          <tr>
            <th>Specialization</th>
            <td>${appointment.doctor?.specialization || "-"}</td>
          </tr>
        </table>

        <table>
          <tr class="section-header">
            <td colspan="2">APPOINTMENT DETAILS</td>
          </tr>
          <tr>
            <th>Date</th>
            <td>${appointment.date}</td>
          </tr>
          <tr>
            <th>Time</th>
            <td>${appointment.time}</td>
          </tr>
          <tr>
            <th>Type</th>
            <td>${appointment.type || "-"}</td>
          </tr>
          <tr>
            <th>Status</th>
            <td>${appointment.status}</td>
          </tr>
          ${appointment.notes ? `<tr><th>Notes</th><td>${appointment.notes}</td></tr>` : ""}
        </table>

        <table>
          <tr class="section-header">
            <td colspan="2">PAYMENT SUMMARY</td>
          </tr>
          <tr>
            <th>Consultation Fee</th>
            <td>₹${appointment.fee}</td>
          </tr>
          <tr class="total-row">
            <td>TOTAL PAID</td>
            <td>₹${appointment.fee}</td>
          </tr>
        </table>

        <p class="footer">Thank you for choosing our services. This is a system-generated receipt.</p>
      </body>
    </html>
  `;

  await Print.printAsync({ html });
}
