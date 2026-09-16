// This file contains code sample for Earthlink team, about how data flow can be managed.


const express = require("express");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const PORT = 4000;


const CRM_API_KEY = "your-secret-api-key";

const EARTHLINK_FRONTEND_URL =
    "https://dev.earthood.in";




// sample authentication code


function authenticateCRM(req, res, next) {

    const authHeader =
        req.headers.authorization;


    if (!authHeader) {

        return res.status(401).json({
            success: false,
            message: "Authorization header missing"
        });
    }


    const expected =
        `Bearer ${CRM_API_KEY}`;


    if (authHeader !== expected) {

        return res.status(401).json({
            success: false,
            message: "Invalid API key"
        });
    }


    next();
}





// ======================================================
// 1. RECIEVING CLIENT DATA FROM EARTHLINK AND THEN SENDING THE RFP FORM. 
// ======================================================

// 1.1 getting the data from crm and creating a client
app.post("/api/integrations/crm/rfp", authenticateCRM, async (req, res) => {
    try {
        const {
            form_id,
            name,
            email,
            country,
            mobile_number,
            address,
            contact_person,
            contact_email,
            contact_mobile,
            region,
            code
        } = req.body;

        // Validate required fields
        if (!name || !email || !country) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: name, email, and country are mandatory."
            });
        }

        // Store client data in database (Mock DB call / ORM operation)
        const newClient = {
            id: crypto.randomUUID(), // or database auto-increment ID
            form_id: form_id || null,
            name,
            email,
            country,
            mobile_number: mobile_number || null,
            address: address || null,
            contact_person: contact_person || [],
            contact_email: contact_email || null,
            contact_mobile: contact_mobile || null,
            region: region ?? null,
            crm_lead_code: code || null,
            created_at: new Date()
        };

        // TODO: Replace with actual DB query, e.g., await db.Client.create(newClient);
        console.log("Saving client to Earthlink DB:", newClient);

        // 1.2 Send RFP Form to client email right after registration
        const emailResult = await sendRFPFormEmail(newClient);

        return res.status(201).json({
            success: true,
            message: "Client data received, created successfully, and RFP form email sent",
            data: {
                client_id: newClient.id,
                name: newClient.name,
                email: newClient.email,
                email_status: emailResult
            }
        });

    } catch (error) {
        console.error("Error creating client from CRM payload:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error while processing client data",
            error: error.message
        });
    }
});


// 1.2 Function to generate RFP form link & send email to client
async function sendRFPFormEmail(client) {
    try {
        // Generate a secure access token or payload for the RFP form
        const token = crypto.randomBytes(32).toString("hex");
        const recipientEmail = client.contact_email || client.email;
        const rfpFormUrl = `${EARTHLINK_FRONTEND_URL}/rfp-form?token=${token}&clientId=${client.id}&formId=${client.form_id}`;

        console.log(`[Email Service] Sending RFP Form email to ${recipientEmail}`);
        console.log(`[Email Service] Link: ${rfpFormUrl}`);

        return { sent: true, recipient: recipientEmail, rfpFormUrl };
    } catch (error) {
        console.error("[Email Service Error]: Failed to send RFP form email", error);
        return { sent: false, error: error.message };
    }
}

 
// ======================================================
// 2. PROPOSAL SENT BY SALES REP TO THE CLIENT IN THE EARTHLINK, NOW THE PROPOSAL DATA TO BE SENT TO CRM
// ======================================================

app.post("/api/proposals/send-to-crm", async (req, res) => {
    try {
        const {
            code, // Lead ID
            proposal_value,
            proposal_currency,
            proposal_sent_date,
            espl_proposal_number,
            no_of_reports,
            organization_country,
            sectoral_scope,
            sbu_class
        } = req.body;

        // Mandatory fields validation
        if (
            !code ||
            proposal_value === undefined ||
            !proposal_currency ||
            !proposal_sent_date ||
            !espl_proposal_number ||
            no_of_reports === undefined ||
            !organization_country ||
            !sectoral_scope ||
            !sbu_class
        ) {
            return res.status(400).json({
                success: false,
                message: "Missing mandatory fields for proposal payload."
            });
        }

        // Construct payload to be sent to CRM
        const payload = {
            code,
            proposal_value,
            proposal_currency,
            proposal_sent_date,
            espl_proposal_number,
            no_of_reports,
            organization_country,
            sectoral_scope,
            sbu_class
        };

        // Post proposal data to CRM webhook endpoint
        const response = await axios.post(
            `${EARTHLINK_FRONTEND_URL}/api/webhooks/earthlink/proposal`,
            payload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CRM_API_KEY}`
                },
                timeout: 30000
            }
        );

        return res.status(200).json({
            success: true,
            message: "Proposal data successfully sent to CRM",
            crm_response: response.data
        });

    } catch (error) {
        console.error("Error sending proposal data to CRM:", error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            message: "Failed to send proposal data to CRM",
            error: error.response?.data || error.message
        });
    }
});






// ======================================================
// 3. NOW SINCE THE PROPOSAL IS SENT TO CLIENT, HE CAN NOW ACCEPT THE PROPOSAL, AND IT IS SHOWN TO SALES REP ON HIS DASHBOARD.
// FROM THERE THEY CAN JUST CLICK VERIFIED BUTTON, AND THE DEAL IS WON.
// AND THE DEAL WON UPDATE IS SENT TO CRM, SO THAT THE DEAL CAN BE MARKED AS WON IN THE CRM.
// ======================================================

app.post("/api/proposals/verify-and-win", async (req, res) => {
    try {
        const {
            code, // Lead ID
            proposal_value // Final updated proposal value (if negotiated/changed)
        } = req.body;

        if (!code || proposal_value === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: code (lead ID) and proposal_value are mandatory."
            });
        }

        // Payload to send to CRM to mark deal as WON and update final proposal value
        const payload = {
            code,
            proposal_value,
            stage: "won"
        };

        // Send update to CRM webhook endpoint
        const response = await axios.post(
            `${EARTHLINK_FRONTEND_URL}/api/webhooks/earthlink/deal-won`,
            payload,
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${CRM_API_KEY}`
                },
                timeout: 30000
            }
        );

        return res.status(200).json({
            success: true,
            message: "Deal won status and updated proposal value successfully sent to CRM",
            crm_response: response.data
        });

    } catch (error) {
        console.error("Error sending deal won update to CRM:", error.message);
        return res.status(error.response?.status || 500).json({
            success: false,
            message: "Failed to send deal won update to CRM",
            error: error.response?.data || error.message
        });
    }
});