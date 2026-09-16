// this is the data being captured from crm to earthlink


const express = require("express");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const PORT = 4000;


// ======================================================
// CONFIG
// ======================================================

const CRM_API_KEY = "your-secret-api-key";

const EARTHLINK_FRONTEND_URL =
    "https://your-earthlink-domain.com";


// ======================================================
// AUTHENTICATION
// ======================================================

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
// CRM → EARTHLINK
// ======================================================

app.post(
    "/api/integrations/crm/rfp",
    authenticateCRM,
    async (req, res) => {

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

                form_id
            } = req.body;


            // ------------------------------------------
            // Validate required fields
            // ------------------------------------------

            if (!name || !email || !country) {

                return res.status(400).json({
                    success: false,
                    message:
                        "name, email and country are required"
                });
            }


            if (!form_id) {

                return res.status(400).json({
                    success: false,
                    message:
                        "form_id is required"
                });
            }


            // ------------------------------------------
            // Find form
            // ------------------------------------------

            const form =
                await findForm(form_id);


            if (!form) {

                return res.status(404).json({
                    success: false,
                    message:
                        `Form '${form_id}' not found`
                });
            }


            // ------------------------------------------
            // Check form status
            // ------------------------------------------

            if (form.status !== "active") {

                return res.status(400).json({
                    success: false,
                    message:
                        `Form '${form_id}' is not active`
                });
            }


            // ------------------------------------------
            // Create / find client
            // ------------------------------------------

            const client =
                await findOrCreateClient({

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
                    code

                });


            // ------------------------------------------
            // Create unique form instance
            // ------------------------------------------

            const token =
                crypto
                    .randomBytes(32)
                    .toString("hex");


            const formInstance =
                await createFormInstance({

                    formId: form.id,

                    clientId: client.id,

                    token

                });


            // ------------------------------------------
            // Create client form URL
            // ------------------------------------------

            const formUrl =
                `${EARTHLINK_FRONTEND_URL}/forms/${token}`;


            // ------------------------------------------
            // Send form to client
            // ------------------------------------------

            await sendFormToClient({

                clientName: client.name,

                clientEmail: client.email,

                formName: form.name,

                formUrl

            });


            // ------------------------------------------
            // Return response to CRM
            // ------------------------------------------

            return res.status(200).json({

                success: true,

                message:
                    "Form created and sent to client",

                data: {

                    client_id:
                        client.id,

                    form_id:
                        form.form_id,

                    form_instance_id:
                        formInstance.id,

                    status:
                        "sent"

                }

            });


        } catch (error) {

            console.error(
                "CRM → Earthlink error:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to process RFP"

            });
        }
    }
);


// ======================================================
// FIND FORM
// ======================================================

async function findForm(formId) {

    // Replace this with your actual DB query.

    // Example:

    /*
    const [rows] = await db.execute(
        `
        SELECT *
        FROM forms
        WHERE form_id = ?
        LIMIT 1
        `,
        [formId]
    );

    return rows[0] || null;
    */


    // Temporary example

    if (formId === "F20-sg-earthlink") {

        return {
            id: 20,

            form_id: "F20-sg-earthlink",

            name: "F20 SG Earthlink",

            status: "active"
        };
    }


    return null;
}


// ======================================================
// FIND OR CREATE CLIENT
// ======================================================

async function findOrCreateClient(data) {

    // Replace with your actual Earthlink database logic.

    console.log(
        "Client received from CRM:",
        data
    );


    // Example temporary response

    return {

        id: 1001,

        name: data.name,

        email: data.email,

        country: data.country

    };
}


// ======================================================
// CREATE FORM INSTANCE
// ======================================================

async function createFormInstance({
    formId,
    clientId,
    token
}) {

    // Replace with your actual database INSERT.

    console.log(
        "Creating form instance:",
        {
            formId,
            clientId,
            token
        }
    );


    return {

        id: 5001,

        formId,

        clientId,

        token

    };
}


// ======================================================
// SEND FORM TO CLIENT
// ======================================================

async function sendFormToClient({
    clientName,
    clientEmail,
    formName,
    formUrl
}) {

    // ------------------------------------------
    // Replace this with your existing
    // Earthlink email service.
    // ------------------------------------------

    console.log(
        "Sending form to:",
        clientEmail
    );

    console.log(
        "Form URL:",
        formUrl
    );


    /*
    
    Example using Nodemailer:

    await transporter.sendMail({

        from: "salesman@earthood.com",

        to: clientEmail,

        subject: `Action Required: ${formName}`,

        html: `
            <p>Dear ${clientName},</p>

            <p>
                Please complete the following form:
            </p>

            <p>
                <strong>${formName}</strong>
            </p>

            <p>
                <a href="${formUrl}">
                    Complete Form
                </a>
            </p>

            <p>
                Regards,<br>
                Earthood
            </p>
        `
    });

    */
}


// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {

    res.json({
        success: true,
        service: "Earthlink",
        status: "running"
    });

});


// ======================================================
// START EARTHLINK
// ======================================================

app.listen(PORT, () => {

    console.log(
        `Earthlink running on port ${PORT}`
    );

});