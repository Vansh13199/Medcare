import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise'; // Use mysql2/promise
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

// --- MySQL Database Connection Config ---
const mysqlConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// --- Global Connection Pool ---
let pool;
try {
    pool = mysql.createPool(mysqlConfig);
    console.log('Successfully created MySQL connection pool.');
} catch (err) {
    console.error("Fatal Error: Could not create MySQL pool.", err.stack);
    process.exit(1);
}

// --- Function to Create Tables (MySQL Syntax) ---
async function setupDatabase() {
    const createPatientTable = `
        CREATE TABLE IF NOT EXISTS Patient (
            id VARCHAR(255) PRIMARY KEY,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            fullName VARCHAR(255),
            dob VARCHAR(50),
            gender VARCHAR(50),
            bloodType VARCHAR(10),
            contactNumber VARCHAR(50),
            emergencyContact VARCHAR(50),
            allergies TEXT,
            medicalHistory TEXT
        );
    `;
    const createPrescriptionTable = `
        CREATE TABLE IF NOT EXISTS Prescription (
            id VARCHAR(255) PRIMARY KEY,
            patientId VARCHAR(255) NOT NULL,
            doctorId VARCHAR(255),
            riskLevel VARCHAR(50),
            summary TEXT,
            recommendations TEXT,
            alternativePrescription TEXT, 
            disclaimer TEXT,
            createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patientId) REFERENCES Patient(id) ON DELETE CASCADE
        );
    `;
    const createPrescribedDrugTable = `
        CREATE TABLE IF NOT EXISTS PrescribedDrug (
            id VARCHAR(255) PRIMARY KEY,
            prescriptionId VARCHAR(255) NOT NULL,
            name VARCHAR(255) NOT NULL,
            dosage VARCHAR(100),
            frequency VARCHAR(100),
            FOREIGN KEY (prescriptionId) REFERENCES Prescription(id) ON DELETE CASCADE
        );
    `;
    try {
        console.log('Checking/Creating database tables...');
        await pool.query(createPatientTable);
        await pool.query(createPrescriptionTable);
        await pool.query(createPrescribedDrugTable);
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
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// --- AI Helper Function for Gemini Vision ---
async function analyzeImageWithGemini(prompt, imageBase64, imageMediaType) {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
        console.error('[AI] Error: GOOGLE_GEMINI_API_KEY environment variable is not set.');
        throw new Error('AI service configuration error.');
    }
    
    // Using gemini-2.5-pro model
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`;
    
    const requestBody = {
        contents: [ { parts: [ { text: prompt }, { inline_data: { mime_type: imageMediaType, data: imageBase64 } } ] } ],
        generationConfig: { responseMimeType: "application/json" }
    };

    try {
        console.log('[AI] Sending image and prompt to Google Gemini 2.5 Pro...');
        const response = await axios.post(geminiUrl, requestBody);
        
        if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
             console.error('[AI] Gemini response format unexpected:', JSON.stringify(response.data, null, 2));
             throw new Error('Gemini response format was unexpected.');
        }
        
        const resultJsonString = response.data.candidates[0].content.parts[0].text;
        console.log('[AI] Gemini analysis successful (JSON parsed).');
        return JSON.parse(resultJsonString);
    } catch (error) {
        console.error('[AI] Gemini Vision API call or processing failed.', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        if (error.response?.data?.error) {
             throw new Error(`Gemini API Error: ${error.response.data.error.message}`);
        }
        throw new Error('Failed to analyze the image with Gemini.');
    }
}

// --- API Routes (Updated for 'mysql2' syntax) ---
app.get('/api/test', (req, res) => {
    res.status(200).json({ message: "Backend API is running successfully!" });
});

app.get('/api/stats', async (req, res) => {
    try {
        const [patientsRows] = await pool.query('SELECT COUNT(*) as count FROM Patient');
        const [prescriptionsRows] = await pool.query("SELECT COUNT(*) as count FROM Prescription WHERE createdAt >= NOW() - INTERVAL 1 DAY");
        const [alertsRows] = await pool.query("SELECT COUNT(*) as count FROM Prescription WHERE riskLevel = 'High'");

        res.status(200).json({
            totalPatients: patientsRows[0].count,
            prescriptionsToday: prescriptionsRows[0].count,
            highRiskAlerts: alertsRows[0].count
        });
    } catch (err) {
        console.error('Error fetching stats:', err.message);
        res.status(500).json({ error: 'Failed to retrieve stats.' });
    }
});

app.post('/api/prescriptions/upload/:patientId', upload.single('prescriptionImage'), async (req, res) => {
    const { patientId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No prescription image uploaded.' });

    let connection; 
    try {
        connection = await pool.getConnection(); 
        await connection.beginTransaction(); 

        const [patientRows] = await connection.query('SELECT id FROM Patient WHERE id = ?', [patientId]);
        if (patientRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: `Patient not found.` });
        }

        const imageBase64 = req.file.buffer.toString('base64');
        const imageMediaType = req.file.mimetype;
        const prompt = `
            You are a highly accurate medical transcription and clinical analysis AI. Analyze the attached prescription image.
            
            First, assess the readability of the handwriting.
            - IF the handwriting is completely unreadable, illegible, or the image is too blurry to analyze,
              return ONLY the following JSON object:
              { "error": "UNREADABLE", "message": "The prescription is unreadable." }

            - OTHERWISE, if the image is readable, perform the following tasks:
            1. Identify every drug listed.
            2. Extract its dosage and frequency.
            3. Analyze the drug combination for interactions.
            4. Classify the overall risk as "Low", "Moderate", or "High".
            5. Provide a concise summary of the critical interaction.
            6. List actionable recommendations for the clinician.
            7. If risk is 'Moderate' or 'High', suggest a safer alternative prescription.
            8. Include a fixed disclaimer.
            
            Return ONLY a single, valid JSON object with this structure:
            { 
              "riskLevel": "...", 
              "summary": "...", 
              "recommendations": ["...", "..."], 
              "extractedDrugs": [{ "name": "...", "dosage": "...", "frequency": "..." }], 
              "alternativePrescription": { "summary": "...", "drugs": [{ "name": "...", "dosage": "...", "frequency": "..." }] },
              "disclaimer": "This is an AI-generated analysis and has low credibility. It should not be used for final medical decisions without verification by a qualified healthcare professional."
            }
        `;
        const analysisResult = await analyzeImageWithGemini(prompt, imageBase64, imageMediaType);
        console.log('[AI] Received analysis:', analysisResult);

        if (analysisResult.error && analysisResult.error === 'UNREADABLE') {
            console.log('[AI] AI determined the image is unreadable.');
            return res.status(400).json({ error: 'Handwriting is unreadable or the image is too blurry. Please upload a clearer image.' });
        }

        if (!analysisResult?.riskLevel || !Array.isArray(analysisResult.extractedDrugs)) {
            throw new Error('AI response structure was invalid.');
        }

        const newPrescriptionId = `pres_${Date.now()}`;
        const doctorId = 'doc_placeholder_123';

        const prescriptionSql = `
            INSERT INTO Prescription 
                (id, patientId, doctorId, riskLevel, summary, recommendations, alternativePrescription, disclaimer, createdAt) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        const prescriptionParams = [
            newPrescriptionId, 
            patientId, 
            doctorId, 
            analysisResult.riskLevel, 
            analysisResult.summary || '', 
            JSON.stringify(analysisResult.recommendations || []),
            JSON.stringify(analysisResult.alternativePrescription || null),
            analysisResult.disclaimer || ''
        ];
        await connection.query(prescriptionSql, prescriptionParams);

        if (analysisResult.extractedDrugs.length > 0) {
            const drugSql = `INSERT INTO PrescribedDrug (id, prescriptionId, name, dosage, frequency) VALUES ?`;
            const drugValues = analysisResult.extractedDrugs.map(drug => {
                 const newDrugId = `drug_${Date.now()}_${Math.random()}`;
                 return [newDrugId, newPrescriptionId, drug.name || 'Unknown', drug.dosage || 'N/A', drug.frequency || 'N/A'];
            });
            await connection.query(drugSql, [drugValues]);
        }
        
        await connection.commit();
        res.status(201).json({ id: newPrescriptionId, patientId, ...analysisResult });

    } catch (error) {
        console.error('Error in prescription upload:', error.message);
        if (connection) await connection.rollback(); 
        res.status(500).json({ error: error.message || 'An error occurred during prescription processing.' });
    } finally {
        if (connection) connection.release(); 
    }
});

app.get('/api/prescriptions/patient/:patientId', async (req, res) => {
    const { patientId } = req.params;
    try {
        const prescriptionsSql = `SELECT * FROM Prescription WHERE patientId = ? ORDER BY createdAt DESC`;
        const [prescriptions] = await pool.query(prescriptionsSql, [patientId]);

        if (prescriptions.length === 0) {
            return res.status(200).json([]);
        }

        const prescriptionHistory = [];
        for (const pres of prescriptions) {
            const drugsSql = `SELECT * FROM PrescribedDrug WHERE prescriptionId = ?`;
            const [drugs] = await pool.query(drugsSql, [pres.id]);
            
            prescriptionHistory.push({
                ...pres,
                recommendations: JSON.parse(pres.recommendations || '[]'),
                alternativePrescription: JSON.parse(pres.alternativePrescription || 'null'),
                extractedDrugs: drugs
            });
        }
        
        res.status(200).json(prescriptionHistory);

    } catch (err) {
        console.error('Error fetching prescription history:', err.message);
        res.status(500).json({ error: 'Failed to retrieve prescription history.' });
    }
});


app.delete('/api/prescriptions/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `DELETE FROM Prescription WHERE id = ?`;
        const [result] = await pool.query(sql, [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Prescription not found.' });
        res.status(200).json({ message: 'Prescription deleted successfully.' });
    } catch (err) {
        console.error('Error deleting prescription:', err.message);
        res.status(500).json({ error: 'Failed to delete prescription.' });
    }
});


app.get('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query('SELECT * FROM Patient WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Patient not found.' });
        res.status(200).json(rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

app.get('/api/patients', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM Patient ORDER BY createdAt DESC');
        res.status(200).json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve patients.' });
    }
});

app.post('/api/patients', async (req, res) => {
    const { fullName, dob } = req.body;
    if (!fullName || !dob) return res.status(400).json({ error: 'Required fields missing.' });
    
    const newId = `pat_${Date.now()}`;
    const sql = `INSERT INTO Patient (id, fullName, dob, gender, bloodType, contactNumber, emergencyContact, allergies, medicalHistory, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
    const params = [newId, req.body.fullName, req.body.dob, req.body.gender, req.body.bloodType, req.body.contactNumber, req.body.emergencyContact, req.body.allergies, req.body.medicalHistory];
    
    try {
        await pool.query(sql, params);
        res.status(201).json({ id: newId, ...req.body });
    } catch (err) {
        console.error("DB Error creating patient:", err);
        res.status(500).json({ error: 'Database error.' });
    }
});

app.delete('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const sql = `DELETE FROM Patient WHERE id = ?`;
        const [result] = await pool.query(sql, [id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Patient not found.' });
        res.status(200).json({ message: 'Patient and all associated records deleted successfully.' });
    } catch (err) {
        console.error('Error deleting patient:', err.message);
        res.status(500).json({ error: 'Failed to delete patient.' });
    }
});


// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Backend server listening on http://localhost:${PORT}`);
    console.log("-------------------------------------------------");
});

