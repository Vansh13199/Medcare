import os
import pyodbc
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Database Connection Setup ---
db_driver = os.getenv("ODBC_DRIVER", "{ODBC Driver 17 for SQL Server}")
db_server = os.getenv("DB_SERVER")
db_database = os.getenv("DB_DATABASE")
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")

if not all([db_server, db_database, db_user, db_password]):
    print("FATAL ERROR: Database environment variables (DB_SERVER, DB_DATABASE, DB_USER, DB_PASSWORD) are not set.")
    exit(1)

conn_str = (
    f"DRIVER={db_driver};"
    f"SERVER={db_server};"
    f"DATABASE={db_database};"
    f"UID={db_user};"
    f"PWD={db_password};"
    f"Encrypt=yes;"
    f"TrustServerCertificate=no;"
    f"Connection Timeout=30;"
)

# --- SQL CREATE TABLE Statements ---
# Using SQL Server syntax with IF NOT EXISTS
create_patient_table = """
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Patient]') AND type in (N'U'))
BEGIN
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
    PRINT 'Table [Patient] created.';
END
ELSE
BEGIN
    PRINT 'Table [Patient] already exists.';
END
"""

create_prescription_table = """
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Prescription]') AND type in (N'U'))
BEGIN
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
    PRINT 'Table [Prescription] created.';
END
ELSE
BEGIN
    PRINT 'Table [Prescription] already exists.';
END
"""

create_prescribed_drug_table = """
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[PrescribedDrug]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[PrescribedDrug] (
        [id] NVARCHAR(255) PRIMARY KEY,
        [prescriptionId] NVARCHAR(255) NOT NULL,
        [name] NVARCHAR(255) NOT NULL,
        [dosage] NVARCHAR(100),
        [frequency] NVARCHAR(100),
        CONSTRAINT FK_PrescribedDrug_Prescription FOREIGN KEY ([prescriptionId]) REFERENCES [dbo].[Prescription]([id]) ON DELETE CASCADE
    );
    PRINT 'Table [PrescribedDrug] created.';
END
ELSE
BEGIN
    PRINT 'Table [PrescribedDrug] already exists.';
END
"""

# List of SQL commands to execute
sql_commands = [
    create_patient_table,
    create_prescription_table,
    create_prescribed_drug_table
]

# --- Execute SQL Commands ---
conn = None
cursor = None
try:
    print(f"Connecting to database: {db_server}/{db_database}...")
    conn = pyodbc.connect(conn_str, autocommit=True) # Use autocommit for DDL
    cursor = conn.cursor()
    print("Connection successful.")

    print("\nChecking/Creating tables...")
    for command in sql_commands:
        print(f"\nExecuting: \n{command[:150]}...") # Print start of command
        cursor.execute(command)
        # Fetch any PRINT messages from SQL Server
        while cursor.nextset():
            try:
                # Some drivers might not support fetching messages directly,
                # or might require different handling. This is a basic attempt.
                messages = cursor.messages
                if messages:
                    for msg in messages:
                        print(f"  DB Message: {msg[1]}") # msg[1] contains the message text
            except AttributeError:
                # If cursor.messages doesn't exist, just continue
                pass
            except Exception as msg_err:
                 print(f"  (Could not fetch messages: {msg_err})")

    print("\nDatabase schema check/creation complete.")

except pyodbc.Error as ex:
    sqlstate = ex.args[0]
    print(f"ERROR: Database connection or execution failed.")
    print(f"SQLSTATE: {sqlstate}")
    # Print detailed error args if available
    if len(ex.args) > 1:
        print(f"Message: {ex.args[1]}")

except Exception as e:
    print(f"An unexpected error occurred: {e}")

finally:
    if cursor:
        cursor.close()
        print("\nCursor closed.")
    if conn:
        conn.close()
        print("Database connection closed.")
