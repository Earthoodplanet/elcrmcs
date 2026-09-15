// POST https://earthlink-dev.solz.me/api/integrations/crm/rfp



const express = require("express");
const axios = require("axios");

const app = express();

app.use(express.json());

const PORT = 3000;

// Earthlink API URL
const EARTHLINK_API_URL = "https://earthlink-dev.solz.me"; //can come from the fiel

// Secret key shared between CRM and Earthlink
const EARTHLINK_API_KEY = "your-secret-api-key"; 


// ======================================================
// SEND RFP TO EARTHLINK
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
            client_code,
            code,
            salesperson_email,

            form_id
        } = req.body;

        // ----------------------------------------------
        // Required fields
        // ----------------------------------------------

        if (!name || !email || !country) {
            return res.status(400).json({
                success: false,
                message: "name, email and country are required"
            });
        }


        // ----------------------------------------------
        // Form ID required for sending RFP
        // ----------------------------------------------

        if (!form_id) {
            return res.status(400).json({
                success: false,
                message: "form_id is required"
            });
        }


        // ----------------------------------------------
        // Payload for Earthlink
        // ----------------------------------------------

        const payload = {
            name,
            email,
            country,

            form_id,

            ...(mobile_number !== undefined && {
                mobile_number
            }),

            ...(address !== undefined && {
                address
            }),

            ...(contact_person !== undefined && {
                contact_person
            }),

            ...(contact_email !== undefined && {
                contact_email
            }),

            ...(contact_mobile !== undefined && {
                contact_mobile
            }),

            ...(region !== undefined && {
                region
            }),

            ...(client_code !== undefined && {
                client_code
            }),

            ...(code !== undefined && {
                code
            }),

            ...(salesperson_email !== undefined && {
                salesperson_email
            })
        };


        console.log("Sending data to Earthlink:");
        console.log(payload);


        // ----------------------------------------------
        // Call Earthlink API
        // ----------------------------------------------

        const response = await axios.post(
            `${EARTHLINK_API_URL}/api/integrations/crm/rfp`,
            payload,
            {
                headers: {
                    "Content-Type": "application/json",

                    "Authorization":
                        `Bearer ${EARTHLINK_API_KEY}`
                },

                timeout: 30000
            }
        );


        // ----------------------------------------------
        // Earthlink response
        // ----------------------------------------------

        return res.status(200).json({
            success: true,
            message: "RFP sent to Earthlink successfully",

            data: response.data
        });


    } catch (error) {

        console.error(
            "Earthlink API Error:",
            error.response?.data || error.message
        );


        if (error.response) {

            return res.status(
                error.response.status
            ).json({

                success: false,

                message:
                    error.response.data?.message ||
                    "Earthlink rejected the request"
            });
        }


        return res.status(500).json({
            success: false,
            message: "Unable to connect to Earthlink"
        });
    }
});


// ======================================================
// START CRM SERVER
// ======================================================

app.listen(PORT, () => {
    console.log(`CRM running on port ${PORT}`);
});