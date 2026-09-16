// This file contains the code sample for the CRM team, on what all data points we need and how, and whatever is being used here is going to connect to earthlink.

// The goal is to build a connected system, where data is consistent, and verifiable. 
 
const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());

const PORT = 3000;

const EARTHLINK_API_URL = "https://earthlink-dev.solz.me" // this data comes from the CRM, where we are storing it for the climate change team

const EARTHLINK_API_KEY = "crm-secret-key-here-for-authorization" // this is also coming from CRM, where we are storing it for climate change team
 
const FORM_ID = "f23-sg-earthlink"
// ======================================================
// 1. SEND CLIENT DETAILS TO EARTHLINK
// When user clicks on the button "SEND RFP" in the CRM, through the interactive panel, by choosing a lead.
// the SEND RFP button should get connected to this api, and share data to the earthlink.
// ======================================================

app.post("/api/clients/send-rfp", async (req, res) => {
    try {
        const {
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

        // Validation for mandatory fields
        if (!name || !email || !country) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: name, email, and country are mandatory."
            });
        }

        // Constructing the payload object to send to Earthlink
        const payload = {
            form_id: FORM_ID,
            name,
            email,
            country,
            ...(mobile_number && { mobile_number }),
            ...(address && { address }),
            ...(contact_person && { contact_person }),
            ...(contact_email && { contact_email }),
            ...(contact_mobile && { contact_mobile }),
            ...(region !== undefined && { region }),
            ...(code && { code })
        };

        // calling the api on the earthlink.
        const response = await axios.post(
            `${EARTHLINK_API_URL}/api/integrations/crm/rfp`,
            payload, 
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${EARTHLINK_API_KEY}`
                },
                timeout: 30000
            }
        );

        return res.status(response.status).json(response.data);

    } catch (error) {
        console.log(
            "api error from CRM",
            error.message
        );
        return res.status(error.response?.status || 500).json({
            success: false,
            message: error.message,
            error: error.response?.data
        });
    }
});



// ======================================================
// 2. WHEN THE SALES PERSON IN THE EARTHLINK SENDS THE PROPOSAL TO THE CLIENT, THEN THE PROPOSAL DATA IS TO RECIEVED IN THE CRM, AND THE LEAD IS NOT CONVERTED TO DEAL
// and yeah, the stage should be updated to proposal sent.
// ======================================================

app.post("/api/webhooks/earthlink/proposal", async (req, res) => {
    try {
        const {
            code, // Unique Lead ID
            proposal_value,
            proposal_currency,
            proposal_sent_date,
            espl_proposal_number,
            no_of_reports,
            organization_country,
            sectoral_scope,
            sbu_class
        } = req.body;

        // Validation for mandatory fields
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
                message: "Missing mandatory fields in proposal payload."
            });
        }

        // Mock DB operation: Update deal table / lead record in CRM using lead `code`
        const dealRecord = {
            lead_id: code,
            proposal_value,
            proposal_currency,
            proposal_sent_date,
            espl_proposal_number,
            no_of_reports,
            organization_country,
            sectoral_scope,
            sbu_class,
            updated_at: new Date()
        };

        // TODO: Replace with actual CRM DB query, e.g.:
        // await db.Deal.update(dealRecord, { where: { lead_id: code } });
        console.log("Updating CRM Deal table with proposal data:", dealRecord);

        return res.status(200).json({
            success: true,
            message: "Proposal data received and updated in CRM deal table successfully",
            data: {
                lead_id: code,
                espl_proposal_number
            }
        });

    } catch (error) {
        console.error("Error receiving proposal data in CRM:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error while processing proposal data",
            error: error.message
        });
    }
});







// ======================================================
// 3.WHEN SALES REP MARK THE PROPOSAL ACCEPTANCE VERIFIED IN EARTHLINK, WE NEED TO SEND UPDATE BACK TO CRM.
// AND THE DEAL WON UPDATE IS SENT TO CRM, SO THAT THE DEAL CAN BE MARKED AS WON IN THE CRM.
// ======================================================

app.post("/api/webhooks/earthlink/deal-won", async (req, res) => {
    try {
        const {
            code, // Unique Lead ID
            proposal_value, // Final updated proposal value
            stage = "won"
        } = req.body;

        if (!code || proposal_value === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: code and proposal_value are mandatory."
            });
        }

        // Mock DB operation: Update deal status to WON and update final proposal value in CRM using lead `code`
        const updateDealPayload = {
            lead_id: code,
            proposal_value,
            stage: stage,
            is_won: true,
            updated_at: new Date()
        };

        // TODO: Replace with actual CRM DB query, e.g.:
        // await db.Deal.update({ proposal_value, stage: 'won' }, { where: { lead_id: code } });
        console.log("Updating CRM Deal status to WON:", updateDealPayload);

        return res.status(200).json({
            success: true,
            message: "CRM deal updated to WON status with final proposal value successfully",
            data: {
                lead_id: code,
                proposal_value,
                stage: "won"
            }
        });

    } catch (error) {
        console.error("Error updating deal status to WON in CRM:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error while updating deal status",
            error: error.message
        });
    }
});
