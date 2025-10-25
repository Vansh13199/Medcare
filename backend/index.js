import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import sql from 'mssql'; // Use the mssql library
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

// --- SQL Server Database Connection Config ---
const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
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

// --- ⭐️ Function to Create Tables if they don't exist ---
async function setupDatabase() {
    const createPatientTable = `
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Patient]') AND type in (N'U'))
        CREATE TABLE [dbo].[Patient] (
            [id] NVARCHAR(255) PRIMARY KEY,
            [createdAt] DATETIMEOFFSET DEFAULT SYSUTCDATETIME(),
            [updatedAt] DATETIMEOFFSET DEFAULT SYSUTCDATETIME(),
            [fullName] NVARCHAR(255),
            [dob] NVARCHAR(50),
            [gender] NVARCHAR(50),
            [bloodType] NVARCHAR(10),
            [contactNumber] NVARCHAR(50),
            [emergencyContact] NVARCHAR(50),
            [allergies] NVARCHAR(MAX),
            [medicalHistory] NVARCHAR(MAX)
        );
    `;

    const createPrescriptionTable = `
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Prescription]') AND type in (N'U'))
        CREATE TABLE [dbo].[Prescription] (
            [id] NVARCHAR(255) PRIMARY KEY,
            [patientId] NVARCHAR(255) NOT NULL,
            [doctorId] NVARCHAR(255),
            [riskLevel] NVARCHAR(50),
            [summary] NVARCHAR(MAX),
            [recommendations] NVARCHAR(MAX),
            [createdAt] DATETIMEOFFSET DEFAULT SYSUTCDATETIME(),
            CONSTRAINT FK_Prescription_Patient FOREIGN KEY ([patientId]) REFERENCES [dbo].[Patient]([id]) ON DELETE CASCADE
        );
    `;

    const createPrescribedDrugTable = `
        IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PrescribedDrug]') AND type in (N'U'))
        CREATE TABLE [dbo].[PrescribedDrug] (
            [id] NVARCHAR(255) PRIMARY KEY,
            [prescriptionId] NVARCHAR(255) NOT NULL,
            [name] NVARCHAR(255) NOT NULL,
            [dosage] NVARCHAR(100),
            [frequency] NVARCHAR(100),
            CONSTRAINT FK_PrescribedDrug_Prescription FOREIGN KEY ([prescriptionId]) REFERENCES [dbo].[Prescription]([id]) ON DELETE CASCADE
        );
    `;

    let pool; // Declare pool variable outside try block
    try {
        pool = await sql.connect(sqlConfig);
        console.log('Successfully connected to the SQL Server database for setup.');

        console.log('Checking/Creating Patient table...');
        await pool.request().query(createPatientTable);
        console.log('Checking/Creating Prescription table...');
        await pool.request().query(createPrescriptionTable);
        console.log('Checking/Creating PrescribedDrug table...');
        await pool.request().query(createPrescribedDrugTable);

        console.log('Database tables are ready.');

    } catch (err) {
        console.error("Fatal Error during database setup:", err.stack);
        process.exit(1); // Exit if setup fails
    } finally {
         if (pool) {
             try {
                // Close the connection pool used specifically for setup
                await pool.close();
                console.log('Setup database connection closed.');
             } catch (closeErr) {
                 console.error('Error closing setup connection pool:', closeErr);
             }
         }
    }
}

// --- Run Database Setup on Startup ---
setupDatabase().then(() => {
    // Start the Express server *only after* setup is complete
    app.listen(PORT, () => {
        console.log(`Backend server listening on http://localhost:${PORT}`);
        console.log("-------------------------------------------------");
    });
}).catch(err => {
    console.error("Failed to start server due to database setup error:", err);
});


// --- Middleware ---
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// --- AI Helper (Unchanged) ---
async function analyzeImageWithGemini(prompt, imageBase64, imageMediaType) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`;
    const requestBody = { /* ... */ }; // Assume body is correct
    try {
        const response = await axios.post(geminiUrl, requestBody);
        return JSON.parse(response.data.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error('[AI] Gemini Call Error:', error.response ? error.response.data : error.message);
        throw new Error('Failed to analyze image with Gemini.');
    }
}


// --- API Routes (Using pool directly now) ---

app.get('/api/stats', async (req, res) => {
    try {
        const pool = await sql.connect(sqlConfig); // Get connection from pool
        const patientsResult = await pool.request().query('SELECT COUNT(*) as count FROM Patient');
        const prescriptionsResult = await pool.request().query("SELECT COUNT(*) as count FROM Prescription WHERE createdAt >= DATEADD(day, -1, SYSUTCDATETIME())");
        const alertsResult = await pool.request().query("SELECT COUNT(*) as count FROM Prescription WHERE riskLevel = 'High'");

        res.status(200).json({
            totalPatients: patientsResult.recordset[0].count,
            prescriptionsToday: prescriptionsResult.recordset[0].count,
            highRiskAlerts: alertsResult.recordset[0].count
        });
    } catch (err) {
        console.error('Error fetching stats:', err.message);
        res.status(500).json({ error: 'Failed to retrieve stats.' });
    }
     // Pool connection is automatically released when using await sql.connect() this way
});


app.post('/api/prescriptions/upload/:patientId', upload.single('prescriptionImage'), async (req, res) => {
    const { patientId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No prescription image uploaded.' });

    let pool; // Define pool here to use in finally block if needed
    let transaction;
    try {
        pool = await sql.connect(sqlConfig); // Connect using the pool

        const patientCheck = await pool.request()
            .input('patientId', sql.NVarChar, patientId)
            .query('SELECT id FROM Patient WHERE id = @patientId');
        if (patientCheck.recordset.length === 0) {
            return res.status(404).json({ error: `Patient not found.` });
        }

        const imageBase64 = req.file.buffer.toString('base64');
        const imageMediaType = req.file.mimetype;
        const prompt = `You are a medical AI... (full prompt here)`;
        const analysisResult = await analyzeImageWithGemini(prompt, imageBase64, imageMediaType);

        const newPrescriptionId = `pres_${Date.now()}`;
        const doctorId = 'doc_placeholder_123';

        transaction = new sql.Transaction(pool); // Start transaction using the connected pool
        await transaction.begin();

        const prescriptionRequest = new sql.Request(transaction);
        await prescriptionRequest
            .input('id', sql.NVarChar, newPrescriptionId)
            .input('patientId', sql.NVarChar, patientId)
            .input('doctorId', sql.NVarChar, doctorId)
            .input('riskLevel', sql.NVarChar, analysisResult.riskLevel)
            .input('summary', sql.NVarChar, analysisResult.summary || '')
            .input('recommendations', sql.NVarChar, JSON.stringify(analysisResult.recommendations || []))
            .query(`INSERT INTO Prescription (id, patientId, doctorId, riskLevel, summary, recommendations, createdAt) 
                    VALUES (@id, @patientId, @doctorId, @riskLevel, @summary, @recommendations, SYSUTCDATETIME())`);

        if (Array.isArray(analysisResult.extractedDrugs)) {
            for (const drug of analysisResult.extractedDrugs) {
                const drugRequest = new sql.Request(transaction);
                const newDrugId = `drug_${Date.now()}_${Math.random()}`;
                await drugRequest
                    .input('id', sql.NVarChar, newDrugId)
                    .input('prescriptionId', sql.NVarChar, newPrescriptionId)
                    .input('name', sql.NVarChar, drug.name || 'Unknown')
                    .input('dosage', sql.NVarChar, drug.dosage || 'N/A')
                    .input('frequency', sql.NVarChar, drug.frequency || 'N/A')
                    .query(`INSERT INTO PrescribedDrug (id, prescriptionId, name, dosage, frequency) 
                            VALUES (@id, @prescriptionId, @name, @dosage, @frequency)`);
            }
        }

        await transaction.commit();
        res.status(201).json({ id: newPrescriptionId, patientId, ...analysisResult });

    } catch (error) {
        console.error('Error in prescription upload:', error.message);
        if (transaction) await transaction.rollback(); // Rollback if transaction exists
        res.status(500).json({ error: 'An error occurred during prescription processing.' });
    }
    // No finally block needed here, connection pool manages connections
});

// GET /api/patients/:id (using pool)
app.get('/api/patients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await sql.connect(sqlConfig);
        const result = await pool.request()
            .input('id', sql.NVarChar, id)
            .query('SELECT * FROM Patient WHERE id = @id');
        if (result.recordset.length === 0) return res.status(404).json({ error: 'Patient not found.' });
        res.status(200).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Database error.' });
    }
});

// GET /api/patients (using pool)
app.get('/api/patients', async (req, res) => {
    try {
        const pool = await sql.connect(sqlConfig);
        const result = await pool.request().query('SELECT * FROM Patient ORDER BY createdAt DESC');
        res.status(200).json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve patients.' });
    }
});

// POST /api/patients (using pool)
app.post('/api/patients', async (req, res) => {
    const { fullName, dob } = req.body;
    if (!fullName || !dob) return res.status(400).json({ error: 'Required fields missing.' });
    
    const newId = `pat_${Date.now()}`;
    try {
        const pool = await sql.connect(sqlConfig);
        await pool.request()
            .input('id', sql.NVarChar, newId)
            // ... (rest of the inputs)
            .input('fullName', sql.NVarChar, req.body.fullName)
            .input('dob', sql.NVarChar, req.body.dob)
            .input('gender', sql.NVarChar, req.body.gender)
            .input('bloodType', sql.NVarChar, req.body.bloodType)
            .input('contactNumber', sql.NVarChar, req.body.contactNumber)
            .input('emergencyContact', sql.NVarChar, req.body.emergencyContact)
            .input('allergies', sql.NVarChar, req.body.allergies)
            .input('medicalHistory', sql.NVarChar, req.body.medicalHistory)
            .query(`INSERT INTO Patient (id, fullName, dob, gender, bloodType, contactNumber, emergencyContact, allergies, medicalHistory, createdAt, updatedAt) 
                    VALUES (@id, @fullName, @dob, @gender, @bloodType, @contactNumber, @emergencyContact, @allergies, @medicalHistory, SYSUTCDATETIME(), SYSUTCDATETIME())`);
        res.status(201).json({ id: newId, ...req.body });
    } catch (err) {
        console.error("DB Error:", err);
        res.status(500).json({ error: 'Database error.' });
    }
});

// --- Start Server (Moved inside .then() of setupDatabase) ---
// The app.listen() call is now inside the .then() block after setupDatabase() runs.

