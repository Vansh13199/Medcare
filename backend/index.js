import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import sql from 'mssql'; 
import { fileURLToPath } from 'url';
import path from 'path';
import multer from 'multer';
import axios from 'axios';

// --- Basic Setup ---
const app = express();
const PORT = process.env.PORT || 3001; // Read port from environment

// --- Credentials read from environment variables ---
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_SERVER = process.env.DB_SERVER;
const DB_DATABASE = process.env.DB_DATABASE;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY; // Read from env
const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY; // Read from env
const FRONTEND_URL = process.env.FRONTEND_URL; // Read from env

// --- Multer Setup ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- SQL Server Database Connection Config (Uses variables from env) ---
const sqlConfig = {
    user: DB_USER,
    password: DB_PASSWORD,
    server: DB_SERVER,
    database: DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: false
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// --- Global Connection Pool ---
let pool;
try {
    if (!DB_USER || !DB_PASSWORD || !DB_SERVER || !DB_DATABASE) {
        throw new Error('Missing required database environment variables (DB_USER, DB_PASSWORD, DB_SERVER, DB_DATABASE)');
    }
    pool = await sql.connect(sqlConfig);
    console.log('Successfully connected global pool to SQL Server database.');
} catch (err) {
    console.error("Fatal Error: Could not connect global pool to SQL Server.", err.stack);
    process.exit(1);
}

// --- Function to Create Tables ---
async function setupDatabase() {
    const createPatientTable = `
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Patient]') AND type in (N'U'))
        CREATE TABLE [dbo].[Patient] ( [id] NVARCHAR(255) PRIMARY KEY, [createdAt] DATETIMEOFFSET DEFAULT SYSUTCDATETIME(), [updatedAt] DATETIMEOFFSET DEFAULT SYSUTCDATETIME(), [fullName] NVARCHAR(255), [dob] NVARCHAR(50), [gender] NVARCHAR(50), [bloodType] NVARCHAR(10), [contactNumber] NVARCHAR(50), [emergencyContact] NVARCHAR(50), [allergies] NVARCHAR(MAX), [medicalHistory] NVARCHAR(MAX) );
    `;
    const createPrescriptionTable = `
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Prescription]') AND type in (N'U'))
        CREATE TABLE [dbo].[Prescription] ( [id] NVARCHAR(255) PRIMARY KEY, [patientId] NVARCHAR(255) NOT NULL, [doctorId] NVARCHAR(255), [riskLevel] NVARCHAR(50), [summary] NVARCHAR(MAX), [recommendations] NVARCHAR(MAX), [createdAt] DATETIMEOFFSET DEFAULT SYSUTCDATETIME(), CONSTRAINT FK_Prescription_Patient FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE CASCADE );
    `;
    const createPrescribedDrugTable = `
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PrescribedDrug]') AND type in (N'U'))
        CREATE TABLE [dbo].[PrescribedDrug] ( [id] NVARCHAR(255) PRIMARY KEY, [prescriptionId] NVARCHAR(255) NOT NULL, [name] NVARCHAR(255) NOT NULL, [dosage] NVARCHAR(100), [frequency] NVARCHAR(100), CONSTRAINT FK_PrescribedDrug_Prescription FOREIGN KEY ([prescriptionId]) REFERENCES [dbo].[Prescription]([id]) ON DELETE CASCADE );
    `;
    try {
        console.log('Checking/Creating database tables...');
        await pool.request().query(createPatientTable);
        await pool.request().query(createPrescriptionTable);
        await pool.request().query(createPrescribedDrugTable);
        console.log('Database tables are ready.');
    } catch (err) {
        console.error("Fatal Error during database table setup:", err.stack);
        process.exit(1);
    }
}

// --- Run Database Setup ---
setupDatabase().catch(err => {
    console.error("Database setup failed, server not started:", err);
    process.exit(1);
});

// --- Middleware ---
app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// --- AI Helper ---
async function analyzeImageWithGemini(prompt, imageBase64, imageMediaType) {
    if (!GOOGLE_GEMINI_API_KEY) {
        console.error('[AI] Error: GOOGLE_GEMINI_API_KEY environment variable is not set.');
        throw new Error('AI service configuration error.');
    }
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GOOGLE_GEMINI_API_KEY}`;
    const requestBody = {
        contents: [ { parts: [ { text: prompt }, { inline_data: { mime_type: imageMediaType, data: imageBase64 } } ] } ],
        generationConfig: { responseMimeType: "application/json" }
    };
    try {
        console.log('[AI] Sending image and prompt to Google Gemini Vision...');
        const response = await axios.post(geminiUrl, requestBody);
        
        if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
             console.error('[AI] Gemini response format unexpected:', JSON.stringify(response.data, null, 2));
             throw new Error('Gemini response format was unexpected.');
        }
        
        const resultJsonString = response.data.candidates[0].content.parts[0].text;
        // --- ⭐️ Log the raw string ---
        console.log('[AI] Raw JSON String received from Gemini:', resultJsonString); 
        
        // Attempt to parse
        let resultJson;
        try {
            resultJson = JSON.parse(resultJsonString);
        } catch (parseError) {
             console.error('[AI] Failed to parse JSON string from Gemini:', parseError);
             console.error('[AI] Raw string was:', resultJsonString);
             throw new Error('AI returned invalid JSON.');
        }
        console.log('[AI] Gemini analysis successful (JSON parsed).');
        return resultJson; // Return the parsed object
    } catch (error) {
        console.error('[AI] Gemini Vision API call or processing failed.', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        if (error.response?.data?.error) {
             throw new Error(`Gemini API Error: ${error.response.data.error.message}`);
        }
        // Re-throw original error or a more generic one if it wasn't an API error
        throw error instanceof Error ? error : new Error('Failed to analyze the image with Gemini.');
    }
}

// --- API Routes ---
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: "Backend API is running successfully!" });
});

app.get('/api/stats', async (req, res) => {
    try {
        const request = pool.request();
        const patientsResult = await request.query('SELECT COUNT(*) as count FROM Patient');
        const prescriptionsResult = await request.query("SELECT COUNT(*) as count FROM Prescription WHERE createdAt >= DATEADD(day, -1, SYSUTCDATETIME())");
        const alertsResult = await request.query("SELECT COUNT(*) as count FROM Prescription WHERE riskLevel = 'High'");
        res.status(200).json({
            totalPatients: patientsResult.recordset[0].count,
            prescriptionsToday: prescriptionsResult.recordset[0].count,
            highRiskAlerts: alertsResult.recordset[0].count
        });
    } catch (err) {
        console.error('Error fetching stats:', err.message);
        res.status(500).json({ error: 'Failed to retrieve stats.' });
    }
});

app.post('/api/prescriptions/upload/:patientId', upload.single('prescriptionImage'), async (req, res) => {
    const { patientId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No prescription image uploaded.' });

    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        const patientCheck = await request.input('patientId', sql.NVarChar, patientId).query('SELECT id FROM Patient WHERE id = @patientId');
        if (patientCheck.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: `Patient not found.` });
        }

        const imageBase64 = req.file.buffer.toString('base64');
        const imageMediaType = req.file.mimetype;
        const prompt = `
            You are a highly accurate medical transcription... (full prompt here, including JSON structure and disclaimer)
            { 
              "riskLevel": "...", 
              "summary": "...", 
              "recommendations": ["..."], 
              "extractedDrugs": [{ "name": "...", "dosage": "...", "frequency": "..." }], 
              "alternativePrescription": { ... },
              "disclaimer": "..."
            }
        `;
        const analysisResult = await analyzeImageWithGemini(prompt, imageBase64, imageMediaType);
        console.log('[AI] Parsed analysis:', analysisResult);

        // --- ⭐️ More Specific Validation ---
        let validationError = null;
        if (!analysisResult || typeof analysisResult !== 'object') {
            validationError = 'AI response is not a valid object.';
        } else if (!analysisResult.riskLevel) {
            validationError = 'AI response is missing the "riskLevel" field.';
        } else if (!Array.isArray(analysisResult.extractedDrugs)) {
            validationError = 'AI response is missing the "extractedDrugs" array.';
        } // Add more checks if needed (e.g., for disclaimer)

        if (validationError) {
             console.error(`[AI Validation Error] ${validationError}`, analysisResult);
             throw new Error(`AI response structure was invalid: ${validationError}`);
        }
        // --- End Validation ---

        const newPrescriptionId = `pres_${Date.now()}`;
        const doctorId = 'doc_placeholder_123';

        const prescriptionRequest = new sql.Request(transaction);
        await prescriptionRequest
            .input('id', sql.NVarChar, newPrescriptionId)
            .input('patientId', sql.NVarChar, patientId)
            .input('doctorId', sql.NVarChar, doctorId)
            .input('riskLevel', sql.NVarChar, analysisResult.riskLevel)
            .input('summary', sql.NVarChar, analysisResult.summary || '')
            .input('recommendations', sql.NVarChar, JSON.stringify(analysisResult.recommendations || []))
            .query(`INSERT INTO Prescription (id, patientId, doctorId, riskLevel, summary, recommendations, createdAt) VALUES (@id, @patientId, @doctorId, @riskLevel, @summary, @recommendations, SYSUTCDATETIME())`);

        if (analysisResult.extractedDrugs.length > 0) {
            for (const drug of analysisResult.extractedDrugs) {
                const drugRequest = new sql.Request(transaction);
                const newDrugId = `drug_${Date.now()}_${Math.random()}`;
                await drugRequest
                    .input('id', sql.NVarChar, newDrugId)
                    .input('prescriptionId', sql.NVarChar, newPrescriptionId)
                    .input('name', sql.NVarChar, drug.name || 'Unknown')
                    .input('dosage', sql.NVarChar, drug.dosage || 'N/A')
                    .input('frequency', sql.NVarChar, drug.frequency || 'N/A')
                    .query(`INSERT INTO PrescribedDrug (id, prescriptionId, name, dosage, frequency) VALUES (@id, @prescriptionId, @name, @dosage, @frequency)`);
            }
        }
        await transaction.commit();
        res.status(201).json({ id: newPrescriptionId, patientId, ...analysisResult });

    } catch (error) {
        console.error('Error in prescription upload:', error.message);
        try { if (transaction && transaction.active) await transaction.rollback(); }
        catch (rollbackError) { console.error('Failed to rollback transaction:', rollbackError); }
        // Send back the specific error message
        res.status(500).json({ error: error.message || 'An error occurred during prescription processing.' });
    }
});

// GET /api/patients/:id
app.get('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const request = pool.request();
        const result = await request.input('id', sql.NVarChar, id).query('SELECT * FROM Patient WHERE id = @id');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Patient not found.' });
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// GET /api/patients
app.get('/api/patients', async (req, res) => {
    try {
        const request = pool.request();
        const result = await request.query('SELECT * FROM Patient ORDER BY createdAt DESC');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve patients.' });
    }
});

// POST /api/patients
app.post('/api/patients', async (req, res) => {
    const { fullName, dob } = req.body;
    if (!fullName || !dob) return res.status(400).json({ error: 'Required fields missing.' });
    
    const newId = `pat_${Date.now()}`;
    try {
        const request = pool.request();
        await request
            .input('id', sql.NVarChar, newId)
            .input('fullName', sql.NVarChar, req.body.fullName)
            .input('dob', sql.NVarChar, req.body.dob)
            .input('gender', sql.NVarChar, req.body.gender)
            .input('bloodType', sql.NVarChar, req.body.bloodType)
            .input('contactNumber', sql.NVarChar, req.body.contactNumber)
            .input('emergencyContact', sql.NVarChar, req.body.emergencyContact)
            .input('allergies', sql.NVarChar, req.body.allergies)
            .input('medicalHistory', sql.NVarChar, req.body.medicalHistory)
            .query(`INSERT INTO Patient (id, fullName, dob, gender, bloodType, contactNumber, emergencyContact, allergies, medicalHistory, createdAt, updatedAt) VALUES (@id, @fullName, @dob, @gender, @bloodType, @contactNumber, @emergencyContact, @allergies, @medicalHistory, SYSUTCDATETIME(), SYSUTCDATETIME())`);
        res.status(201).json({ id: newId, ...req.body });
    } catch (err) {
        console.error("DB Error creating patient:", err);
        res.status(500).json({ error: 'Database error.' });
    }
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
    console.log("-------------------------------------------------");
});

