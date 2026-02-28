-- Collab-U: Inicialización de 13 bases de datos
-- Se ejecuta automáticamente al crear el contenedor PostgreSQL por primera vez

CREATE DATABASE auth_db;
CREATE DATABASE user_db;
CREATE DATABASE student_db;
CREATE DATABASE company_db;
CREATE DATABASE project_db;
CREATE DATABASE application_db;
CREATE DATABASE matching_db;
CREATE DATABASE evaluation_db;
CREATE DATABASE notification_db;
CREATE DATABASE chat_db;
CREATE DATABASE admin_db;
CREATE DATABASE analytics_db;
CREATE DATABASE storage_db;

-- Habilitar uuid-ossp en cada base de datos
\c auth_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c user_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c student_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c company_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c project_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c application_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c matching_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c evaluation_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c notification_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c chat_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c admin_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c analytics_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c storage_db
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
