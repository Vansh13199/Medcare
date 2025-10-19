import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg'; // ⭐️ Use the PostgreSQL 'pg' library
import { fileURLToPath } from 'url';
import path from 'path';
import multer from 'multer';
import axios from 'axios';

// --- Basic Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Multer Setup ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ⭐️ PostgreSQL Database Connection ---
const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Required for connecting to cloud databases like Supabase/Render
    ssl: {
        rejectUnauthorized: false
    }
});

// Test the connection
pool.connect((err) => {
    if (err) {
        console.error("Fatal Error: Could not connect to the PostgreSQL database.", err.stack);
        process.exit(1);
    } else {
        console.log(`Successfully connected to the PostgreSQL database.`);
    }
});


// --- Middleware ---
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// --- AI Helper Function (Unchanged) ---
async function analyzeImageWithGemini(prompt, imageBase64, imageMediaType) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`;
    
    const requestBody = {
        contents: [ { parts: [ { text: prompt }, { inline_data: { mime_type: imageMediaType, data: imageBase64 } } ] } ],
        generationConfig: { responseMimeType: "application/json" }
    };

    try {
        console.log('[AI] Sending image and prompt to Google Gemini Vision...');
        const response = await axios.post(geminiUrl, requestBody);
        const resultJsonString = response.data.candidates[0].content.parts[0].text;
        return JSON.parse(resultJsonString);
    } catch (error) {
        console.error('[AI] Gemini Vision API call failed.', error.response ? error.response.data : error.message);
        throw new Error('Failed to analyze the image with Gemini.');
    }
}


// --- API Routes (Updated for 'pg' syntax) ---

app.get('/api/stats', async (req, res) => {
    try {
        // PostgreSQL uses double quotes for table/column names
        const patientsRow = await pool.query('SELECT COUNT(*) as count FROM "Patient"');
        const prescriptionsRow = await pool.query("SELECT COUNT(*) as count FROM \"Prescription\" WHERE \"createdAt\" >= now() - interval '1 day'");
        const alertsRow = await pool.query("SELECT COUNT(*) as count FROM \"Prescription\" WHERE \"riskLevel\" = 'High'");

        res.status(200).json({
            totalPatients: parseInt(patientsRow.rows[0].count, 10),
            prescriptionsToday: parseInt(prescriptionsRow.rows[0].count, 10),
            highRiskAlerts: parseInt(alertsRow.rows[0].count, 10)
        });
    } catch (err) {
        console.error('Error fetching stats:', err.message);
        res.status(500).json({ error: 'Failed to retrieve dashboard stats.' });
    }
});


app.post('/api/prescriptions/upload/:patientId', upload.single('prescriptionImage'), async (req, res) => {
    const { patientId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No prescription image was uploaded.' });

    const client = await pool.connect(); // Get a client from the pool for a transaction
    try {
        const patient = await client.query('SELECT id FROM "Patient" WHERE id = $1', [patientId]);
        if (patient.rows.length === 0) {
            return res.status(404).json({ error: `Patient with ID ${patientId} not found.` });
        }

        const imageBase64 = req.file.buffer.toString('base64');
        const imageMediaType = req.file.mimetype;

        const prompt = `
            You are a highly accurate medical transcription... (full prompt here)
            Return ONLY a single, valid JSON object...
        `;

        const analysisResult = await analyzeImageWithGemini(prompt, imageBase64, imageMediaType);
        console.log('[AI] Received analysis:', analysisResult);

        const newPrescriptionId = `pres_${Date.now()}`;
        const doctorId = 'doc_placeholder_123';

        await client.query('BEGIN');
        
        const prescriptionSql = `INSERT INTO "Prescription" (id, "patientId", "doctorId", "riskLevel", summary, recommendations) VALUES ($1, $2, $3, $4, $5, $6)`;
        const prescriptionParams = [newPrescriptionId, patientId, doctorId, analysisResult.riskLevel, analysisResult.summary, JSON.stringify(analysisResult.recommendations)];
        await client.query(prescriptionSql, prescriptionParams);

        if (Array.isArray(analysisResult.extractedDrugs)) {
            for (const drug of analysisResult.extractedDrugs) {
                const drugSql = `INSERT INTO "PrescribedDrug" (id, "prescriptionId", name, dosage, frequency) VALUES ($1, $2, $3, $4, $5)`;
                const newDrugId = `drug_${Date.now()}_${Math.random()}`;
                const drugParams = [newDrugId, newPrescriptionId, drug.name, drug.dosage || 'N/A', drug.frequency || 'N/A'];
                await client.query(drugSql, drugParams);
            }
        }
        await client.query('COMMIT');
        res.status(201).json({ id: newPrescriptionId, patientId, ...analysisResult });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in prescription upload workflow:', error.message);
        res.status(500).json({ error: 'An error occurred during the prescription workflow.' });
    } finally {
        client.release(); // IMPORTANT: Release the client back to the pool
    }
});


app.get('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM "Patient" WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Patient not found.' });
        res.status(200).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Database error while fetching patient.' });
    }
});


app.get('/api/patients', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM "Patient" ORDER BY "createdAt" DESC');
        res.status(200).json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve patients.' });
    }
});


app.post('/api/patients', async (req, res) => {
    const { fullName, dob } = req.body;
    if (!fullName || !dob) {
        return res.status(400).json({ error: 'Full Name and Date of Birth are required.' });
    }

    const newId = `pat_${Date.now()}`;
    const sql = `INSERT INTO "Patient" (id, "fullName", dob, gender, "bloodType", "contactNumber", "emergencyContact", allergies, "medicalHistory", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`;
    const params = [newId, req.body.fullName, req.body.dob, req.body.gender, req.body.bloodType, req.body.contactNumber, req.body.emergencyContact, req.body.allergies, req.body.medicalHistory];
    
    try {
        await pool.query(sql, params);
        res.status(201).json({ id: newId, ...req.body });
    } catch (err) {
        res.status(500).json({ error: 'Database error while creating patient.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server is listening on http://localhost:${PORT}`);
    console.log("-------------------------------------------------");
});

