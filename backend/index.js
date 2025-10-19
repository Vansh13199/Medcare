import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';
import multer from 'multer'; // For handling image uploads
import axios from 'axios';   // For making API calls to AI services

// --- Basic Setup ---
const app = express();
const PORT = process.env.PORT || 3001;

// --- Multer Setup ---
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Database Connection ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, process.env.DATABASE_URL);

console.log(`[DEBUG] Attempting to connect to database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Fatal Error: Could not connect to the database.", err.message);
        process.exit(1);
    } else {
        console.log(`Successfully connected to the SQLite database.`);
    }
});

// --- Create/Update Tables on Startup ---
const tableCreationSql = `
  CREATE TABLE IF NOT EXISTS Patient (
    id TEXT PRIMARY KEY, createdAt TEXT, updatedAt TEXT, fullName TEXT, dob TEXT, gender TEXT, bloodType TEXT,
    contactNumber TEXT, emergencyContact TEXT, allergies TEXT, medicalHistory TEXT
  );
  CREATE TABLE IF NOT EXISTS Prescription (
    id TEXT PRIMARY KEY, patientId TEXT NOT NULL, doctorId TEXT, riskLevel TEXT, summary TEXT, recommendations TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patientId) REFERENCES Patient (id) ON DELETE CASCADE -- Added CASCADE delete
  );
  CREATE TABLE IF NOT EXISTS PrescribedDrug (
    id TEXT PRIMARY KEY, prescriptionId TEXT NOT NULL, name TEXT NOT NULL, dosage TEXT, frequency TEXT,
    FOREIGN KEY (prescriptionId) REFERENCES Prescription (id) ON DELETE CASCADE -- Added CASCADE delete
  );
`;
db.exec(tableCreationSql, (err) => {
    if (err) console.error("Error creating tables:", err.message);
    else console.log("Database tables are ready.");
});

// --- Middleware ---
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());


// --- AI Helper Function for Gemini Vision ---
async function analyzeImageWithGemini(prompt, imageBase64, imageMediaType) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`;
    
    const requestBody = {
        contents: [ { parts: [ { text: prompt }, { inline_data: { mime_type: imageMediaType, data: imageBase64 } } ] } ],
        generationConfig: { responseMimeType: "application/json" }
    };

    try {
        console.log('[AI] Sending image and prompt to Google Gemini Vision...');
        const response = await axios.post(geminiUrl, requestBody);
        
        // Error handling for Gemini response structure
        if (!response.data || !response.data.candidates || !response.data.candidates[0] || !response.data.candidates[0].content || !response.data.candidates[0].content.parts || !response.data.candidates[0].content.parts[0] || !response.data.candidates[0].content.parts[0].text) {
             console.error('[AI] Gemini response format unexpected:', JSON.stringify(response.data, null, 2));
             throw new Error('Gemini response format was unexpected.');
        }
        
        const resultJsonString = response.data.candidates[0].content.parts[0].text;
        const resultJson = JSON.parse(resultJsonString);
        console.log('[AI] Gemini analysis successful.');
        return resultJson;
    } catch (error) {
        console.error('[AI] Gemini Vision API call failed.', error.response ? JSON.stringify(error.response.data, null, 2) : error.message);
        // More specific error based on Google API response
        if (error.response && error.response.data && error.response.data.error) {
             throw new Error(`Gemini API Error: ${error.response.data.error.message}`);
        }
        throw new Error('Failed to analyze the image with Gemini.');
    }
}


// --- API Routes ---

/**
 * @route   GET /api/stats
 * @desc    Get dashboard statistics
 */
app.get('/api/stats', (req, res) => {
    const stats = {};
    const queries = [
        { sql: "SELECT COUNT(*) as totalPatients FROM Patient;", key: 'totalPatients' },
        { sql: "SELECT COUNT(*) as prescriptionsToday FROM Prescription WHERE createdAt >= datetime('now', '-1 day');", key: 'prescriptionsToday' },
        { sql: "SELECT COUNT(*) as highRiskAlerts FROM Prescription WHERE riskLevel = 'High';", key: 'highRiskAlerts' }
    ];
    let completed = 0;
    let errors = false; // Flag to prevent multiple error responses

    queries.forEach(queryInfo => {
        db.get(queryInfo.sql, [], (err, row) => {
            if (errors) return; // Stop if an error already occurred
            if (err) {
                errors = true;
                console.error('Error fetching stats:', err.message);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to retrieve dashboard stats.' });
                }
                return;
            }
            stats[queryInfo.key] = Object.values(row)[0];
            completed++;

            if (completed === queries.length) {
                 if (!res.headersSent) {
                     res.status(200).json(stats);
                 }
            }
        });
    });
});

/**
 * @route   POST /api/prescriptions/upload/:patientId
 * @desc    Upload prescription image, analyze with AI, and save to DB
 */
app.post('/api/prescriptions/upload/:patientId', upload.single('prescriptionImage'), (req, res) => {
    const { patientId } = req.params;
    
    if (!req.file) {
        return res.status(400).json({ error: 'No prescription image was uploaded.' });
    }

    const patientCheckSql = "SELECT id FROM Patient WHERE id = ?";
    db.get(patientCheckSql, [patientId], async (err, patientRow) => {
        if (err) {
            console.error('[DB CHECK ERROR]', err.message);
            return res.status(500).json({ error: 'Database error while verifying patient.' });
        }
        if (!patientRow) {
            return res.status(404).json({ error: `Patient with ID ${patientId} not found.` });
        }

        try {
            const imageBase64 = req.file.buffer.toString('base64');
            const imageMediaType = req.file.mimetype;

            const prompt = `
                You are a highly accurate medical transcription and clinical analysis AI. Analyze the attached prescription image.
                Your task is to:
                1. Identify every drug listed. Handle common misspellings or blurry text.
                2. Extract its dosage and frequency if available.
                3. Analyze the combination of all drugs for potential interactions based on your internal medical knowledge.
                4. Classify the overall interaction risk as "Low", "Moderate", or "High".
                5. Provide a concise, clinician-focused summary of the most critical interaction.
                6. List 2-3 actionable recommendations for the clinician regarding the CURRENT prescription.
                7. IMPORTANT: If the riskLevel is 'Moderate' or 'High', suggest a safer, alternative prescription that treats the likely condition with fewer side effects.
                8. Include a fixed disclaimer text in a 'disclaimer' field.
                
                Return ONLY a single, valid JSON object with the following structure. If no drugs are found, return an empty "extractedDrugs" array. If no alternative is needed, the "alternativePrescription" object can be null.
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
            
            // Validate essential fields from AI response
            if (!analysisResult || typeof analysisResult !== 'object' || !analysisResult.riskLevel || !Array.isArray(analysisResult.extractedDrugs)) {
                 console.error('[AI] Invalid response structure from Gemini:', analysisResult);
                 throw new Error('AI response structure was invalid.');
            }


            const newPrescriptionId = `pres_${Date.now()}`;
            const doctorId = 'doc_placeholder_123'; // TODO: Get this from Clerk auth

            // Use promises for cleaner async database operations
            const run = (sql, params = []) => new Promise((resolve, reject) => {
                db.run(sql, params, function(err) {
                    if (err) reject(err);
                    else resolve(this); // 'this' contains lastID, changes
                });
            });

            await run('BEGIN TRANSACTION;');
            try {
                const prescriptionSql = `INSERT INTO Prescription (id, patientId, doctorId, riskLevel, summary, recommendations, createdAt) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`;
                const prescriptionParams = [newPrescriptionId, patientId, doctorId, analysisResult.riskLevel, analysisResult.summary || '', JSON.stringify(analysisResult.recommendations || [])];
                await run(prescriptionSql, prescriptionParams);

                if (Array.isArray(analysisResult.extractedDrugs) && analysisResult.extractedDrugs.length > 0) {
                    const drugSql = `INSERT INTO PrescribedDrug (id, prescriptionId, name, dosage, frequency) VALUES (?, ?, ?, ?, ?)`;
                    for (const drug of analysisResult.extractedDrugs) {
                        const newDrugId = `drug_${Date.now()}_${Math.random().toString(36).substring(2)}`; // More unique ID
                        const drugParams = [newDrugId, newPrescriptionId, drug.name || 'Unknown', drug.dosage || 'N/A', drug.frequency || 'N/A'];
                        await run(drugSql, drugParams);
                    }
                }

                await run('COMMIT;');
                const finalResult = { id: newPrescriptionId, patientId, ...analysisResult };
                res.status(201).json(finalResult);

            } catch (dbError) {
                console.error('Database transaction error:', dbError.message);
                await run('ROLLBACK;'); // Ensure rollback on error
                res.status(500).json({ error: 'Failed to save prescription details to the database.' });
            }

        } catch (aiError) {
            console.error('Error during AI analysis workflow:', aiError.message);
            res.status(500).json({ error: aiError.message || 'An error occurred during the AI analysis workflow.' });
        }
    });
});


// --- GET Patient by ID ---
app.get('/api/patients/:id', (req, res) => {
    const { id } = req.params;
    db.get("SELECT * FROM Patient WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error('[DB GET /api/patients/:id] Error:', err.message);
            return res.status(500).json({ error: 'Database error while fetching patient.' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Patient not found.' });
        }
        res.status(200).json(row);
    });
});

// --- GET All Patients ---
app.get('/api/patients', (req, res) => {
    db.all("SELECT * FROM Patient ORDER BY createdAt DESC", [], (err, rows) => {
        if (err) {
            console.error('[DB GET /api/patients] Error:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve patients.' });
        }
        res.status(200).json(rows);
    });
});

// --- POST New Patient ---
app.post('/api/patients', (req, res) => {
    const { fullName, dob, gender, bloodType, contactNumber, emergencyContact, allergies, medicalHistory } = req.body;
    
    // Basic validation
    if (!fullName || !dob) {
        return res.status(400).json({ error: 'Full Name and Date of Birth are required.' });
    }
    
    const newId = `pat_${Date.now()}`;
    const sql = `INSERT INTO Patient (id, fullName, dob, gender, bloodType, contactNumber, emergencyContact, allergies, medicalHistory, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
    const params = [newId, fullName, dob, gender, bloodType, contactNumber, emergencyContact, allergies, medicalHistory];
    
    db.run(sql, params, function(err) {
        if (err) {
            console.error('[DB POST /api/patients] Error:', err.message);
            return res.status(500).json({ error: 'Database error while creating patient.' });
        }
        res.status(201).json({ id: newId, ...req.body });
    });
});


// --- Start the Server ---
app.listen(PORT, () => {
    console.log(`Backend server is listening on http://localhost:${PORT}`);
    console.log("-------------------------------------------------");
});